# LLM 接入 - 操作指南

## 你只需要做一件事：开通云开发并部署云函数

前置条件：已有 DeepSeek API Key（请在 `miniprogram/services/config.secret.js` 中配置）


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

### 3. 配置 API Key（二选一）

**方式 A（推荐）：云控制台环境变量**
- 云开发控制台 → 云函数 → 环境变量
- 添加键值对：`DEEPSEEK_API_KEY` = `your-deepseek-api-key-here`

**方式 B（快速）：直接改 config.json**
- 编辑 `cloudfunctions/llm/config.json`，填上 API Key
- ⚠️ 此方式 API Key 会随代码部署到云函数，不算最安全，但 MVP 够用


### 4. 部署云函数
- 在开发者工具左侧文件树，右键 `cloudfunctions/llm` 文件夹
- 选择「上传并部署：云端安装依赖」
- 等待上传完成

### 5. 测试
- 编译运行小程序
- 选择食材 → 点击推荐
- 看到 AI 生成的菜谱 = 成功
- 如果失败自动降级本地菜谱，不影响使用


## 架构说明

```
小程序前端（llm.js）
  → wx.cloud.callFunction('llm')    ← 优先路径
    → DeepSeek API
  → 本地降级菜谱                    ← 失败时自动切换
```
