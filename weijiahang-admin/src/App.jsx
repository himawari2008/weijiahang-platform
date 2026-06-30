import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Card, Form, Input, message, Avatar, Dropdown, Drawer } from 'antd';
import {
  DashboardOutlined, ShopOutlined, UserOutlined, ShoppingOutlined,
  EnvironmentOutlined, SettingOutlined, DollarOutlined, LogoutOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, TeamOutlined, FileTextOutlined,
  BarChartOutlined, PictureOutlined, WalletOutlined, StarOutlined,
  GiftOutlined, WifiOutlined, MenuOutlined,
  IdcardOutlined, TagsOutlined, MessageOutlined,
} from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import ShopVerify from './pages/ShopVerify';
import NavigatorVerify from './pages/NavigatorVerify';
import UserManage from './pages/UserManage';
import OrderManage from './pages/OrderManage';
import MarketManage from './pages/MarketManage';
import Finance from './pages/Finance';
import SystemConfig from './pages/SystemConfig';
import AuditLog from './pages/AuditLog';
import MarketAnalytics from './pages/MarketAnalytics';
import AdManage from './pages/AdManage';
import SettlementManage from './pages/SettlementManage';
import ReviewModeration from './pages/ReviewModeration';
import MarketingManage from './pages/MarketingManage';
import BeaconManage from './pages/BeaconManage';
/* Phase 5 — 核心交易链路管理 */
import CustomerSegmentManage from './pages/CustomerSegmentManage';
import CouponManage from './pages/CouponManage';
import ProductOrderManage from './pages/ProductOrderManage';
import MessageTemplateManage from './pages/MessageTemplateManage';
import ErrorBoundary from './components/ErrorBoundary';
import api, { adminLogin } from './services/api';

const { Header, Sider, Content } = Layout;

/* ==================== 菜单配置 ==================== */
const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '运营大盘' },
  { key: '/shop-verify', icon: <ShopOutlined />, label: '商家审核' },
  { key: '/navigator-verify', icon: <TeamOutlined />, label: '领航员审核' },
  { key: '/users', icon: <UserOutlined />, label: '用户管理' },
  { key: '/orders', icon: <ShoppingOutlined />, label: '订单纠纷' },
  { key: '/markets', icon: <EnvironmentOutlined />, label: '市场管理' },
  { key: '/market-analytics', icon: <BarChartOutlined />, label: '市场大盘' },
  { key: '/ads', icon: <PictureOutlined />, label: '广告管理' },
  { key: '/marketing', icon: <GiftOutlined />, label: '营销活动' },
  { key: '/settlements', icon: <WalletOutlined />, label: '结算审核' },
  { key: '/reviews', icon: <StarOutlined />, label: '评价审核' },
  { key: '/beacons', icon: <WifiOutlined />, label: '信标管理' },
  { key: '/product-orders', icon: <ShoppingOutlined />, label: '采购订单' },
  { key: '/customers', icon: <IdcardOutlined />, label: '客户分层' },
  { key: '/coupons', icon: <TagsOutlined />, label: '优惠券' },
  { key: '/message-templates', icon: <MessageOutlined />, label: '话术模板' },
  { key: '/finance', icon: <DollarOutlined />, label: '财务对账' },
  { key: '/system', icon: <SettingOutlined />, label: '系统配置' },
  { key: '/audit-log', icon: <FileTextOutlined />, label: '审计日志' },
];

/* ==================== 路由配置 ==================== */
const routes = [
  { path: '/', element: <Dashboard /> },
  { path: '/shop-verify', element: <ShopVerify /> },
  { path: '/navigator-verify', element: <NavigatorVerify /> },
  { path: '/users', element: <UserManage /> },
  { path: '/orders', element: <OrderManage /> },
  { path: '/markets', element: <MarketManage /> },
  { path: '/market-analytics', element: <MarketAnalytics /> },
  { path: '/ads', element: <AdManage /> },
  { path: '/marketing', element: <MarketingManage /> },
  { path: '/settlements', element: <SettlementManage /> },
  { path: '/reviews', element: <ReviewModeration /> },
  { path: '/beacons', element: <BeaconManage /> },
  { path: '/product-orders', element: <ProductOrderManage /> },
  { path: '/customers', element: <CustomerSegmentManage /> },
  { path: '/coupons', element: <CouponManage /> },
  { path: '/message-templates', element: <MessageTemplateManage /> },
  { path: '/finance', element: <Finance /> },
  { path: '/system', element: <SystemConfig /> },
  { path: '/audit-log', element: <AuditLog /> },
];

