/**
 * 聊天 WebSocket 单例客户端（租客端）。
 *
 * 设计：全小程序只维护一条长连接（App 启动/登录后建立），各页面通过
 * onChatEvent 订阅消息，避免聊天列表/详情页各开一条连接导致重复收消息。
 *
 * - 断线重连由 utils/ws.js 内部负责（3s/6s/9s…最多 5 次）；
 * - 彻底断开（重连超限或被 closeChat 关闭）后 socket 置空，登录态下可再次 ensureChatConnected。
 */
import { connectChat } from './ws'
import { useUserStore } from '@/store/user'

let socket = null
let listeners = []
let activeConversationId = null
let appShowListeners = []

/** 订阅全局 WS 事件，返回取消订阅函数 */
export function onChatEvent(fn) {
  listeners.push(fn)
  return function off() {
    const i = listeners.indexOf(fn)
    if (i > -1) listeners.splice(i, 1)
  }
}

/** 登录状态下确保已建立全局连接（幂等） */
export function ensureChatConnected() {
  const store = useUserStore()
  if (!store.isLogin) return
  const userId = store.userInfo && store.userInfo.id
  if (!userId || socket) return

  socket = connectChat({
    userType: 'tenant',
    userId,
    token: store.token,
    onOpen: () => {
      // 连接建立/断线重连成功后广播，让当前页面重拉数据补齐断线期间的消息
      broadcast({ type: 'ws_open' })
    },
    onMessage: (data) => {
      // 快照遍历，订阅方在回调里卸载自己也不影响本轮分发
      broadcast(data)
    },
    onTerminated: () => {
      // 手动关闭或重连超限 → 允许下次 ensure 重新建立
      socket = null
    }
  })
}

/** 把事件分发给所有订阅方 */
function broadcast(data) {
  const snapshot = listeners.slice()
  snapshot.forEach((fn) => {
    try {
      fn(data)
    } catch (e) {
      console.log('chat event handler error', e)
    }
  })
}

/** 退出登录时调用：关闭并清空状态 */
export function closeChat() {
  activeConversationId = null
  if (socket) {
    const s = socket
    socket = null
    s.close()
  }
}

/** 通过全局连接发送消息；未连接返回 false */
export function sendChat(data) {
  if (!socket) return false
  socket.send(data)
  return true
}

export function isChatConnected() {
  return !!socket
}

/** 标记当前正在看的会话（用于决定新消息是否弹窗/计入未读） */
export function setActiveConversation(id) {
  activeConversationId = id
}

export function getActiveConversation() {
  return activeConversationId
}

/**
 * 小程序从后台切回前台（App.onShow）时的订阅。
 * 微信在后台会断开 WebSocket，切回前台后需要重新拉历史补上断线期间的消息。
 */
export function onAppShow(fn) {
  appShowListeners.push(fn)
  return function off() {
    const i = appShowListeners.indexOf(fn)
    if (i > -1) appShowListeners.splice(i, 1)
  }
}

/** App.onShow 时广播给订阅方（由 App.vue 调用） */
export function notifyAppShow() {
  const snapshot = appShowListeners.slice()
  snapshot.forEach((fn) => {
    try {
      fn()
    } catch (e) {
      console.log('appShow handler error', e)
    }
  })
}
