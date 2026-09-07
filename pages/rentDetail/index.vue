<template>
  <view class="detail-page" v-if="order">
    <!-- ===== 基本信息 ===== -->
    <view class="card">
      <view class="head-row">
        <text class="house">{{ order.houseTitle || '房源' }}</text>
        <text class="status-tag" :class="'status-' + order.status">{{ statusText(order.status) }}</text>
      </view>
      <view class="info-row"><text class="label">订单号</text><text class="value">{{ order.orderNo }}</text></view>
      <view class="info-row"><text class="label">月租</text><text class="value price">{{ money(order.monthlyRent) }}元</text></view>
      <view class="info-row"><text class="label">押金</text><text class="value">{{ money(order.deposit) }}元</text></view>
      <view class="info-row"><text class="label">起租日</text><text class="value">{{ order.startDate || '—' }}</text></view>
      <view class="info-row"><text class="label">下期待缴</text><text class="value">{{ order.nextDuePeriod || '—' }}</text></view>
      <view class="info-row"><text class="label">已缴月数</text><text class="value">{{ order.paidMonths }}个月</text></view>
    </view>

    <!-- ===== 退租信息 ===== -->
    <view v-if="order.termination" class="card">
      <view class="card-title">退租信息</view>
      <view class="info-row"><text class="label">生效租期至</text><text class="value">{{ order.termination.effectiveEndPeriod }}</text></view>
      <view class="info-row"><text class="label">押金状态</text>
        <text class="value" :class="order.termination.refundStatus === 1 ? 'green' : 'orange'">
          {{ order.termination.refundStatus === 1 ? '已退回' : '待退回' }}
        </text>
      </view>
      <view v-if="order.termination.refundTime" class="info-row"><text class="label">退回时间</text><text class="value">{{ formatTime(order.termination.refundTime) }}</text></view>
    </view>

    <!-- ===== 缴费记录 ===== -->
    <view class="card" v-if="order.payments && order.payments.length">
      <view class="card-title">缴费记录</view>
      <view v-for="p in order.payments" :key="p.id" class="pay-row">
        <view class="pay-left">
          <text class="pay-type">{{ payTypeText(p) }}</text>
          <text class="pay-time">{{ formatTime(p.createTime) }}</text>
        </view>
        <text class="pay-amount">{{ money(p.amount) }}元</text>
      </view>
    </view>

    <!-- ===== 操作区 ===== -->
    <view class="action-bar">
      <!-- 待缴押金 -->
      <template v-if="order.status === 1">
        <view class="action-btn primary" @tap="payDeposit">缴纳押金 {{ money(order.deposit) }}元</view>
      </template>

      <!-- 租房中 -->
      <template v-if="order.status === 2">
        <view class="action-btn primary" @tap="payRent">缴纳当月租金 {{ money(order.monthlyRent) }}元</view>
        <view class="action-btn" @tap="payAhead">提前支付（≤5月）</view>
        <view class="action-btn danger" @tap="terminate">申请退租</view>
      </template>

      <!-- 退租申请中 -->
      <view v-if="order.status === 3" class="hint">退租申请中，租期结束后将自动退还押金</view>
    </view>
  </view>
</template>

<script>
import { getRentDetail, payDeposit, payRent, payAhead, terminateRent } from '@/api/rent'

const STATUS_TEXT = { 1: '待缴押金', 2: '租房中', 3: '退租申请中', 4: '已退租', 5: '已取消' }

