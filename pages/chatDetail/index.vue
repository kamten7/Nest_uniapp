<template>
  <view class="chat-detail">
    <!-- 消息列表 -->
    <scroll-view
      class="message-list"
      scroll-y
      :scroll-into-view="scrollInto"
      scroll-with-animation
    >
      <view v-if="!messages.length" class="empty">
        <view class="empty-text">和对方打个招呼吧</view>
      </view>
      <view
        v-for="(msg, idx) in messages"
        :key="msg.id || msg._local"
        class="message-row"
        :class="msg.mine ? 'mine' : 'theirs'"
      >
        <view class="bubble">{{ msg.content }}</view>
        <!-- 自己发的消息展示 未读/已读（Douyin/微信式会话状态） -->
        <view
          v-if="msg.mine && (msg.isRead === 1 || idx === lastOwnMsgIndex)"
          class="msg-status"
          :class="{ read: msg.isRead === 1 }"
        >
          {{ msg.isRead === 1 ? '已读' : idx === lastOwnMsgIndex ? '未读' : '' }}
        </view>
      </view>
      <view id="msg-bottom" class="msg-bottom" />
    </scroll-view>

    <!-- 输入栏 -->
    <view class="input-bar">
      <input v-model="inputText" class="input-box" placeholder="输入消息..." confirm-type="send" @confirm="sendMessage" />
      <view class="send-btn" :class="{ disabled: !inputText }" @tap="sendMessage">发送</view>
    </view>
  </view>
</template>

<script>
import { getMessages, getConversations } from '@/api/chat'
import {
  ensureChatConnected,
  sendChat,
  onChatEvent,
  setActiveConversation,
  onAppShow
} from '@/utils/chatClient'
import { syncMessageBadge } from '@/utils/tabBadge'

