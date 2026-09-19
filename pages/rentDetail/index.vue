<template>
  <view class="detail-page" v-if="order">
    <!-- ===== 基本信息 ===== -->
    <view class="card">
      <view class="head-row">
        <text class="house" @tap="goHouse">{{ order.houseTitle || '房源' }} ›</text>
        <text class="status-tag" :class="'status-' + order.status">{{ statusText(order.status) }}</text>
      </view>
      <view class="info-row"><text class="label">订单号</text><text class="value">{{ order.orderNo }}</text></view>
      <view class="info-row"><text class="label">月租</text><text class="value price">{{ money(order.monthlyRent) }}元</text></view>
      <view class="info-row"><text class="label">押金</text><text class="value">{{ money(order.deposit) }}元</text></view>
      <view class="info-row"><text class="label">起租日</text><text class="value">{{ order.startDate || '—' }}</text></view>
      <view class="info-row"><text class="label">下期待缴</text><text class="value">{{ order.nextDuePeriod || '—' }}</text></view>
      <view class="info-row"><text class="label">已缴月数</text><text class="value">{{ order.paidMonths }}个月</text></view>
    </view>

    <!-- ===== 房东信息（确认租房后可直接联系房东） ===== -->
    <view v-if="order.landlordId" class="card">
      <view class="card-title">房东信息</view>
      <view class="landlord-row">
        <view class="landlord-main">
          <view class="landlord-name">{{ order.landlordName || '房东' }}</view>
          <view class="landlord-sub">入住、维修、退租等事宜可直接与房东沟通</view>
        </view>
        <view class="chat-btn" @tap="goChat">联系房东</view>
      </view>
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

    <!-- ===== 我的评价（已退租后可评价、可追评） ===== -->
    <view v-if="order.status === 4" class="card">
      <view class="card-title">我的评价</view>
      <view v-if="reviewed" class="hint">✅ 你已评价过这套房子，可去房源页继续追评或回复别人</view>
      <view v-else class="action-btn primary" @tap="openReviewPopup">评价这套房子</view>
      <view class="action-btn" @tap="goHouse">查看房源评论 / 追评</view>
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
        <view class="hint">请在 30 分钟内缴纳押金，超时订单将自动取消、房源重新上架</view>
        <view class="action-btn primary" @tap="payDeposit">缴纳押金 {{ money(order.deposit) }}元</view>
        <view class="action-btn danger" @tap="onCancelOrder">放弃租房</view>
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

    <!-- ===== 退租后弹评价 ===== -->
    <view v-if="showReviewPopup" class="popup-mask" @tap="showReviewPopup = false">
      <view class="popup-card" @tap.stop>
        <view class="popup-title">评价这套房子</view>
        <view class="popup-sub">退租完成啦，给后面的租客留个参考吧～</view>
        <view class="star-row">
          <text
            v-for="n in 5"
            :key="n"
            class="star"
            :class="{ active: n <= reviewRating }"
            @tap="reviewRating = n"
          >★</text>
          <text class="star-hint">{{ reviewRating ? reviewRating + ' 星' : '未打分' }}</text>
        </view>
        <view class="star-clear" @tap="reviewRating = 0">
          <text>{{ reviewRating ? '不打分，只发评论' : '✓ 已选择：不打分' }}</text>
        </view>
        <textarea
          v-model="reviewContent"
          class="popup-input"
          placeholder="说说你的入住体验（交通、房东、房屋状况…）"
          :maxlength="500"
        />
        <view class="popup-btn" @tap="submitReview">提交评价</view>
      </view>
    </view>
  </view>
</template>

<script>
import { getRentDetail, payDeposit, payRent, payAhead, terminateRent, cancelOrder } from '@/api/rent'
import { getMyReviewStatus, addReview } from '@/api/review'
import { createConversation } from '@/api/chat'
import { useUserStore } from '@/store/user'

const STATUS_TEXT = { 1: '待缴押金', 2: '租房中', 3: '退租申请中', 4: '已退租', 5: '已取消' }

/**
 * 租房订单详情。
 *
 * ⚠️ 本页保持「纯选项式 API」写法（不使用 setup()）—— 与 pages/profile 同源：
 * 混用 setup() + data() 时页面能正常渲染，但所有 @tap 事件都不触发。
 * 需要 Pinia store 时用 computed 暴露（放 data 里会被 setData 序列化）。
 */
