# Nest 安居 · 租客端微信小程序

基于 Uni-app (Vue 3) + Pinia 构建的租房平台租客端微信小程序，配套后端见 [Nest_Backend](https://github.com/kamten7/Nest_Backend)，前端房东管理端见 [Nest_frontend](https://github.com/kamten7/Nest_frontend)。

## 技术栈

| 层级 | 技术选型 |
|------|---------|
| 跨平台框架 | Uni-app (Vue 3) + Vite |
| 状态管理 | Pinia |
| 实时通信 | WebSocket（聊天长连接 + 已读回执 + 断线重连） |
| AI 对话 | SSE 流式请求（`/user/ai/chat/stream`） |
| 地图 | 微信原生 `<map>` 组件 + 高德底图 |
| 样式 | rpx 响应式单位，全局工具类 |

## 功能模块

### 已完成

| 模块 | 页面 | 说明 |
|------|------|------|
| **首页** | `pages/index/` | 关键词搜索、城市/价格/排序多维筛选、分页加载、下拉刷新 |
| **地图找房** | `pages/map/` | 微信原生地图、marker 房源标记、视野联动加载、底部房源卡片 |
| **AI 小巢** | `pages/ai/` | SSE 流式对话、快捷提问模板、登录态校验、请求中断 |
| **消息** | `pages/chat/` | 会话列表、未读角标、WebSocket 实时刷新 |
| **聊天详情** | `pages/chatDetail/` | 历史消息拉取、实时收发、已读回执、断线重连消息补齐、去重 |
| **我的** | `pages/my/` | 登录/注册、用户信息展示、菜单导航、退出登录 |
| **房源详情** | `pages/houseDetail/` | 图片轮播、房屋信息、标签、住客评价（发表/回复/点赞）、收藏/取消收藏、预约看房、联系房东（自动建会话） |
| **我的收藏** | `pages/favorite/` | 收藏列表、取消收藏、分页加载 |
| **我的预约** | `pages/appointment/` | 预约列表、状态标签（待确认/已确认/已看房/已取消/已成交）、取消预约 |
| **租房订单** | `pages/rent/` | 订单列表、状态筛选、缴纳押金、分页加载 |
| **订单详情** | `pages/rentDetail/` | 订单详情、缴费记录、缴纳租金、提前支付（1-5月）、退租申请 |
| **我的钱包** | `pages/wallet/` | 余额展示、充值、提现、收支明细流水 |

### 基础设施

| 模块 | 文件 | 说明 |
|------|------|------|
| HTTP 请求 | `utils/request.js` | 封装 `get/post/put/del`，统一拦截 + 错误处理 |
| 环境配置 | `utils/env.js` | 后端 baseUrl 切换（本地/真机） |
| SSE 流式 | `utils/stream.js` | AI 对话流式请求封装 |
| WebSocket | `utils/chatClient.js` + `utils/ws.js` | 全局单连接管理、事件订阅、断线重连 |
| 角标同步 | `utils/tabBadge.js` | 消息 Tab 未读角标实时同步 |
| 用户状态 | `store/user.js` | Pinia 用户 token + 信息持久化 |
| 通知状态 | `store/notification.js` | 全局消息弹窗队列 |
| 消息弹窗 | `components/message-toast/` | 顶部通知弹窗组件 |

## 页面结构

```
TabBar（5 个）
├── 首页      pages/index/
├── 地图      pages/map/
├── AI        pages/ai/
├── 消息      pages/chat/
└── 我的      pages/my/

子页面
├── 房源详情    pages/houseDetail/
├── 聊天详情    pages/chatDetail/
├── 我的收藏    pages/favorite/
├── 我的预约    pages/appointment/
├── 租房订单    pages/rent/
├── 订单详情    pages/rentDetail/
└── 我的钱包    pages/wallet/
```

## 开发环境

| 环境 | 要求 |
|------|------|
| Node.js | >= 18 |
| npm | >= 9 |
| VS Code | 最新版 |
| 微信开发者工具 | 最新版 |
| 后端服务 | `localhost:8080`（见 [Nest_Backend](https://github.com/kamten7/Nest_Backend)） |

### VS Code 推荐插件

| 插件 | 说明 |
|------|------|
| [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) | Vue 3 语法高亮、类型检查 |
| [uni-helper](https://marketplace.visualstudio.com/items?itemName=uni-helper.uni-helper-vscode) | Uni-app 语法提示（`@` 路径补全、`pages.json` 提示、API 提示） |

## 快速开始

### 方式一：VS Code + CLI（推荐）

```bash
# 1. 安装依赖
npm install

# 2. 启动开发编译（watch 模式，文件改动自动重编译）
npm run dev:mp-weixin

# 3. 编译产物输出到 dist/dev/mp-weixin/
#    微信开发者工具 → 导入项目 → 选择 dist/dev/mp-weixin/ 目录

# 4. 微信开发者工具设置
#    详情 → 本地设置 → 勾选「不校验合法域名」
#    （因为后端 baseUrl 是 http://localhost:8080，非 https）

# 5. 生产构建
npm run build:mp-weixin
#    构建产物输出到 dist/build/mp-weixin/
```

**开发流程：** VS Code 编辑代码 → `npm run dev:mp-weixin` 自动编译 → 微信开发者工具自动刷新预览

### 方式二：HBuilderX

```bash
# 1. 安装依赖
npm install

# 2. HBuilderX 打开本目录
#    文件 → 打开目录 → 选择 miniapp/

# 3. 编译运行
#    运行 → 运行到小程序模拟器 → 微信开发者工具
```

## npm 命令说明

| 命令 | 说明 |
|------|------|
| `npm run dev:mp-weixin` | 开发模式编译微信小程序（watch 模式，自动重编译） |
| `npm run build:mp-weixin` | 生产构建微信小程序 |
| `npm run dev:h5` | 开发模式编译 H5（浏览器预览） |
| `npm run build:h5` | 生产构建 H5 |

## 关键配置

| 配置项 | 文件 | 说明 |
|--------|------|------|
| 后端地址 | `utils/env.js` → `baseUrl` | 本地 `http://localhost:8080`，真机改为局域网 IP |
| 微信 AppID | `manifest.json` → `mp-weixin.appid` | 填入你的小程序 AppID |
| Vue 版本 | `manifest.json` → `vueVersion` | 固定 `"3"` |
| Vite 配置 | `vite.config.js` | Uni-app Vite 插件配置 |

## 测试账号

| 角色 | 手机号 | 密码 |
|------|--------|------|
| 租客 | `13900000001` | `123456` |

## 项目结构

```
miniapp/
├── api/                    # 接口定义（chat/rent/review/wallet）
├── components/             # 公共组件（message-toast）
├── pages/                  # 页面目录（12 个页面）
│   ├── index/              # 首页
│   ├── map/                # 地图找房
│   ├── ai/                 # AI 小巢
│   ├── chat/               # 消息列表
│   ├── chatDetail/         # 聊天详情
│   ├── my/                 # 我的
│   ├── houseDetail/        # 房源详情
│   ├── favorite/           # 我的收藏
│   ├── appointment/        # 我的预约
│   ├── rent/               # 租房订单
│   ├── rentDetail/         # 订单详情
│   └── wallet/             # 我的钱包
├── static/tabbar/          # TabBar 图标（10 个 PNG）
├── store/                  # Pinia 状态（user/notification）
├── utils/                  # 工具函数（request/env/stream/ws/chatClient/tabBadge）
├── App.vue                 # 根组件（全局样式 + WebSocket 事件分发）
├── main.js                 # 入口（createSSRApp + Pinia 注册）
├── index.html              # Vite 入口文件
├── vite.config.js          # Vite 编译配置
├── manifest.json           # Uni-app 配置（AppID/平台配置）
├── pages.json              # 路由 + TabBar + 权限声明
├── uni.scss                # 全局 SCSS 变量
└── package.json            # 依赖与脚本命令
```

## 相关仓库

| 仓库 | 说明 |
|------|------|
| [Nest_Backend](https://github.com/kamten7/Nest_Backend) | Spring Boot 3.4.3 后端 API |
| [Nest_frontend](https://github.com/kamten7/Nest_frontend) | Vue 3 房东管理端 |
| **Nest_miniapp**（本仓库） | Uni-app 租客端微信小程序 |
