// utils/request.js - 统一网络请求封装
// 支持：自动带 token、401 自动刷新、超时、错误统一处理

const BASE_URL = 'https://api.example.com/v1'; // TODO: 替换为真实域名

let _refreshPromise = null; // 防止并发刷新

const request = (options) => {
  const { url, method = 'GET', data = {}, header = {}, skipAuth = false } = options;

  const token = skipAuth ? '' : (wx.getStorageSync('access_token') || '');

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...header,
      },
      timeout: 10000,
      success: async (res) => {
        if (res.statusCode === 401 && !skipAuth) {
          // Token 过期，刷新后重试
          try {
            if (!_refreshPromise) {
              const { refreshToken } = require('./auth');
              _refreshPromise = refreshToken().finally(() => { _refreshPromise = null; });
            }
            await _refreshPromise;
            // 重试一次
            resolve(await request(options));
          } catch (e) {
            const { clearTokens, login } = require('./auth');
            clearTokens();
            login().catch(() => {});
            reject({ code: 401, message: '登录状态已过期，请重新打开小程序' });
          }
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const msg = res.data?.message || res.data?.msg || `请求失败 (${res.statusCode})`;
          // 只在非生产模式展示详细错误
          console.error(`[request] ${method} ${url} → ${res.statusCode}`, res.data);
          reject({ code: res.statusCode, message: msg });
        }
      },
      fail: (err) => {
        console.error(`[request] network error`, err);
        reject({ code: -1, message: '网络连接失败，请检查网络后重试' });
      },
    });
  });
};

/**
 * 上传图片到云存储（直接调用微信云开发）
 * @param {string} filePath 本地临时文件路径
 * @param {string} cloudPath 云端路径，如 'ingredients/xxx.jpg'
 */
const uploadFile = (filePath, cloudPath) => {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (res) => resolve(res.fileID),
      fail: reject,
    });
  });
};

module.exports = { request, uploadFile };
