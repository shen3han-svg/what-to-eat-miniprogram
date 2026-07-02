// app.js - 全局生命周期与公共数据
const { login } = require('./utils/auth');

App({
  globalData: {
    userInfo: null,
    openid: null,
    // 用户偏好：口味、时间预算、难度
    preferences: {
      flavor: [],       // ['家常', '川味', '粤式', ...]
      maxMinutes: 0,    // 0 = 不限
      difficulty: 0,   // 0=不限 1=简单 2=中等 3=复杂
    },
    // 本次选定的食材（跨页面传递）
    currentIngredients: [],
  },

  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'your-env-id', // TODO: 替换为你的云开发环境 ID
        traceUser: true,
      });
    }
    // 静默登录，获取 openid，不强制用户授权
    this._silentLogin();
    // 读取本地偏好
    this._loadPreferences();
  },

  async _silentLogin() {
    try {
      const user = await login();
      this.globalData.userInfo = user;
      this.globalData.openid = user.openid;
    } catch (e) {
      console.warn('[App] silent login failed', e);
    }
  },

  _loadPreferences() {
    try {
      const prefs = wx.getStorageSync('user_preferences');
      if (prefs) {
        this.globalData.preferences = { ...this.globalData.preferences, ...prefs };
      }
    } catch (e) {
      // 首次使用，使用默认值
    }
  },

  savePreferences(prefs) {
    this.globalData.preferences = { ...this.globalData.preferences, ...prefs };
    wx.setStorageSync('user_preferences', this.globalData.preferences);
  },
});
