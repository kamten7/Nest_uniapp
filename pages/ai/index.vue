<template>
  <view class="ai-page">
    <!-- 全局消息弹窗 -->
    <message-toast />

    <!-- 顶部栏：固定在消息区上方，不随消息滚动 -->
    <view class="header">
      <text class="header-title">小巢</text>
      <view
        class="clear-btn"
        :class="{ disabled: streaming || !messages.length }"
        @tap="clearChat"
      >
        清空对话
      </view>
    </view>

    <!-- 消息区（包一层用于给「回到底部」定位，避免压住输入栏） -->
    <view class="list-wrap">
      <scroll-view
        class="message-list"
        scroll-y
        :scroll-into-view="scrollAnchor"
        :scroll-with-animation="false"
        @scroll="onListScroll"
      >
        <view v-if="!messages.length" class="welcome">
          <view class="welcome-icon">🤖</view>
          <view class="welcome-title">我是 AI 小巢</view>
          <view class="welcome-desc">用一句话描述你的租房需求，我帮你找房</view>
          <view class="suggestion" @tap="quickAsk('帮我找湛江市2000以内的两居室')">
            🏠 帮我找湛江市2000以内的两居室
          </view>
          <view class="suggestion" @tap="quickAsk('推荐霞山区近地铁的一室一厅')">
            📍 推荐霞山区近地铁的一室一厅
          </view>
        </view>

        <view v-for="(msg, idx) in messages" :key="idx" class="message-row" :class="msg.role">
          <view v-if="msg.role === 'ai'" class="avatar ai-avatar">🤖</view>
          <view class="bubble" :class="msg.role">{{ msg.content }}</view>
          <view v-if="msg.role === 'user'" class="avatar user-avatar">👤</view>
        </view>

        <!-- 正在输入指示 -->
        <view v-if="streaming" class="streaming">小巢正在思考...</view>

        <!--
          底部锚点：scroll-into-view 只能按 id 定位，且「值不变就不触发」，
          所以准备两个锚点交替切换（同一位置，视觉无差别）来保证每次都能滚到底。
        -->
        <view id="anchor-a" class="anchor" />
        <view id="anchor-b" class="anchor" />
      </scroll-view>

      <!-- 上滑查看历史时出现：一键回到底部并恢复跟随 -->
      <view v-if="!atBottom" class="to-bottom" @tap="scrollToBottom(true)">
        <text class="to-bottom-icon">↓</text>
        <text class="to-bottom-text">回到底部</text>
      </view>
    </view>

    <!-- 输入栏 -->
    <view class="input-bar">
      <input
        v-model="inputText"
        class="input-box"
        placeholder="描述你的找房需求..."
        confirm-type="send"
        @confirm="sendMessage"
      />
      <view class="send-btn" :class="{ disabled: !inputText }" @tap="sendMessage">发送</view>
    </view>
  </view>
</template>

<script>
import { streamRequest } from '@/utils/stream'
import { getAiMemory, clearAiMemory } from '@/api/ai'
import { useUserStore } from '@/store/user'

/** 距离底部小于该值（px）就算「贴着底部」，仍自动跟随 */
const FOLLOW_THRESHOLD = 60

