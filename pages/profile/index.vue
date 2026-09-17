<template>
  <view class="profile-page">
    <view class="card">
      <!-- 头像：点击选择并上传 -->
      <view class="row" hover-class="row-hover" @tap="chooseAvatar">
        <text class="label">头像</text>
        <view class="row-right">
          <image v-if="form.avatar" class="avatar-img" :src="form.avatar" mode="aspectFill" />
          <view v-else class="avatar-placeholder">{{ avatarText }}</view>
          <text class="arrow">›</text>
        </view>
      </view>

      <view class="row">
        <text class="label">昵称</text>
        <input class="input" :value="form.nickname" placeholder="请输入昵称" maxlength="50"
               @input="onNicknameInput" />
      </view>

      <view class="row">
        <text class="label">手机号</text>
        <input class="input" :value="form.phone" type="number" maxlength="11"
               placeholder="绑定后才能租房" @input="onPhoneInput" />
      </view>

      <!-- 性别：用原生 picker（比 showActionSheet 稳，且自带选择器 UI） -->
      <picker class="row" mode="selector" :range="genderLabels" :value="genderIndex" @change="onGenderChange">
        <text class="label">性别</text>
        <view class="row-right">
          <text class="value">{{ genderText }}</text>
          <text class="arrow">›</text>
        </view>
      </picker>
    </view>

    <view class="tip">
      以上信息均可不填。手机号用于房东联系与租房下单，
      <text class="tip-strong">未绑定手机号无法确认租房</text>。
      当前仅校验号码格式，短信验证后续接入。
    </view>

    <view class="save-btn" hover-class="save-btn-hover" @tap="save">保存</view>
  </view>
</template>

<script>
import { getProfile, updateProfile, uploadAvatar } from '@/api/user'
import { useUserStore } from '@/store/user'

const genderOptions = [
  { value: 0, label: '未知' },
  { value: 1, label: '男' },
  { value: 2, label: '女' }
]

/**
 * 租客个人信息页。
 *
 * ⚠️ 本页刻意保持「纯选项式 API」写法（不使用 setup()）：
 * 项目里能正常工作的 pages/my（只有 setup）与 pages/wallet（只有 data）都是单一写法，
 * 而本页最初混用 setup() + data() 时，页面渲染正常但所有 @tap 事件都不触发。
 * 需要 Pinia store 时用 computed 暴露（放 data 里会被 setData 序列化，store 含函数会出问题）。
 */
