// cloudfunctions/llm/index.js
// LLM 菜谱推荐云函数 — 代理 DeepSeek API
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

exports.main = async (event, context) => {
  const { action } = event;

  try {
    switch (action) {
      case 'recommend':
        return await handleRecommend(event);
      case 'detail':
        return await handleDetail(event);
      default:
        return { code: -1, message: `Unknown action: ${action}` };
    }
  } catch (e) {
    console.error('[llm] cloud function error:', e);
    return { code: -1, message: e.message || '云函数执行失败' };
  }
};

/**
 * 调用 DeepSeek Chat API
 */
async function callDeepSeek(messages, maxTokens = 2000) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY 未配置，请在云函数环境变量中设置');
  }

  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek 返回内容为空');
  }
  return content;
}

/**
 * 从 LLM 文本中提取 JSON
 */
function extractJSON(text) {
  // 去掉 markdown 代码块包裹
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // 尝试找到第一个 { 到最后一个 } 之间的内容
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  return JSON.parse(cleaned);
}

/**
 * 推荐菜谱
 */
async function handleRecommend(event) {
  const { ingredients = [], preferences = {}, count = 3, exclude = [] } = event;

  if (ingredients.length === 0) {
    return { code: -1, message: '请至少选择一种食材' };
  }

  const flavorStr = preferences.flavor?.length > 0
    ? preferences.flavor.join('、')
    : '不限';
  const timeStr = preferences.maxMinutes
    ? `${preferences.maxMinutes} 分钟以内`
    : '不限';
  const excludeStr = exclude.length > 0
    ? `\n请不要推荐：${exclude.join('、')}`
    : '';

  const systemPrompt = `你是一位经验丰富的中国家庭料理专家。你的任务是根据用户现有的食材，推荐他们可以做的菜谱。

规则：
- 优先推荐能充分利用已有食材的菜
- 缺少的食材应该是常见调料或基础食材（如葱姜蒜、盐糖酱油等），不要推荐需要稀有食材的菜
- 如果用户有口味偏好，优先匹配
- 如果用户有时间限制，不要推荐超出时间的菜`;

  const userPrompt = `我有以下食材：${ingredients.join('、')}
口味偏好：${flavorStr}
时间限制：${timeStr}${excludeStr}

请推荐 ${count} 道菜，直接返回 JSON（不要 markdown 代码块）：

{
  "recipes": [
    {
      "name": "菜名",
      "minutes": 预计时间(分钟),
      "difficulty": 难度1-3,
      "matchedIngredients": ["我已有的食材名"],
      "missingIngredients": ["缺少的食材名"],
      "reason": "一句话推荐理由"
    }
  ]
}`;

  const content = await callDeepSeek([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 1500);

  const parsed = extractJSON(content);
  return { code: 0, data: parsed.recipes || [] };
}

/**
 * 获取菜谱详细步骤
 */
async function handleDetail(event) {
  const { name, ingredients = [] } = event;

  if (!name) {
    return { code: -1, message: '缺少菜名' };
  }

  const systemPrompt = `你是一位经验丰富的中国家庭厨师。请为用户生成详细的做菜步骤。

要求：
- 步骤控制在 4-6 步，每步都需要清晰的操作说明
- timer 是建议计时秒数（需要计时的步骤填秒数，不需要填 0）
- tips 是一句做这道菜的核心窍门`;

  const userPrompt = `请为"${name}"生成做菜步骤。
${ingredients.length > 0 ? `可用食材：${ingredients.join('、')}` : ''}

直接返回 JSON（不要 markdown 代码块）：

{
  "name": "${name}",
  "minutes": 总时间(分钟),
  "difficulty": 难度1-3,
  "coverEmoji": "用一个 emoji 代表这道菜",
  "steps": [
    {
      "title": "步骤名称",
      "description": "详细操作说明",
      "timer": 秒数
    }
  ],
  "tips": "核心窍门，30字以内"
}`;

  const content = await callDeepSeek([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 1500);

  const parsed = extractJSON(content);
  return { code: 0, data: parsed };
}
