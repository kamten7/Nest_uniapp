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
          <text v-if="item.status === 1 || item.status === 2" class="cancel-btn" @tap="cancelAppointment(item)">取消预约</text>
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
      hasMore: true
    }
  },
  onShow() {
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
