<template>
  <view class="map-page">
    <!-- 全局消息弹窗 -->
    <message-toast />
    <!-- 微信内置地图（高德底图），markers 绑定房源标记 -->
    <map
      id="houseMap"
      class="house-map"
      :latitude="centerLat"
      :longitude="centerLng"
      :markers="markers"
      :scale="13"
      show-location
      @regionchange="onRegionChange"
      @markertap="onMarkerTap"
    />

    <!-- 底部房源卡片（点击 marker 后显示） -->
    <view v-if="currentHouse" class="house-card">
      <image v-if="currentHouse.coverImage" class="card-cover" :src="currentHouse.coverImage" mode="aspectFill" />
      <view class="card-info">
        <view class="card-title line-clamp-2">{{ currentHouse.title }}</view>
        <view class="card-price price-text">¥{{ currentHouse.price }}/月</view>
        <view class="card-btn" @tap="goDetail">查看详情</view>
      </view>
      <view class="card-close" @tap="currentHouse = null">✕</view>
    </view>
  </view>
</template>

<script>
import { get } from '@/utils/request'

export default {
  data() {
    return {
      centerLat: 21.27,      // 默认湛江霞山区
      centerLng: 110.40,
      markers: [],
      currentHouse: null,
      _loading: false
    }
  },
  onLoad() {
    this.loadMarkers()
  },
  methods: {
    /** 地图视野变化（拖动/缩放结束）→ 按当前视野重新加载标记 */
    onRegionChange(e) {
      if (e.type !== 'end') return  // 只在地图停止移动后加载
      const { latitude, longitude } = e.detail || {}
      if (latitude && longitude) {
        this.centerLat = latitude
        this.centerLng = longitude
        this.loadMarkers()
      }
    },
    /** 加载当前视野内的房源标记（bounds 模式） */
    async loadMarkers() {
      if (this._loading) return
      this._loading = true
      try {
        // 以当前中心点为中心，周边 20km（覆盖整个湛江城区，转 bounds 由后端 GeoUtils.boundingBox 处理）
        // 之前 5000 太窄，距离 5km+ 的房源被过滤，地图只显示 1 个
        const res = await get('/user/house/map', {
          lat: this.centerLat,
          lng: this.centerLng,
          radius: 20000
        })
        const houses = res.data || []
        this.markers = houses
          .filter(h => h.latitude && h.longitude)
          .map(h => ({
            id: h.id,
            latitude: h.latitude,
            longitude: h.longitude,
            width: 30,
            height: 40,
            callout: {
              content: `¥${h.price}`,
              display: 'BYCLICK',
              fontSize: 12,
              borderRadius: 6,
              padding: 4,
              bgColor: '#ffffff',
              color: '#e74c3c'
            }
          }))
      } catch (e) {
        console.log('地图加载失败', e)
      } finally {
        this._loading = false
      }
    },
    /** 点击标记 → 显示底部卡片 */
    async onMarkerTap(e) {
      const id = e.detail?.markerId
      const house = this.markers.find(m => m.id === id)
      if (!house) return
      try {
        const res = await get(`/user/house/detail/${id}`)
        this.currentHouse = res.data
      } catch (err) {
        uni.showToast({ title: '加载详情失败', icon: 'none' })
      }
    },
    goDetail() {
      if (this.currentHouse) {
        uni.navigateTo({ url: `/pages/houseDetail/index?id=${this.currentHouse.id}` })
      }
    }
  }
}
</script>

<style scoped>
.map-page {
  height: 100vh;
  position: relative;
}

.house-map {
  width: 100%;
  height: 100%;
}

.house-card {
  position: fixed;
  bottom: 30rpx;
  left: 30rpx;
  right: 30rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.15);
}

.card-cover {
  width: 180rpx;
  height: 130rpx;
  border-radius: 10rpx;
  flex-shrink: 0;
}

.card-info {
  flex: 1;
  margin-left: 20rpx;
}

.card-title {
  font-size: 28rpx;
  color: #303133;
}

.card-price {
  font-size: 30rpx;
  margin-top: 8rpx;
}

.card-btn {
  margin-top: 10rpx;
  background: #1a56db;
  color: #fff;
  text-align: center;
  border-radius: 30rpx;
  padding: 10rpx 0;
  font-size: 26rpx;
}

.card-close {
  position: absolute;
  right: 16rpx;
  top: 12rpx;
  color: #909399;
  padding: 8rpx;
}
</style>
