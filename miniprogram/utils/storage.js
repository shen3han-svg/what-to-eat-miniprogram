// utils/storage.js - 本地存储工具
const KEYS = {
  PREFERENCES: 'user_preferences',
  HISTORY: 'cook_history',
  RECENT_INGREDIENTS: 'recent_ingredients',
};

const get = (key, defaultVal = null) => {
  try {
    const v = wx.getStorageSync(key);
    return v !== '' ? v : defaultVal;
  } catch {
    return defaultVal;
  }
};

const set = (key, value) => {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {
    console.warn('[storage] set failed', key, e);
  }
};

/**
 * 追加最近常用食材（最多保留 20 条）
 */
const appendRecentIngredients = (ingredients) => {
  let recent = get(KEYS.RECENT_INGREDIENTS, []);
  const names = ingredients.map((i) => i.name);
  // 去重 + 置顶
  recent = [...new Set([...names, ...recent])].slice(0, 20);
  set(KEYS.RECENT_INGREDIENTS, recent);
};

const getRecentIngredients = () => get(KEYS.RECENT_INGREDIENTS, []);

/**
 * 追加历史烹饪记录
 */
const appendHistory = (record) => {
  let history = get(KEYS.HISTORY, []);
  history.unshift({ ...record, time: Date.now() });
  history = history.slice(0, 50); // 最多 50 条
  set(KEYS.HISTORY, history);
};

const getHistory = () => get(KEYS.HISTORY, []);

module.exports = {
  KEYS,
  get,
  set,
  appendRecentIngredients,
  getRecentIngredients,
  appendHistory,
  getHistory,
};
