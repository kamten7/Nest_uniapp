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
    <!-- 非「上架」房源：只有曾租住过的租客能看到（退租后回来看评论/追评） -->
    <view v-if="house.status !== 1" class="house-banner">
      <text>{{ house.status === 2 ? '该房源正在出租中，你曾租住过，可继续查看与追评' : '该房源已下架，仅曾租住的你可以查看与追评' }}</text>
    </view>

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

    <!-- 住客评价 / 房源讨论 -->
    <view class="section">
      <view class="section-title">
        住客评价
        <text v-if="reviews.ratedCount" class="avg-rating">⭐ {{ reviews.avgRating }}</text>
        <text v-if="reviews.ratedCount" class="review-count">{{ reviews.ratedCount }}人评分</text>
        <text class="review-count">共{{ reviews.totalCount }}条</text>
      </view>

      <!-- 发表评论（可不打分，看房用户也能发） -->
      <view class="add-review" @tap="showAddReview">
        <text>✏️ 发表评论 / 提问</text>
      </view>

      <!-- 评论列表 -->
      <view v-if="reviewList.length" class="review-list">
        <view v-for="r in reviewList" :key="r.id" class="review-item">
          <view class="review-header">
            <text class="review-name">{{ r.tenantName }}</text>
            <text v-if="r.rating" class="review-stars">{{ '★'.repeat(r.rating) }}<text class="stars-empty">{{ '★'.repeat(5 - r.rating) }}</text></text>
            <text v-else class="review-tag">评论</text>
          </view>
          <view class="review-content">{{ r.content }}</view>
          <view class="review-foot">
            <text class="review-time">{{ formatTime(r.createTime) }}</text>
            <view class="foot-ops">
              <text v-if="r.mine" class="op-del" @tap="onDeleteReview(r)">删除</text>
              <text class="review-like" :class="{ liked: r.liked }" @tap="toggleLikeReview(r)">♥ {{ r.likeCount || 0 }}</text>
            </view>
          </view>

          <!-- 回复列表（「A 回复 B：内容」） -->
          <view v-if="r.comments && r.comments.length" class="comment-list">
            <view v-for="c in r.comments" :key="c.id" class="comment-item">
              <view class="comment-body">
                <text class="comment-name">{{ c.userName }}</text>
                <text v-if="c.parentUserName" class="comment-reply-to">回复 {{ c.parentUserName }}</text>
                <text class="comment-content">：{{ c.content }}</text>
              </view>
              <view class="comment-ops">
                <text v-if="c.mine" class="comment-op op-del" @tap="onDeleteComment(c)">删除</text>
                <text class="comment-op" @tap="replyToComment(r, c)">回复</text>
                <text class="comment-like" :class="{ liked: c.liked }" @tap="toggleLike(c)">♥ {{ c.likeCount || 0 }}</text>
              </view>
            </view>
          </view>

          <!-- 参与讨论 / 在下面提问 -->
          <view class="reply-btn" @tap="replyToReview(r)">
            <text>{{ r.comments && r.comments.length ? '参与讨论' : '回复 / 提问' }}</text>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="hasMore" class="load-more" @tap="loadMore">
          <text>{{ loadingMore ? '加载中…' : '加载更多评论' }}</text>
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

    <!-- 发表评论弹窗（星级可选：不点星即为纯评论/提问） -->
    <view v-if="showReviewPopup" class="popup-mask" @tap="showReviewPopup = false">
      <view class="popup-card" @tap.stop>
        <view class="popup-title">{{ reviewMode === 'review' ? '评价这次租房' : '发表评论' }}</view>
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
          :placeholder="reviewMode === 'review' ? '说说你的入住体验...' : '想问点什么？或者说说你的看法...'"
          :maxlength="500"
        />
        <view class="popup-btn" @tap="submitReview">提交</view>
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
import { getHouseReviews, addReview, addComment, likeReview, likeComment, deleteReview, deleteComment } from '@/api/review'
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
      reviews: { avgRating: 0, totalCount: 0, ratedCount: 0 },   // 平均分+总数+评分人数
      reviewPage: 1,           // 评论分页页码
      reviewPageSize: 10,      // 每页条数
      hasMore: false,          // 是否还有更多评论
      loadingMore: false,      // 加载更多中
      // 评价弹窗
      showReviewPopup: false,
      reviewMode: 'comment',   // comment=纯评论 / review=带星评价
      reviewRating: 0,         // 0 = 不打分
      reviewContent: '',
      reviewSubmitting: false,
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
    /** 加载房源评论（reset=true 时回到第一页） */
    async loadReviews(reset = true) {
      if (reset) {
        this.reviewPage = 1
        this.reviewList = []
      }
      try {
        const res = await getHouseReviews(this.houseId, this.reviewPage, this.reviewPageSize)
        const data = res.data || { records: [], total: 0 }
        const list = data.records || []
        this.reviewList = reset ? list : this.reviewList.concat(list)
        this.hasMore = this.reviewList.length < Number(data.total || 0)
        if (list.length) {
          this.reviews.ratedCount = list[0].ratedCount || 0
          this.reviews.avgRating = list[0].avgRating || 0
          this.reviews.totalCount = list[0].totalCount || 0
        } else if (reset) {
          this.reviews = { avgRating: 0, totalCount: 0, ratedCount: 0 }
        }
      } catch (e) {
        console.log('评论加载失败', e)
      }
    },
    /** 加载更多评论 */
    async loadMore() {
      if (this.loadingMore || !this.hasMore) return
      this.loadingMore = true
      this.reviewPage += 1
      await this.loadReviews(false)
      this.loadingMore = false
    },
    /** 打开评论弹窗（mode=review 时默认 5 星，mode=comment 时默认不打分） */
    openReviewPopup(mode = 'comment') {
      if (!this.userStore.isLogin) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return false
      }
      this.reviewMode = mode
      this.reviewRating = mode === 'review' ? 5 : 0
      this.reviewContent = ''
      this.showReviewPopup = true
      return true
    },
    /** 打开评论弹窗（房源页入口：默认不打分，看房用户也能发） */
    showAddReview() {
      this.openReviewPopup('comment')
    },
    /** 提交评价/评论 */
    async submitReview() {
      if (!this.reviewContent.trim()) {
        uni.showToast({ title: '请输入内容', icon: 'none' })
        return
      }
      if (this.reviewSubmitting) return
      this.reviewSubmitting = true
      try {
        await addReview({
          houseId: Number(this.houseId),
          rating: this.reviewRating > 0 ? this.reviewRating : null,
          content: this.reviewContent.trim()
        })
        this.showReviewPopup = false
        this.loadReviews()
        // showLoading/toast 共用一层遮罩，延后一点再弹，避免被吞
        setTimeout(() => uni.showToast({ title: '发布成功', icon: 'success' }), 100)
      } catch (e) {
        uni.showToast({ title: e.msg || '发布失败', icon: 'none' })
      } finally {
        this.reviewSubmitting = false
      }
    },
    /** 回复评价本身（一级回复） */
    replyToReview(review) {
      this.openReplyModal(review, null, '回复评价')
    },
    /** 在某条回复下追问（parentId 指向该回复，支持「在别人评论下问问题」） */
    replyToComment(review, comment) {
      this.openReplyModal(review, comment, `回复 ${comment.userName}`)
    },
    /** 统一的回复弹窗 */
    openReplyModal(review, comment, title) {
      if (!this.userStore.isLogin) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      uni.showModal({
        title,
        editable: true,
        placeholderText: comment ? `回复 ${comment.userName}…` : '输入回复内容',
        success: async (res) => {
          if (!res.confirm || !res.content || !res.content.trim()) return
          try {
            await addComment(review.id, {
              content: res.content.trim(),
              parentId: comment ? comment.id : null
            })
            this.loadReviews()
            setTimeout(() => uni.showToast({ title: '回复成功', icon: 'success' }), 100)
          } catch (e) {
            uni.showToast({ title: e.msg || '回复失败', icon: 'none' })
          }
        }
      })
    },
    /** 点赞/取消赞（顶楼评价） */
    async toggleLikeReview(review) {
      if (!this.userStore.isLogin) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      if (review.liking) return
      review.liking = true
      const liked = !review.liked
      try {
        await likeReview(review.id, liked)
        review.liked = liked
        review.likeCount = Math.max(0, (review.likeCount || 0) + (liked ? 1 : -1))
      } catch (e) {
        uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
      } finally {
        review.liking = false
      }
    },
    /** 点赞/取消赞（楼中回复） */
    async toggleLike(comment) {
      if (!this.userStore.isLogin) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      if (comment.liking) return
      comment.liking = true
      const liked = !comment.liked
      try {
        await likeComment(comment.id, liked)
        comment.liked = liked
        comment.likeCount = Math.max(0, (comment.likeCount || 0) + (liked ? 1 : -1))
      } catch (e) {
        uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
      } finally {
        comment.liking = false
      }
    },
    formatTime(t) {
      if (!t) return ''
      return t.replace('T', ' ').slice(0, 10)
    },
    /** 删除本人发的评价（只能删自己的，其下回复会一并消失） */
    onDeleteReview(review) {
      const count = (review.comments && review.comments.length) || 0
      uni.showModal({
        title: '删除评价',
        content: count
          ? `删除后这条评价下的 ${count} 条回复也会一并删除，且无法恢复。确定删除？`
          : '删除后无法恢复，确定删除这条评价？',
        confirmText: '删除',
        confirmColor: '#e74c3c',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await deleteReview(review.id)
            this.loadReviews()
            setTimeout(() => uni.showToast({ title: '已删除', icon: 'success' }), 100)
          } catch (e) {
            uni.showToast({ title: e.msg || '删除失败', icon: 'none' })
          }
        }
      })
    },
    /** 删除本人发的回复 */
    onDeleteComment(comment) {
      uni.showModal({
        title: '删除回复',
        content: '删除后无法恢复（它下面的追问也会一并删除），确定删除？',
        confirmText: '删除',
        confirmColor: '#e74c3c',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await deleteComment(comment.id)
            this.loadReviews()
            setTimeout(() => uni.showToast({ title: '已删除', icon: 'success' }), 100)
          } catch (e) {
            uni.showToast({ title: e.msg || '删除失败', icon: 'none' })
          }
        }
      })
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

