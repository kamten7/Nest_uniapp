# Nest 安居 · 租客端微信小程序

面向租房平台的租客端微信小程序，基于 Uni-app (Vue 3) + Vite + Pinia 构建，提供房源检索、地图找房、AI 智能找房、房东实时沟通、预约看房、租房订单与钱包等完整租客侧能力。

- 后端 API：Spring Boot 服务
- 房东管理端：Vue 3 Web 应用
- 本仓库：租客端小程序

---

## 一、项目说明

### 1.1 项目定位

租客端应用，覆盖「找房 → 咨询 → 预约 → 签约 → 缴费 → 退租」的完整租房链路。前端不直连数据库，全部通过后端 REST 接口与 WebSocket 长连接交互。

### 1.2 功能模块

| 模块 | 页面目录 | 能力说明 |
|------|----------|----------|
| 首页 | `pages/index/` | 关键词搜索、城市/价格/排序多维筛选、分页加载、下拉刷新 |
| 地图找房 | `pages/map/` | 微信原生地图组件、房源 marker 标注、视野联动加载、底部房源卡片 |
| AI 找房助手 | `pages/ai/` | 流式对话、快捷提问模板、登录态校验、请求中断 |
| 消息 | `pages/chat/` | 会话列表、未读角标、长连接实时刷新 |
| 聊天详情 | `pages/chatDetail/` | 历史消息拉取、实时收发、已读回执、断线重连补齐、消息去重 |
| 我的 | `pages/my/` | 登录/注册、用户信息、菜单导航、退出登录 |
| 房源详情 | `pages/houseDetail/` | 图片轮播、房屋信息、标签、住客评价、收藏、预约看房、联系房东 |
| 我的收藏 | `pages/favorite/` | 收藏列表、取消收藏、分页加载 |
| 我的预约 | `pages/appointment/` | 预约列表、状态流转展示、取消预约 |
| 租房订单 | `pages/rent/` | 订单列表、状态筛选、缴纳押金、分页加载 |
| 订单详情 | `pages/rentDetail/` | 订单详情、缴费记录、缴纳租金、提前支付、退租申请 |
| 我的钱包 | `pages/wallet/` | 余额展示、充值、提现、收支明细流水 |

### 1.3 页面与路由

```
TabBar（5 个）
├── 首页      pages/index/index
├── 地图      pages/map/index
├── AI        pages/ai/index
├── 消息      pages/chat/index
└── 我的      pages/my/index

子页面
├── 房源详情    pages/houseDetail/index
├── 聊天详情    pages/chatDetail/index
├── 我的收藏    pages/favorite/index
├── 我的预约    pages/appointment/index
├── 租房订单    pages/rent/index
├── 订单详情    pages/rentDetail/index
└── 我的钱包    pages/wallet/index
```

页面注册、导航栏样式、TabBar 图标与地理位置权限声明统一维护在 `pages.json`。

### 1.4 目录结构

```
.
├── api/                      # 接口定义（按业务域拆分）
│   ├── chat.js               #   会话 / 消息 / 未读数
│   ├── rent.js               #   租房订单 / 押金 / 租金 / 退租
│   ├── review.js             #   住客评价 / 回复 / 点赞
│   └── wallet.js             #   钱包 / 充值 / 提现 / 流水
├── components/
│   └── message-toast/        #   顶部全局通知弹窗
├── pages/                    # 页面（12 个）
├── static/tabbar/            # TabBar 图标
├── store/                    # Pinia 状态
│   ├── user.js               #   token 与用户信息（持久化）
│   └── notification.js       #   全局通知队列
├── utils/
│   ├── request.js            #   HTTP 请求封装（拦截 + 统一错误处理）
│   ├── env.js                #   环境地址配置
│   ├── stream.js             #   SSE 流式请求封装
│   ├── ws.js                 #   WebSocket 连接 / 心跳 / 重连
│   ├── chatClient.js         #   全局单连接管理与事件订阅
│   └── tabBadge.js           #   消息 Tab 未读角标同步
├── App.vue                   # 根组件：全局样式 + WebSocket 事件分发
├── main.js                   # 入口：createSSRApp + Pinia 注册
├── manifest.json             # Uni-app 应用配置
├── pages.json                # 路由 / TabBar / 权限声明
├── vite.config.js            # Vite 编译配置
└── package.json              # 依赖与脚本
```

---

## 二、技术栈

