# LLM 接入 - 操作指南

## 你只需要两个东西

| 需要 | 去哪拿 |
|------|--------|
| DeepSeek API Key | [platform.deepseek.com](https://platform.deepseek.com) 注册 → API Keys → 创建 |
| 云开发环境 ID | 微信开发者工具 → 云开发 → 开通 → 环境 ID（类似 `cloud1-xxxxx`） |

## 步骤（5 分钟）

### 1. 开通云开发
- 微信开发者工具打开项目
- 点击工具栏「云开发」图标
- 创建环境（选基础版即可，免费额度够用）
- 记下环境 ID

### 2. 配置环境 ID
编辑 `miniprogram/app.js` 第 22 行：
```js
env: 'cloud1-xxxxx',  // 替换 your-env-id
```

### 3. 配置 API Key
- 云开发控制台 → 云函数 → 环境变量
- 添加 `DEEPSEEK_API_KEY` = 你的 API Key

### 4. 部署云函数
- 在开发者工具左侧文件树，右键 `cloudfunctions/llm` 文件夹
- 选择「上传并部署：云端安装依赖」
- 等待上传完成

### 5. 测试
- 编译运行小程序
- 选择食材 → 点击推荐
- 如果网络正常，应该看到 AI 生成的菜谱（不再是固定的 3 道菜）
- 如果失败，会自动降级回本地菜谱（不影响正常使用）

## 架构说明

```
小程序前端（llm.js）
  → wx.cloud.callFunction('llm')    ← 优先路径
    → DeepSeek API
  → 本地降级菜谱                    ← 失败时自动切换
```
