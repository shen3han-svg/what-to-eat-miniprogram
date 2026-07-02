# 今天吃什么 — 微信小程序

> 告诉我你有什么，我帮你决定今天吃什么。

## 快速上手

1. 用微信开发者工具打开 `miniprogram/` 目录
2. 在 `project.config.json` 中将 `appid` 替换为你的小程序 AppID
3. 在 `utils/request.js` 中将 `BASE_URL` 替换为你的后端域名
4. 在 `app.js` 中将云开发 env id 替换为你的环境 ID
5. 在微信小程序后台配置合法域名（request、upload、download）

## 目录结构

```
miniprogram/
├── app.js / app.json / app.wxss    # 全局入口
├── pages/
│   ├── index/        食材输入首页（拍照/语音/手动）
│   ├── recommend/    AI 推荐结果页
│   ├── cooking/      做菜步骤引导页
│   └── onboarding/   偏好设置页
├── services/
│   ├── llm.js        LLM 推荐 & 菜谱生成（调后端代理）
│   └── vision.js     图像/语音识别（调后端代理）
├── utils/
│   ├── request.js    统一请求封装（含 token 刷新）
│   ├── auth.js       微信静默登录 & Token 管理
│   └── storage.js    本地存储工具
├── constants/
│   └── ingredients.js  常用食材预设库（分类 + 全量）
└── subpackages/
    └── history/      历史记录（按需加载）
```

## 核心数据流

```
用户拍照
  → 图片上传云存储
  → POST /vision/recognize → 食材列表
  → 合并用户偏好
  → POST /recipes/recommend → 2-3 道菜推荐
  → 用户选菜
  → POST /recipes/detail → 步骤列表
  → 分步引导做菜 → 反馈评分
```

## 后端接口清单（需自行实现）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/auth/wechat-login` | POST | code → openid + 自定义 token |
| `/auth/refresh` | POST | refresh_token → 新 access_token |
| `/vision/recognize` | POST | fileID → 食材列表 |
| `/voice/parse-ingredients` | POST | fileID → 食材名称数组 |
| `/recipes/recommend` | POST | 食材 + 偏好 → 菜谱推荐（LLM）|
| `/recipes/detail` | POST | 菜名 + 食材 → 步骤数组（LLM）|

## 性能目标

- 主包大小：≤ 1.2MB
- 首屏加载：≤ 1.5s（中端 Android）
- 拍照到出推荐：≤ 5s（网络正常）
- 超时降级：本地规则引擎兜底，不白屏

## TODO（MVP 后迭代）

- [ ] 后端云函数实现（LLM proxy、视觉 API）
- [ ] TTS 语音播报（步骤朗读）
- [ ] 步骤图片（AI 生成 or 图库）
- [ ] 食材库存持久化
- [ ] 历史记录页完整实现
- [ ] 运营数据埋点
