// pages/index/index.js - 食材输入首页逻辑
const { recognizeIngredients, voiceToIngredients } = require('../../services/vision');
const { getRecommendations, getFallbackRecommendations } = require('../../services/llm');
const { appendRecentIngredients, getRecentIngredients } = require('../../utils/storage');
const { INGREDIENT_CATEGORIES, ALL_INGREDIENTS } = require('../../constants/ingredients');

const app = getApp();

Page({
  data: {
    selectedIngredients: [],  // [{name, fromCamera}]
    recentIngredients: [],    // string[]
    filteredCategories: INGREDIENT_CATEGORIES,
    searchKeyword: '',
    showManual: false,
    isRecording: false,
    loading: false,
    prefLabel: '偏好：不限时间 · 随便口味',
  },

  onLoad() {
    this.setData({
      recentIngredients: getRecentIngredients().slice(0, 12),
    });
    this._updatePrefLabel();
  },

  onShow() {
    this._updatePrefLabel();
  },

  // ── 拍照识别 ──────────────────────────────────────
  async onTakePhoto() {
    try {
      const res = await new Promise((resolve, reject) =>
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['camera', 'album'],
          camera: 'back',
          success: resolve,
          fail: reject,
        })
      );

      const filePath = res.tempFiles[0].tempFilePath;
      wx.showLoading({ title: '正在识别食材…', mask: true });

      const items = await recognizeIngredients(filePath);

      wx.hideLoading();

      if (items.length === 0) {
        wx.showModal({
          title: '没认出来',
          content: '光线可能不太好，换个角度再拍一次？\n或者手动选择食材。',
          confirmText: '手动选',
          cancelText: '再拍',
          success: ({ confirm }) => { if (confirm) this.onOpenManual(); },
        });
        return;
      }

      const newIngredients = items.map((i) => ({ name: i.name, fromCamera: true }));
      this._mergeIngredients(newIngredients);

    } catch (e) {
      wx.hideLoading();
      if (e.errMsg && e.errMsg.includes('cancel')) return;
      wx.showToast({ title: '识别失败，请重试', icon: 'none' });
    }
  },

  // ── 语音输入 ──────────────────────────────────────
  onVoiceStart() {
    this._recorderManager = wx.getRecorderManager();
    this._recorderManager.start({ format: 'mp3', duration: 10000 });
    this.setData({ isRecording: true });
  },

  async onVoiceEnd() {
    this.setData({ isRecording: false });
    this._recorderManager.stop();

    wx.showLoading({ title: '正在解析…', mask: true });
    try {
      const { tempFilePath } = await new Promise((resolve) => {
        this._recorderManager.onStop(resolve);
      });
      const names = await voiceToIngredients(tempFilePath);
      wx.hideLoading();
      if (names.length === 0) {
        wx.showToast({ title: '没听清楚，试试手动选', icon: 'none' });
        return;
      }
      const newIngredients = names.map((name) => ({ name, fromCamera: false }));
      this._mergeIngredients(newIngredients);
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '语音识别失败', icon: 'none' });
    }
  },

  // ── 快捷添加 ──────────────────────────────────────
  onQuickAdd(e) {
    const name = e.currentTarget.dataset.name;
    this._mergeIngredients([{ name, fromCamera: false }]);
  },

  // ── 手动弹窗 ──────────────────────────────────────
  onOpenManual() { this.setData({ showManual: true, searchKeyword: '', filteredCategories: INGREDIENT_CATEGORIES }); },
  onCloseManual() { this.setData({ showManual: false }); },

  onSearch(e) {
    const keyword = e.detail.value.trim();
    this.setData({ searchKeyword: keyword });
    if (!keyword) {
      this.setData({ filteredCategories: INGREDIENT_CATEGORIES });
      return;
    }
    const filtered = INGREDIENT_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => item.includes(keyword)),
    })).filter((cat) => cat.items.length > 0);
    this.setData({ filteredCategories: filtered });
  },

  onToggleIngredient(e) {
    const name = e.currentTarget.dataset.name;
    const list = this.data.selectedIngredients;
    const idx = list.findIndex((i) => i.name === name);
    if (idx >= 0) {
      this.setData({ selectedIngredients: list.filter((_, i) => i !== idx) });
    } else {
      this.setData({ selectedIngredients: [...list, { name, fromCamera: false }] });
    }
  },

  removeIngredient(e) {
    const name = e.currentTarget.dataset.name;
    this.setData({
      selectedIngredients: this.data.selectedIngredients.filter((i) => i.name !== name),
    });
  },

  clearIngredients() {
    this.setData({ selectedIngredients: [] });
  },

  // ── 偏好设置 ──────────────────────────────────────
  onOpenPreferences() {
    wx.navigateTo({ url: '/pages/onboarding/onboarding?mode=prefs' });
  },

  _updatePrefLabel() {
    const prefs = app.globalData.preferences;
    const timeLabel = prefs.maxMinutes > 0 ? `${prefs.maxMinutes}分钟内` : '不限时间';
    const flavorLabel = prefs.flavor?.length > 0 ? prefs.flavor.join('/') : '随便口味';
    this.setData({ prefLabel: `偏好：${timeLabel} · ${flavorLabel}` });
  },

  // ── 推荐 ──────────────────────────────────────────
  async onGetRecommend() {
    const { selectedIngredients } = this.data;
    if (selectedIngredients.length === 0) return;

    this.setData({ loading: true });
    const ingredientNames = selectedIngredients.map((i) => i.name);
    const prefs = app.globalData.preferences;

    // 保存最近使用食材
    appendRecentIngredients(selectedIngredients);

    // 保存到全局，推荐页也需要用
    app.globalData.currentIngredients = selectedIngredients;

    let recipes = [];
    try {
      recipes = await getRecommendations(ingredientNames, prefs);
    } catch (e) {
      // 超时/网络异常 → 降级
      console.warn('[index] LLM failed, using fallback', e);
      recipes = getFallbackRecommendations(ingredientNames);
      wx.showToast({ title: '网络慢，用了备用方案', icon: 'none', duration: 2000 });
    }

    this.setData({ loading: false });
    wx.navigateTo({
      url: `/pages/recommend/recommend`,
      success: (res) => {
        // 通过 EventChannel 传递数据，比 URL 参数更安全可靠
        res.eventChannel.emit('recipesReady', { recipes, ingredients: selectedIngredients });
      },
    });
  },

  // ── 内部工具 ──────────────────────────────────────
  _mergeIngredients(newItems) {
    const existing = new Set(this.data.selectedIngredients.map((i) => i.name));
    const toAdd = newItems.filter((i) => !existing.has(i.name));
    if (toAdd.length > 0) {
      this.setData({ selectedIngredients: [...this.data.selectedIngredients, ...toAdd] });
    }
    if (toAdd.length < newItems.length) {
      wx.showToast({ title: '部分食材已存在', icon: 'none', duration: 1500 });
    }
  },
});
