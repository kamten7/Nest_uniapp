<template>
  <view class="chat-page">
    <!-- 全局消息弹窗（聊天页收到新消息也提示，但进入 chatDetail 后不打扰） -->
    <message-toast />
    <!-- 会话列表 -->
    <view v-if="conversations.length" class="conversation-list">
      <view v-for="conv in conversations" :key="conv.id" class="conv-item" @tap="goDetail(conv)">
        <view class="conv-avatar">{{ (conv.otherName || '?').charAt(0) }}</view>
        <view class="conv-info">
          <view class="conv-name">{{ conv.otherName }}</view>
          <view class="conv-preview">{{ conv.lastMessage || '暂无消息' }}</view>
        </view>
        <view class="conv-right">
          <view class="conv-time">{{ formatTime(conv.lastMessageTime) }}</view>
          <view v-if="conv.unreadCount > 0" class="unread-badge">{{ conv.unreadCount }}</view>
        </view>
      </view>
    </view>

    <!-- 空态 -->
    <view v-else class="empty">
      <view class="empty-icon">💬</view>
      <view class="empty-text">暂无会话</view>
      <view class="empty-hint">联系房东或预约看房后，会话会显示在这里</view>
    </view>
  </view>
</template>

<script>
import { getConversations } from '@/api/chat'
import {
  ensureChatConnected,
  onChatEvent,
  setActiveConversation,
  onAppShow
} from '@/utils/chatClient'
import { syncMessageBadge } from '@/utils/tabBadge'

export default {
  data() {
    return {
      conversations: [],
      offChat: null,
      offAppShow: null,
      pageVisible: false
    }
  },
  onLoad() {
    // 订阅全局 WS 事件：列表页打开时收到新消息 → 实时刷新会话列表
    this.offChat = onChatEvent((data) => this.onWsMessage(data))
    // 订阅 App 回前台事件：后台断线期间的消息重拉会话列表
    this.offAppShow = onAppShow(() => {
      if (this.pageVisible) this.loadConversations()
    })
  },
  onShow() {
    this.pageVisible = true
    // 列表页不算“正在看某个会话”，新消息仍计入未读/角标
    setActiveConversation(null)
    ensureChatConnected()
    syncMessageBadge()
    this.loadConversations()
  },
  onHide() {
    this.pageVisible = false
  },
  onUnload() {
    this.pageVisible = false
    if (this.offChat) {
      this.offChat()
      this.offChat = null
    }
    if (this.offAppShow) {
      this.offAppShow()
      this.offAppShow = null
    }
  },
  onPullDownRefresh() {
    this.loadConversations().then(() => uni.stopPullDownRefresh())
  },
  methods: {
    /** 列表页可见时收到新消息 → 刷新列表（预览/未读角标即时更新） */
    onWsMessage(data) {
      if (!data) return
      if (!this.pageVisible) return
      // 断线重连成功或收到新消息 → 刷新会话列表
      if (data.type === 'chat' || data.type === 'ws_open') {
        this.loadConversations()
      }
    },
    async loadConversations() {
      try {
        const res = await getConversations()
        this.conversations = res.data?.records || []
      } catch (e) {
        // 未登录时静默（TabBar 页面）
        console.log('会话加载失败', e)
      }
    },
    formatTime(t) {
      if (!t) return ''
      return t.replace('T', ' ').slice(5, 16)
    },
    goDetail(conv) {
      uni.navigateTo({
        url: `/pages/chatDetail/index?conversationId=${conv.id}&otherId=${conv.otherId}&otherType=${conv.otherType}&otherName=${encodeURIComponent(conv.otherName || '')}`
      })
    }
  }
}
</script>

<style scoped>
.chat-page {
  min-height: 100vh;
}

.conversation-list {
  padding: 20rpx;
}

.conv-item {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.conv-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #1a56db;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  flex-shrink: 0;
}

.conv-info {
  flex: 1;
  margin-left: 20rpx;
  min-width: 0;
}

.conv-name {
  font-size: 28rpx;
  color: #303133;
}

.conv-preview {
  font-size: 24rpx;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.conv-time {
  font-size: 22rpx;
  color: #c0c4cc;
}

.unread-badge {
  min-width: 32rpx;
  height: 32rpx;
  border-radius: 16rpx;
  background: #e74c3c;
  color: #fff;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.empty {
  text-align: center;
  padding: 160rpx 40rpx;
}

.empty-icon {
  font-size: 100rpx;
}

.empty-text {
  font-size: 30rpx;
  color: #909399;
  margin-top: 20rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #c0c4cc;
  margin-top: 12rpx;
}
</style>
