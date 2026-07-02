// services/llm.js - LLM 推荐服务
// 优先通过云函数调用大模型 API，失败时自动降级到本地数据

/**
 * 调用 LLM 云函数
 * @param {object} data - 传给云函数的参数
 * @returns {Promise<{code: number, data: any}>}
 */
const _callCloudLLM = async (data) => {
  const canUseCloud = wx.cloud && typeof wx.cloud.callFunction === 'function';
  if (!canUseCloud) {
    throw new Error('云开发未初始化');
  }
  const res = await wx.cloud.callFunction({
    name: 'llm',
    data,
  });
  if (res.result && res.result.code === 0) {
    return res.result;
  }
  throw new Error(res.result?.message || '云函数返回错误');
};

/**
 * 根据食材列表 + 用户偏好获取菜谱推荐
 * @param {string[]} ingredients   食材名称列表，如 ['鸡蛋', '番茄', '青椒']
 * @param {object}   preferences   用户偏好 { flavor, maxMinutes, difficulty }
 * @param {number}   count         推荐数量，默认 3
 * @returns {Promise<Recipe[]>}
 */
const getRecommendations = async (ingredients, preferences = {}, count = 3) => {
  try {
    const res = await _callCloudLLM({
      action: 'recommend',
      ingredients,
      preferences,
      count,
    });
    return res.data || [];
  } catch (e) {
    console.warn('[llm] 推荐云函数失败，使用本地降级', e.message);
    return getFallbackRecommendations(ingredients);
  }
};

/**
 * 换一批推荐（排除已展示的菜名）
 */
const refreshRecommendations = async (ingredients, preferences, excludeNames = []) => {
  try {
    const res = await _callCloudLLM({
      action: 'recommend',
      ingredients,
      preferences,
      count: 3,
      exclude: excludeNames,
    });
    return res.data || [];
  } catch (e) {
    console.warn('[llm] 换一批云函数失败，使用本地降级', e.message);
    // 第二轮降级：排除已展示的再排序
    const all = getFallbackRecommendations(ingredients);
    return all.filter((r) => !excludeNames.includes(r.name)).slice(0, 3);
  }
};

/**
 * 获取菜谱详细步骤（优先 LLM 生成，失败降级本地）
 */
const getRecipeDetail = async (recipeName, ingredients) => {
  try {
    const res = await _callCloudLLM({
      action: 'detail',
      name: recipeName,
      ingredients,
    });
    return res.data;
  } catch (e) {
    console.warn('[llm] 详情云函数失败，使用本地降级', e.message);
    const fallback = FALLBACK_RECIPE_STEPS[recipeName];
    if (fallback) {
      return { ...fallback };
    }
    return generateGenericSteps(recipeName, ingredients);
  }
};

// ── 本地降级推荐（网络不可用时使用）──
const FALLBACK_RECIPES = [
  {
    name: '番茄炒蛋',
    minutes: 10,
    difficulty: 1,
    matchedIngredients: ['番茄', '鸡蛋'],
    missingIngredients: [],
    coverEmoji: '🍳',
  },
  {
    name: '蒜蓉炒青菜',
    minutes: 8,
    difficulty: 1,
    matchedIngredients: ['青菜', '大蒜'],
    missingIngredients: [],
    coverEmoji: '🥬',
  },
  {
    name: '煎鸡蛋',
    minutes: 5,
    difficulty: 1,
    matchedIngredients: ['鸡蛋'],
    missingIngredients: [],
    coverEmoji: '🍳',
  },
];

const getFallbackRecommendations = (ingredients) => {
  // 简单按匹配度排序
  return FALLBACK_RECIPES.map((r) => ({
    ...r,
    score: r.matchedIngredients.filter((i) => ingredients.includes(i)).length,
  })).sort((a, b) => b.score - a.score).slice(0, 3);
};

// ── 本地降级步骤（无需后端，MVP 阶段可用）──
const FALLBACK_RECIPE_STEPS = {
  '番茄炒蛋': {
    name: '番茄炒蛋',
    minutes: 10,
    difficulty: 1,
    coverEmoji: '🍳',
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
    name: '蒜蓉炒青菜',
    minutes: 8,
    difficulty: 1,
    coverEmoji: '🥬',
    steps: [
      { title: '备菜', description: '青菜洗净沥干，大蒜切成蒜末备用。', timer: 0 },
      { title: '爆香', description: '热锅倒油，放入蒜末小火煸炒出香味（注意不要炒糊）。', timer: 30 },
      { title: '炒青菜', description: '转大火，倒入青菜快速翻炒，加适量盐。', timer: 180 },
      { title: '调味出锅', description: '青菜变软变色后，加少许蚝油（可选），翻炒均匀即可出锅。', timer: 30 },
    ],
    tips: '青菜一定要大火快炒，保持脆嫩口感。蒜末先下锅爆香是灵魂。',
  },
  '煎鸡蛋': {
    name: '煎鸡蛋',
    minutes: 5,
    difficulty: 1,
    coverEmoji: '🍳',
    steps: [
      { title: '热锅', description: '平底锅中小火烧热，倒入少许油，晃动锅子让油铺满锅底。', timer: 30 },
      { title: '打蛋', description: '将鸡蛋打入锅中，保持中小火，让蛋白慢慢凝固。', timer: 0 },
      { title: '煎制', description: '根据喜好：单面煎（只煎一面，蛋黄流心）或翻面煎（全熟）。撒少许盐和黑胡椒。', timer: 180 },
      { title: '出锅', description: '用锅铲轻轻铲起，盛盘。可以搭配面包或米饭。', timer: 0 },
    ],
    tips: '低温慢煎蛋更嫩。喜欢吃溏心蛋就不要翻面，蛋白凝固即可出锅。',
  },
};

/**
 * 为不在本地库中的菜谱生成通用步骤模板
 */
const generateGenericSteps = (recipeName, ingredients) => {
  return {
    name: recipeName,
    minutes: 15,
    difficulty: 2,
    coverEmoji: '🍽️',
    steps: [
      { title: '准备食材', description: `将 ${ingredients.join('、')} 洗净切好，准备好调料（盐、生抽、油等）。`, timer: 0 },
      { title: '烹饪', description: '热锅倒油，按照食材易熟程度依次下锅翻炒。', timer: 300 },
      { title: '调味', description: '加入适量盐、生抽等调味，翻炒均匀。', timer: 60 },
      { title: '出锅装盘', description: '起锅盛盘，完成！', timer: 0 },
    ],
    tips: '这是通用模板——等后端上线后，AI 会生成更精准的步骤。',
  };
};

module.exports = {
  getRecommendations,
  refreshRecommendations,
  getRecipeDetail,
  getFallbackRecommendations,
};
