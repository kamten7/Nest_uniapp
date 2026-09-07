<template>
  <view class="favorite-page">
    <view v-if="list.length" class="list">
      <view v-for="item in list" :key="item.favoriteId" class="fav-card" @tap="goDetail(item.houseId)">
        <image v-if="item.coverImage" class="fav-cover" :src="item.coverImage" mode="aspectFill" />
        <view v-else class="fav-cover placeholder">🏠</view>
        <view class="fav-info">
          <view class="fav-title line-clamp-2">{{ item.houseTitle }}</view>
          <view class="fav-meta">{{ item.district }} · {{ item.area ? item.area + '㎡' : '' }}</view>
          <view class="fav-price price-text">¥{{ item.price }}/月</view>
        </view>
        <view class="fav-remove" @tap.stop="removeFavorite(item)">✕</view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more" @tap="loadMore">加载更多</view>
    </view>

    <view v-else class="empty">
      <view class="empty-icon">🤍</view>
      <view class="empty-text">还没有收藏的房源</view>
      <view class="empty-hint">去首页看看，把喜欢的房子收藏起来</view>
    </view>
  </view>
</template>

<script>
import { get, del } from '@/utils/request'

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
    // 每次进入刷新（可能取消了收藏或新增）
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
        const res = await get('/user/favorite/my', { page: this.page, pageSize: this.pageSize })
        const data = res.data || { records: [], total: 0 }
        this.list = reset ? data.records : this.list.concat(data.records || [])
        this.total = data.total || 0
        this.hasMore = this.list.length < this.total
        if (!reset) this.page++
      } catch (e) {
        uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
      }
    },
    async removeFavorite(item) {
      uni.showModal({
        title: '提示',
        content: '确定取消收藏吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await del(`/user/favorite/${item.houseId}`)
              uni.showToast({ title: '已取消收藏', icon: 'none' })
              this.load(true)
            } catch (e) {
              uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
            }
          }
        }
      })
    },
    goDetail(id) {
      uni.navigateTo({ url: `/pages/houseDetail/index?id=${id}` })
    }
  }
}
</script>

<style scoped>
.favorite-page {
  min-height: 100vh;
}

.list {
  padding: 20rpx;
}

.fav-card {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  position: relative;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.fav-cover {
  width: 200rpx;
  height: 150rpx;
  border-radius: 10rpx;
  flex-shrink: 0;
}

.fav-cover.placeholder {
  background: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 50rpx;
}

.fav-info {
  flex: 1;
  margin-left: 20rpx;
  min-width: 0;
}

.fav-title {
  font-size: 28rpx;
  color: #303133;
}

.fav-meta {
  font-size: 24rpx;
  color: #909399;
  margin-top: 8rpx;
}

.fav-price {
  font-size: 30rpx;
  margin-top: 10rpx;
}

.fav-remove {
  position: absolute;
  right: 16rpx;
  top: 12rpx;
  color: #c0c4cc;
  padding: 8rpx;
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
