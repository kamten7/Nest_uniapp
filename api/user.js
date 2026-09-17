import { get, put, uploadFile } from '@/utils/request'

/**
 * 租客个人信息（对齐后端 /user/tenant/*）。
 *
 * 字段都是可选的：更新时只传要改的字段，未传的后端保持原值。
 * 手机号当前只校验格式长度（不校验号码真实性），短信验证码为后续上线项。
 */

/** 查询个人信息（昵称 / 头像 / 手机号 / 性别 / 是否已绑手机号） */
export function getProfile() {
  return get('/user/tenant/profile')
}

/** 更新个人信息（昵称 / 手机号 / 头像 / 性别，均可选） */
export function updateProfile(data) {
  return put('/user/tenant/profile', data)
}

/** 上传头像到用户头像专用 bucket，返回 { data: 头像URL }；后端会同时更新资料 */
export function uploadAvatar(filePath) {
  return uploadFile('/user/tenant/avatar', filePath, 'file')
}
