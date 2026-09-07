<template>
  <!-- 顶部弹窗：订阅 store 的通知，收到即弹出，3 秒自动消失 -->
  <view class="message-toast">
    <view
      v-for="n in store.notifications"
      :key="n.id"
      class="toast-card"
      :class="n.type"
      @tap="handleTap(n)"
    >
      <view class="toast-icon">{{ n.type === 'appointment' ? '📅' : '💬' }}</view>
      <view class="toast-body">
        <view class="toast-title">{{ n.title }}</view>
        <view class="toast-content">{{ n.content }}</view>
      </view>
      <view class="toast-close" @tap.stop="store.remove(n.id)">✕</view>
    </view>
  </view>
</template>

<script>
import { useNotificationStore } from '@/store/notification'

export default {
  setup() {
    const store = useNotificationStore()
    return { store }
  },
  methods: {
    /** 点击通知：chat 类型跳聊天页（预约类型暂无落地页，暂不跳） */
    handleTap(n) {
      if (n.type === 'chat' && n.conversationId) {
        uni.navigateTo({ url: `/pages/chatDetail/index?conversationId=${n.conversationId}` })
      }
      this.store.remove(n.id)
    }
  }
}
</script>

<style scoped>
.message-toast {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  padding: 0 24rpx;
  /* 避开状态栏 */
  padding-top: calc(env(safe-area-inset-top) + 20rpx);
  pointer-events: none; /* 容器不挡点击，卡片自己可点 */
}

.toast-card {
  pointer-events: auto;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.15);
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: flex-start;
  border-left: 8rpx solid;
  animation: toastIn 0.3s ease;
}

.toast-card.chat {
  border-left-color: #1a56db;
}

.toast-card.appointment {
  border-left-color: #e6a23c;
}

.toast-icon {
  font-size: 44rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.toast-body {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #303133;
}

.toast-content {
  font-size: 24rpx;
  color: #909399;
  margin-top: 6rpx;
  /* 两行省略 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.toast-close {
  color: #c0c4cc;
  font-size: 24rpx;
  padding: 8rpx;
  flex-shrink: 0;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateY(-20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
