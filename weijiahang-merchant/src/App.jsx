import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, message, Badge } from 'antd';
import {
  DashboardOutlined, ShopOutlined, ShoppingOutlined, FileTextOutlined,
  RiseOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  StarOutlined, TeamOutlined, GiftOutlined, HeartOutlined, DollarOutlined,
  SoundOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { ShopProvider, useShop } from './context/ShopContext';
import useOrderSocket from './hooks/useOrderSocket';
import Logo from './components/Logo';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ShopManage from './pages/ShopManage';
import ProductManage from './pages/ProductManage';
import Orders from './pages/Orders';
import Promotions from './pages/Promotions';
import Reviews from './pages/Reviews';
import Customers from './pages/Customers';
import Marketing from './pages/Marketing';
import ShopHealth from './pages/ShopHealth';
import Finance from './pages/Finance';
import Analytics from './pages/Analytics';
import ServiceChat from './pages/ServiceChat';

const { Header, Sider, Content } = Layout;

// 路由守卫
function ProtectedRoute({ children, token, onLogout }) {
  if (!token) return <Navigate to="/login" />;
  return children;
}

/** 底部 Tab 栏（移动端用） */
function BottomTabs({ current, onNav, unreadCount }) {
  const tabs = [
    { key: '/', icon: <DashboardOutlined />, label: '看板' },
    { key: '/orders', icon: <FileTextOutlined />, label: '订单', badge: unreadCount },
    { key: '/products', icon: <ShoppingOutlined />, label: '商品' },
    { key: '/customers', icon: <TeamOutlined />, label: '客户' },
    { key: '/analytics', icon: <BarChartOutlined />, label: '分析' },
  ];

  return (
    <div className="bottom-tabs" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
      background: '#fff', borderTop: '1px solid #f0f0f0',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      height: 56, paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map(tab => (
        <div
          key={tab.key}
          onClick={() => onNav(tab.key)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', flex: 1, cursor: 'pointer',
            color: current === tab.key ? '#FF6B35' : '#999',
            fontSize: 12, padding: '4px 0', position: 'relative',
          }}
        >
          <Badge count={tab.badge} size="small" offset={[6, -4]}>
            <span style={{ fontSize: 20, display: 'block', lineHeight: 1 }}>{tab.icon}</span>
          </Badge>
          <span style={{ marginTop: 2, fontSize: 10 }}>{tab.label}</span>
        </div>
      ))}
    </div>
  );
}

/** 移动端更多菜单 */
function MobileMenu({ shop, onLogout, onNavigate }) {
  const allItems = [
    { key: '/', icon: <DashboardOutlined />, label: '数据看板' },
    { key: '/shop', icon: <ShopOutlined />, label: '店铺管理' },
    { key: '/products', icon: <ShoppingOutlined />, label: '商品管理' },
    { key: '/orders', icon: <FileTextOutlined />, label: '订单管理' },
    { key: '/reviews', icon: <StarOutlined />, label: '评价管理' },
    { key: '/customers', icon: <TeamOutlined />, label: '客户管理' },
    { key: '/marketing', icon: <GiftOutlined />, label: '营销中心' },
    { key: '/promotions', icon: <RiseOutlined />, label: '推广中心' },
    { key: '/health', icon: <HeartOutlined />, label: '店铺体检' },
    { key: '/finance', icon: <DollarOutlined />, label: '财务管理' },
    { key: '/analytics', icon: <BarChartOutlined />, label: '经营分析' },
    { key: '/service-chat', icon: <SoundOutlined />, label: '客服消息' },
  ];

  return (
    <Dropdown
      menu={{
        items: [
          ...allItems.map(item => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            onClick: () => onNavigate(item.key),
          })),
          { type: 'divider' },
          { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: onLogout, danger: true },
        ],
      }}
      trigger={['click']}
    >
      <Avatar style={{ background: '#FF6B35', cursor: 'pointer' }}>
        {(shop?.name || '商').charAt(0)}
      </Avatar>
    </Dropdown>
  );
}

