import { get, post } from '@/utils/request'

/** 我的钱包（余额） */
export function getMyWallet() {
  return get('/user/wallet')
}

/** 充值（模拟，预留微信支付） */
export function recharge(amount) {
  return post('/user/wallet/recharge', { amount })
}

/** 提现（预留微信零钱到账） */
export function withdraw(amount) {
  return post('/user/wallet/withdraw', { amount })
}

/** 钱包流水（分页，可按业务类型筛选） */
export function getTransactions(params = {}) {
  return get('/user/wallet/transactions', params)
}
