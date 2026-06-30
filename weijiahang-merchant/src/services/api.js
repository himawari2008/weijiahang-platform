import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000, // 15秒超时
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** 获取当前店铺ID（登录后由 ShopContext 写入 localStorage） */
function getShopId() {
  return localStorage.getItem('shopId') || '';
}

api.interceptors.response.use(
  // 使用 ?? 而非 ||，避免 0/false/空字符串 被误判为无效
  (res) => res.data?.data ?? res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('shopId');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ==================== 认证 ====================
export const merchantLogin = (data) => api.post('/auth/merchant-login', data);

// ==================== 店铺 ====================
export const getMarkets = () => api.get('/markets');
export const getShopInfo = () => api.get('/shops/mine');
export const saveShopInfo = (data) => api.put('/shops/mine', data);
export const getShopStats = () => api.get('/shops/mine/stats');
export const getDashboard = () => api.get('/shops/mine/dashboard');
export const getShopHealth = () => api.get(`/shop-health/${getShopId()}`);

// ==================== 商品 ====================
export const getProducts = (params) => api.get('/products', { params });
export const getProductById = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', { ...data, shopId: getShopId() });
export const updateProduct = (id, data) => api.patch(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const batchUpdateProducts = (ids, data) => api.put('/products/batch', { ids, ...data, shopId: getShopId() });
export const batchDeleteProducts = (ids) => api.delete('/products/batch', { data: { ids, shopId: getShopId() } });

// ==================== 订单 ====================
export const getShopOrders = (params) => api.get(`/orders/shop/${getShopId()}`, { params });
export const getOrderDetail = (id) => api.get(`/orders/${id}`);
export const updateOrderStatus = (id, status) => api.put(`/orders/${id}/status`, { status, operatorType: 'shop' });
export const batchConfirmOrders = (ids) => api.put('/orders/batch-confirm', { ids, shopId: getShopId() });
export const fulfillOrder = (id, data) => api.post(`/orders/${id}/ready`, { shopId: getShopId(), ...data });
export const exportOrders = (params) => api.get(`/orders/shop/${getShopId()}`, { params, responseType: 'blob' });

// ==================== 评价管理 ====================
export const getShopReviews = (params) => api.get(`/reviews/shop/${getShopId()}`, { params });
export const replyToReview = (id, data) => api.post(`/reviews/${id}/reply`, data);
export const disputeReview = (id, data) => api.post(`/reviews/${id}/hide`, data);

// ==================== 客户管理 ====================
export const getShopCustomers = (params) => api.get(`/merchant-crm/customers/${getShopId()}`, { params });
export const updateCustomerTags = (customerId, tags) => api.put(`/merchant-crm/customers/${getShopId()}/${customerId}/tags`, { tags });
export const updateCustomerNote = (customerId, notes) => api.put(`/merchant-crm/customers/${getShopId()}/${customerId}/notes`, { notes });

// ==================== 营销中心 ====================
export const getShopActivities = (params) => api.get(`/marketing/activities/${getShopId()}`, { params });
export const createActivity = (data) => api.post('/marketing/activities', { shopId: getShopId(), ...data });
export const updateActivity = (id, data) => api.put(`/marketing/activities/${id}`, { shopId: getShopId(), ...data });
export const toggleActivityStatus = (id, action) => api.put(`/marketing/activities/${id}/${action}`);
export const deleteActivity = (id) => api.delete(`/marketing/activities/${id}`);
export const getPlatformActivities = () => api.get('/marketing/platform');
export const joinPlatformActivity = (id) => api.post(`/marketing/platform/${id}/join`, { shopId: getShopId() });

// ==================== 推广管理 ====================
export const getMyAds = () => api.get(`/ads/shop/${getShopId()}`);
export const createAd = (data) => api.post('/ads', { shopId: getShopId(), ...data });
export const pauseAd = (id) => api.patch(`/ads/${id}/status`, { status: 0 });
export const resumeAd = (id) => api.patch(`/ads/${id}/status`, { status: 1 });

// ==================== 经营分析 ====================
export const getAnalytics = (params) => api.get(`/analytics/shop/${getShopId()}`, { params });

// ==================== 财务管理 ====================
export const getFinanceSummary = () => api.get(`/merchant-finance/overview/${getShopId()}`);
export const getFinanceTransactions = (params) => api.get(`/merchant-finance/transactions/${getShopId()}`, { params });
export const exportFinanceTransactions = (params) => api.get(`/merchant-finance/transactions/${getShopId()}`, { params, responseType: 'blob' });
export const getWithdrawals = (params) => api.get(`/merchant-finance/withdrawals/${getShopId()}`, { params });
export const applyWithdrawal = (data) => api.post('/merchant-finance/withdraw', { shopId: getShopId(), ...data });

export default api;
