# LLM 接入 - 操作指南

## 你只需要做两件事

1. 开通云开发（用于云函数代理模式）
2. 配置 DeepSeek API Key（本地配置文件，不提交 git）


## 步骤（5 分钟）

### 1. 开通云开发
- 微信开发者工具打开项目
- 点击工具栏「云开发」图标
- 创建环境（选基础版即可，免费额度够用）
- 记下环境 ID（类似 `cloud1-xxxxx`）

### 2. 配置环境 ID
编辑 `miniprogram/app.js`，把 `your-env-id` 换成你的环境 ID：
```js
wx.cloud.init({
  env: 'cloud1-xxxxx',  // ← 改这里
  traceUser: true,
});
```

### 3. 配置 API Key（本地文件，不提交 git）
```bash
cp miniprogram/services/config.secret.example.js miniprogram/services/config.secret.js
```
然后编辑 `config.secret.js`，填入你的 DeepSeek API Key：
```js
module.exports = {
  DEEPSEEK_API_KEY: 'sk-你的key',
};
```
> `config.secret.js` 已在 `.gitignore` 中，不会被提交。

### 4. 部署云函数（可选 — 仅云函数代理模式需要）
- 在开发者工具左侧文件树，右键 `cloudfunctions/llm` 文件夹
- 选择「上传并部署：云端安装依赖」
- 云函数通过环境变量读取 Key，需在云开发控制台配置 `DEEPSEEK_API_KEY`

### 5. 测试
- 编译运行小程序
- 选择食材 → 点击推荐
- 看到 AI 生成的菜谱 = 成功
- 如果失败自动降级本地菜谱，不影响使用


## API Key 安全说明

- **前端直调模式**（当前默认）：API Key 存在 `config.secret.js`，小程序编译后打包进代码，适合开发测试
- **云函数代理模式**（推荐生产）：API Key 存在云函数环境变量，前端不接触 Key
- 两种模式的切换在 `services/llm.js` 中配置
- 无论哪种模式，真实 Key 都不会进入 git（`config.secret.js` 和 `config.json` 均在 `.gitignore` 中）


## 架构说明

```
小程序前端（llm.js）
  ├─ wx.request → DeepSeek API     ← 前端直调（当前默认，Key 在 config.secret.js）
  ├─ wx.cloud.callFunction('llm')  ← 云函数代理（推荐生产，Key 在环境变量）
  └─ 本地降级菜谱                    ← 失败时自动切换
```
