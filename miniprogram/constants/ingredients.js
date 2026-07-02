// constants/ingredients.js - 常用食材预设库（用于手动勾选网格）

const INGREDIENT_CATEGORIES = [
  {
    name: '蛋类',
    icon: '🥚',
    items: ['鸡蛋', '鸭蛋', '皮蛋', '鹌鹑蛋'],
  },
  {
    name: '蔬菜',
    icon: '🥬',
    items: ['番茄', '青椒', '黄瓜', '茄子', '土豆', '洋葱', '大蒜', '生姜',
            '菠菜', '生菜', '西兰花', '白菜', '豆腐', '豆芽'],
  },
  {
    name: '肉类',
    icon: '🥩',
    items: ['猪肉', '牛肉', '鸡肉', '鸡胸肉', '鸡腿', '猪排', '猪肝', '虾'],
  },
  {
    name: '主食',
    icon: '🍚',
    items: ['大米', '面条', '馒头', '面包', '粉丝', '意面'],
  },
  {
    name: '调料',
    icon: '🧂',
    items: ['盐', '生抽', '老抽', '醋', '糖', '淀粉', '料酒', '豆瓣酱', '花椒'],
  },
  {
    name: '菌菇',
    icon: '🍄',
    items: ['香菇', '金针菇', '平菇', '木耳'],
  },
];

// 扁平化食材列表（用于搜索）
const ALL_INGREDIENTS = INGREDIENT_CATEGORIES.flatMap((c) =>
  c.items.map((name) => ({ name, category: c.name, icon: c.icon }))
);

module.exports = { INGREDIENT_CATEGORIES, ALL_INGREDIENTS };
