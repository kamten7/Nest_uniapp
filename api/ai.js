import { get, del } from '@/utils/request'

/** 获取当前租客的 AI 对话历史（服务端只保留最近 20 条，role 只有 user / ai） */
export function getAiMemory() {
  return get('/user/ai/memory')
}

/** 清空当前租客的 AI 对话记忆（下次对话重新开始） */
export function clearAiMemory() {
  return del('/user/ai/memory')
}
