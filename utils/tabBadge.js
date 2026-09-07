/**
 * 小程序「消息」Tab 红点同步（服务端总未读数）。
 */
import { getUnread } from '@/api/chat'
import { useUserStore } from '@/store/user'

/** 消息 Tab 在 tabBar 中的下标（0 首页/1 地图/2 AI/3 消息/4 我的） */
const TAB_CHAT_INDEX = 3

export function syncMessageBadge() {
  const store = useUserStore()
  if (!store.isLogin) {
    try {
      uni.removeTabBarBadge({ index: TAB_CHAT_INDEX })
    } catch (e) {
      /* 忽略 */
    }
    return Promise.resolve()
  }
  return getUnread()
    .then((res) => {
      const n = Number((res && res.data) || 0)
      try {
        if (n > 0) {
          uni.setTabBarBadge({ index: TAB_CHAT_INDEX, text: n > 99 ? '99+' : String(n) })
        } else {
          uni.removeTabBarBadge({ index: TAB_CHAT_INDEX })
        }
      } catch (e) {
        /* 当前环境不支持则忽略 */
      }
    })
    .catch(() => {
      /* 请求失败保持现状 */
    })
}