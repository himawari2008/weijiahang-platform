import React, { useState, useEffect } from 'react';
import { Card, Form, Input, InputNumber, Switch, Button, message, Skeleton, Tabs, Space, Divider, Select, Alert, Popconfirm } from 'antd';
import { SaveOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import { getSystemConfig, updateSystemConfig, clearCache, rebuildSearchIndex } from '../services/api';

const ORANGE = '#FF6B35';

export default function SystemConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({});
  const [form] = Form.useForm();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await getSystemConfig();
      setConfig(res || {});
      form.setFieldsValue(res || {});
    } catch {
      // 降级：使用默认值
      const defaults = {
        platformName: '为家航',
        minNavigatorIncome: 39,
        maxNavigatorDistance: 5,
        commissionRate: 20,
        autoCancelMinutes: 30,
        fatigueHours: 4,
        restRewardAmount: 5,
        enableRegistration: true,
        enableAutoDispatch: true,
        maintenanceMode: false,
      };
      setConfig(defaults);
      form.setFieldsValue(defaults);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = form.getFieldsValue();
      await updateSystemConfig(values);
      message.success('配置已保存');
      setConfig(values);
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    form.setFieldsValue(config);
    message.info('已恢复');
  };

  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>系统配置</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>恢复</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}
            style={{ background: ORANGE, borderColor: ORANGE }}>保存配置</Button>
        </Space>
      </div>

      {config?.maintenanceMode && (
        <Alert type="warning" showIcon icon={<WarningOutlined />}
          message="系统当前处于维护模式，普通用户将无法访问"
          style={{ marginBottom: 16 }} />
      )}

      <Tabs
        items={[
          {
            key: 'basic',
            label: '基础设置',
            children: (
              <Card>
                <Form form={form} layout="vertical">
                  <Form.Item name="platformName" label="平台名称">
                    <Input placeholder="为家航" />
                  </Form.Item>
                  <Form.Item name="maintenanceMode" label="维护模式" valuePropName="checked">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                  </Form.Item>
                  <Form.Item name="enableRegistration" label="允许新用户注册" valuePropName="checked">
                    <Switch checkedChildren="允许" unCheckedChildren="禁止" />
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'navigator',
            label: '领航员设置',
            children: (
              <Card>
                <Form form={form} layout="vertical">
                  <Form.Item name="minNavigatorIncome" label="导航最低起步价（元）">
                    <InputNumber min={9} max={199} prefix="¥" style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item name="maxNavigatorDistance" label="领航员最大接单距离（公里）">
                    <InputNumber min={1} max={20} suffix="km" style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item name="commissionRate" label="平台抽佣比例（%）">
                    <InputNumber min={0} max={30} suffix="%" style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item name="enableAutoDispatch" label="启用智能派单" valuePropName="checked">
                    <Switch checkedChildren="启用" unCheckedChildren="关闭" />
                  </Form.Item>
                  <Form.Item name="fatigueHours" label="疲劳保护触发时长（小时）">
                    <InputNumber min={1} max={12} suffix="小时" style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item name="restRewardAmount" label="休息回归奖励（元）">
                    <InputNumber min={0} max={50} prefix="¥" style={{ width: 200 }} />
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'order',
            label: '订单设置',
            children: (
              <Card>
                <Form form={form} layout="vertical">
                  <Form.Item name="autoCancelMinutes" label="未接单自动取消（分钟）">
                    <InputNumber min={5} max={120} suffix="分钟" style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item name="maxDailyOrders" label="单日最大订单数（每商户）">
                    <InputNumber min={10} max={9999} style={{ width: 200 }} />
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'danger',
            label: '危险操作',
            children: (
              <Card>
                <Space direction="vertical" size="middle">
                  <Alert type="error" showIcon
                    message="以下操作不可逆，请谨慎操作"
                    style={{ marginBottom: 16 }} />
                  <Popconfirm title="确定清空所有缓存？此操作不可逆" onConfirm={async () => {
                    try { await clearCache(); message.success('缓存已清空'); }
                    catch { message.error('操作失败'); }
                  }}>
                    <Button danger type="primary">清空Redis缓存</Button>
                  </Popconfirm>
                  <Popconfirm title="确定重建搜索索引？" onConfirm={async () => {
                    try { await rebuildSearchIndex(); message.success('索引重建中...'); }
                    catch { message.error('操作失败'); }
                  }}>
                    <Button danger>重建搜索索引</Button>
                  </Popconfirm>
                </Space>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