| 层级 | 选型 |
|------|------|
| 跨平台框架 | Uni-app（Vue 3 语法）+ Vite 5 |
| 状态管理 | Pinia 2 |
| 实时通信 | WebSocket 长连接（心跳保活、自动重连、已读回执） |
| 流式对话 | SSE（基于 `wx.request` 的 `enableChunked` 分块接收） |
| 地图 | 微信原生 `<map>` 组件 |
| 样式方案 | `rpx` 响应式单位 + 全局工具类 |
| 代码组织 | 业务域分层的 `api / utils / store / components` 结构 |

---

## 三、环境要求

| 依赖 | 版本要求 |
|------|----------|
| Node.js | >= 18 |
| npm | >= 9 |
| VS Code | 最新版 |
| 微信开发者工具 | 最新版（基础库 >= 2.20.1，SSE 流式能力依赖） |
| 后端服务 | 需同时启动 HTTP 接口服务与 WebSocket 长连接服务，见第四节 |

### VS Code 推荐插件

| 插件 | 用途 |
|------|------|
| Vue - Official (Volar) | Vue 3 语法高亮与类型检查 |
| uni-helper | Uni-app 语法提示、`@` 路径补全、`pages.json` 提示 |

---

## 四、启动说明

### 4.1 安装依赖

```bash
npm install
```

### 4.2 启动开发编译

```bash
npm run dev:mp-weixin
```

该命令以 **watch 模式**运行，输出到 `dist/dev/mp-weixin/`，源码变更后自动重新编译。**编译进程需保持运行**，无需手动重复执行构建。

### 4.3 微信开发者工具配置

1. 打开微信开发者工具，选择 **导入项目**。
2. 项目目录选择**编译产物目录**：

   ```
   dist/dev/mp-weixin
   ```

   > 注意：不是仓库根目录。选择错误会出现找不到 `app.json` 或页面空白。
3. 在 **详情 → 本地设置** 中勾选：

   ```
   不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书
   ```

   本地开发环境下前后端均未使用 HTTPS，不勾选会被域名校验拦截。

### 4.4 后端服务

前端依赖后端提供两类服务：

| 服务 | 默认地址 | 用途 |
|------|----------|------|
| HTTP 接口 | `http://localhost:8080` | REST 接口、登录、AI 流式对话 |
| WebSocket 长连接 | `ws://localhost:8081` | 聊天实时收发、已读回执 |

两者**端口不同**，需分别启动；地址在 `utils/env.js` 中配置，详见第五节。

### 4.5 生产构建

```bash
npm run build:mp-weixin     # 产物输出到 dist/build/mp-weixin/
```

### 4.6 npm 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev:mp-weixin` | 开发模式编译微信小程序（watch） |
| `npm run build:mp-weixin` | 生产构建微信小程序 |
| `npm run dev:h5` | 开发模式编译 H5（浏览器预览） |
| `npm run build:h5` | 生产构建 H5 |

---

## 五、配置信息

### 5.1 环境地址（`utils/env.js`）

HTTP 接口与 WebSocket 长连接由后端的不同服务提供，**端口不同，必须分别配置**：

| 导出项 | 说明 |
|--------|------|
| `baseUrl` | HTTP 接口地址，默认 `http://localhost:8080` |
| `wsBaseUrl` | WebSocket 地址，默认 `ws://localhost:8081` |

> `wsBaseUrl` 不能由 `baseUrl` 推导得出，两者协议与端口均不同。
> 真机调试时两行都要改为开发机的局域网 IP，例如：
> ```js
> export const baseUrl = 'http://192.168.x.x:8080'
> export const wsBaseUrl = 'ws://192.168.x.x:8081'
> ```

### 5.2 小程序配置

| 配置项 | 文件 | 说明 |
|--------|------|------|
| 小程序 AppID | `project.config.json` → `appid` | **本地文件，不进仓库**（见下方「本地配置」） |
| Vue 版本 | `manifest.json` → `vueVersion` | 固定为 `"3"` |
| 路由 / TabBar / 权限 | `pages.json` | 页面注册、导航栏、位置权限声明 |
| 编译配置 | `vite.config.js` | 源码根目录不在 `src/`，通过 `UNI_INPUT_DIR` 覆盖为项目根目录 |

#### 本地配置：AppID 不进仓库

`project.config.json` 含个人小程序 AppID，**已被 `.gitignore` 忽略**，仓库只提交模板 `project.config.json.example`。首次拉取代码后：

```bash
cp project.config.json.example project.config.json
```

再把其中的 `appid` 改成你自己的小程序 AppID 即可。

