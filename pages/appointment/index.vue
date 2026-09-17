<template>
  <view class="appointment-page">
    <view v-if="list.length" class="list">
      <view v-for="item in list" :key="item.id" class="appt-card">
        <view class="appt-header">
          <text class="appt-house">{{ item.houseTitle }}</text>
          <text class="status-tag" :class="'status-' + item.status">{{ item.statusText }}</text>
        </view>
        <view class="appt-row">
          <text class="appt-label">看房时间</text>
          <text class="appt-value">{{ formatTime(item.appointmentTime) }}</text>
        </view>
        <view class="appt-row" v-if="item.remark">
          <text class="appt-label">备注</text>
          <text class="appt-value">{{ item.remark }}</text>
        </view>
        <view class="appt-row" v-if="item.cancelReason">
          <text class="appt-label">取消原因</text>
          <text class="appt-value cancel">{{ item.cancelReason }}</text>
        </view>
        <view class="appt-footer">
          <text class="appt-landlord">房东：{{ item.landlordName }}</text>
          <view class="appt-actions">
            <text v-if="item.status === 1 || item.status === 2" class="cancel-btn" @tap="cancelAppointment(item)">取消预约</text>
            <!-- 已看房 → 租客决定租下，生成租房订单（后端要求预约处于「已看房」且已绑定手机号） -->
            <text v-if="item.status === 3" class="rent-btn" @tap="onConfirmRent(item)">确认租房</text>
          </view>
        </view>
      </view>

      <view v-if="hasMore" class="load-more" @tap="loadMore">加载更多</view>
    </view>

    <view v-else class="empty">
      <view class="empty-icon">📅</view>
      <view class="empty-text">还没有预约记录</view>
      <view class="empty-hint">去房源详情页预约看房</view>
    </view>
  </view>
</template>

<script>
import { get, put } from '@/utils/request'
import { confirmRent } from '@/api/rent'

// 状态文本（与后端 AppointmentStatus 一致）
const STATUS_TEXT = {
  1: '待确认', 2: '已确认', 3: '已看房', 4: '已取消', 5: '已成交'
}

