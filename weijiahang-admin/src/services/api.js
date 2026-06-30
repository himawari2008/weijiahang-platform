import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data?.data || res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ==================== 管理员认证 ====================
export const adminLogin = (username, password) => api.post('/admin/login', { username, password });

// ==================== 大盘 ====================
export const getDashboard = () => api.get('/admin/dashboard');
export const getPendingTasks = () => api.get('/admin/pending-tasks');

// ==================== 商家审核 ====================
export const getPendingShops = (params) => api.get('/admin/shops/pending', { params });
export const approveShop = (id, approved, reason) => api.put(`/admin/shops/${id}/verify`, { approved, reason });

// ==================== 领航员审核 ====================
export const getPendingNavigators = (params) => api.get('/admin/navigators/pending', { params });
export const approveNavigator = (id, approved, reason) => api.put(`/admin/navigators/${id}/verify`, { approved, reason });

// ==================== 用户管理 ====================
export const getUserList = (params) => api.get('/admin/users', { params });
export const updateUserStatus = (id, status) => api.put(`/admin/users/${id}/status`, { status });

// ==================== 订单纠纷 ====================
export const getDisputes = (params) => api.get('/admin/orders/disputes', { params });
export const resolveDispute = (id, resolution) => api.put(`/admin/orders/${id}/dispute`, resolution);

// ==================== 市场管理 ====================
export const getMarkets = () => api.get('/markets');
export const getMarketsList = () => api.get('/admin/markets/list');
export const createMarket = (data) => api.post('/admin/markets', data);
export const updateMarket = (id, data) => api.put(`/admin/markets/${id}`, data);
export const deleteMarket = (id) => api.delete(`/admin/markets/${id}`);
export const getActiveCities = () => api.get('/markets/city/list');

// ==================== 财务 ====================
export const getFinanceOverview = () => api.get('/admin/finance/overview');
export const getFinanceRecords = (params) => api.get('/admin/finance/records', { params });
export const processWithdraw = (id, approved, reason) => api.put(`/admin/finance/withdraw/${id}`, { approved, reason });

// ==================== 系统配置 ====================
export const getSystemConfig = () => api.get('/admin/system-config');
export const updateSystemConfig = (data) => api.put('/admin/system-config', data);
export const clearCache = () => api.post('/admin/cache/clear');
export const rebuildSearchIndex = () => api.post('/admin/search/rebuild-index');

// ==================== 审计日志 ====================
export const getAuditLogs = (params) => api.get('/admin/audit-logs', { params });
export const getAuditLogDetail = (id) => api.get(`/admin/audit-logs/${id}`);

// ==================== 广告管理 ====================
export const getAdList = (params) => api.get('/admin/ads', { params });
export const createAd = (data) => api.post('/admin/ads', data);
export const updateAd = (id, data) => api.put(`/admin/ads/${id}`, data);
export const deleteAd = (id) => api.delete(`/admin/ads/${id}`);

// ==================== 结算审核 ====================
export const getSettlements = (params) => api.get('/admin/settlements', { params });
export const approveSettlement = (id) => api.put(`/admin/settlements/${id}/approve`);
export const rejectSettlement = (id, reason) => api.put(`/admin/settlements/${id}/reject`, { reason });
export const batchPaySettlements = (ids) => api.post('/admin/settlements/batch-pay', { ids });

// ==================== 评价审核 ====================
export const getReviews = (params) => api.get('/admin/reviews', { params });
export const moderateReview = (id, action) => api.put(`/admin/reviews/${id}`, { action });

// ==================== 营销管理 ====================
export const getMarketingList = (params) => api.get('/admin/marketing', { params });
export const createMarketing = (data) => api.post('/admin/marketing', data);
export const updateMarketing = (id, data) => api.put(`/admin/marketing/${id}`, data);
export const deleteMarketing = (id) => api.delete(`/admin/marketing/${id}`);

// ==================== 信标管理 ====================
export const getBeacons = (params) => api.get('/admin/beacons', { params });
export const createBeacon = (data) => api.post('/admin/beacons', data);
export const updateBeacon = (id, data) => api.put(`/admin/beacons/${id}`, data);
export const deleteBeacon = (id) => api.delete(`/admin/beacons/${id}`);

// ==================== 优惠券管理 ====================
export const getCoupons = (params) => api.get('/admin/coupons', { params });
export const createCoupon = (data) => api.post('/admin/coupons', data);
export const updateCoupon = (id, data) => api.put(`/admin/coupons/${id}`, data);
export const deleteCoupon = (id) => api.delete(`/admin/coupons/${id}`);

// ==================== 采购订单 ====================
export const getProductOrders = (params) => api.get('/admin/product-orders', { params });
export const updateProductOrderStatus = (id, status) => api.put(`/admin/product-orders/${id}/status`, { status });

// ==================== 客户分层 ====================
export const getCustomerTiers = (params) => api.get('/admin/customer-tiers', { params });
export const assignCustomerTier = (userId, customerType) => api.put(`/admin/customer-tiers/${userId}`, { customerType });

// ==================== 消息模板 ====================
export const getMessageTemplates = () => api.get('/admin/message-templates');
export const updateMessageTemplate = (id, data) => api.put(`/admin/message-templates/${id}`, data);

// ==================== 市场分析 ====================
export const getMarketAnalytics = (days) => api.get('/admin/analytics/markets', { params: { days } });

export default api;