- 编译时 appid **取自 `project.config.json`**，会写入产物 `dist/*/mp-weixin/project.config.json`（产物目录不进仓库，也不会泄露）。
- `manifest.json` 的 `mp-weixin.appid` 保持留空 —— 它不参与产物生成。
- 若 `appid` 为空，产物会退化为微信的 `touristappid`（游客模式），仍可编译运行，但无法真机调试与上传。


### 5.3 与后端的接口约定

| 约定项 | 内容 |
|--------|------|
| 认证方式 | 请求头 `authentication` 携带租客端 JWT，由 `utils/request.js` 统一注入 |
| 响应结构 | `{ code, msg, data }`，`code === 1` 表示成功 |
| 分页结构 | 数据位于 `data.records`，总数位于 `data.total`，请求参数为 `page` / `pageSize` |
| 登录态失效 | 返回 HTTP 401 时自动清除本地登录态、关闭长连接并提示重新登录 |
| 长连接协议 | 客户端上行 `chat` / `read_receipt` / `typing` / `heartbeat`；服务端下行 `chat` / `read_receipt` / `appointment` |
| 流式对话 | `POST /user/ai/chat/stream`，SSE 格式：`data: <文本片段>` 逐段返回，`data: [DONE]` 结束，`data: [ERROR] <原因>` 表示异常 |

### 5.4 真机与生产环境注意事项

- **真机调试**：`localhost` 不成立，需将 `baseUrl` 与 `wsBaseUrl` 均改为局域网 IP，并确保开发机防火墙放通对应端口。
- **正式发布**：微信要求 `request` 与 `socket` 域名在管理后台配置备案，且必须为 HTTPS / WSS。WebSocket 使用 `wss://` 地址时需同步更新 `wsBaseUrl`。
- **端口收敛建议**：生产环境可通过反向代理将 WebSocket 路径（如 `/ws`）转发至长连接服务，使前端只暴露单一域名与端口，简化域名报备。

---

## 六、使用说明

### 6.1 日常开发流程

```
VS Code 编辑源码
      ↓
npm run dev:mp-weixin（watch 自动重编译）
      ↓
微信开发者工具自动刷新预览
```

### 6.2 新增页面

1. 在 `pages/` 下创建页面目录与 `index.vue`。
2. 在 `pages.json` 的 `pages` 数组中注册路径与导航栏样式；如需出现在底部导航，同步加入 `tabBar.list` 并准备普通态 / 选中态两张图标。
3. 若页面需要新的后端接口，在 `api/` 下按业务域补充方法，统一通过 `utils/request.js` 发起请求。

### 6.3 实时通信机制

全局只维护**一条** WebSocket 长连接，由 `utils/chatClient.js` 单例管理，各页面通过 `onChatEvent` 订阅事件，避免多页面重复建连导致消息重复。

| 机制 | 实现方式 |
|------|----------|
| 建立时机 | 登录后由 `App.vue` 的 `onShow` 调用 `ensureChatConnected()`，幂等 |
| 鉴权 | token 置于连接地址 query 中，路径携带身份标识；服务端校验 token 与路径身份一致 |
| 心跳 | 每 30 秒发送一次，防止长连接被空闲回收 |
| 断线重连 | 间隔递增重试，达上限后交由应用层重新建立 |
| 离线补齐 | 连接恢复与小程序回到前台时，重新拉取会话列表与历史消息，与实时推送按消息 ID 去重 |
| 已读回执 | 阅读会话时上行回执，服务端标记已读并回推发送方，气泡状态翻转为「已读」 |

### 6.4 AI 流式对话

`utils/stream.js` 基于 `wx.request` 的分块接收能力实现 SSE 解析，逐段渲染到气泡，支持中途中断请求。该能力依赖微信基础库 >= 2.20.1，低版本会给出明确提示。

### 6.5 常见问题

| 现象 | 排查方向 |
|------|----------|
| 提示「不在以下 request 合法域名列表中」 | 开发者工具未勾选「不校验合法域名」。注意 `project.private.config.json` 中 `urlCheck` 为 `true` 时会开启校验，且该文件每次编译会由源码复制覆盖，建议直接将源码中的该项改为 `false` |
| 接口正常但聊天无响应 | 确认 `wsBaseUrl` 指向长连接服务的正确端口，且该服务已启动、端口未被占用 |
| 长连接频繁断开 | 检查客户端心跳间隔是否小于服务端空闲超时时间；网络切换后由重连机制恢复 |
| 白屏或找不到 `app.json` | 微信开发者工具导入的目录应为编译产物 `dist/dev/mp-weixin`，而非仓库根目录 |
| 登录后立即跳回登录页 | 登录态已失效或后端服务不可用，检查后端及其依赖服务状态 |