// 主布局
function MainLayout({ children, shop, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const nav = useNavigate();
  const loc = useLocation();

  // WebSocket 实时订单通知
  const token = localStorage.getItem('token');
  const { newOrderCount, clearCount } = useOrderSocket(
    shop?.id,
    token
  );

  // 监听窗口大小变化
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // 订单路由自动清除角标
  useEffect(() => {
    if (loc.pathname === '/orders') clearCount();
  }, [loc.pathname, clearCount]);

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '数据看板' },
    { key: '/shop', icon: <ShopOutlined />, label: '店铺管理' },
    { key: '/products', icon: <ShoppingOutlined />, label: '商品管理' },
    { key: '/orders', icon: <FileTextOutlined />, label: newOrderCount > 0 ? <Badge count={newOrderCount} size="small" offset={[6, 0]}>订单管理</Badge> : '订单管理' },
    { key: '/reviews', icon: <StarOutlined />, label: '评价管理' },
    { key: '/customers', icon: <TeamOutlined />, label: '客户管理' },
    { key: '/marketing', icon: <GiftOutlined />, label: '营销中心' },
    { key: '/promotions', icon: <RiseOutlined />, label: '推广中心' },
    { key: '/health', icon: <HeartOutlined />, label: '店铺体检' },
    { key: '/finance', icon: <DollarOutlined />, label: '财务管理' },
    { key: '/analytics', icon: <BarChartOutlined />, label: '经营分析' },
    { key: '/service-chat', icon: <SoundOutlined />, label: '客服消息' },
  ];

  const selectedKey = '/' + loc.pathname.split('/')[1];

  // 移动端布局
  if (isMobile) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#F5F5F5' }}>
        <Header style={{
          background: '#fff', padding: '0 16px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 100,
          height: 48,
        }}>
          <Logo size={28} showText variant="dark" />
          <MobileMenu shop={shop} onLogout={onLogout} onNavigate={key => nav(key)} />
        </Header>
        <Content style={{ padding: '8px 8px 72px 8px', minHeight: 280 }}>
          {children}
        </Content>
        <BottomTabs
          current={selectedKey}
          onNav={key => { nav(key); if (key === '/orders') clearCount(); }}
          unreadCount={newOrderCount}
        />
      </Layout>
    );
  }

  // PC 端布局
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" width={220}>
        <div style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0', padding: '0 12px',
        }}>
          {collapsed ? (
            <Logo size={32} variant="dark" />
          ) : (
            <Logo size={28} showText variant="dark" style={{ transform: 'translateY(1px)' }} />
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => nav(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff', padding: '0 24px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown
            menu={{
              items: [
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: onLogout },
              ],
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <span style={{ fontSize: 14, color: '#333' }}>
                {shop?.name || '商家'}
              </span>
              <Avatar style={{ background: '#FF6B35' }}>
                {(shop?.name || '商').charAt(0)}
              </Avatar>
            </div>
          </Dropdown>
        </Header>
        <Content style={{
          margin: 16, padding: 24, background: '#F5F5F5',
          borderRadius: 12, minHeight: 280,
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

/** 内部 App 组件（有 ShopContext 访问权限） */
function AppInner() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const { shop, fetchShop } = useShop();

  useEffect(() => {
    if (token) {
      fetchShop();
    }
  }, [token]);

  const handleLogin = (t) => { localStorage.setItem('token', t); setToken(t); };
  const handleLogout = () => { localStorage.removeItem('token'); setToken(null); message.success('已退出'); };

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
      <Route path="/*" element={
        <ProtectedRoute token={token}>
          <MainLayout shop={shop} onLogout={handleLogout}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/shop" element={<ShopManage />} />
              <Route path="/products" element={<ProductManage />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/promotions" element={<Promotions />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/marketing" element={<Marketing />} />
              <Route path="/health" element={<ShopHealth />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/service-chat" element={<ServiceChat />} />
            </Routes>
          </MainLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <ShopProvider>
      <AppInner />
    </ShopProvider>
  );
}