export default {
  setup() {
    return { userStore: useUserStore() }
  },
  data() {
    return {
      messages: [],      // [{ role: 'user'|'ai', content }]
      inputText: '',
      streaming: false,
      scrollAnchor: '',  // scroll-into-view 目标（anchor-a / anchor-b 交替）
      atBottom: true,    // 是否贴着底部：决定流式输出时要不要自动跟随
      listHeight: 0,     // 消息区可视高度（判断贴底用）
      requestTask: null, // 流式请求 task（用于中断）
      loadedUserId: null // 已加载历史对应的租客 ID（换账号时判断要不要重载）
    }
  },
  onReady() {
    // 量一次消息区高度：@scroll 只给 scrollHeight，判断贴底需要可视高度
    uni.createSelectorQuery()
      .select('.message-list')
      .boundingClientRect((rect) => {
        if (rect && rect.height) this.listHeight = rect.height
      })
      .exec()
  },
  onUnload() {
    // 离开页面时中断未完成的流式请求
    if (this.requestTask && this.requestTask.abort) {
      this.requestTask.abort()
    }
  },
  onShow() {
    // 进页面时按当前登录租客恢复历史；切换账号/退出登录则清空本地气泡重载
    const userId = (this.userStore.userInfo && this.userStore.userInfo.id) || null
    if (userId === this.loadedUserId) return
    this.loadedUserId = userId
    this.messages = []
    this.atBottom = true
    if (userId) this.loadHistory()
  },
  methods: {
    /** 拉服务端保存的对话恢复气泡；失败静默，不打断用户提问 */
    loadHistory() {
      getAiMemory()
        .then((res) => {
          this.messages = (res && res.data) || []
          this.scrollToBottom(true)
        })
        .catch(() => {
          // 读历史失败就当没有历史，用户仍可正常对话
        })
    },

    /**
     * 列表滚动：只在「离底部很近」时保持自动跟随。
     * 用户上滑去看历史时不再把他拽回底部（豆包/DeepSeek 的行为）。
     */
    onListScroll(e) {
      const detail = e && e.detail
      // 拿不到 scrollHeight（极老基础库）就保持跟随，宁可可预期也不要停住不动
      if (!detail || detail.scrollHeight === undefined || !this.listHeight) return
      this.atBottom = detail.scrollHeight - detail.scrollTop - this.listHeight < FOLLOW_THRESHOLD
    },

    /**
     * 滚到底部。
     * force=true 用于「用户主动要求」的场景（发消息、加载完历史、点回到底部），
     * 否则只有当前贴着底部才跟随，避免打断正在上翻历史的人。
     */
    scrollToBottom(force = false) {
      if (!force && !this.atBottom) return
      this.atBottom = true
      this.$nextTick(() => {
        // 交替锚点：scroll-into-view 的值必须有变化才会重新滚动
        this.scrollAnchor = this.scrollAnchor === 'anchor-a' ? 'anchor-b' : 'anchor-a'
      })
    },

    /** 清空对话：二次确认后调后端删记忆 */
    clearChat() {
      // 流式回复期间禁用：服务端结束时会把整份记忆写回，此时清空会失效
      if (this.streaming) {
        uni.showToast({ title: '小巢正在回复，请稍候', icon: 'none' })
        return
      }
      if (!this.messages.length) return

      uni.showModal({
        title: '清空对话',
        content: '确定清空和小巢的全部聊天记录吗？清空后无法恢复。',
        confirmText: '清空',
        confirmColor: '#e64340',
        success: (modalRes) => {
          if (modalRes.confirm) this.doClear()
        }
      })
    },
    /** 真正执行清空 */
    doClear() {
      uni.showLoading({ title: '正在清空' })
      clearAiMemory()
        .then(() => {
          uni.hideLoading()
          this.messages = []
          this.inputText = ''
          this.atBottom = true
          uni.showToast({ title: '已清空', icon: 'success' })
        })
        .catch((err) => {
          uni.hideLoading()
          uni.showToast({ title: (err && err.msg) || '清空失败，请稍后再试', icon: 'none' })
        })
    },
    quickAsk(text) {
      this.inputText = text
      this.sendMessage()
    },
    /** 发送消息 → 后端 AI 流式接口 */
    sendMessage() {
      const text = this.inputText.trim()
      if (!text || this.streaming) return

      // 未登录提示
      if (!this.userStore.isLogin) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      this.messages.push({ role: 'user', content: text })
      this.inputText = ''
      this.streaming = true
      this.scrollToBottom(true)   // 自己发的消息一定要看到

      this.requestTask = streamRequest({
        url: '/user/ai/chat/stream',
        data: { message: text },
        onMessage: (chunk) => this.appendAI(chunk),
        onDone: () => this.finishAI(),
        onError: (msg) => this.finishAI(msg)
      })
    },
    /** 追加 AI 回复片段到最后一个 AI 气泡 */
    appendAI(chunk) {
      const last = this.messages[this.messages.length - 1]
      if (last && last.role === 'ai') {
        last.content += chunk
      } else {
        this.messages.push({ role: 'ai', content: chunk })
      }
      // 逐字输出时消息条数不变、但内容一直在变高，所以必须每次都重新定位到底部锚点
      this.scrollToBottom()
    },
    /** 流式结束 */
    finishAI(errorMsg) {
      this.streaming = false
      if (errorMsg) {
        const last = this.messages[this.messages.length - 1]
        if (!last || last.role !== 'ai') {
          this.messages.push({ role: 'ai', content: errorMsg })
        }
      }
      this.scrollToBottom()
    }
  }
}
</script>

