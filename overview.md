# API Key 安全清理 - 完成总结

## 问题

DeepSeek API Key (`sk-f35a54fd...`) 曾被硬编码在多个文件中并提交到 git，泄露在 27 条 commit 历史中。

## 做了什么

### 1. Git 历史重写（git filter-repo）
- 安装 `git-filter-repo`，用 `--replace-text` 将所有 commit 中的真实 Key 替换为 `REDACTED_KEY_PREFIX`
- 两轮替换：完整 Key → 截断前缀，确保零残留
- 验证：`git log --all -p -S "sk-f35a54fd"` 返回空

### 2. 外部配置文件方案
- `miniprogram/services/config.secret.js` — 本地存放真实 Key，已加入 `.gitignore`
- `miniprogram/services/config.secret.example.js` — 模板文件，可安全提交
- `llm.js` 第 4 行：`const { DEEPSEEK_API_KEY } = require('./config.secret')`
- `cloudfunctions/llm/config.json` — `git rm --cached` 取消跟踪（保留本地文件）

### 3. 清理泄露源
- 删除 `scrub_key.py`（临时脚本，含真实 Key）
- 删除 `config.secret.js.bak`（备份文件，含真实 Key）
- 删除 `replacements.txt`（filter-repo 临时配置）
- `git stash drop` 清除含 Key 的 stash

### 4. 文档更新
- `LLM-SETUP.md` 补充 `config.secret.js` 配置步骤和安全说明
- 更新架构图，反映前端直调 + 云函数代理双模式

## 当前状态

| 检查项 | 状态 |
|--------|------|
| git 历史含真实 Key | 0 条 |
| git 跟踪文件含真实 Key | 0 个 |
| config.secret.js 在 .gitignore | ✓ |
| config.json 不再被跟踪 | ✓ |
| git stash | 空 |
| 临时文件 | 已删除 |
| git remote | 已恢复 |

## ⚠️ 待用户操作

由于 git 历史被重写，所有 commit hash 已变更，需要 **force push** 覆盖远程：

```bash
git push --force-with-lease origin main
```

> `--force-with-lease` 比 `--force` 更安全：如果远程有别人新推的 commit 会拒绝，防止覆盖他人工作。
> 
> 按用户习惯，不自动 push，等明确指令后执行。

## 额外建议

- **轮换 API Key**：尽管 git 历史已清理，但 Key 曾暴露在 GitHub 上，建议去 DeepSeek 控制台吊销旧 Key、生成新 Key
- 更新 `config.secret.js` 中的新 Key
