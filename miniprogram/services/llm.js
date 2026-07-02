// services/llm.js - LLM 推荐服务
// 直接调用 DeepSeek API，失败时自动降级到本地数据

const DEEPSEEK_API_KEY = '__DEEPSEEK_API_KEY_REMOVED__';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

/**
 * 从 LLM 文本中提取 JSON
 */
const _extractJSON = (text) => {
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return JSON.parse(cleaned);
};

/**
 * 调用 DeepSeek Chat API
 */
const _callDeepSeek = (messages, maxTokens = 1500) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${DEEPSEEK_BASE_URL}/chat/completions`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      data: {
        model: 'deepseek-chat',
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      },
      success(res) {
        console.log('[DeepSeek] response status:', res.statusCode, 'data:', res.data);
        if (res.statusCode === 200 && res.data && res.data.choices) {
          const content = res.data.choices[0]?.message?.content;
          if (content) {
            resolve(content);
          } else {
            reject(new Error('DeepSeek 返回内容为空'));
          }
        } else {
          reject(new Error(`DeepSeek API 错误 ${res.statusCode}: ${JSON.stringify(res.data)}`));
        }
      },
      fail(err) {
        console.error('[DeepSeek] request failed:', err);
        reject(new Error(`网络请求失败: ${err.errMsg || '未知错误'}`));
      },
    });
  });
};

/**
 * 推荐菜谱 — 调用 DeepSeek
 */
const _deepseekRecommend = async (ingredients, preferences, count, exclude) => {
  const flavorStr = preferences.flavor?.length > 0
    ? preferences.flavor.join('、')
    : '不限';
  const timeStr = preferences.maxMinutes
    ? `${preferences.maxMinutes} 分钟以内`
    : '不限';
  const excludeStr = exclude?.length > 0
    ? `\n请不要推荐：${exclude.join('、')}`
    : '';

  const content = await _callDeepSeek([
    {
      role: 'system',
      content: '你是一位经验丰富的中国家庭料理专家。根据用户现有的食材推荐可做的菜谱。优先推荐能充分利用已有食材的菜，缺少的食材应为常见调料或基础食材。时间限制和口味偏好要严格遵守。直接返回 JSON，不要 markdown。',
    },
    {
      role: 'user',
      content: `我有以下食材：${ingredients.join('、')}
口味偏好：${flavorStr}
时间限制：${timeStr}${excludeStr}

请推荐 ${count} 道菜，直接返回 JSON：
{
  "recipes": [
    {
      "name": "菜名",
      "minutes": 时间(分钟),
      "difficulty": 难度1-3,
      "matchedIngredients": ["已有食材"],
      "missingIngredients": ["缺少食材"],
      "coverEmoji": "一个emoji",
      "reason": "一句话理由"
    }
  ]
}`,
    },
  ]);

  const parsed = _extractJSON(content);
  return parsed.recipes || [];
};

/**
 * 菜谱详细步骤 — 调用 DeepSeek
 */
const _deepseekDetail = async (recipeName, ingredients) => {
  const content = await _callDeepSeek([
    {
      role: 'system',
      content: '你是一位经验丰富的中国家庭厨师。请生成详细的做菜步骤，4-6步。timer 是建议计时秒数（不需要计时的填 0）。tips 是核心窍门，30字以内。直接返回 JSON。',
    },
    {
      role: 'user',
      content: `请为"${recipeName}"生成做菜步骤。
${ingredients?.length > 0 ? `可用食材：${ingredients.join('、')}` : ''}