export default {
  data() {
    return {
      orderId: null,
      order: null
    }
  },
  onLoad(query) {
    this.orderId = query.orderId
  },
  onShow() {
    this.load()
  },
  methods: {
    async load() {
      try {
        const res = await getRentDetail(this.orderId)
        this.order = res.data
      } catch (e) {
        uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
      }
    },
    payDeposit() {
      uni.showModal({
        title: '缴纳押金',
        content: `确认使用钱包余额缴纳押金 ${this.money(this.order.deposit)} 元？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await payDeposit(this.order.id)
            uni.showToast({ title: '押金已缴纳', icon: 'success' })
            this.load()
          } catch (e) {
            uni.showToast({ title: e.msg || '缴纳失败', icon: 'none' })
          }
        }
      })
    },
    payRent() {
      uni.showModal({
        title: '缴纳当月租金',
        content: `确认缴纳下期（${this.order.nextDuePeriod}）租金 ${this.money(this.order.monthlyRent)} 元？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await payRent(this.order.id)
            uni.showToast({ title: '缴纳成功', icon: 'success' })
            this.load()
          } catch (e) {
            uni.showToast({ title: e.msg || '缴纳失败', icon: 'none' })
          }
        }
      })
    },
    payAhead() {
      uni.showModal({
        title: '提前支付房租',
        editable: true,
        placeholderText: '输入月数（1-5）',
        success: async (res) => {
          if (!res.confirm) return
          const months = parseInt(res.content, 10)
          if (!months || months < 1 || months > 5) {
            uni.showToast({ title: '请输入 1-5 的月数', icon: 'none' })
            return
          }
          const total = Number(this.order.monthlyRent) * months
          uni.showModal({
            title: '确认提前支付',
            content: `将支付 ${months} 个月，共 ${this.money(total)} 元`,
            success: async (r) => {
              if (!r.confirm) return
              try {
                await payAhead(this.order.id, months)
                uni.showToast({ title: '支付成功', icon: 'success' })
                this.load()
              } catch (e) {
                uni.showToast({ title: e.msg || '支付失败', icon: 'none' })
              }
            }
          })
        }
      })
    },
    terminate() {
      uni.showModal({
        title: '申请退租',
        editable: true,
        placeholderText: '退租原因（可选）',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await terminateRent(this.order.id, res.content || '')
            uni.showToast({ title: '退租申请已提交', icon: 'success' })
            this.load()
          } catch (e) {
            uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
          }
        }
      })
    },
    payTypeText(p) {
      return p.payType === 'DEPOSIT' ? '押金' : `租金 ${p.period || ''}`
    },
    statusText(s) {
      return STATUS_TEXT[s] || '未知'
    },
    formatTime(t) {
      if (!t) return ''
      return t.replace('T', ' ').slice(0, 16)
    },
    money(n) {
      const v = Number(n || 0)
      return v % 1 === 0 ? String(v) : v.toFixed(2)
    }
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  padding: 20rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.house {
  font-size: 32rpx;
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

.info-row {
  display: flex;
  font-size: 26rpx;
  margin-top: 12rpx;
}

.label {
  color: #909399;
  width: 160rpx;
  flex-shrink: 0;
}

.value {
  color: #303133;
}

.value.price {
  color: #e6a23c;
  font-weight: bold;
}

.value.green { color: #67c23a; }
.value.orange { color: #e6a23c; }

.card-title {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
}

.pay-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f0f2f5;
}

.pay-left {
  display: flex;
  flex-direction: column;
}

.pay-type {
  font-size: 26rpx;
  color: #303133;
}

.pay-time {
  font-size: 22rpx;
  color: #909399;
  margin-top: 4rpx;
}

.pay-amount {
  font-size: 26rpx;
  font-weight: bold;
  color: #303133;
}

.action-bar {
  margin-top: 10rpx;
}

.action-btn {
  background: #fff;
  color: #1a56db;
  text-align: center;
  border-radius: 30rpx;
  padding: 22rpx;
  font-size: 28rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid #1a56db;
}

.action-btn.primary {
  background: #1a56db;
  color: #fff;
  border: none;
}

.action-btn.danger {
  color: #e74c3c;
  border-color: #e74c3c;
}

.hint {
  text-align: center;
  color: #909399;
  font-size: 26rpx;
  padding: 24rpx;
}
</style>
