<script>
import {
  ensureChatConnected,
  onChatEvent,
  getActiveConversation,
  notifyAppShow
} from '@/utils/chatClient'
import { syncMessageBadge } from '@/utils/tabBadge'
import { useNotificationStore } from '@/store/notification'

// App 实例只创建一次：全局 WS 事件订阅也只注册一次
let offChatEvent = null

export default {
  onLaunch() {
    console.log('Nest 小程序启动')
    if (!offChatEvent) {
      offChatEvent = onChatEvent((data) => this.handleGlobalEvent(data))
    }
  },
  onShow() {
    console.log('Nest 小程序前台')
    // 已登录则确保长连接存在（连接被彻底断开后这里会自动重建）
    ensureChatConnected()
    // 回到前台刷新「消息」Tab 角标（后台期间可能积压了消息）
    syncMessageBadge()
    // 通知当前页面：后台断线期间的消息需要重拉补齐
    notifyAppShow()
  },
  methods: {
    /**
     * 全局 WebSocket 消息分发（单连接，消息只在这里和聊天相关页面各处理一次）。
     *
     * - chat 类型：若正在看该会话（chatDetail 已 setActiveConversation），
     *   由聊天页自己追加+回已读回执，这里不弹窗；否则顶部弹窗 + 刷新角标。
     * - appointment 类型：预约通知，始终顶部弹窗（5 个 Tab 页的 message-toast 渲染）。
     */
    handleGlobalEvent(data) {
      if (!data || !data.type) return
      const notifStore = useNotificationStore()

      if (data.type === 'ws_open') {
        // 断线重连成功 → 校准「消息」Tab 角标（离线期间可能积压了消息）
        syncMessageBadge()
      } else if (data.type === 'chat') {
        const active = getActiveConversation()
        if (active != null && String(active) === String(data.conversationId)) {
          return // 正在读该会话，不打扰
        }
        notifStore.push('chat', '收到新消息', data.content || '您有一条新消息', data.conversationId)
        syncMessageBadge()
      } else if (data.type === 'appointment') {
        notifStore.push('appointment', '有新的预约通知', data.content || '房东处理了您的预约')
      }
    }
  }
}
</script>

<style>
/* ===== 全局样式 ===== */
page {
  background-color: #f5f7fa;
  height: 100%;
  font-size: 28rpx;
  line-height: 1.6;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #303133;
}

/* ===== 通用工具类 ===== */

/* 卡片 */
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

/* 价格文字 */
.price-text {
  color: #e74c3c;
  font-weight: bold;
}

/* 两行省略 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
</style>