/* ==================== 移动端底部TabBar ==================== */
const bottomTabItems = [
  { key: '/', icon: <DashboardOutlined />, label: '大盘' },
  { key: '/orders', icon: <ShoppingOutlined />, label: '订单' },
  { key: '/markets', icon: <EnvironmentOutlined />, label: '市场' },
  { key: '/finance', icon: <DollarOutlined />, label: '财务' },
  { key: '/system', icon: <SettingOutlined />, label: '设置' },
];

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [collapsed, setCollapsed] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  /* 响应式检测 */
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* 真实 JWT 管理员登录 */
  const handleLogin = async (values) => {
    console.log('[Login] 开始登录:', values.username);
    setLoginLoading(true);
    try {
      const res = await adminLogin(values.username, values.password);
      console.log('[Login] API响应:', res);
      const jwt = res.accessToken;
      if (!jwt) {
        console.error('[Login] Token缺失, 完整响应:', JSON.stringify(res));
        throw new Error('未获取到Token');
      }
      localStorage.setItem('admin_token', jwt);
      setToken(jwt);
      message.success('登录成功');
    } catch (err) {
      console.error('[Login] 登录失败:', err);
      const msg = err?.response?.data?.message || err?.message || '登录失败';
      message.error(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  /* 退出登录 */
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  const currentPath = '/' + loc.pathname.split('/')[1];

  /* ==================== 登录页 ==================== */
  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>为家航 · 管理后台</h1>
          <p className="subtitle">平台运营管理中心</p>
          <Form onFinish={handleLogin} size="large">
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input placeholder="管理员用户名" autoFocus />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="密码" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loginLoading}
              style={{ background: '#FF6B35', borderColor: '#FF6B35', height: 44, fontSize: 16 }}>
              登录管理后台
            </Button>
          </Form>
          <div style={{ marginTop: 16, fontSize: 12, color: '#ccc' }}>仅供内部运营使用 · 为家航</div>
        </div>
      </div>
    );
  }

  /* ==================== 桌面端布局 ==================== */
  return (
    <>
      {!isMobile ? (
        <Layout style={{ minHeight: '100vh' }}>
          {/* 桌面侧边栏 */}
          <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" width={220}
            style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}>
            <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: collapsed ? 16 : 20, fontWeight: 700 }}>
              {collapsed ? '航' : '为家航·管理后台'}
            </div>
            <Menu theme="dark" mode="inline" selectedKeys={[currentPath]}
              items={menuItems} onClick={({ key }) => nav(key)} />
          </Sider>

          <Layout>
            <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
              <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)} />
              <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出', onClick: handleLogout }] }}>
                <Avatar style={{ background: '#FF6B35', cursor: 'pointer' }}>管</Avatar>
              </Dropdown>
            </Header>

            <Content style={{ margin: 16, padding: 24, background: '#F5F5F5', borderRadius: 12, minHeight: 280 }}>
              <ErrorBoundary>
                <Routes>
                  {routes.map(r => <Route key={r.path} path={r.path} element={r.element} />)}
                </Routes>
              </ErrorBoundary>
            </Content>
          </Layout>
        </Layout>
      ) : (
        /* ==================== 移动端布局 ==================== */
        <Layout style={{ minHeight: '100vh', paddingBottom: 56 }}>
          {/* 移动端顶栏 */}
          <Header style={{
            background: '#fff', padding: '0 16px', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center',
            position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #f0f0f0',
          }}>
            <Button type="text" icon={<MenuOutlined />} onClick={() => setMobileOpen(true)} />
            <span style={{ fontWeight: 700, fontSize: 18, color: '#FF6B35' }}>为家航</span>
            <Avatar style={{ background: '#FF6B35', cursor: 'pointer' }} size="small"
              onClick={handleLogout}>管</Avatar>
          </Header>

          {/* 移动端抽屉菜单 */}
          <Drawer
            title="为家航管理后台"
            placement="left"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            width={260}
            styles={{ body: { padding: 0 } }}
          >
            <Menu mode="inline" selectedKeys={[currentPath]}
              items={menuItems}
              onClick={({ key }) => { nav(key); setMobileOpen(false); }}
              style={{ borderRight: 0 }} />
            <div style={{ position: 'absolute', bottom: 20, width: '100%', textAlign: 'center' }}>
              <Button type="link" danger icon={<LogoutOutlined />} onClick={handleLogout}>退出登录</Button>
            </div>
          </Drawer>

          {/* 移动端内容区 */}
          <Content style={{ padding: 12, background: '#F5F5F5', minHeight: 280 }}>
            <ErrorBoundary>
              <Routes>
                {routes.map(r => <Route key={r.path} path={r.path} element={r.element} />)}
              </Routes>
            </ErrorBoundary>
          </Content>

          {/* 移动端底部TabBar */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#fff', borderTop: '1px solid #f0f0f0',
            display: 'flex', justifyContent: 'space-around', alignItems: 'center',
            height: 56, zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)',
          }}>
            {bottomTabItems.map(item => {
              const isActive = currentPath === item.key;
              return (
                <div key={item.key}
                  onClick={() => nav(item.key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', flex: 1, height: 56, cursor: 'pointer',
                    color: isActive ? '#FF6B35' : '#999',
                    fontSize: isActive ? 13 : 12, fontWeight: isActive ? 600 : 400,
                  }}>
                  <div style={{ fontSize: 22, marginBottom: 2 }}>{item.icon}</div>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </Layout>
      )}
    </>
  );
}
