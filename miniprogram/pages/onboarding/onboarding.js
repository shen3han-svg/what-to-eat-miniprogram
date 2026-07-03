// pages/onboarding/onboarding.js
const app = getApp();

Page({
  data: {
    mode: 'first',  // 'first' | 'prefs'
    prefs: {
      flavor: [],
      maxMinutes: 0,
      difficulty: 0,
    },
    flavorOptions: ['家常', '川味', '粤式', '湘菜', '东北菜', '日式', '韩式', '素食'],
  },

  onLoad(options) {
    const mode = options.mode || 'first';
    const prefs = { ...app.globalData.preferences };
    this.setData({ mode, prefs });
  },

  onSelectTime(e) {
    this.setData({ 'prefs.maxMinutes': Number(e.currentTarget.dataset.val) });
  },

  onSelectDifficulty(e) {
    this.setData({ 'prefs.difficulty': Number(e.currentTarget.dataset.val) });
  },

  onToggleFlavor(e) {
    const flavor = e.currentTarget.dataset.flavor;
    let list = [...this.data.prefs.flavor];
    const idx = list.indexOf(flavor);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(flavor);
    this.setData({ 'prefs.flavor': list });
  },

  onSave() {
    app.savePreferences(this.data.prefs);
    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 800);
  },

  onSkip() {
    wx.navigateBack();
  },
});
