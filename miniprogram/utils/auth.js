// utils/auth.js - 微信登录 & Token 管理
const { request } = require('./request');

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

/**
 * 静默登录（不弹授权弹窗），获取 openid + 自定义 token
 */
const login = () => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async ({ code }) => {
        try {
          const res = await request({
            url: '/auth/wechat-login',
            method: 'POST',
            data: { code },
            skipAuth: true, // 防止循环 401
          });
          wx.setStorageSync(TOKEN_KEY, res.data.access_token);
          wx.setStorageSync(REFRESH_KEY, res.data.refresh_token);
          resolve(res.data.user);
        } catch (e) {
          reject(e);
        }
      },
      fail: reject,
    });
  });
};

const getToken = () => wx.getStorageSync(TOKEN_KEY) || '';

const clearTokens = () => {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(REFRESH_KEY);
};

/**
 * 无感刷新 token
 */
const refreshToken = async () => {
  const refreshTk = wx.getStorageSync(REFRESH_KEY);
  if (!refreshTk) throw new Error('no_refresh_token');
  const res = await request({
    url: '/auth/refresh',
    method: 'POST',
    data: { refresh_token: refreshTk },
    skipAuth: true,
  });
  wx.setStorageSync(TOKEN_KEY, res.data.access_token);
  return res.data.access_token;
};

module.exports = { login, getToken, clearTokens, refreshToken };
