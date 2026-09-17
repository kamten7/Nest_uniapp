import { defineStore } from 'pinia'

/**
 * 用户状态 —— token 持久化到本地，登录/登出。
 * 后端租客端 Header 名是 authentication（见 utils/request.js）。
 */
export const useUserStore = defineStore('user', {
  state: () => ({
    token: uni.getStorageSync('token') || '',
    userInfo: uni.getStorageSync('userInfo') || {}
  }),
  getters: {
    isLogin: (state) => !!state.token
  },
  actions: {
    /** 登录成功后保存 token 和用户信息 */
    setLogin(token, userInfo) {
      this.token = token
      this.userInfo = userInfo || {}
      uni.setStorageSync('token', token)
      uni.setStorageSync('userInfo', this.userInfo)
    },
    /** 退出登录 */
    logout() {
      this.token = ''
      this.userInfo = {}
      uni.removeStorageSync('token')
      uni.removeStorageSync('userInfo')
    },
    /**
     * 局部更新本地缓存的用户信息（改资料 / 换头像后用）。
     * 用合并而不是整体替换，避免后端只返回部分字段时把其余字段抹掉。
     */
    updateUserInfo(partial) {
      this.userInfo = { ...this.userInfo, ...(partial || {}) }
      uni.setStorageSync('userInfo', this.userInfo)
    }
  }
})
