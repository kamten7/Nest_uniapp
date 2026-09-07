<template>
  <view class="ai-page">
    <!-- 全局消息弹窗 -->
    <message-toast />
    <!-- 消息列表 -->
    <scroll-view class="message-list" scroll-y :scroll-top="scrollTop" scroll-with-animation>
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
    </scroll-view>

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
import { useUserStore } from '@/store/user'

export default {
  setup() {
    return { userStore: useUserStore() }
  },
  data() {
    return {
      messages: [],      // [{ role: 'user'|'ai', content }]
      inputText: '',
      streaming: false,
      scrollTop: 0,
      requestTask: null  // 流式请求 task（用于中断）
    }
  },
  onUnload() {
    // 离开页面时中断未完成的流式请求
    if (this.requestTask && this.requestTask.abort) {
      this.requestTask.abort()
    }
  },
  methods: {
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
    },
    scrollToBottom() {
      this.$nextTick(() => {
        this.scrollTop = this.messages.length * 1000
      })
    }
  }
}
</script>

<style scoped>
.ai-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.message-list {
  flex: 1;
  padding: 20rpx;
  box-sizing: border-box;
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
