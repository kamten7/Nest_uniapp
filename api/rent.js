import { get, post } from '@/utils/request'

/** 确认租房（看房结束后创建订单） */
export function confirmRent(appointmentId) {
  return post('/user/rent/confirm', { appointmentId })
}

/** 用钱包缴纳押金 */
export function payDeposit(orderId) {
  return post(`/user/rent/${orderId}/pay-deposit`)
}

/** 我的租房订单（分页，可按状态过滤） */
export function getMyRentOrders(params = {}) {
  return get('/user/rent/my', params)
}

/** 订单详情（含缴费记录与退租信息） */
export function getRentDetail(orderId) {
  return get(`/user/rent/${orderId}`)
}

/** 缴纳当月租金（period 缺省取订单的 nextDuePeriod） */
export function payRent(orderId, period) {
  return post(`/user/rent/${orderId}/pay-rent`, { period })
}

/** 提前支付未来 N（1-5）个月房租 */
export function payAhead(orderId, months) {
  return post(`/user/rent/${orderId}/pay-ahead`, { months })
}

/** 申请退租 */
export function terminateRent(orderId, remark) {
  return post(`/user/rent/${orderId}/terminate`, { remark })
}
