<template>
  <!-- 加载失败：显示提示而非空白 -->
  <view class="detail-page" v-if="loadError && !house">
    <view class="error-box">
      <view class="error-icon">😕</view>
      <view class="error-text">房源不存在或已下架</view>
      <view class="error-btn" @tap="goBack">返回</view>
    </view>
  </view>

  <view class="detail-page" v-if="house">
    <!-- 图片轮播 -->
    <swiper v-if="house.images && house.images.length" class="image-swiper" indicator-dots autoplay circular>
      <swiper-item v-for="(img, idx) in house.images" :key="idx">
        <image class="swiper-image" :src="img" mode="aspectFill" />
      </swiper-item>
    </swiper>
    <view v-else class="image-placeholder">🏠</view>

    <!-- 价格 + 基本信息 -->
    <view class="section">
      <view class="price-row">
        <text class="price price-text">¥{{ house.price }}/月</text>
        <text v-if="house.deposit" class="deposit">押{{ house.deposit }}</text>
      </view>
      <view class="title">{{ house.title }}</view>
      <view class="location">
        {{ house.city }} · {{ house.district }} · {{ house.address }}
      </view>
      <view class="tags" v-if="house.tags && house.tags.length">
        <text v-for="t in house.tags" :key="t" class="tag">{{ t }}</text>
      </view>
    </view>

    <!-- 房屋信息 -->
    <view class="section">
      <view class="section-title">房屋信息</view>
      <view class="info-grid">
        <view class="info-item">
          <view class="info-value">{{ house.rentType || '整租' }}</view>
          <view class="info-label">出租方式</view>
        </view>
        <view class="info-item">
          <view class="info-value">{{ house.area ? house.area + '㎡' : '—' }}</view>
          <view class="info-label">面积</view>
        </view>
        <view class="info-item">
          <view class="info-value">{{ house.roomCount }}室{{ house.hallCount }}厅{{ house.bathroomCount }}卫</view>
          <view class="info-label">户型</view>
        </view>
        <view class="info-item">
          <view class="info-value">{{ house.orientation || '—' }}</view>
          <view class="info-label">朝向</view>
        </view>
      </view>
    </view>

    <!-- 描述 -->
    <view class="section" v-if="house.description">
      <view class="section-title">房源描述</view>
      <view class="description">{{ house.description }}</view>
    </view>

    <!-- 房东信息 -->
    <view class="section">
      <view class="section-title">房东信息</view>
      <view class="landlord-row">
        <view class="landlord-avatar">{{ house.landlordName ? house.landlordName.charAt(0) : '🏠' }}</view>
        <view class="landlord-name">{{ house.landlordName || '房东' }}</view>
      </view>
    </view>

    <!-- 住客评价 -->
    <view class="section">
      <view class="section-title">
        住客评价
        <text v-if="reviews.avgRating" class="avg-rating">⭐ {{ reviews.avgRating }}</text>
        <text v-if="reviews.totalCount" class="review-count">（{{ reviews.totalCount }}条）</text>
      </view>

      <!-- 发表评论 -->
      <view class="add-review" @tap="showAddReview">
        <text>✏️ 发表评价</text>
      </view>

      <!-- 评论列表 -->
      <view v-if="reviewList.length" class="review-list">
        <view v-for="r in reviewList" :key="r.id" class="review-item">
          <view class="review-header">
            <text class="review-name">{{ r.tenantName }}</text>
            <text class="review-stars">{{ '★'.repeat(r.rating) }}<text class="stars-empty">{{ '★'.repeat(5 - r.rating) }}</text></text>
          </view>
          <view class="review-content">{{ r.content }}</view>
          <view class="review-time">{{ formatTime(r.createTime) }}</view>

          <!-- 回复列表 -->
          <view v-if="r.comments && r.comments.length" class="comment-list">
            <view v-for="c in r.comments" :key="c.id" class="comment-item">
              <text class="comment-name">{{ c.userName }}：</text>
              <text class="comment-content">{{ c.content }}</text>
              <text class="comment-like" @tap="toggleLike(c)">♥ {{ c.likeCount }}</text>
            </view>
          </view>

          <!-- 回复按钮 -->
          <view class="reply-btn" @tap="showAddComment(r)">回复</view>
        </view>
      </view>

      <view v-else class="no-review">还没有评价，来抢沙发～</view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="action-item" @tap="toggleFavorite">
        <text class="action-icon">{{ isFavorite ? '❤️' : '🤍' }}</text>
        <text class="action-text">{{ isFavorite ? '已收藏' : '收藏' }}</text>
      </view>
      <view class="action-item" @tap="goChat">
        <text class="action-icon">💬</text>
        <text class="action-text">联系房东</text>
      </view>
      <view class="appoint-btn" @tap="showAppointment">预约看房</view>
    </view>

    <!-- 发表评价弹窗（星级选择） -->
    <view v-if="showReviewPopup" class="popup-mask" @tap="showReviewPopup = false">
      <view class="popup-card" @tap.stop>
        <view class="popup-title">发表评价</view>
        <view class="star-row">
          <text
            v-for="n in 5"
            :key="n"
            class="star"
            :class="{ active: n <= reviewRating }"
            @tap="reviewRating = n"
          >★</text>
          <text class="star-hint">{{ reviewRating }} 星</text>
        </view>
        <textarea v-model="reviewContent" class="popup-input" placeholder="说说你的入住体验..." :maxlength="200" />
        <view class="popup-btn" @tap="submitReview">提交评价</view>
      </view>
    </view>

    <!-- 预约看房弹窗（日期选择） -->
    <view v-if="showAppointmentPopup" class="popup-mask" @tap="showAppointmentPopup = false">
      <view class="popup-card" @tap.stop>
        <view class="popup-title">预约看房</view>
        <picker mode="date" :value="appointmentDate" start="2026-01-01" end="2027-12-31" @change="onDateChange">
          <view class="date-picker">📅 {{ appointmentDate || '选择看房日期' }}</view>
        </picker>
        <input v-model="appointmentPhone" class="popup-input" placeholder="联系电话" type="number" maxlength="11" />
        <textarea v-model="appointmentRemark" class="popup-input" placeholder="备注（可选）" :maxlength="100" />
        <view class="popup-btn" @tap="submitAppointment">提交预约</view>
      </view>
    </view>
  </view>
