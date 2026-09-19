import { get, post } from '@/utils/request'

/** 我的钱包（余额） */
export function getMyWallet() {
  return get('/user/wallet')
}

/** 充值（模拟，预留微信支付） */
export function recharge(amount) {
  return post('/user/wallet/recharge', { amount })
}

/**
 * 提现（预留微信零钱到账）。
 * @param idempotencyKey 幂等键：调用方在「打开提现弹层」时生成一次，
 *                       同一层内重复提交命中同一键 ⇒ 后端只受理一次（防双击重复扣款）
 */
export function withdraw(amount, idempotencyKey) {
  return post('/user/wallet/withdraw', { amount, idempotencyKey })
}

/** 生成幂等键（小程序环境无 crypto.randomUUID，用时间戳+随机数足够） */
export function genIdempotencyKey() {
  return `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** 钱包流水（分页，可按业务类型筛选） */
export function getTransactions(params = {}) {
  return get('/user/wallet/transactions', params)
}