export default {
  data() {
    return {
      list: [],
      page: 1,
      pageSize: 10,
      total: 0,
      hasMore: true,
      submitting: false
    }
  },
  onShow() {
    // 防御：若上一次请求在页面失焦/被销毁途中没走完 finally，
    // 防连点标记会一直停在 true，之后每次点「确认租房」都会被静默拦掉（表现为按钮无响应）。
    this.submitting = false
    this.load(true)
  },
  onReachBottom() {
    if (this.hasMore) this.load(false)
  },
  methods: {
    async load(reset) {
      if (reset) {
        this.page = 1
        this.hasMore = true
      }
      try {
        const res = await get('/user/appointment/my', { page: this.page, pageSize: this.pageSize })
        const data = res.data || { records: [], total: 0 }
        // 后端返回 statusText，这里补兜底
        const records = (data.records || []).map(r => ({
          ...r,
          statusText: r.statusText || STATUS_TEXT[r.status] || '未知'
        }))
        this.list = reset ? records : this.list.concat(records)
        this.total = data.total || 0
        this.hasMore = this.list.length < this.total
        if (!reset) this.page++
      } catch (e) {
        uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
      }
    },
    formatTime(t) {
      if (!t) return '—'
      return t.replace('T', ' ').slice(0, 16)
    },
    cancelAppointment(item) {
      uni.showModal({
        title: '取消预约',
        editable: true,
        placeholderText: '取消原因（可选）',
        success: async (res) => {
          if (res.confirm) {
            try {
              await put(`/user/appointment/${item.id}/cancel`, { reason: res.content || '' })
              uni.showToast({ title: '已取消预约', icon: 'success' })
              this.load(true)
            } catch (e) {
              uni.showToast({ title: e.msg || '取消失败', icon: 'none' })
            }
          }
        }
      })
    },
    /**
     * 已看房 → 确认租房：调用 /user/rent/confirm 生成租房订单，成功后进订单详情缴押金。
     * 后端前置条件：预约状态必须为「已看房」、租客必须已绑定手机号
     * （未绑手机号时会返回「请先绑定手机号后再租房（我的 → 个人信息）」，这里原样提示）。
     */
    onConfirmRent(item) {
      uni.showModal({
        title: '确认租房',
        content: `确认租下「${item.houseTitle}」？将生成租房订单，随后需缴纳押金。`,
        success: async (res) => {
          if (!res.confirm) return
          // 不能静默 return：静默会被当成「按钮坏了」，一定要给用户一句反馈
          if (this.submitting) {
            uni.showToast({ title: '正在处理，请稍候…', icon: 'none' })
            return
          }
          this.submitting = true
          uni.showLoading({ title: '生成订单中...' })
          try {
            const r = await confirmRent(item.id)
            const orderId = r.data && r.data.id
            uni.hideLoading()
            setTimeout(() => {
              uni.showToast({ title: '已生成租房订单', icon: 'success', duration: 800 })
              setTimeout(() => {
                const url = orderId
                  ? `/pages/rentDetail/index?orderId=${orderId}`
                  : '/pages/rent/index'
                // 页面栈满（小程序上限 10 层）时 navigateTo 会失败且毫无提示，
                // 这里降级成 redirectTo，保证一定有跳转。
                uni.navigateTo({ url, fail: () => uni.redirectTo({ url }) })
              }, 800)
            }, 100)
          } catch (e) {
            uni.hideLoading()
            // showLoading 与 showToast 共用同一浮层，紧接着调用有概率被吞掉 ⇒ 用户看不到任何提示。
            // 延迟一帧再弹，失败原因一定能看到。
            setTimeout(() => uni.showToast({ title: e.msg || '确认租房失败', icon: 'none' }), 100)
          } finally {
            this.submitting = false
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.appointment-page {
  min-height: 100vh;
}

.list {
  padding: 20rpx;
}

.appt-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.appt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.appt-house {
  font-size: 28rpx;
  font-weight: bold;
  flex: 1;
}

.status-tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.status-1 { background: #fdf6ec; color: #e6a23c; }
.status-2 { background: #ecf3ff; color: #1a56db; }
.status-3 { background: #f0f9eb; color: #67c23a; }
.status-4 { background: #f4f4f5; color: #909399; }
.status-5 { background: #f0f9eb; color: #67c23a; }

.appt-row {
  display: flex;
  margin-top: 16rpx;
  font-size: 26rpx;
}

.appt-label {
  color: #909399;
  width: 140rpx;
  flex-shrink: 0;
}

.appt-value {
  color: #303133;
}

.appt-value.cancel {
  color: #e74c3c;
}

.appt-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f2f5;
}

.appt-landlord {
  font-size: 24rpx;
  color: #909399;
}

.cancel-btn {
  font-size: 26rpx;
  color: #e74c3c;
  border: 1rpx solid #e74c3c;
  border-radius: 30rpx;
  padding: 6rpx 24rpx;
}

.appt-actions {
  display: flex;
  align-items: center;
}

/* 不用 gap：小程序部分基础库不支持 flex gap */
.rent-btn {
  font-size: 26rpx;
  color: #fff;
  background: #1a56db;
  border-radius: 30rpx;
  padding: 8rpx 28rpx;
  margin-left: 16rpx;
}

.load-more {
  text-align: center;
  color: #909399;
  padding: 20rpx;
  font-size: 26rpx;
}

.empty {
  text-align: center;
  padding: 160rpx 40rpx;
}

.empty-icon {
  font-size: 100rpx;
}

.empty-text {
  font-size: 30rpx;
  color: #909399;
  margin-top: 20rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #c0c4cc;
  margin-top: 12rpx;
}
</style>
