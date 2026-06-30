import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { merchantLogin } from '../services/api';
import Logo from '../components/Logo';

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await merchantLogin(values);
      // 首次登录自动注册逻辑由后端处理
      const token = res?.token;
      if (!token || typeof token !== 'string') throw new Error('登录失败：无效的Token');
      onLogin(token);
      message.success('登录成功');
    } catch (err) {
      const msg = err.response?.data?.message || '登录失败，请检查手机号和密码';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ marginBottom: 8, textAlign: 'center' }}>
          <Logo size={64} showText variant="dark" />
        </div>
        <p className="subtitle" style={{ marginBottom: 24 }}>商家管理后台</p>
        <Form onFinish={handleSubmit} size="large">
          <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }]}>
            <Input prefix={<UserOutlined />} placeholder="手机号" autoComplete="tel" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block
                    style={{ height: 44, borderRadius: 8, background: '#FF6B35' }}>
              登录 / 注册
            </Button>
          </Form.Item>
        </Form>
        <p style={{ fontSize: 12, color: '#bbb' }}>首次登录自动注册，需提交营业执照完成认证</p>
      </div>
    </div>
  );
}
