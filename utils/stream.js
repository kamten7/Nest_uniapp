/**
 * SSE 流式请求工具 —— 微信小程序原生实现 AI 逐字输出。
 *
 * 原理：微信小程序 wx.request 支持 enableChunked 分块接收，
 * 通过 onChunkReceived 逐块读取，配合持久化 TextDecoder 处理跨 chunk 的中文字符。
 * 需要微信基础库 >= 2.20.1。
 *
 * 用法（阶段 6 AI 找房时接 /user/ai/chat/stream）：
 *   import { streamRequest } from '@/utils/stream'
 *   streamRequest({
 *     url: '/user/ai/chat/stream',
 *     data: { message: '帮我找西湖区便宜的两居室' },
 *     onMessage: (text) => appendToBubble(text),  // 每收到一段文字
 *     onDone: () => finishBubble(),               // 流结束
 *     onError: (msg) => showError(msg)
 *   })
 */
import { baseUrl } from './env'
import { useUserStore } from '@/store/user'

export function streamRequest({ url, data = {}, onMessage, onDone, onError }) {
  const store = useUserStore()
  const token = store.token

  // 流结束标记，防止结束后继续处理 chunk
  let finished = false

  const requestTask = wx.request({
    url: baseUrl + url,
    data: data,
    method: 'POST',
    enableChunked: true,
    header: {
      'Content-Type': 'application/json',
      'authentication': token || ''
    },
    success: (res) => {
      // 流正常结束但没收到 [DONE]（可能是服务器提前关闭连接）
      if (!finished && res.statusCode === 200) {
        finished = true
        onDone && onDone()
      }
    },
    fail: (err) => {
      if (!finished) {
        finished = true
        onError && onError(err.errMsg || '网络请求失败')
      }
    }
  })

  // 监听分块数据（微信基础库 >= 2.20.1）
  if (requestTask && requestTask.onChunkReceived) {
    // 持久化 TextDecoder，stream:true 处理跨 chunk 的多字节 UTF-8 字符
    let decoder = null
    try {
      decoder = new TextDecoder('utf-8', { stream: true })
    } catch (e) {
      decoder = new TextDecoder('utf-8') // 旧版本降级
    }

    // SSE 行缓冲区
    let buffer = ''

    requestTask.onChunkReceived((res) => {
      if (finished) return

      try {
        // res.data 是 ArrayBuffer，用持久化解码器处理多字节字符
        const text = decoder.decode(new Uint8Array(res.data), { stream: true })
        buffer += text

        // SSE 格式：每行以 "data: " 开头，以 "\n\n" 结尾
        // 按 "\n\n" 分割完整的消息
        const parts = buffer.split('\n\n')
        // 最后一个可能是不完整的，保留到下一次
        buffer = parts.pop() || ''

        for (const part of parts) {
          if (finished) return
          processSSEPart(part)
        }
      } catch (e) {
        console.error('SSE chunk 解析错误:', e)
      }
    })
  } else {
    // 降级：不支持 enableChunked
    if (!finished) {
      finished = true
      onError && onError('当前微信版本不支持流式对话，请升级微信')
    }
  }

  /**
   * 处理一条完整的 SSE 消息（可能包含多行 data:）
   */
  function processSSEPart(part) {
    const lines = part.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue

      const content = trimmed.slice(5).trim() // 去掉 "data:" 前缀

      if (content === '[DONE]') {
        finished = true
        // 冲刷 TextDecoder 中剩余的字节
        try { decoder.decode() } catch (e) { /* ignore */ }
        onDone && onDone()
        return
      }

      if (content.startsWith('[ERROR]')) {
        finished = true
        const errorMsg = content.slice(7).trim() || '服务暂时不可用'
        try { decoder.decode() } catch (e) { /* ignore */ }
        onError && onError(errorMsg)
        return
      }

      // 正常内容块：处理转义字符
      const decoded = content
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')
      onMessage && onMessage(decoded)
    }
  }

  return requestTask
}
