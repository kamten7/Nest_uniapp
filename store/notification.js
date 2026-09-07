import { defineStore } from 'pinia'

/**
 * 通知 store —— 管理小程序顶部弹窗的消息列表。
 *
 * 全局 WebSocket（App.vue）收到 chat/appointment 消息后 push 进来，
 * message-toast 组件订阅渲染顶部弹窗，3 秒自动消失。
 */
export const useNotificationStore = defineStore('notification', {
  state: () => ({
    // 最近的通知（保留最新 3 条）
    notifications: []
  }),
  actions: {
    /**
     * 推送一条通知。
     * @param type           类型：chat / appointment
     * @param title          通知标题
     * @param content        通知内容
     * @param conversationId 会话 ID（点击弹窗跳聊天用，chat 类型才有）
     */
    push(type, title, content, conversationId = null) {
      const item = {
        id: Date.now(),
        type,
        title,
        content,
        conversationId,
        createdAt: Date.now()
      }
      // 保留最近 3 条，避免堆叠
      this.notifications.push(item)
      if (this.notifications.length > 3) {
        this.notifications.shift()
      }
      // 3 秒后自动消失
      setTimeout(() => {
        this.remove(item.id)
      }, 3000)
    },
    /** 移除一条通知 */
    remove(id) {
      const idx = this.notifications.findIndex((n) => n.id === id)
      if (idx >= 0) this.notifications.splice(idx, 1)
    },
    /** 清空全部通知 */
    clear() {
      this.notifications = []
    }
  }
})