export default {
  data() {
    return {
      orderId: null,
      order: null,
      /** 防连点：缴押金/缴租/提前支付/退租请求进行中时忽略后续点击 */
      submitting: false,
      // ===== 退租后弹评价 =====
      /** 是否已评价过该房源 */
      reviewed: false,
      /** 本次进入页面是否已经弹过（避免 onShow 每次回来都弹） */
      reviewPrompted: false,
      showReviewPopup: false,
      reviewRating: 5,
      reviewContent: '',
      reviewSubmitting: false
    }
  },
  computed: {
    userStore() {
      return useUserStore()
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
        this.checkReview()
      } catch (e) {
        uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
      }
    },
    /**
     * 已退租 → 查询是否评价过；没评价过就弹窗邀请评价。
     * reviewPrompted 保证同一次进入页面只弹一次（onShow 返回时不会再打扰）。
     */
    async checkReview() {
      if (!this.order || this.order.status !== 4 || !this.order.houseId) return
      try {
        const res = await getMyReviewStatus(this.order.houseId)
        this.reviewed = !!res.data
      } catch (e) {
        return
      }
      if (!this.reviewed && !this.reviewPrompted) {
        this.reviewPrompted = true
        // 等页面渲染完再弹，避免和加载提示抢层级被吞掉
        setTimeout(() => this.openReviewPopup(), 400)
      }
    },
    /** 打开评价弹窗 */
    openReviewPopup() {
      this.reviewRating = 5
      this.reviewContent = ''
      this.showReviewPopup = true
    },
    /**
     * 去该房源的详情页看评论、追评。
     * 退租后房源已下架，但后端对「租过这套房的租客」放开了详情页访问。
     */
    goHouse() {
      if (!this.order || !this.order.houseId) return
      const url = `/pages/houseDetail/index?id=${this.order.houseId}`
      uni.navigateTo({ url, fail: () => uni.redirectTo({ url }) })
    },
    /**
     * 联系房东：找/建会话 → 跳聊天。
     * 与房源详情页 goChat 同一套逻辑；房东身份来自订单 VO（landlordId / landlordName）。
     */
    async goChat() {
      if (!this.userStore.isLogin) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      if (!this.order || !this.order.landlordId) {
        uni.showToast({ title: '无法获取房东信息', icon: 'none' })
        return
      }
      try {
        uni.showLoading({ title: '打开会话...' })
        const res = await createConversation(this.order.landlordId)
        uni.hideLoading()
        const conversationId = res.data
        uni.navigateTo({
          url: `/pages/chatDetail/index?conversationId=${conversationId}&otherId=${this.order.landlordId}&otherType=landlord&otherName=${encodeURIComponent(this.order.landlordName || '房东')}`
        })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.msg || '打开会话失败', icon: 'none' })
      }
    },
    /** 提交评价（reviewRating 为 0 时按「不打分」提交） */
    async submitReview() {
      if (!this.reviewContent.trim()) {
        uni.showToast({ title: '请输入评价内容', icon: 'none' })
        return
      }
      if (this.reviewSubmitting) return
      this.reviewSubmitting = true
      try {
        await addReview({
          houseId: Number(this.order.houseId),
          rating: this.reviewRating > 0 ? this.reviewRating : null,
          content: this.reviewContent.trim()
        })
        this.showReviewPopup = false
        this.reviewed = true
        setTimeout(() => uni.showToast({ title: '评价成功', icon: 'success' }), 100)
      } catch (e) {
        uni.showToast({ title: e.msg || '评价失败', icon: 'none' })
      } finally {
        this.reviewSubmitting = false
      }
    },
    payDeposit() {
      uni.showModal({
        title: '缴纳押金',
        content: `确认使用钱包余额缴纳押金 ${this.money(this.order.deposit)} 元？`,
        success: async (res) => {
          if (!res.confirm) return
          if (this.submitting) { uni.showToast({ title: '正在处理，请稍候…', icon: 'none' }); return }
          this.submitting = true
          try {
            await payDeposit(this.order.id)
            uni.showToast({ title: '押金已缴纳', icon: 'success' })
            this.load()
          } catch (e) {
            uni.showToast({ title: e.msg || '缴纳失败', icon: 'none' })
          } finally {
            this.submitting = false
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
          if (this.submitting) { uni.showToast({ title: '正在处理，请稍候…', icon: 'none' }); return }
          this.submitting = true
          try {
            // 必须把弹窗里展示的那个周期一并传上去：
            // 不传时服务端会取「当前待缴周期」，于是第二次点击会合法地缴掉下一个月（重复扣款）。
            // 传了之后，重复请求会因周期已被推进而被服务端拒绝。
            await payRent(this.order.id, this.order.nextDuePeriod)
            uni.showToast({ title: '缴纳成功', icon: 'success' })
            this.load()
          } catch (e) {
            uni.showToast({ title: e.msg || '缴纳失败', icon: 'none' })
          } finally {
            this.submitting = false
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
              if (this.submitting) { uni.showToast({ title: '正在处理，请稍候…', icon: 'none' }); return }
              this.submitting = true
              try {
                await payAhead(this.order.id, months)
                uni.showToast({ title: '支付成功', icon: 'success' })
                this.load()
              } catch (e) {
                uni.showToast({ title: e.msg || '支付失败', icon: 'none' })
              } finally {
                this.submitting = false
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
          if (this.submitting) { uni.showToast({ title: '正在处理，请稍候…', icon: 'none' }); return }
          this.submitting = true
          try {
            await terminateRent(this.order.id, res.content || '')
            uni.showToast({ title: '退租申请已提交', icon: 'success' })
            this.load()
          } catch (e) {
            uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
          } finally {
            this.submitting = false
          }
        }
      })
    },
    /**
     * 放弃租房（仅「待缴押金」状态）。
     * ⚠️ 方法名不要叫 cancelOrder —— 会和顶部从 @/api/rent 导入的 cancelOrder 同名，
     * 虽然当前构建产物能正确解析成 api_rent.cancelOrder，但这种遮蔽随时可能踩坑。
     */
    onCancelOrder() {
      uni.showModal({
        title: '放弃租房',
        content: '确认放弃本次租房？房源将恢复上架，其他租客可继续预约。',
        success: async (res) => {
          if (!res.confirm) return
          if (this.submitting) { uni.showToast({ title: '正在处理，请稍候…', icon: 'none' }); return }
          this.submitting = true
          try {
            await cancelOrder(this.order.id)
            uni.showToast({ title: '已放弃租房', icon: 'success' })
            setTimeout(() => uni.navigateBack(), 1000)
          } catch (e) {
            uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
          } finally {
            this.submitting = false
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

/* ===== 房东信息 / 联系房东 ===== */
.landlord-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.landlord-main {
  flex: 1;
  min-width: 0;
  padding-right: 20rpx;
}

.landlord-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #303133;
}

.landlord-sub {
  font-size: 22rpx;
  color: #909399;
  margin-top: 6rpx;
}

.chat-btn {
  flex-shrink: 0;
  background: #1a56db;
  color: #fff;
  font-size: 26rpx;
  padding: 14rpx 28rpx;
  border-radius: 30rpx;
}

/* ===== 评价弹窗 ===== */
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.popup-card {
  width: 80%;
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx 30rpx;
}

.popup-title {
  font-size: 32rpx;
  font-weight: bold;
  text-align: center;
}

.popup-sub {
  font-size: 24rpx;
  color: #909399;
  text-align: center;
  margin: 12rpx 0 24rpx;
}

.star-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.star {
  font-size: 60rpx;
  color: #e0e0e0;
  padding: 0 6rpx;
}

.star.active {
  color: #e6a23c;
}

.star-hint {
  font-size: 26rpx;
  color: #909399;
  margin-left: 16rpx;
}

.star-clear {
  text-align: center;
  font-size: 24rpx;
  color: #909399;
  padding: 4rpx 0 16rpx;
}

.popup-input {
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 20rpx;
  min-height: 160rpx;
}

.popup-btn {
  background: #1a56db;
  color: #fff;
  text-align: center;
  border-radius: 30rpx;
  padding: 20rpx;
  font-size: 30rpx;
  margin-top: 10rpx;
}
</style>
