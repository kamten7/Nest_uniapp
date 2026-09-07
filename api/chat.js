import { get, post } from '@/utils/request'

/** 我的会话列表 */
export function getConversations(page = 1, pageSize = 20) {
  return get('/user/chat/conversations', { page, pageSize })
}

/** 找或创建与某房东的会话，返回会话 ID */
export function createConversation(otherId) {
  return post('/user/chat/create', { otherId })
}

/** 历史消息（打开会话时后端自动标记已读） */
export function getMessages(conversationId, page = 1, pageSize = 50) {
  return get(`/user/chat/messages/${conversationId}`, { page, pageSize })
}

/** 总未读数 */
export function getUnread() {
  return get('/user/chat/unread')
}
