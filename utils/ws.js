import { wsBaseUrl } from './env'

/**
 * WebSocket 封装 —— 连接聊天服务 + 自动重连 + 心跳。
 *
 * 连接地址：ws://host:8081/ws/chat/{userType}/{userId}?token=xxx
 * —— 长连接由 Netty 独立端口（默认 8081）提供，与 HTTP 的 baseUrl 不同端口，
 *    因此这里用 env.js 的 wsBaseUrl，**不能**再由 baseUrl 派生。
 * token 放 queryString（小程序 WebSocket 无法自定义 Header）。
 *
 * 断线自动重连：最多重试 5 次，每次间隔递增（3s、6s、9s...）。
 * 心跳：每 30 秒发一次，保活连接（服务端 reader-idle 为 60s，30s 安全）。
 */
export function connectChat({ userType, userId, token, onMessage, onClose, onOpen, onTerminated }) {
  const url = `${wsBaseUrl}/ws/chat/${userType}/${userId}?token=${token}`

  const state = {
    socket: null,
    heartbeatTimer: null,
    reconnectTimer: null,
    reconnectAttempts: 0,
    maxReconnect: 5,
    closed: false,   // 手动关闭标记
    connectParams: { userType, userId, token, onMessage, onClose, onOpen }
  }

  /** 建立连接 */
  function connect() {
    const s = uni.connectSocket({ url, complete: () => {} })
    state.socket = s

    s.onOpen(() => {
      console.log('WebSocket 已连接:', url)
      state.reconnectAttempts = 0
      onOpen && onOpen()
      startHeartbeat(s)
    })

    s.onMessage((res) => {
      try {
        const data = JSON.parse(res.data)
        onMessage && onMessage(data)
      } catch (e) {
        console.log('消息解析失败', e)
      }
    })

    s.onClose(() => {
      console.log('WebSocket 已断开')
      stopHeartbeat()
      if (!state.closed) {
        scheduleReconnect()
      }
      onClose && onClose()
    })

    s.onError((err) => {
      console.log('WebSocket 错误', err)
    })
  }

  /** 断线重连（递增间隔） */
  function scheduleReconnect() {
    if (state.reconnectAttempts >= state.maxReconnect) {
      console.log('WebSocket 重连次数超限，停止')
      if (onTerminated) onTerminated() // 彻底断开，通知外部（便于重新建立）
      return
    }
    const delay = (state.reconnectAttempts + 1) * 3000
    state.reconnectAttempts++
    console.log(`WebSocket ${delay / 1000}s 后重连 (第${state.reconnectAttempts}次)`)
    state.reconnectTimer = setTimeout(() => {
      if (!state.closed) connect()
    }, delay)
  }

  /** 心跳（每个 socket 自己的定时器） */
  function startHeartbeat(socket) {
    stopHeartbeat()
    state.heartbeatTimer = setInterval(() => {
      socket.send({ data: JSON.stringify({ type: 'heartbeat' }) })
    }, 30000)
  }

  function stopHeartbeat() {
    if (state.heartbeatTimer) {
      clearInterval(state.heartbeatTimer)
      state.heartbeatTimer = null
    }
  }

  // 启动
  connect()

  return {
    /** 手动关闭（不再重连） */
    close() {
      state.closed = true
      if (state.reconnectTimer) clearTimeout(state.reconnectTimer)
      stopHeartbeat()
      if (state.socket) state.socket.close()
      if (onTerminated) onTerminated()
    },
    /** 发送消息 */
    send(data) {
      if (state.socket) {
        state.socket.send({ data: JSON.stringify(data) })
      }
    },
    getSocket() {
      return state.socket
    }
  }
}

/** 发送消息（兼容旧调用） */
export function sendChat(socket, data) {
  if (socket) {
    if (typeof socket.send === 'function') {
      socket.send(data)
    }
  }
}