export default {
  data() {
    return {
      form: { nickname: '', avatar: '', phone: '', gender: null },
      saving: false,
      uploading: false
    }
  },
  computed: {
    userStore() {
      return useUserStore()
    },
    avatarText() {
      const n = this.form.nickname
      return (n && n.charAt(0)) || '👤'
    },
    genderLabels() {
      return genderOptions.map((g) => g.label)
    },
    genderIndex() {
      return this.form.gender === null || this.form.gender === undefined ? 0 : this.form.gender
    },
    genderText() {
      const hit = genderOptions.find((g) => g.value === this.form.gender)
      return hit ? hit.label : '未设置'
    }
  },
  onLoad() {
    this.load()
  },
  methods: {
    /** 拉取最新资料（登录返回的信息不全，手机号/性别以这里为准） */
    async load() {
      try {
        const res = await getProfile()
        const d = res.data || {}
        this.form.nickname = d.nickname || ''
        this.form.avatar = d.avatar || ''
        this.form.phone = d.phone || ''
        this.form.gender = d.gender === undefined ? null : d.gender
        // 同步到全局缓存，返回「我的」页时昵称/手机号/头像立即是新值
        this.userStore.updateUserInfo({
          nickname: this.form.nickname,
          avatar: this.form.avatar,
          phone: this.form.phone,
          gender: this.form.gender
        })
      } catch (e) {
        console.error('[profile] 加载个人信息失败', e)
        uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
      }
    },
    onNicknameInput(e) {
      this.form.nickname = e.detail.value
    },
    onPhoneInput(e) {
      this.form.phone = e.detail.value
    },
    onGenderChange(e) {
      const idx = Number(e.detail.value)
      this.form.gender = genderOptions[idx].value
    },
    /** 选图：优先用微信推荐的 chooseMedia，并补上 fail 回调（否则失败时完全静默） */
    chooseAvatar() {
      const onPicked = (filePath) => {
        if (filePath) this.doUpload(filePath)
      }
      const onFail = (err) => {
        console.error('[profile] 选择图片失败', err)
        uni.showToast({ title: '选择图片失败：' + ((err && err.errMsg) || ''), icon: 'none' })
      }

      if (typeof uni.chooseMedia === 'function') {
        uni.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: (res) => {
            const f = res.tempFiles && res.tempFiles[0]
            if (f) onPicked(f.tempFilePath)
          },
          fail: onFail
        })
        return
      }

      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          onPicked(res.tempFilePaths && res.tempFilePaths[0])
        },
        fail: onFail
      })
    },
    /** 头像上传后后端会直接写回资料，这里同步本地缓存 */
    async doUpload(filePath) {
      if (this.uploading) return
      this.uploading = true
      uni.showLoading({ title: '上传中...' })
      try {
        const res = await uploadAvatar(filePath)
        this.form.avatar = res.data
        this.userStore.updateUserInfo({ avatar: res.data })
        uni.hideLoading()
        uni.showToast({ title: '头像已更新', icon: 'success' })
      } catch (e) {
        uni.hideLoading()
        console.error('[profile] 头像上传失败', e)
        uni.showToast({ title: e.msg || '头像上传失败', icon: 'none' })
      } finally {
        this.uploading = false
      }
    },
    async save() {
      if (this.saving) return

      const nickname = (this.form.nickname || '').trim()
      const phone = (this.form.phone || '').trim()

      // 前端只做格式提示，最终以后端校验为准（后端只校验长度格式，不校验号码真实性）
      if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
        uni.showToast({ title: '手机号格式不正确', icon: 'none' })
        return
      }

      const payload = {}
      if (nickname) payload.nickname = nickname
      if (phone) payload.phone = phone
      if (this.form.gender !== null && this.form.gender !== undefined) payload.gender = this.form.gender

      if (Object.keys(payload).length === 0) {
        uni.showToast({ title: '没有需要保存的内容', icon: 'none' })
        return
      }

      this.saving = true
      uni.showLoading({ title: '保存中...' })
      try {
        await updateProfile(payload)
        this.userStore.updateUserInfo(payload)
        uni.hideLoading()
        uni.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 600)
      } catch (e) {
        uni.hideLoading()
        console.error('[profile] 保存失败', e)
        uni.showToast({ title: e.msg || '保存失败', icon: 'none' })
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: 20rpx;
  box-sizing: border-box;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.row {
  display: flex;
  align-items: center;
  padding: 26rpx 24rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.row:last-child {
  border-bottom: none;
}

.row-hover {
  background: #f5f7fa;
}

.label {
  width: 140rpx;
  font-size: 28rpx;
  color: #303133;
}

.input {
  flex: 1;
  font-size: 28rpx;
  color: #303133;
  text-align: right;
}

.row-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.value {
  font-size: 28rpx;
  color: #606266;
}

.arrow {
  color: #c0c4cc;
  font-size: 32rpx;
  margin-left: 12rpx;
}

.avatar-img {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #f0f2f5;
}

.avatar-placeholder {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #e8eefc;
  color: #1a56db;
  font-size: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tip {
  margin: 24rpx 8rpx;
  font-size: 24rpx;
  color: #909399;
  line-height: 1.7;
}

.tip-strong {
  color: #e6a23c;
}

.save-btn {
  margin: 40rpx 8rpx 0;
  background: #1a56db;
  color: #fff;
  text-align: center;
  border-radius: 44rpx;
  padding: 24rpx;
  font-size: 30rpx;
}

.save-btn-hover {
  opacity: 0.85;
}
</style>
