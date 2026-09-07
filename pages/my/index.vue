<template>
  <view class="my-page">
    <!-- 全局消息弹窗 -->
    <message-toast />
    <!-- 已登录：用户信息卡 + 菜单 -->
    <template v-if="userStore.isLogin">
      <view class="user-card">
        <view class="avatar">{{ avatarText }}</view>
        <view class="user-info">
          <view class="nickname">{{ nicknameText }}</view>
          <view class="phone" v-if="userStore.userInfo.phone">{{ userStore.userInfo.phone }}</view>
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

        <input v-model="phone" class="login-input" placeholder="手机号" type="number" maxlength="11" />
        <input v-model="password" class="login-input" placeholder="密码" password />
        <view class="login-btn" @tap="doLogin">登 录</view>
        <view class="register-btn" @tap="doRegister">没有账号？注册</view>
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
  data() {
    return {
      phone: '',
      password: ''
    }
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
    async doLogin() {
      if (!this.phone || !this.password) {
        uni.showToast({ title: '请输入手机号和密码', icon: 'none' })
        return
      }
      uni.showLoading({ title: '登录中...' })
      try {
        const res = await post('/user/tenant/login', { phone: this.phone, password: this.password })
        this.userStore.setLogin(res.data.token, res.data)
        // 登录成功 → 建立全局聊天长连接 + 刷新消息角标
        ensureChatConnected()
        syncMessageBadge()
        uni.hideLoading()
        uni.showToast({ title: '登录成功', icon: 'success' })
        this.phone = ''
        this.password = ''
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.msg || '登录失败', icon: 'none' })
      }
    },
    async doRegister() {
      if (!this.phone || !this.password) {
        uni.showToast({ title: '请输入手机号和密码', icon: 'none' })
        return
      }
      uni.showLoading({ title: '注册中...' })
      try {
        const res = await post('/user/tenant/register', { phone: this.phone, password: this.password })
        this.userStore.setLogin(res.data.token, res.data)
        ensureChatConnected()
        syncMessageBadge()
        uni.hideLoading()
        uni.showToast({ title: '注册成功', icon: 'success' })
        this.phone = ''
        this.password = ''
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.msg || '注册失败', icon: 'none' })
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

.login-input {
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 22rpx 24rpx;
  margin-bottom: 24rpx;
  font-size: 28rpx;
}

.login-btn {
  background: #1a56db;
  color: #fff;
  text-align: center;
  border-radius: 30rpx;
  padding: 22rpx;
  font-size: 30rpx;
  margin-top: 10rpx;
}

.register-btn {
  text-align: center;
  color: #1a56db;
  font-size: 26rpx;
  margin-top: 24rpx;
}
</style>
