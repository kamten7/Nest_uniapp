<template>
  <view class="wallet-page">
    <!-- ===== 余额卡 ===== -->
    <view class="balance-card">
      <view class="balance-label">钱包余额（元）</view>
      <view class="balance-num">{{ balanceText }}</view>
      <view class="balance-ops">
        <view class="op-btn" @tap="showRecharge">充值</view>
        <view class="op-btn outline" @tap="doWithdraw">提现</view>
      </view>
    </view>

    <!-- ===== 充值面板 ===== -->
    <view v-if="showRechargePanel" class="panel">
      <view class="panel-title">选择充值金额</view>
      <view class="amount-chips">
        <view v-for="a in quickAmounts" :key="a"
              class="chip" :class="{ active: rechargeAmount === a }"
              @tap="rechargeAmount = a">{{ a }}元</view>
      </view>
      <input v-model="rechargeAmount" class="amount-input" type="digit" placeholder="自定义金额" />
      <view class="pay-btn" @tap="doRecharge">立即充值</view>
      <view class="panel-tip">当前为模拟充值，后期接入微信支付</view>
    </view>

    <!-- ===== 提现面板 ===== -->
    <view v-if="showWithdrawPanel" class="panel">
      <view class="panel-title">提现到微信零钱</view>
      <input v-model="withdrawAmount" class="amount-input" type="digit" placeholder="输入提现金额" />
      <view class="pay-btn outline" @tap="doWithdrawConfirm">确认提现</view>
      <view class="panel-tip">提现需人工审核，暂未对接实际到账</view>
    </view>

    <!-- ===== 流水 ===== -->
    <view class="section-title">收支明细</view>
    <view v-if="txnList.length" class="txn-list">
      <view v-for="t in txnList" :key="t.id" class="txn-item">
        <view class="txn-left">
          <view class="txn-type">{{ bizTypeText(t.bizType) }}</view>
          <view class="txn-time">{{ formatTime(t.createTime) }}</view>
        </view>
        <view class="txn-right">
          <text class="txn-amount" :class="t.direction === 1 ? 'in' : 'out'">
            {{ t.direction === 1 ? '+' : '-' }}{{ money(t.amount) }}
          </text>
          <text class="txn-status" :class="'s-' + t.status">{{ statusText(t.status) }}</text>
        </view>
      </view>
      <view v-if="hasMore" class="load-more" @tap="loadTxns(false)">加载更多</view>
    </view>
    <view v-else class="empty">
      <view class="empty-icon">💰</view>
      <view class="empty-text">暂无收支记录</view>
    </view>
  </view>
</template>

<script>
import { getMyWallet, recharge, withdraw, getTransactions } from '@/api/wallet'

const BIZ_TEXT = {
  RECHARGE: '充值', WITHDRAW: '提现',
  DEPOSIT_PAY: '缴纳押金', DEPOSIT_INCOME: '收取押金', DEPOSIT_REFUND: '押金退回',
  RENT_PAY: '缴纳房租', RENT_INCOME: '收取房租'
}
const STATUS_TEXT = { 1: '成功', 0: '处理中', 2: '失败' }

