# 「今天吃什么」微信小程序 — 开发完成概览

## 完成内容

### 项目结构（`miniprogram/`）
原生微信小程序代码（可直接用开发者工具打开），主包 3 个核心页面 + 公共层。

### 核心文件清单

| 文件 | 说明 |
|------|------|
| `app.js / app.json / app.wxss` | 全局入口、路由配置、设计 Token |
| `project.config.json` | 开发工具配置（替换 AppID 即可） |
| `pages/index/` | 食材输入首页：拍照识别 / 语音 / 手动勾选 |
| `pages/recommend/` | AI 推荐结果页：菜谱卡片 / 换一批 / 加载态 |
| `pages/cooking/` | 做菜步骤页：Swiper 分步 / 计时器 / 完成反馈 |
| `pages/onboarding/` | 偏好设置页：时间 / 口味 / 难度 |
| `utils/request.js` | 统一请求封装（401 自动刷新 token）|
| `utils/auth.js` | 微信静默登录 |
| `utils/storage.js` | 本地存储（最近食材、历史记录）|
| `services/llm.js` | LLM 推荐服务 + 本地降级兜底 |
| `services/vision.js` | 图像/语音识别服务 |
| `constants/ingredients.js` | 常用食材预设库（8 大类 60+ 食材）|

### 关键设计决策

1. **页面间数据传递**：用 `EventChannel`（不用 URL query），安全且支持任意数据结构
2. **超时降级**：LLM 失败时自动切换本地规则引擎，不白屏不卡死
3. **Token 刷新**：并发请求只触发一次 refresh（`_refreshPromise` 防重）
4. **步骤格式兜底**：`_normalizeSteps()` 处理 LLM 输出格式不一致

### 下一步（需补齐）

- [ ] 后端 API 实现（LLM proxy + 视觉 API）
- [ ] 替换 AppID、BASE_URL、云开发 env id
- [ ] 注册合法域名
- [ ] 历史记录子包页面实现
