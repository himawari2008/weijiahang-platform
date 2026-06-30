import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Upload, TimePicker, message, Tabs, Tag, Spin, Alert } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { getShopInfo, saveShopInfo, getMarkets } from '../services/api';
import dayjs from 'dayjs';

const { TextArea } = Input;

export default function ShopManage() {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [marketOptions, setMarketOptions] = useState([]);

  const fetchShopInfo = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await getShopInfo();
      if (res) {
        const vals = {
          ...res,
          bizHours: res.bizHours
            ? [dayjs(res.bizHours[0], 'HH:mm'), dayjs(res.bizHours[1], 'HH:mm')]
            : undefined,
        };
        form.setFieldsValue(vals);
      }
    } catch {
      message.error('加载店铺信息失败');
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShopInfo(); fetchMarketOptions(); }, []);

  const fetchMarketOptions = async () => {
    try {
      const res = await getMarkets();
      const list = Array.isArray(res) ? res : (res?.list || res?.items || []);
      setMarketOptions(list.map(m => ({ value: m.name, label: m.name })));
    } catch {
      // 降级：保留手动输入能力
    }
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const data = {
        ...values,
        bizHours: values.bizHours
          ? [values.bizHours[0].format('HH:mm'), values.bizHours[1].format('HH:mm')]
          : undefined,
      };
      await saveShopInfo(data);
      message.success('保存成功');
    } catch {
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>店铺管理</h2>
      <Tabs items={[
        {
          key: 'info', label: '基本信息', children: (
            <Card>
              {loadError && (
                <Alert
                  type="error"
                  message="加载店铺信息失败"
                  showIcon
                  style={{ marginBottom: 16, borderRadius: 6 }}
                  action={<Button size="small" onClick={fetchShopInfo}>重试</Button>}
                />
              )}
              <Spin spinning={loading}>
                <Form form={form} layout="vertical" onFinish={handleSave}>
                  <Form.Item label="店铺名称" name="name" rules={[{ required: true }]}>
                    <Input placeholder="与营业执照一致" />
                  </Form.Item>
                  <Form.Item label="所在市场" name="market" rules={[{ required: true }]}>
                    <Select options={marketOptions} placeholder="请选择所在市场" />
                  </Form.Item>
                  <Form.Item label="详细位置" style={{ marginBottom: 0 }}>
                    <Input.Group compact>
                      <Form.Item name="building"><Input placeholder="区/栋" style={{ width: 120 }} /></Form.Item>
                      <Form.Item name="row"><Input placeholder="排" style={{ width: 100 }} /></Form.Item>
                      <Form.Item name="no"><Input placeholder="号" style={{ width: 100 }} /></Form.Item>
                    </Input.Group>
                  </Form.Item>
                  <Form.Item label="联系电话" name="phone"><Input /></Form.Item>
                  <Form.Item label="营业时间" name="bizHours"><TimePicker.RangePicker format="HH:mm" /></Form.Item>
                  <Form.Item label="主营品类" name="categories">
                    <Select mode="multiple"
                            options={['瓷砖', '地板', '卫浴', '门窗', '涂料', '灯具', '五金', '辅材', '石材', '汽配'].map(c => ({ value: c, label: c }))} />
                  </Form.Item>
                  <Form.Item label="门头照" name="image">
                    <Upload action="/api/v1/upload" listType="picture-card" maxCount={1}>
                      <div><PlusOutlined /><div>上传</div></div>
                    </Upload>
                  </Form.Item>
                  <Form.Item label="店内环境" name="images">
                    <Upload action="/api/v1/upload" listType="picture-card" maxCount={5}>
                      <div><PlusOutlined /><div>上传</div></div>
                    </Upload>
                  </Form.Item>
                  <Form.Item label="商家公告" name="announcement"><TextArea rows={3} maxLength={200} /></Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={saving} style={{ background: '#FF6B35' }}>保存</Button>
                  </Form.Item>
                </Form>
              </Spin>
            </Card>
          )
        },
        {
          key: 'license', label: '资质认证', children: (
            <Card>
              <Form layout="vertical">
                <Form.Item label="营业执照" required>
                  <Upload action="/api/v1/upload">
                    <Button icon={<UploadOutlined />}>上传营业执照</Button>
                  </Upload>
                </Form.Item>
                <Form.Item label="统一社会信用代码"><Input placeholder="自动识别或手动填写" /></Form.Item>
                <Form.Item label="法人姓名"><Input /></Form.Item>
                <Form.Item><Tag color="processing">审核中</Tag> 预计1-2个工作日完成审核</Form.Item>
              </Form>
            </Card>
          )
        },
      ]} />
    </div>
  );
}
