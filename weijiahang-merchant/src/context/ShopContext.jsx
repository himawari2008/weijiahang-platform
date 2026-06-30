import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const ShopContext = createContext(null);

/**
 * 店铺信息全局上下文
 * 避免每个页面重复调用 getShopInfo()
 */
export function ShopProvider({ children }) {
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchShop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getShopInfo();
      setShop(data);
      // 将店铺ID写入localStorage，供api.js使用
      if (data?.id) {
        localStorage.setItem('shopId', data.id);
      }
    } catch (err) {
      setError(err.message);
      // API不可用时，不阻塞UI（页面有mock降级）
      setShop({ id: 'local', name: '我的店铺' });
    } finally {
      setLoading(false);
    }
  }, []);

  /** 更新店铺信息（局部更新，不重新请求） */
  const updateShop = useCallback((partial) => {
    setShop((prev) => (prev ? { ...prev, ...partial } : partial));
  }, []);

  return (
    <ShopContext.Provider value={{ shop, loading, error, fetchShop, updateShop }}>
      {children}
    </ShopContext.Provider>
  );
}

/** 获取店铺上下文的 Hook */
export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) {
    // 如果不在 ShopProvider 内，返回降级空值
    return { shop: null, loading: false, error: null, fetchShop: () => {}, updateShop: () => {} };
  }
  return ctx;
}

export default ShopContext;
