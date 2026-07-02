// services/llm.js - LLM 推荐服务
// 所有 LLM 调用都走后端云函数代理，前端不直接持有 API Key
const { request } = require('../utils/request');

/**
 * 根据食材列表 + 用户偏好获取菜谱推荐
 * @param {string[]} ingredients   食材名称列表，如 ['鸡蛋', '番茄', '青椒']
 * @param {object}   preferences   用户偏好 { flavor, maxMinutes, difficulty }
 * @param {number}   count         推荐数量，默认 3
 * @returns {Promise<Recipe[]>}
 */
const getRecommendations = async (ingredients, preferences = {}, count = 3) => {
  const res = await request({
    url: '/recipes/recommend',
    method: 'POST',
    data: {
      ingredients,
      preferences,
      count,
    },
  });
  return res.data || [];
};

/**
 * 换一批推荐（排除已展示的菜名）
 */
const refreshRecommendations = async (ingredients, preferences, excludeNames = []) => {
  const res = await request({
    url: '/recipes/recommend',
    method: 'POST',
    data: {
      ingredients,
      preferences,
      count: 3,
      exclude: excludeNames,
    },
  });
  return res.data || [];
};

/**
 * 获取菜谱详细步骤（LLM 实时生成）
 */
const getRecipeDetail = async (recipeName, ingredients) => {
  const res = await request({
    url: '/recipes/detail',
    method: 'POST',
    data: { name: recipeName, ingredients },
  });
  return res.data;
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

module.exports = {
  getRecommendations,
  refreshRecommendations,
  getRecipeDetail,
  getFallbackRecommendations,
};
