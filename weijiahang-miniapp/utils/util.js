// ============================================
// 为家航 — 通用工具函数
// ============================================

/** 格式化价格 */
const formatPrice = (price, unit = '元') => {
  if (price >= 10000) {
    return `${(price / 10000).toFixed(1)}万${unit}`;
  }
  return `${price}${unit}`;
};

/** 格式化距离 */
const formatDistance = (meters) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  if (meters < 1) {
    return '<1m';
  }
  return `${Math.round(meters)}m`;
};

/** 格式化时间 */
const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

/** 品类图标映射 */
const categoryIcons = {
  '瓷砖': '🧱', '地板': '🪵', '卫浴': '🚿', '门窗': '🚪',
  '涂料': '🎨', '灯具': '💡', '橱柜': '🗄️', '石材': '🪨',
  '五金': '🔧', '软装': '🛋️', '定制': '📐', '辅材': '📦',
};

const getCategoryIcon = (category) => {
  return categoryIcons[category] || '📌';
};

/** 服务类型中文 */
const serviceTypeLabels = {
  'navigation': '导航单',
  'accompany': '陪逛单',
  'inspection': '验货单',
};

/** 订单状态中文 + 颜色 */
const orderStatusConfig = {
  'pending':    { label: '待接单', color: '#FAAD14' },
  'accepted':   { label: '已接单', color: '#1890FF' },
  'arrived':    { label: '已到达', color: '#52C41A' },
  'serving':    { label: '服务中', color: '#52C41A' },
  'completed':  { label: '已完成', color: '#999' },
  'cancelled':  { label: '已取消', color: '#FF4D4F' },
  'abnormal':   { label: '异常',   color: '#FF4D4F' },
};

module.exports = {
  formatPrice,
  formatDistance,
  formatTime,
  categoryIcons,
  getCategoryIcon,
  serviceTypeLabels,
  orderStatusConfig,
};
