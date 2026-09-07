import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'path'

// Uni-app Vite CLI 默认从 src/ 读取源码
// 本项目源码在根目录，通过 UNI_INPUT_DIR 覆盖默认路径
process.env.UNI_INPUT_DIR = path.resolve(process.cwd())

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni()
  ]
})
