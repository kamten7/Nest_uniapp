import App from './App'
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'

// Uni-app Vue3 必须导出 createApp 函数（HBuilder 编译要求）
// 与普通 Vue3 的 createApp().mount() 不同，这里是 createSSRApp + 导出工厂
export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())   // 注册 Pinia 状态管理
  return {
    app
  }
}
