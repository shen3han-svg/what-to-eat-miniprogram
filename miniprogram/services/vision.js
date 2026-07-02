// services/vision.js - 图像识别服务（食材识别）
const { request } = require('../utils/request');
const { uploadFile } = require('../utils/request');

/**
 * 拍照识别食材
 * 1. 将本地图片上传云存储
 * 2. 后端调用视觉 AI（混元/通义千问）识别食材
 * @param {string} filePath  wx.chooseMedia 返回的临时文件路径
 * @returns {Promise<Ingredient[]>}
 */
const recognizeIngredients = async (filePath) => {
  // Step 1: 上传到云存储
  const timestamp = Date.now();
  const cloudPath = `ingredients/${timestamp}.jpg`;
  const fileID = await uploadFile(filePath, cloudPath);

  // Step 2: 请求后端识别
  const res = await request({
    url: '/vision/recognize',
    method: 'POST',
    data: { fileID },
  });

  // 过滤置信度低于 0.6 的结果
  const items = (res.data || []).filter((item) => (item.confidence || 1) >= 0.6);
  return items;
};

/**
 * 语音转食材列表
 * @param {string} filePath  录音临时文件路径
 * @returns {Promise<string[]>}  食材名称列表
 */
const voiceToIngredients = async (filePath) => {
  const timestamp = Date.now();
  const cloudPath = `voice/${timestamp}.mp3`;
  const fileID = await uploadFile(filePath, cloudPath);

  const res = await request({
    url: '/voice/parse-ingredients',
    method: 'POST',
    data: { fileID },
  });
  return res.data?.ingredients || [];
};

module.exports = { recognizeIngredients, voiceToIngredients };
