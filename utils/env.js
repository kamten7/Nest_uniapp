// ==================== 环境配置 ====================
// HTTP 接口（REST / 登录 / AI 的 SSE 流）→ Spring Boot / Tomcat
// 本地开发：后端跑在 localhost:8080
// 微信开发者工具需勾选「详情 → 本地设置 → 不校验合法域名」
// 真机调试：改成电脑的局域网 IP，如 http://192.168.x.x:8080
export const baseUrl = 'http://localhost:8080'

// WebSocket 聊天长连接 → Netty（★ 独立端口，与 HTTP 不是同一个）
// 切换到 Netty 后长连接不再走 8080，必须单独配置，不能由 baseUrl 派生。
// 真机调试：改成电脑的局域网 IP，如 ws://192.168.x.x:8081
export const wsBaseUrl = 'ws://localhost:8081'
