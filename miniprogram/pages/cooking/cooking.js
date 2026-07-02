// pages/cooking/cooking.js - 做菜步骤引导页逻辑
const { appendHistory } = require('../../utils/storage');

Page({
  data: {
    recipe: {},
    steps: [],
    currentStep: 0,
    progressPct: 0,
    timerState: {},    // { [stepIndex]: 'idle' | 'running' | 'done' }
    timerCountdown: 0,
    showDone: false,
    ingredients: [],
  },

  _timerInterval: null,

  onLoad() {
    const eventChannel = this.getOpenerEventChannel();
    eventChannel.on('recipeReady', ({ recipe, ingredients }) => {
      // 校验步骤数据是否合法
      const steps = this._normalizeSteps(recipe.steps || []);
      const timerState = {};
      steps.forEach((_, i) => { timerState[i] = 'idle'; });

      this.setData({
        recipe,
        steps,
        ingredients,
        currentStep: 0,
        progressPct: steps.length > 0 ? (1 / steps.length) * 100 : 0,
        timerState,
      });

      wx.setNavigationBarTitle({ title: recipe.name });
    });
  },

  onUnload() {
    this._clearTimer();
  },

  // ── 步骤切换 ──────────────────────────────────────
  onStepChange(e) {
    const idx = e.detail.current;
    this._goToStep(idx);
  },

  onNextStep() {
    const { currentStep, steps } = this.data;
    if (currentStep < steps.length - 1) {
      this._goToStep(currentStep + 1);
    } else {
      // 最后一步，显示完成弹窗
      this.setData({ showDone: true });
    }
  },

  onPrevStep() {
    const { currentStep } = this.data;
    if (currentStep > 0) this._goToStep(currentStep - 1);
  },

  _goToStep(idx) {
    const { steps } = this.data;
    this._clearTimer();
    this.setData({
      currentStep: idx,
      progressPct: ((idx + 1) / steps.length) * 100,
    });
    // 语音播报当前步骤
    this._speakStep(idx);
  },

  // ── 语音播报 ──────────────────────────────────────
  onSpeak() {
    this._speakStep(this.data.currentStep);
  },

  _speakStep(idx) {
    const step = this.data.steps[idx];
    if (!step) return;
    const text = `第${step.order}步：${step.description}`;
    // 使用微信 TTS（需要先获取 innerAudioContext + wx.downloadFile 方案）
    // 简化实现：直接用 wx.showToast 展示文字（正式版接入 TTS API）
    wx.vibrateShort({ type: 'light' }); // 换步时轻振动提示
  },

  // ── 计时器 ──────────────────────────────────────
  onTimer(e) {
    const { index, seconds } = e.currentTarget.dataset;
    const state = this.data.timerState[index];

    if (state === 'running') {
      // 取消计时
      this._clearTimer();
      this.setData({ [`timerState.${index}`]: 'idle' });
      return;
    }

    this._clearTimer();
    let remaining = seconds;
    this.setData({
      [`timerState.${index}`]: 'running',
      timerCountdown: remaining,
    });

    this._timerInterval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        this._clearTimer();
        this.setData({ [`timerState.${index}`]: 'done' });
        wx.vibrateLong();
        wx.showToast({ title: '计时结束！', icon: 'success' });
      } else {
        this.setData({ timerCountdown: remaining });
      }
    }, 1000);
  },

  _clearTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  },

  // ── 完成反馈 ──────────────────────────────────────
  onFeedback(e) {
    const score = e.currentTarget.dataset.score;
    const { recipe, ingredients } = this.data;
    // 记录烹饪历史
    appendHistory({
      recipeName: recipe.name,
      ingredients: ingredients.map((i) => i.name),
      score,
    });
    wx.showToast({ title: '已记录，下次推荐参考！', icon: 'none', duration: 1500 });
    setTimeout(() => this.setData({ showDone: false }), 1600);
  },

  onBackHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  onShowSteps() {
    // TODO: 步骤目录 sheet（MVP 后迭代）
    const steps = this.data.steps.map((s, i) => `第${s.order}步：${s.description.slice(0, 15)}…`);
    wx.showActionSheet({
      itemList: steps,
      success: ({ tapIndex }) => this._goToStep(tapIndex),
    });
  },

  // ── 分享 ──────────────────────────────────────────
  onShareAppMessage() {
    const { recipe } = this.data;
    return {
      title: `我今晚做了${recipe.name}！`,
      path: '/pages/index/index',
      imageUrl: '',
    };
  },

  // ── 内部工具 ──────────────────────────────────────
  /**
   * 标准化步骤格式，兜底 LLM 输出格式不一致的问题
   */
  _normalizeSteps(raw) {
    if (!Array.isArray(raw) || raw.length === 0) {
      return [{ order: 1, description: '暂无步骤信息', emoji: '🤷', timerSeconds: 0 }];
    }
    return raw.map((s, i) => ({
      order: s.order || i + 1,
      description: s.description || s.text || s.step || String(s),
      emoji: s.emoji || '🥘',
      tip: s.tip || '',
      timerSeconds: s.timerSeconds || s.timer || 0,
    }));
  },
});
