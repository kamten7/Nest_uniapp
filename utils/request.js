import { baseUrl } from './env'
import { useUserStore } from '@/store/user'
import { closeChat } from '@/utils/chatClient'

/**
 * 统一的请求封装 —— 对接 Nest 后端租客端 API。
 *
 * - Header 带 `authentication`（Nest 租客端 JWT 头，和后端 JwtConstant.USER_TOKEN_NAME 一致）
 * - 后端统一返回 { code: 1, msg, data }，code===1 为成功
 * - 401（token 失效）自动清除登录态并跳登录
 */
export function request({ url, data = {}, method = 'GET' }) {
  return new Promise((resolve, reject) => {
    // 注意：useUserStore() 必须在函数内调用（Pinia 需要活跃的 app 实例）
    const store = useUserStore()

    uni.request({
      url: baseUrl + url,
      data,
      method,
      header: {
        'Content-Type': 'application/json',
        'authentication': store.token
      },
      success: (res) => {
        const body = res.data
        if (body && body.code === 1) {
          resolve(body)
        } else if (res.statusCode === 401) {
          // token 失效 → 清登录态
          store.logout()
          closeChat()   // 关闭聊天长连接，避免失效登录态继续收消息
          uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
          reject(body || { msg: '登录已过期' })
        } else {
          reject(body || { msg: '请求失败' })
        }
      },
      fail: (err) => {
        reject({ msg: err.errMsg || '网络请求失败' })
      }
    })
  })
}

/** 便捷方法 */
export const get = (url, data = {}) => request({ url, data, method: 'GET' })
export const post = (url, data = {}) => request({ url, data, method: 'POST' })
export const put = (url, data = {}) => request({ url, data, method: 'PUT' })
export const del = (url, data = {}) => request({ url, data, method: 'DELETE' })

/**
 * 文件上传封装（multipart/form-data）。
 *
 * - 用 uni.uploadFile（文件走 filePath，不能像 uni.request 那样放 data 里）
 * - header 带 authentication，但**不要**手动设 Content-Type —— 交给运行时生成 boundary
 * - 响应体是字符串，需要自己 JSON.parse
 */
export function uploadFile(url, filePath, name = 'file') {
  return new Promise((resolve, reject) => {
    const store = useUserStore()

    uni.uploadFile({
      url: baseUrl + url,
      filePath,
      name,
      header: {
        'authentication': store.token
      },
      success: (res) => {
        let body
        try {
          body = JSON.parse(res.data)
        } catch (e) {
          reject({ msg: '上传响应解析失败' })
          return
        }
        if (body && body.code === 1) {
          resolve(body)
        } else if (res.statusCode === 401) {
          store.logout()
          closeChat()
          uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
          reject(body || { msg: '登录已过期' })
        } else {
          reject(body || { msg: '上传失败' })
        }
      },
      fail: (err) => {
        reject({ msg: err.errMsg || '上传失败' })
      }
    })
  })
}