<style scoped>
/* height 用 100% 而不是 100vh：App.vue 里已经全局设了 page{height:100%}，
   这样容器高度严格等于可视区，页面根不会溢出 ⇒ 整页不会滚动 ⇒ 头部永远留在屏幕上 */
.ai-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #ebeef5;
  flex-shrink: 0;
}

.header-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #303133;
}

.clear-btn {
  font-size: 26rpx;
  color: #e64340;
  border: 1rpx solid #e64340;
  border-radius: 24rpx;
  padding: 6rpx 22rpx;
}

.clear-btn.disabled {
  color: #c0c4cc;
  border-color: #e4e7ed;
}

/* 消息区外层：flex:1 拿到可用高度，并给悬浮按钮一个定位基准 */
.list-wrap {
  flex: 1;
  min-height: 0;
  position: relative;
}

.message-list {
  height: 100%;
  padding: 20rpx;
  box-sizing: border-box;
}

.anchor {
  height: 4rpx;
}

/* 回到底部：只在用户上滑看历史时出现 */
.to-bottom {
  position: absolute;
  right: 24rpx;
  bottom: 24rpx;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 30rpx;
  padding: 8rpx 20rpx;
}

.to-bottom-icon {
  font-size: 26rpx;
  margin-right: 6rpx;
}

.to-bottom-text {
  font-size: 24rpx;
}

.welcome {
  text-align: center;
  padding: 80rpx 40rpx 40rpx;
}

.welcome-icon {
  font-size: 100rpx;
}

.welcome-title {
  font-size: 36rpx;
  font-weight: bold;
  margin-top: 20rpx;
}

.welcome-desc {
  font-size: 26rpx;
  color: #909399;
  margin-top: 12rpx;
}

.suggestion {
  margin-top: 24rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 26rpx;
  color: #1a56db;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.message-row {
  display: flex;
  margin-bottom: 20rpx;
  align-items: flex-start;
}

.message-row.user {
  justify-content: flex-end;
}

.avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  margin: 0 12rpx;
  flex-shrink: 0;
}

.ai-avatar {
  background: #ecf3ff;
}

.user-avatar {
  background: #f5f7fa;
}

.bubble {
  max-width: 70%;
  padding: 18rpx 22rpx;
  border-radius: 14rpx;
  font-size: 28rpx;
  line-height: 1.5;
  word-break: break-all;
}

.bubble.ai {
  background: #fff;
  color: #303133;
  border-top-left-radius: 2rpx;
}

.bubble.user {
  background: #1a56db;
  color: #fff;
  border-top-right-radius: 2rpx;
}

.streaming {
  color: #909399;
  font-size: 24rpx;
  padding: 12rpx 0;
}

.input-bar {
  display: flex;
  padding: 16rpx 20rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  gap: 16rpx;
  flex-shrink: 0;
}

.input-box {
  flex: 1;
  background: #f5f7fa;
  border-radius: 30rpx;
  padding: 16rpx 24rpx;
  font-size: 28rpx;
}

.send-btn {
  background: #1a56db;
  color: #fff;
  border-radius: 30rpx;
  padding: 0 36rpx;
  display: flex;
  align-items: center;
  font-size: 28rpx;
}

.send-btn.disabled {
  background: #c0c4cc;
}
</style>
