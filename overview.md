# LLM 菜谱推荐后端接入 - 完成总结

## 做了什么

为「今天吃什么」小程序接入了 DeepSeek 大模型 API，实现真实的 AI 菜谱推荐。

### 新增文件
- `cloudfunctions/llm/index.js` — 云函数核心代码（推荐 + 详情两个 action）
- `cloudfunctions/llm/package.json` — 云函数依赖配置
- `cloudfunctions/llm/config.json` — Node18 运行时 + 环境变量声明
- `LLM-SETUP.md` — 操作指南

### 修改文件
- `services/llm.js` — 优先调用云函数，失败自动降级本地菜谱
- `app.js` — 添加 wx.cloud.init()
- `app.json` — 添加 "cloud": true
- `project.config.json` — 添加 cloudfunctionRoot

### 架构决策
- 云函数作为 LLM API 代理，前端不直接持有 API Key（安全底线）
- DeepSeek API（¥1/百万 token，中文好，国内直达）
- 保留完整本地降级方案：云函数挂了不影响基本使用
- 推荐和详情共用一个云函数，通过 `action` 参数区分

## 待用户完成
- [ ] 开通微信云开发，获取环境 ID → 填入 `app.js`
- [ ] 注册 DeepSeek，获取 API Key → 配置到云函数环境变量
- [ ] 右键 `cloudfunctions/llm` → 上传并部署

详细步骤见 `LLM-SETUP.md`。
