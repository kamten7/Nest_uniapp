<template>
  <view class="my-page">
    <!-- 全局消息弹窗 -->
    <message-toast />
    <!-- 已登录：用户信息卡 + 菜单 -->
    <template v-if="userStore.isLogin">
      <view class="user-card" @tap="go('/pages/profile/index')">
        <image v-if="userStore.userInfo.avatar" class="avatar avatar-img" :src="userStore.userInfo.avatar" mode="aspectFill" />
        <view v-else class="avatar">{{ avatarText }}</view>
        <view class="user-info">
          <view class="nickname">{{ nicknameText }}</view>
          <view class="phone" v-if="userStore.userInfo.phone">{{ userStore.userInfo.phone }}</view>
          <view class="phone hint" v-else>未绑定手机号，绑定后才能租房 ›</view>
        </view>
      </view>

      <view class="menu-group">
        <view class="menu-item" @tap="go('/pages/favorite/index')">
          <text class="menu-icon">❤️</text>
          <text class="menu-text">我的收藏</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="go('/pages/appointment/index')">
          <text class="menu-icon">📅</text>
          <text class="menu-text">我的预约</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="go('/pages/chat/index')">
          <text class="menu-icon">💬</text>
          <text class="menu-text">消息</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="go('/pages/rent/index')">
          <text class="menu-icon">📋</text>
          <text class="menu-text">租房订单</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="go('/pages/wallet/index')">
          <text class="menu-icon">💰</text>
          <text class="menu-text">我的钱包</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <view class="logout-btn" @tap="logout">退出登录</view>
    </template>

    <!-- 未登录：登录/注册表单 -->
    <template v-else>
      <view class="login-card">
        <view class="login-logo">🏠</view>
        <view class="login-title">Nest 安居</view>
        <view class="login-subtitle">登录后收藏房源、预约看房</view>

        <view class="wx-login-btn" @tap="doWxLogin">微信一键登录</view>
      </view>
    </template>
  </view>
</template>

<script>
import { post } from '@/utils/request'
import { useUserStore } from '@/store/user'
import { ensureChatConnected, closeChat } from '@/utils/chatClient'
import { syncMessageBadge } from '@/utils/tabBadge'

export default {
  setup() {
    return { userStore: useUserStore() }
  },
  computed: {
    avatarText() {
      const info = this.userStore.userInfo
      return (info.nickname && info.nickname.charAt(0)) || (info.id ? '租' + info.id : '👤')
    },
    nicknameText() {
      const info = this.userStore.userInfo
      return info.nickname || '租客' + (info.id || '')
    }
  },
  methods: {
    /**
     * 微信一键登录：wx.login() 静默拿一次性 code → 后端调 jscode2session 换 openid
     * → 已注册直接登录，未注册自动注册 → 返回 JWT。
     * code 一次性，失败后需重新调 uni.login() 取新 code（这里每次点击都重新取，天然满足）。
     */
    doWxLogin() {
      uni.login({
        provider: 'weixin',
        success: (res) => {
          if (!res.code) {
            uni.showToast({ title: '获取微信登录凭证失败', icon: 'none' })
            return
          }
          this.loginWithCode(res.code)
        },
        fail: () => {
          uni.showToast({ title: '微信登录未完成', icon: 'none' })
        }
      })
    },
    /** 用 code 调后端登录（后端负责换 openid / 自动注册 / 签发 JWT） */
    async loginWithCode(code) {
      uni.showLoading({ title: '登录中...' })
      try {
        const res = await post('/user/tenant/login', { code })
        this.userStore.setLogin(res.data.token, res.data)
        ensureChatConnected()
        syncMessageBadge()
        uni.hideLoading()
        uni.showToast({ title: '登录成功', icon: 'success' })
      } catch (e) {
        uni.hideLoading()
        // 后端对 code 失效等场景返回的可读提示（如"登录已过期，请重新登录"）
        uni.showToast({ title: e.msg || '登录失败', icon: 'none' })
      }
    },
    logout() {
      uni.showModal({
        title: '提示',
        content: '确定退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            this.userStore.logout()
            // 退出登录 → 关闭长连接 + 清角标
            closeChat()
            syncMessageBadge()
            uni.showToast({ title: '已退出', icon: 'none' })
          }
        }
      })
    },
    go(url) {
      // 消息是 TabBar 页：微信 navigateTo 不能跳 tabBar 页面，需用 switchTab
      if (url === '/pages/chat/index') {
        uni.switchTab({ url })
        return
      }
      uni.navigateTo({ url })
    }
  }
}
</script>

<style scoped>
.my-page {
  min-height: 100vh;
}

/* ===== 已登录 ===== */
.user-card {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #1a56db, #667eea);
  padding: 60rpx 40rpx;
  color: #fff;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56rpx;
}

.user-info {
  flex: 1;
  margin-left: 24rpx;
}

.nickname {
  font-size: 36rpx;
  font-weight: bold;
}

.phone {
  font-size: 26rpx;
  opacity: 0.8;
  margin-top: 8rpx;
}

/* 未绑定手机号：高亮提示（绑定后才能确认租房） */
.phone.hint {
  opacity: 1;
  color: #ffe9b8;
}

/* 真实头像图片：复用 .avatar 的尺寸与圆形 */
.avatar-img {
  background: rgba(255, 255, 255, 0.3);
}

.menu-group {
  margin: 30rpx 20rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 30rpx 24rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.menu-icon {
  font-size: 32rpx;
  margin-right: 20rpx;
}

.menu-text {
  flex: 1;
  font-size: 28rpx;
  color: #303133;
}

.menu-arrow {
  color: #c0c4cc;
  font-size: 32rpx;
}

.logout-btn {
  margin: 40rpx 20rpx;
  background: #fff;
  color: #e74c3c;
  text-align: center;
  border-radius: 16rpx;
  padding: 26rpx;
  font-size: 28rpx;
}

/* ===== 未登录 ===== */
.login-card {
  margin: 100rpx 40rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.login-logo {
  font-size: 90rpx;
  text-align: center;
}

.login-title {
  font-size: 40rpx;
  font-weight: bold;
  text-align: center;
  margin-top: 12rpx;
}

.login-subtitle {
  font-size: 26rpx;
  color: #909399;
  text-align: center;
  margin: 12rpx 0 40rpx;
}

.wx-login-btn {
  background: #07c160;
  color: #fff;
  text-align: center;
  border-radius: 30rpx;
  padding: 22rpx;
  font-size: 30rpx;
}
</style>
