<template>
  <view class="home-page">
    <!-- 全局消息弹窗（收到新消息/预约时顶部弹出） -->
    <message-toast />

    <!-- 搜索框 -->
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索房源标题、描述..."
        confirm-type="search"
        @confirm="onSearch"
      />
      <view class="search-btn" @tap="onSearch">搜索</view>
    </view>

    <!-- 顶部筛选栏 -->
    <view class="filter-bar">
      <picker :range="cities" @change="onCityChange">
        <view class="filter-item">
          {{ city || '全部城市' }} ▾
        </view>
      </picker>
      <picker :range="priceRanges" range-key="label" @change="onPriceChange">
        <view class="filter-item">
          {{ priceLabel }} ▾
        </view>
      </picker>
      <view class="filter-item sort" @tap="toggleSort">
        {{ sortLabel }} ▾
      </view>
    </view>

    <!-- 房源列表 -->
    <view v-if="houses.length" class="house-list">
      <view
        v-for="house in houses"
        :key="house.id"
        class="house-card"
        @tap="goDetail(house.id)"
      >
        <image
          v-if="house.coverImage"
          class="house-cover"
          :src="house.coverImage"
          mode="aspectFill"
        />
        <view v-else class="house-cover placeholder">🏠</view>
        <view class="house-info">
          <view class="house-title line-clamp-2">{{ house.title }}</view>
          <view class="house-tags" v-if="house.tags && house.tags.length">
            <text v-for="t in house.tags.slice(0, 3)" :key="t" class="tag">{{ t }}</text>
          </view>
          <view class="house-meta">
            <text class="house-district">{{ house.district }}</text>
            <text v-if="house.distanceText" class="house-distance">{{ house.distanceText }}</text>
          </view>
          <view class="house-price price-text">¥{{ house.price }}/月</view>
        </view>
      </view>
    </view>

    <!-- 空态 -->
    <view v-if="!houses.length && !loading" class="empty">
      <text>还没有房源</text>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading">加载中...</view>
  </view>
</template>

<script>
import { get } from '@/utils/request'

export default {
  data() {
    return {
      houses: [],
      loading: false,
      page: 1,
      pageSize: 10,
      total: 0,
      hasMore: true,
      // 筛选
      city: '',
      cities: ['全部城市', '湛江市'],
      priceIndex: 0,
      priceRanges: [
        { label: '全部价格', min: null, max: null },
        { label: '¥1000以下', min: null, max: 1000 },
        { label: '¥1000-2000', min: 1000, max: 2000 },
        { label: '¥2000-3000', min: 2000, max: 3000 },
        { label: '¥3000以上', min: 3000, max: null }
      ],
      sortBy: '',
      sortLabel: '最新',
      keyword: ''
    }
  },
  computed: {
    priceLabel() {
      return this.priceRanges[this.priceIndex].label
    }
  },
  onLoad() {
    this.loadHouses(true)
  },
  onPullDownRefresh() {
    this.loadHouses(true).then(() => uni.stopPullDownRefresh())
  },
  onReachBottom() {
    if (this.hasMore) this.loadHouses(false)
  },
  methods: {
    async loadHouses(reset) {
      if (this.loading) return
      if (reset) {
        this.page = 1
        this.hasMore = true
      }
      if (!this.hasMore) return

      this.loading = true
      try {
        const range = this.priceRanges[this.priceIndex]
        // 关键：null/undefined 参数会序列化成字符串 "null" 传给后端，导致 BigDecimal 转换失败 → 400
        // 所以先构建参数对象，再剔除 null/undefined 的键，只把有效值传给后端
        const params = {
          page: this.page,
          pageSize: this.pageSize,
          city: this.city === '全部城市' ? '' : this.city,
          minPrice: range.min,
          maxPrice: range.max,
          sortBy: this.sortBy,
          keyword: this.keyword
        }
        // 剔除 null/undefined/空字符串的键
        Object.keys(params).forEach((k) => {
          if (params[k] === null || params[k] === undefined || params[k] === '') {
            delete params[k]
          }
        })
        const res = await get('/user/house/list', params)
        const data = res.data || { records: [], total: 0 }
        const records = data.records || []
        this.houses = reset ? records : this.houses.concat(records)
        this.total = data.total || 0
        this.hasMore = this.houses.length < this.total
        if (!reset) this.page++
      } catch (e) {
        uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    onSearch() {
      this.loadHouses(true)
    },
    onCityChange(e) {
      this.city = this.cities[Number(e.detail.value)]
      this.loadHouses(true)
    },
    onPriceChange(e) {
      this.priceIndex = Number(e.detail.value)
      this.loadHouses(true)
    },
    toggleSort() {
      // 最新 ↔ 价格升序 ↔ 价格降序 轮换
      if (!this.sortBy) {
        this.sortBy = 'price_asc'
        this.sortLabel = '价格↑'
      } else if (this.sortBy === 'price_asc') {
        this.sortBy = 'price_desc'
        this.sortLabel = '价格↓'
      } else {
        this.sortBy = ''
        this.sortLabel = '最新'
      }
      this.loadHouses(true)
    },
    goDetail(id) {
      uni.navigateTo({ url: `/pages/houseDetail/index?id=${id}` })
    }
  }
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}

.search-bar {
  display: flex;
  background: #fff;
  padding: 16rpx 20rpx 0;
  gap: 12rpx;
}

.search-input {
  flex: 1;
  background: #f5f7fa;
  border-radius: 30rpx;
  padding: 12rpx 24rpx;
  font-size: 26rpx;
}

.search-btn {
  background: #1a56db;
  color: #fff;
  border-radius: 30rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  font-size: 26rpx;
}

.filter-bar {
  display: flex;
  background: #fff;
  padding: 20rpx;
  gap: 16rpx;
  position: sticky;
  top: 0;
  z-index: 10;
}

.filter-item {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  color: #303133;
  background: #f5f7fa;
  border-radius: 30rpx;
  padding: 12rpx 0;
}

.house-list {
  padding: 0 20rpx 40rpx;
}

.house-card {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  margin-top: 20rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.house-cover {
  width: 220rpx;
  height: 160rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background: #f0f2f5;
}

.house-cover.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60rpx;
}

.house-info {
  flex: 1;
  margin-left: 20rpx;
  min-width: 0;
}

.house-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #303133;
}

.house-tags {
  display: flex;
  gap: 8rpx;
  margin-top: 8rpx;
  flex-wrap: wrap;
}

.tag {
  font-size: 20rpx;
  color: #1a56db;
  background: #ecf3ff;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}

.house-meta {
  display: flex;
  gap: 16rpx;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #909399;
}

.house-price {
  margin-top: 10rpx;
  font-size: 32rpx;
}

.empty {
  text-align: center;
  padding: 120rpx 0;
  color: #909399;
}

.loading {
  text-align: center;
  padding: 20rpx;
  color: #909399;
  font-size: 24rpx;
}
</style>