export default {
  data() {
    return {
      conversationId: null,
      otherId: null,      // 对方 ID（房东）
      otherType: 'landlord',
      otherName: '',
      messages: [],
      inputText: '',
      scrollInto: 'msg-bottom',
      offChat: null,
      offAppShow: null,
      pageVisible: false
    }
  },
  computed: {
    /** 最后一条自己发出的消息下标（用于气泡下方显示 未读/已读） */
    lastOwnMsgIndex() {
      for (let i = this.messages.length - 1; i >= 0; i--) {
        if (this.messages[i].mine) return i
      }
      return -1
    }
  },
  onLoad(options) {
    this.conversationId = options.conversationId ? Number(options.conversationId) : null
    this.otherId = options.otherId ? Number(options.otherId) : null
    this.otherType = options.otherType || 'landlord'
    if (options.otherName) {
      this.otherName = decodeURIComponent(options.otherName)
      uni.setNavigationBarTitle({ title: this.otherName })
    }
    // 订阅全局 WS 事件（小程序全局只维护一条聊天长连接）
    this.offChat = onChatEvent((data) => this.onWsMessage(data))
    // 订阅 App 回前台事件：后台断线期间的消息通过重拉历史补齐
    this.offAppShow = onAppShow(() => {
      if (this.pageVisible) this.loadHistory()
    })
  },
  onShow() {
    this.pageVisible = true
    // 标记当前正在读的会话：全局事件里对这个会话的新消息不弹窗
    setActiveConversation(this.conversationId)
    ensureChatConnected()
    if (!this.otherId) {
      this.fillOtherFromList() // 深链（弹窗点击）没带 otherId 时从会话列表补齐
    }
    this.loadHistory()
  },
  onHide() {
    // 被其它页面（如另一个会话详情）盖住时不处理实时消息，避免错发已读回执
    this.pageVisible = false
  },
  onUnload() {
    this.pageVisible = false
    setActiveConversation(null)
    if (this.offChat) {
      this.offChat()
      this.offChat = null
    }
    if (this.offAppShow) {
      this.offAppShow()
      this.offAppShow = null
    }
    // 离开聊天页 → 会话已读状态可能已变化，校准「消息」Tab 角标
    syncMessageBadge()
  },
  methods: {
    /** 弹窗深链只带 conversationId 时，从会话列表补对方信息（否则无法发消息） */
    async fillOtherFromList() {
      try {
        const res = await getConversations(1, 50)
        const list = res.data?.records || []
        const conv = list.find((c) => String(c.id) === String(this.conversationId))
        if (conv) {
          this.otherId = Number(conv.otherId)
          this.otherType = conv.otherType || 'landlord'
          if (!this.otherName && conv.otherName) {
            this.otherName = conv.otherName
            uni.setNavigationBarTitle({ title: conv.otherName })
          }
        }
      } catch (e) {
        console.log('补齐会话信息失败', e)
      }
    },
    /**
     * 拉取历史消息。
     * 后端 getMessages 会自动把本会话租客收到的消息置为已读，并向房东回推已读事件。
     */
    async loadHistory() {
      if (!this.conversationId) {
        uni.showToast({ title: '会话不存在', icon: 'none' })
        return
      }
      try {
        const res = await getMessages(this.conversationId)
        const records = (res.data?.records || []).map((m) => ({
          id: m.id,
          content: m.content,
          mine: !!m.mine,
          isRead: m.isRead === 1 ? 1 : 0,
          createTime: m.createTime || ''
        }))
        // 与实时推来的消息按 id 去重（历史接口与 WS 推送存在极小竞态）
        const existed = new Set(records.map((m) => m.id))
        const live = this.messages.filter((m) => m.id && !existed.has(m.id))
        this.messages = records.concat(live)
        this.scrollToBottom()
      } catch (e) {
        console.log('历史加载失败', e)
      }
    },
    /** 全局 WS 事件（本页面只关心当前会话的消息与已读回执） */
    onWsMessage(data) {
      if (!data || !this.conversationId || !this.pageVisible) return
      // 断线重连成功：重拉历史，补齐断线期间漏掉的消息
      if (data.type === 'ws_open') {
        this.loadHistory()
        return
      }
      const sameConv = String(data.conversationId) === String(this.conversationId)
      if (data.type === 'chat') {
        if (!sameConv) return
        // 去重：防止 onShow 重拉历史与实时推送叠加
        if (this.messages.some((m) => m.id && String(m.id) === String(data.msgId))) return
        this.messages.push({
          id: data.msgId,
          content: data.content,
          mine: false,
          isRead: 0,
          createTime: data.timestamp ? new Date(data.timestamp).toLocaleString() : ''
        })
        this.scrollToBottom()
        // 正在看这个会话 → 发已读回执：服务端把该批消息置已读并回推房东
        sendChat({
          type: 'read_receipt',
          conversationId: Number(this.conversationId),
          lastReadMsgId: Number(data.msgId)
        })
      } else if (data.type === 'read_receipt' && sameConv) {
        // 房东已读：把己方消息置为已读（本地乐观消息没有服务端 id，按整会话置读）
        if (data.lastReadMsgId) {
          this.messages = this.messages.map((m) => {
            if (!m.mine) return m
            // 有服务端 id 时按回执上限判断，无 id 的乐观消息视为已被读到
            if (!m.id || m.id <= Number(data.lastReadMsgId)) {
              return { ...m, isRead: 1 }
            }
            return m
          })
        }
      }
    },
    /** 发送消息 */
    sendMessage() {
      const text = this.inputText.trim()
      if (!text) return
      if (!this.otherId) {
        uni.showToast({ title: '无法确定聊天对象', icon: 'none' })
        return
      }
      const ok = sendChat({
        type: 'chat',
        toType: this.otherType,
        toId: this.otherId,
        content: text,
        msgType: 'text'
      })
      if (!ok) {
        uni.showToast({ title: '连接未建立，请稍后重试', icon: 'none' })
        return
      }

      // 本地先展示自己的消息（isRead=0 → 未读，等房东已读回执后翻转为已读）
      this.messages.push({
        id: null,
        _local: Date.now(),
        content: text,
        mine: true,
        isRead: 0,
        createTime: ''
      })
      this.inputText = ''
      this.scrollToBottom()
    },
    scrollToBottom() {
      this.$nextTick(() => {
        // 通过 scroll-into-view 滚动到底部锚点（先清空再赋值以强制触发）
        this.scrollInto = ''
        this.$nextTick(() => {
          this.scrollInto = 'msg-bottom'
        })
      })
    }
  }
}
</script>

<style scoped>
.chat-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.message-list {
  flex: 1;
  padding: 20rpx;
  box-sizing: border-box;
}

.msg-bottom {
  height: 4rpx;
}

.empty {
  text-align: center;
  padding: 160rpx 0;
}

.empty-text {
  font-size: 30rpx;
  color: #909399;
}

.message-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 20rpx;
}

.message-row.mine {
  align-items: flex-end;
}

.message-row.theirs {
  align-items: flex-start;
}

.bubble {
  max-width: 70%;
  padding: 18rpx 24rpx;
  border-radius: 14rpx;
  font-size: 28rpx;
  line-height: 1.5;
}

.mine .bubble {
  background: #1a56db;
  color: #fff;
}

.theirs .bubble {
  background: #fff;
  color: #303133;
}

.msg-status {
  font-size: 20rpx;
  line-height: 1;
  margin-top: 6rpx;
  color: #b0b3b8;
}

.msg-status.read {
  color: #909399;
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
