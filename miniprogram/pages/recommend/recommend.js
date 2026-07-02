// pages/recommend/recommend.js - 推荐结果页逻辑
const { refreshRecommendations, getRecipeDetail, getFallbackRecommendations } = require('../../services/llm');

const app = getApp();

Page({
  data: {
    recipes: [],
    loading: true,
    refreshing: false,
    ingredientSummary: '',
    ingredients: [],
  },

  onLoad() {
    // 通过 EventChannel 接收数据（比 URL 参数更好）
    const eventChannel = this.getOpenerEventChannel();
    eventChannel.on('recipesReady', ({ recipes, ingredients }) => {
      const names = ingredients.map((i) => i.name);
      this.setData({
        recipes,
        loading: false,
        ingredients,
        ingredientSummary: names.join('、'),
      });
    });

    // 设置页面分享
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
  },

  // ── 选择菜谱 ──────────────────────────────────────
  async onSelectRecipe(e) {
    const { index } = e.currentTarget.dataset;
    const recipe = this.data.recipes[index];
    const ingredientNames = this.data.ingredients.map((i) => i.name);

    wx.showLoading({ title: '加载步骤…', mask: true });
    try {
      const detail = await getRecipeDetail(recipe.name, ingredientNames);
      wx.hideLoading();

      wx.navigateTo({
        url: '/pages/cooking/cooking',
        success: (res) => {
          res.eventChannel.emit('recipeReady', {
            recipe: { ...recipe, ...detail },
            ingredients: this.data.ingredients,
          });
        },
      });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  },

  // ── 换一批 ──────────────────────────────────────
  async onRefresh() {
    if (this.data.refreshing) return;
    this.setData({ refreshing: true });

    const ingredientNames = this.data.ingredients.map((i) => i.name);
    const prefs = app.globalData.preferences;
    const excludeNames = this.data.recipes.map((r) => r.name);

    try {
      const newRecipes = await refreshRecommendations(ingredientNames, prefs, excludeNames);
      this.setData({ recipes: newRecipes, refreshing: false });
    } catch (e) {
      console.warn('[recommend] refresh failed', e);
      const fallback = getFallbackRecommendations(ingredientNames);
      this.setData({ recipes: fallback, refreshing: false });
      wx.showToast({ title: '网络慢，用了备用方案', icon: 'none' });
    }
  },

  // ── 返回添加食材 ──────────────────────────────────
  onBack() {
    wx.navigateBack();
  },

  // ── WXS 辅助函数（在 WXML 中使用）──────────────────
  difficultyLabel(d) {
    const map = { 0: '', 1: '⭐ 简单', 2: '⭐⭐ 中等', 3: '⭐⭐⭐ 复杂' };
    return map[d] || '';
  },

  // ── 分享 ──────────────────────────────────────────
  onShareAppMessage() {
    return {
      title: `${this.data.ingredientSummary} 能做什么菜？`,
      path: '/pages/index/index',
      imageUrl: '',
    };
  },

  onShareTimeline() {
    return {
      title: '今天吃什么 — 冰箱有什么就做什么',
      query: '',
    };
  },
});
