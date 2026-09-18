import { get, post, del } from '@/utils/request'

/** 获取房源评论列表（公开，登录后可看到点赞状态） */
export function getHouseReviews(houseId, page = 1, pageSize = 10) {
  return get(`/user/review/house/${houseId}`, { page, pageSize })
}

/** 发表评论/评价（rating 传 null 表示不打分，纯评论或提问） */
export function addReview(data) {
  return post('/user/review', data)
}

/** 当前租客是否已评价过该房源（退租后弹评价用） */
export function getMyReviewStatus(houseId) {
  return get(`/user/review/mine/${houseId}`)
}

/** 回复评论；parentId 传某条回复的 id 即「在别人评论下追问」 */
export function addComment(reviewId, data) {
  return post(`/user/review/${reviewId}/comment`, data)
}

/** 点赞/取消赞：顶楼评价 */
export function likeReview(reviewId, liked) {
  return post(`/user/review/${reviewId}/like`, { liked })
}

/** 点赞/取消赞：楼中回复 */
export function likeComment(commentId, liked) {
  return post(`/user/review/comment/${commentId}/like`, { liked })
}

/** 删除本人发表的评价（其下回复与点赞会一并删除） */
export function deleteReview(reviewId) {
  return del(`/user/review/${reviewId}`)
}

/** 删除本人发表的回复（其下追问与点赞会一并删除） */
export function deleteComment(commentId) {
  return del(`/user/review/comment/${commentId}`)
}