export default {
  data() {
    return {
      balance: 0,
      quickAmounts: [50, 100, 200, 500, 1000],
      rechargeAmount: 100,
      showRechargePanel: true,
      withdrawAmount: '',
      showWithdrawPanel: false,
      txnList: [],
      page: 1,
      pageSize: 10,
      total: 0,
      hasMore: true,
      /** 防连点：充值/提现请求进行中时忽略后续点击（否则连点会重复提交） */
      submitting: false
    }
  },
  computed: {
    balanceText() {
      return this.money(this.balance)
    }
  },
  onShow() {
    this.init()
  },
  onReachBottom() {
    if (this.hasMore) this.loadTxns(false)
  },
  methods: {
    async init() {
      try {
        const res = await getMyWallet()
        this.balance = (res.data && res.data.balance) || 0
        this.balance = Number(this.balance)
        this.page = 1
        this.hasMore = true
        this.loadTxns(true)
      } catch (e) {
        uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
      }
    },
    async loadTxns(reset) {
      if (reset) { this.page = 1; this.hasMore = true }
      try {
        const res = await getTransactions({ page: this.page, pageSize: this.pageSize })
        const data = res.data || { records: [], total: 0 }
        const records = data.records || []
        this.txnList = reset ? records : this.txnList.concat(records)
        this.total = data.total || 0
        this.hasMore = this.txnList.length < this.total
        if (!reset) this.page++
      } catch (e) {
        uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
      }
    },
    async doRecharge() {
      if (this.submitting) { uni.showToast({ title: '正在处理，请稍候…', icon: 'none' }); return }
      const amount = Number(this.rechargeAmount)
      if (!amount || amount <= 0) {
        uni.showToast({ title: '请输入正确金额', icon: 'none' })
        return
      }
      this.submitting = true
      try {
        const res = await recharge(amount)
        this.balance = Number((res.data && res.data.balance) || 0)
        uni.showToast({ title: '充值成功', icon: 'success' })
        this.loadTxns(true)
      } catch (e) {
        uni.showToast({ title: e.msg || '充值失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
    doWithdraw() {
      this.showWithdrawPanel = !this.showWithdrawPanel
      this.showRechargePanel = false
    },
    showRecharge() {
      this.showRechargePanel = !this.showRechargePanel
      this.showWithdrawPanel = false
    },
    async doWithdrawConfirm() {
      if (this.submitting) { uni.showToast({ title: '正在处理，请稍候…', icon: 'none' }); return }
      const amount = Number(this.withdrawAmount)
      if (!amount || amount <= 0) {
        uni.showToast({ title: '请输入正确金额', icon: 'none' })
        return
      }
      uni.showModal({
        title: '确认提现',
        content: `提现金额 ${this.money(amount)} 元`,
        success: async (res) => {
          if (!res.confirm) return
          if (this.submitting) { uni.showToast({ title: '正在处理，请稍候…', icon: 'none' }); return }
          this.submitting = true
          try {
            const r = await withdraw(amount)
            this.balance = Number((r.data && r.data.balance) || 0)
            this.withdrawAmount = ''
            this.showWithdrawPanel = false
            uni.showToast({ title: '提现申请已提交', icon: 'success' })
            this.loadTxns(true)
          } catch (e) {
            uni.showToast({ title: e.msg || '提现失败', icon: 'none' })
          } finally {
            this.submitting = false
          }
        }
      })
    },
    bizTypeText(t) {
      return BIZ_TEXT[t] || t
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
.wallet-page {
  min-height: 100vh;
}

/* 余额卡 */
.balance-card {
  background: linear-gradient(135deg, #1a56db, #667eea);
  padding: 50rpx 40rpx;
  color: #fff;
}

.balance-label {
  font-size: 26rpx;
  opacity: 0.85;
}

.balance-num {
  font-size: 76rpx;
  font-weight: bold;
  margin: 16rpx 0 30rpx;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

.balance-ops {
  display: flex;
  gap: 20rpx;
}

.op-btn {
  flex: 1;
  text-align: center;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 30rpx;
  padding: 18rpx;
  font-size: 28rpx;
}

.op-btn.outline {
  background: transparent;
  border: 1rpx solid rgba(255, 255, 255, 0.7);
}

/* 面板 */
.panel {
  margin: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}

.panel-title {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 24rpx;
}

.amount-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.chip {
  min-width: 120rpx;
  text-align: center;
  padding: 16rpx 24rpx;
  border: 1rpx solid #dcdfe6;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #606266;
}

.chip.active {
  border-color: #1a56db;
  color: #1a56db;
  background: #ecf3ff;
}

.amount-input {
  margin-top: 24rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
}

.pay-btn {
  margin-top: 24rpx;
  background: #1a56db;
  color: #fff;
  text-align: center;
  border-radius: 30rpx;
  padding: 20rpx;
  font-size: 30rpx;
}

.pay-btn.outline {
  background: #fff;
  color: #1a56db;
  border: 1rpx solid #1a56db;
}

.panel-tip {
  margin-top: 16rpx;
  font-size: 22rpx;
  color: #c0c4cc;
  text-align: center;
}

/* 流水 */
.section-title {
  font-size: 28rpx;
  font-weight: bold;
  margin: 30rpx 24rpx 16rpx;
  color: #303133;
}

.txn-list {
  margin: 0 20rpx 20rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.txn-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.txn-type {
  font-size: 28rpx;
  color: #303133;
}

.txn-time {
  font-size: 22rpx;
  color: #909399;
  margin-top: 8rpx;
}

.txn-right {
  text-align: right;
}

.txn-amount {
  font-size: 28rpx;
  font-weight: bold;
}

.txn-amount.in { color: #67c23a; }
.txn-amount.out { color: #303133; }

.txn-status {
  display: block;
  font-size: 20rpx;
  color: #909399;
  margin-top: 6rpx;
}

.txn-status.s-0 { color: #e6a23c; }

.load-more {
  text-align: center;
  color: #909399;
  padding: 20rpx;
  font-size: 26rpx;
}

.empty {
  text-align: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 100rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #909399;
  margin-top: 20rpx;
}
</style>
