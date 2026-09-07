<template>
  <view class="rent-page">
    <!-- ===== 状态筛选 ===== -->
    <view class="filter-bar">
      <view v-for="f in filters" :key="f.value"
            class="filter-item" :class="{ active: status === f.value }"
            @tap="switchFilter(f.value)">{{ f.label }}</view>
    </view>

    <!-- ===== 列表 ===== -->
    <view v-if="list.length" class="list">
      <view v-for="item in list" :key="item.id" class="rent-card" @tap="goDetail(item)">
        <view class="card-header">
          <text class="house-title">{{ item.houseTitle || '房源' }}</text>
          <text class="status-tag" :class="'status-' + item.status">{{ statusText(item.status) }}</text>
        </view>
        <view class="card-row">
          <text class="label">月租</text>
          <text class="value price">{{ money(item.monthlyRent) }}元</text>
        </view>
        <view class="card-row">
          <text class="label">押金</text>
          <text class="value">{{ money(item.deposit) }}元</text>
        </view>
        <view class="card-row">
          <text class="label">下期待缴</text>
          <text class="value">{{ item.nextDuePeriod || '—' }}</text>
        </view>
        <view class="card-row">
          <text class="label">已缴</text>
          <text class="value">{{ item.paidMonths }}个月</text>
        </view>
        <view class="card-footer">
          <text class="order-no">订单 {{ item.orderNo }}</text>
          <view v-if="item.status === 1" class="pay-btn" @tap.stop="payDeposit(item)">去缴押金</view>
        </view>
      </view>

      <view v-if="hasMore" class="load-more" @tap="loadList(false)">加载更多</view>
    </view>

    <view v-else class="empty">
      <view class="empty-icon">🏠</view>
      <view class="empty-text">暂无租房订单</view>
      <view class="empty-hint">看房结束后可确认租房</view>
    </view>
  </view>
</template>

<script>
import { getMyRentOrders, payDeposit } from '@/api/rent'

const STATUS_TEXT = { 1: '待缴押金', 2: '租房中', 3: '退租申请中', 4: '已退租', 5: '已取消' }

export default {
  data() {
    return {
      filters: [
        { label: '全部', value: null },
        { label: '待缴押金', value: 1 },
        { label: '租房中', value: 2 },
        { label: '退租申请中', value: 3 },
        { label: '已退租', value: 4 }
      ],
      status: null,
      list: [],
      page: 1,
      pageSize: 10,
      total: 0,
      hasMore: true
    }
  },
  onShow() {
    this.loadList(true)
  },
  onReachBottom() {
    if (this.hasMore) this.loadList(false)
  },
  methods: {
    switchFilter(status) {
      this.status = status
      this.loadList(true)
    },
    async loadList(reset) {
      if (reset) { this.page = 1; this.hasMore = true }
      try {
        const params = { page: this.page, pageSize: this.pageSize }
        if (this.status !== null) params.status = this.status
        const res = await getMyRentOrders(params)
        const data = res.data || { records: [], total: 0 }
        const records = data.records || []
        this.list = reset ? records : this.list.concat(records)
        this.total = data.total || 0
        this.hasMore = this.list.length < this.total
        if (!reset) this.page++
      } catch (e) {
        uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
      }
    },
    goDetail(item) {
      uni.navigateTo({ url: `/pages/rentDetail/index?orderId=${item.id}` })
    },
    payDeposit(item) {
      uni.showModal({
        title: '缴纳押金',
        content: `确认缴纳押金 ${this.money(item.deposit)} 元？将使用钱包余额支付`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await payDeposit(item.id)
            uni.showToast({ title: '押金已缴纳', icon: 'success' })
            this.loadList(true)
          } catch (e) {
            uni.showToast({ title: e.msg || '缴纳失败', icon: 'none' })
          }
        }
      })
    },
    statusText(s) {
      return STATUS_TEXT[s] || '未知'
    },
    money(n) {
      const v = Number(n || 0)
      return v % 1 === 0 ? String(v) : v.toFixed(2)
    }
  }
}
</script>

<style scoped>
.rent-page {
  min-height: 100vh;
}

.filter-bar {
  display: flex;
  background: #fff;
  padding: 16rpx 12rpx;
  position: sticky;
  top: 0;
  z-index: 1;
}

.filter-item {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  color: #606266;
  padding: 10rpx 0;
  border-radius: 8rpx;
}

.filter-item.active {
  color: #1a56db;
  font-weight: bold;
}

.list {
  padding: 20rpx;
}

.rent-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.house-title {
  font-size: 30rpx;
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
.status-3 { background: #f4f4f5; color: #909399; }
.status-4 { background: #f0f9eb; color: #67c23a; }
.status-5 { background: #f4f4f5; color: #909399; }

.card-row {
  display: flex;
  font-size: 26rpx;
  margin-top: 8rpx;
}

.label {
  color: #909399;
  width: 140rpx;
  flex-shrink: 0;
}

.value {
  color: #303133;
}

.value.price {
  color: #e6a23c;
  font-weight: bold;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f2f5;
}

.order-no {
  font-size: 22rpx;
  color: #c0c4cc;
}

.pay-btn {
  background: #1a56db;
  color: #fff;
  border-radius: 30rpx;
  padding: 10rpx 28rpx;
  font-size: 26rpx;
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
