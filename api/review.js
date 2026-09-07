import { get, post } from '@/utils/request'

/** 获取房源评论列表（公开，登录后可看到点赞状态） */
export function getHouseReviews(houseId, page = 1, pageSize = 10) {
  return get(`/user/review/house/${houseId}`, { page, pageSize })
}

/** 发表评论（评分 1-5） */
export function addReview(data) {
  return post('/user/review', data)
}

/** 回复评论 */
export function addComment(reviewId, data) {
  return post(`/user/review/${reviewId}/comment`, data)
}

/** 点赞/取消赞 */
export function likeComment(commentId, liked) {
  return post(`/user/review/comment/${commentId}/like`, { liked })
}