</template>

<script>
import { get, post, del, put } from '@/utils/request'
import { getHouseReviews, addReview, addComment, likeComment } from '@/api/review'
import { createConversation } from '@/api/chat'
import { useUserStore } from '@/store/user'

export default {
  setup() {
    return { userStore: useUserStore() }
  },
  data() {
    return {
      houseId: null,
      house: null,
      loadError: false,        // 加载失败标记（避免页面空白，显示失败提示）
      isFavorite: false,
      reviewList: [],        // 评论列表
      reviews: { avgRating: 0, totalCount: 0 },   // 平均分+总数
      // 评价弹窗
      showReviewPopup: false,
      reviewRating: 5,
      reviewContent: '',
      // 预约弹窗
      showAppointmentPopup: false,
      appointmentDate: '',
      appointmentPhone: '',
      appointmentRemark: ''
    }
  },
  onLoad(options) {
    this.houseId = options.id
    this.loadDetail()
    this.loadFavoriteStatus()
    this.loadReviews()
  },
  methods: {
    /** 返回上一页（加载失败时用的返回按钮） */
    goBack() {
      uni.navigateBack()
    },
    /** 加载房源评论 */
    async loadReviews() {
      try {
        const res = await getHouseReviews(this.houseId)
        const data = res.data || { records: [], avgRating: 0, totalCount: 0 }
        this.reviewList = data.records || []
        if (this.reviewList.length) {
          this.reviews.avgRating = this.reviewList[0].avgRating
          this.reviews.totalCount = this.reviewList[0].totalCount
        }
      } catch (e) {
        console.log('评论加载失败', e)
      }
    },
    /** 弹窗发表评论 */
    /** 打开评价弹窗 */
    showAddReview() {
      if (!this.userStore.isLogin) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      this.reviewRating = 5
      this.reviewContent = ''
      this.showReviewPopup = true
    },
    /** 提交评价 */
    async submitReview() {
      if (!this.reviewContent.trim()) {
        uni.showToast({ title: '请输入评价内容', icon: 'none' })
        return
      }
      try {
        await addReview({ houseId: Number(this.houseId), rating: this.reviewRating, content: this.reviewContent })
        uni.showToast({ title: '评价成功', icon: 'success' })
        this.showReviewPopup = false
        this.loadReviews()
      } catch (e) {
        uni.showToast({ title: e.msg || '评价失败', icon: 'none' })
      }
    },
    /** 弹窗回复评论 */
    showAddComment(review) {
      if (!this.userStore.isLogin) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      uni.showModal({
        title: '回复评价',
        editable: true,
        placeholderText: '输入回复内容',
        success: async (res) => {
          if (res.confirm && res.content) {
            try {
              await addComment(review.id, { content: res.content })
              uni.showToast({ title: '回复成功', icon: 'success' })
              this.loadReviews()
            } catch (e) {
              uni.showToast({ title: e.msg || '回复失败', icon: 'none' })
            }
          }
        }
      })
    },
    /** 点赞/取消赞 */
    async toggleLike(comment) {
      if (!this.userStore.isLogin) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      try {
        const liked = !comment.liked
        await likeComment(comment.id, liked)
        comment.liked = liked
        comment.likeCount = Math.max(0, (comment.likeCount || 0) + (liked ? 1 : -1))
      } catch (e) {
        uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
      }
    },
    formatTime(t) {
      if (!t) return ''
      return t.replace('T', ' ').slice(0, 10)
    },
    async loadDetail() {
      try {
        const res = await get(`/user/house/detail/${this.houseId}`)
        this.house = res.data
        this.loadError = false
        uni.setNavigationBarTitle({ title: this.house.title })
      } catch (e) {
        // 加载失败：标记错误，页面显示"加载失败"提示而非空白
        this.loadError = true
        uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
      }
    },
    async loadFavoriteStatus() {
      if (!this.userStore.isLogin) return
      try {
        const res = await get(`/user/favorite/status/${this.houseId}`)
        this.isFavorite = res.data
      } catch (e) { /* 忽略 */ }
    },
    /** 收藏/取消收藏 */
    async toggleFavorite() {
      if (!this.userStore.isLogin) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      try {
        if (this.isFavorite) {
          await del(`/user/favorite/${this.houseId}`)
          this.isFavorite = false
          uni.showToast({ title: '已取消收藏', icon: 'none' })
        } else {
          await post('/user/favorite', { houseId: Number(this.houseId) })
          this.isFavorite = true
          uni.showToast({ title: '收藏成功', icon: 'success' })
        }
      } catch (e) {
        uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
      }
    },
    /** 预约看房：弹窗选日期+填电话 */
    showAppointment() {
      if (!this.userStore.isLogin) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      this.appointmentDate = ''
      this.appointmentPhone = this.userStore.userInfo.phone || ''
      this.appointmentRemark = ''
      this.showAppointmentPopup = true
    },
    /** 日期选择 */
    onDateChange(e) {
      this.appointmentDate = e.detail.value
    },
    /** 提交预约 */
    async submitAppointment() {
      if (!this.appointmentDate) {
        uni.showToast({ title: '请选择看房日期', icon: 'none' })
        return
      }
      if (!this.appointmentPhone) {
        uni.showToast({ title: '请填写联系电话', icon: 'none' })
        return
      }
      try {
        // 日期转成后端需要的 LocalDateTime 格式（ISO 标准用 T 分隔，当天 10:00 作为默认看房时间）
        await post('/user/appointment', {
          houseId: Number(this.houseId),
          contactPhone: this.appointmentPhone,
          appointmentTime: `${this.appointmentDate}T10:00:00`,
          remark: this.appointmentRemark || ''
        })
        uni.showToast({ title: '预约成功，等待房东确认', icon: 'success' })
        this.showAppointmentPopup = false
      } catch (e) {
        uni.showToast({ title: e.msg || '预约失败', icon: 'none' })
      }
    },
    /** 联系房东：找/建会话 → 跳聊天 */
    async goChat() {
      if (!this.userStore.isLogin) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      if (!this.house || !this.house.landlordId) {
        uni.showToast({ title: '无法获取房东信息', icon: 'none' })
        return
      }
      try {
        uni.showLoading({ title: '打开会话...' })
        const res = await createConversation(this.house.landlordId)
        uni.hideLoading()
        const conversationId = res.data
        uni.navigateTo({
          url: `/pages/chatDetail/index?conversationId=${conversationId}&otherId=${this.house.landlordId}&otherType=landlord&otherName=${encodeURIComponent(this.house.landlordName || '房东')}`
        })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.msg || '打开会话失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  padding-bottom: 140rpx;
}

.image-swiper {
  width: 100%;
  height: 500rpx;
}

.swiper-image {
  width: 100%;
  height: 100%;
}

.image-placeholder {
  width: 100%;
  height: 400rpx;
  background: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 100rpx;
}

.section {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 24rpx;
}

.price-row {
  display: flex;
  align-items: baseline;
}

.price {
  font-size: 44rpx;
}

.deposit {
  font-size: 24rpx;
  color: #909399;
  margin-left: 16rpx;
}

.title {
  font-size: 32rpx;
  font-weight: bold;
  margin-top: 12rpx;
}

.location {
  font-size: 26rpx;
  color: #909399;
  margin-top: 8rpx;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}

.tag {
  font-size: 22rpx;
  color: #1a56db;
  background: #ecf3ff;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
}

.info-item {
  width: 50%;
  margin-bottom: 20rpx;
}

.info-value {
  font-size: 28rpx;
  color: #303133;
}

.info-label {
  font-size: 24rpx;
  color: #909399;
  margin-top: 4rpx;
}

.description {
  font-size: 26rpx;
  color: #606266;
  line-height: 1.6;
}

.landlord-row {
  display: flex;
  align-items: center;
}

.landlord-avatar {
  width: 70rpx;
  height: 70rpx;
  border-radius: 50%;
  background: #1a56db;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
}

.landlord-name {
  margin-left: 20rpx;
  font-size: 28rpx;
}

/* ===== 住客评价 ===== */
.avg-rating {
  font-size: 26rpx;
  color: #e6a23c;
  margin-left: 12rpx;
}

.review-count {
  font-size: 24rpx;
  color: #909399;
  margin-left: 8rpx;
}

.add-review {
  background: #ecf3ff;
  color: #1a56db;
  text-align: center;
  border-radius: 30rpx;
  padding: 14rpx 0;
  font-size: 26rpx;
  margin-bottom: 16rpx;
}

.no-review {
  text-align: center;
  color: #909399;
  font-size: 26rpx;
  padding: 30rpx 0;
}

.review-item {
  border-top: 1rpx solid #f0f2f5;
  padding: 20rpx 0;
}

.review-header {
  display: flex;
  align-items: center;
}

.review-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #303133;
}

.review-stars {
  font-size: 24rpx;
  color: #e6a23c;
  margin-left: 12rpx;
}

.stars-empty {
  color: #e0e0e0;
}

.review-content {
  font-size: 26rpx;
  color: #303133;
  margin-top: 10rpx;
  line-height: 1.6;
}

.review-time {
  font-size: 22rpx;
  color: #c0c4cc;
  margin-top: 8rpx;
}

.comment-list {
  background: #f5f7fa;
  border-radius: 10rpx;
  padding: 14rpx;
  margin-top: 12rpx;
}

.comment-item {
  font-size: 24rpx;
  margin-bottom: 10rpx;
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
}

.comment-name {
  color: #1a56db;
}

.comment-content {
  color: #606266;
}

.comment-like {
  margin-left: auto;
  color: #e74c3c;
  padding-left: 16rpx;
}

.reply-btn {
  font-size: 24rpx;
  color: #1a56db;
  margin-top: 10rpx;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 30rpx;
}

.action-icon {
  font-size: 40rpx;
}

.action-text {
  font-size: 20rpx;
  color: #606266;
  margin-top: 4rpx;
}

.appoint-btn {
  flex: 1;
  background: #1a56db;
  color: #fff;
  text-align: center;
  border-radius: 30rpx;
  padding: 20rpx 0;
  font-size: 30rpx;
}

/* ===== 弹窗 ===== */
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
  margin-bottom: 30rpx;
}

.star-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
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

.popup-input {
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 20rpx;
  min-height: 80rpx;
}

.date-picker {
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  margin-bottom: 20rpx;
  color: #303133;
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

/* ===== 加载失败空态 ===== */
.error-box {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.error-icon {
  font-size: 100rpx;
}

.error-text {
  font-size: 30rpx;
  color: #909399;
  margin-top: 20rpx;
}

.error-btn {
  margin-top: 40rpx;
  background: #1a56db;
  color: #fff;
  border-radius: 30rpx;
  padding: 16rpx 60rpx;
  font-size: 28rpx;
}
</style>