直接返回 JSON：
{
  "name": "${recipeName}",
  "minutes": 总时间(分钟),
  "difficulty": 难度1-3,
  "coverEmoji": "用一个 emoji 代表这道菜",
  "steps": [
    { "title": "步骤名", "description": "详细操作", "timer": 秒数 }
  ],
  "tips": "核心窍门"
}`,
    },
  ]);

  return _extractJSON(content);
};

// ── 公开 API（优先调 DeepSeek，失败自动降级）──

/**
 * 根据食材列表 + 用户偏好获取菜谱推荐
 */
const getRecommendations = async (ingredients, preferences = {}, count = 3) => {
  try {
    return await _deepseekRecommend(ingredients, preferences, count, []);
  } catch (e) {
    console.warn('[llm] 推荐 API 失败，使用本地降级', e.message);
    wx.showToast({ title: 'AI 服务暂时不可用，使用推荐菜谱', icon: 'none', duration: 3000 });
    return getFallbackRecommendations(ingredients);
  }
};

/**
 * 换一批推荐（排除已展示的菜名）
 */
const refreshRecommendations = async (ingredients, preferences, excludeNames = []) => {
  try {
    return await _deepseekRecommend(ingredients, preferences, 3, excludeNames);
  } catch (e) {
    console.warn('[llm] 换一批 API 失败，使用本地降级', e.message);
    const all = getFallbackRecommendations(ingredients);
    return all.filter((r) => !excludeNames.includes(r.name)).slice(0, 3);
  }
};

/**
 * 获取菜谱详细步骤（优先 DeepSeek 生成，失败降级本地）
 */
const getRecipeDetail = async (recipeName, ingredients) => {
  try {
    return await _deepseekDetail(recipeName, ingredients);
  } catch (e) {
    console.warn('[llm] 详情 API 失败，使用本地降级', e.message);
    const fallback = FALLBACK_RECIPE_STEPS[recipeName];
    if (fallback) return { ...fallback };
    return generateGenericSteps(recipeName, ingredients);
  }
};

// ── 本地降级推荐 ──
const FALLBACK_RECIPES = [
  { name: '番茄炒蛋', minutes: 10, difficulty: 1, matchedIngredients: ['番茄', '鸡蛋'], missingIngredients: [], coverEmoji: '🍳' },
  { name: '蒜蓉炒青菜', minutes: 8, difficulty: 1, matchedIngredients: ['青菜', '大蒜'], missingIngredients: [], coverEmoji: '🥬' },
  { name: '煎鸡蛋', minutes: 5, difficulty: 1, matchedIngredients: ['鸡蛋'], missingIngredients: [], coverEmoji: '🍳' },
];

const getFallbackRecommendations = (ingredients) => {
  return FALLBACK_RECIPES.map((r) => ({
    ...r,
    score: r.matchedIngredients.filter((i) => ingredients.includes(i)).length,
  })).sort((a, b) => b.score - a.score).slice(0, 3);
};

// ── 本地降级步骤 ──
const FALLBACK_RECIPE_STEPS = {
  '番茄炒蛋': {
    name: '番茄炒蛋', minutes: 10, difficulty: 1, coverEmoji: '🍳',
    steps: [
      { title: '备菜', description: '番茄洗净切小块，鸡蛋打入碗中加少许盐搅匀。', timer: 0 },
      { title: '炒蛋', description: '热锅倒油，油温七成热时倒入蛋液，快速翻炒至凝固后盛出备用。', timer: 120 },
      { title: '炒番茄', description: '锅中再加少许油，倒入番茄块翻炒，加半勺糖帮助出汁。', timer: 180 },
      { title: '合炒', description: '番茄出汁后将炒好的鸡蛋倒回锅中，翻炒均匀，加盐调味。', timer: 60 },
      { title: '出锅', description: '撒上葱花点缀（可选），盛盘上桌。', timer: 0 },
    ],
    tips: '番茄炒蛋的秘诀：鸡蛋先炒盛出，番茄单独炒出汁再合炒，这样蛋嫩番茄香。',
  },
  '蒜蓉炒青菜': {
    name: '蒜蓉炒青菜', minutes: 8, difficulty: 1, coverEmoji: '🥬',
    steps: [
      { title: '备菜', description: '青菜洗净沥干，大蒜切成蒜末备用。', timer: 0 },
      { title: '爆香', description: '热锅倒油，放入蒜末小火煸炒出香味（注意不要炒糊）。', timer: 30 },
      { title: '炒青菜', description: '转大火，倒入青菜快速翻炒，加适量盐。', timer: 180 },
      { title: '调味出锅', description: '青菜变软变色后，加少许蚝油（可选），翻炒均匀即可出锅。', timer: 30 },
    ],
    tips: '青菜一定要大火快炒，保持脆嫩口感。蒜末先下锅爆香是灵魂。',
  },
  '煎鸡蛋': {
    name: '煎鸡蛋', minutes: 5, difficulty: 1, coverEmoji: '🍳',
    steps: [
      { title: '热锅', description: '平底锅中小火烧热，倒入少许油，晃动锅子让油铺满锅底。', timer: 30 },
      { title: '打蛋', description: '将鸡蛋打入锅中，保持中小火，让蛋白慢慢凝固。', timer: 0 },
      { title: '煎制', description: '根据喜好：单面煎或翻面煎。撒少许盐和黑胡椒。', timer: 180 },
      { title: '出锅', description: '用锅铲轻轻铲起，盛盘。可以搭配面包或米饭。', timer: 0 },
    ],
    tips: '低温慢煎蛋更嫩。喜欢吃溏心蛋就不要翻面，蛋白凝固即可出锅。',
  },
};

const generateGenericSteps = (recipeName, ingredients) => ({
  name: recipeName, minutes: 15, difficulty: 2, coverEmoji: '🍽️',
  steps: [
    { title: '准备食材', description: `将 ${ingredients.join('、')} 洗净切好，准备好调料。`, timer: 0 },
    { title: '烹饪', description: '热锅倒油，按食材易熟程度依次下锅翻炒。', timer: 300 },
    { title: '调味', description: '加入适量盐、生抽等调味，翻炒均匀。', timer: 60 },
    { title: '出锅装盘', description: '起锅盛盘，完成！', timer: 0 },
  ],
  tips: '这是通用模板——DeepSeek 生成失败时的兜底方案。',
});

module.exports = {
  getRecommendations,
  refreshRecommendations,
  getRecipeDetail,
  getFallbackRecommendations,
};