.review-tag {
  font-size: 22rpx;
  color: #909399;
  background: #f4f4f5;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  margin-left: 12rpx;
}

.house-banner {
  background: #fdf6ec;
  color: #e6a23c;
  font-size: 24rpx;
  line-height: 1.5;
  padding: 18rpx 24rpx;
  margin: 20rpx 20rpx 0;
  border-radius: 12rpx;
}

.review-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8rpx;
}

.foot-ops {
  display: flex;
  align-items: center;
}

.op-del {
  color: #e74c3c;
}

.review-time {
  font-size: 22rpx;
  color: #c0c4cc;
}

.review-like {
  font-size: 24rpx;
  color: #c0c4cc;
  padding: 6rpx 0 6rpx 16rpx;
}

.review-like.liked {
  color: #e74c3c;
}

.comment-list {
  background: #f5f7fa;
  border-radius: 10rpx;
  padding: 6rpx 14rpx;
  margin-top: 12rpx;
}

.comment-item {
  font-size: 24rpx;
  padding: 10rpx 0;
  border-bottom: 1rpx solid #eef0f3;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-body {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
}

.comment-name {
  color: #1a56db;
}

.comment-reply-to {
  color: #909399;
  font-size: 22rpx;
  padding: 0 6rpx;
}

.comment-content {
  color: #606266;
}

.comment-ops {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 6rpx;
}

.comment-op {
  font-size: 22rpx;
  color: #909399;
  padding: 4rpx 0 4rpx 20rpx;
}

.comment-like {
  font-size: 22rpx;
  color: #c0c4cc;
  padding: 4rpx 0 4rpx 20rpx;
}

.comment-like.liked {
  color: #e74c3c;
}

.reply-btn {
  font-size: 24rpx;
  color: #1a56db;
  margin-top: 12rpx;
  display: inline-block;
  padding: 6rpx 0;
}

.load-more {
  text-align: center;
  font-size: 24rpx;
  color: #1a56db;
  padding: 22rpx 0 8rpx;
}

.star-clear {
  text-align: center;
  font-size: 24rpx;
  color: #909399;
  padding: 4rpx 0 16rpx;
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
