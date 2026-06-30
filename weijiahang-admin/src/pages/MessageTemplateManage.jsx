import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, message, Tabs } from 'antd';
import { MessageOutlined, SendOutlined, EditOutlined } from '@ant-design/icons';
import { getMessageTemplates, updateMessageTemplate } from '../services/api';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';

const { TextArea } = Input;

const EVENT_MAP = {
  'product_order.merchant_confirmed': '订单确认',
  'product_order.shipped': '发货通知',
  'product_order.received_7days': '收货回访',
  'user.registered': '新人欢迎',
  'customer_tier.upgraded': '等级升级',
};

const TYPE_OPTIONS = [
  { label: '散客', value: 'retail' },
  { label: '工长', value: 'contractor' },
  { label: '装企', value: 'decoration_company' },
  { label: '批发', value: 'wholesale' },
  { label: '通用', value: 'default' },
];

const MOCK_TEMPLATES = [
  { id: '1', code: 'order_confirmed', name: '订单确认通知', triggerEvent: 'product_order.merchant_confirmed', targetType: 'user', bodyRetail: '您的订单{orderNo}已由为家航平台审核，{shopName}正在备货。平台承诺货不对板包退，全程无忧。', isActive: true },
  { id: '2', code: 'delivery_update', name: '发货通知', triggerEvent: 'product_order.shipped', bodyRetail: '货物已从{shopName}发出，预计{eta}到达。为家航全程追踪。', isActive: true },
  { id: '3', code: 'after_sales_checkin', name: '收货后回访', triggerEvent: 'product_order.received_7days', bodyRetail: '使用7天了，产品怎么样？为家航「货不对板包退」承诺长期有效。', isActive: true },
  { id: '4', code: 'welcome_new_user', name: '新人欢迎', triggerEvent: 'user.registered', bodyRetail: '欢迎加入为家航！首单满200减50新人券已到账。平台「三道把关」为您装修保驾护航。', isActive: true },
  { id: '5', code: 'tier_upgrade', name: '等级升级通知', triggerEvent: 'customer_tier.upgraded', bodyRetail: '恭喜升级为{tierName}客户！专属{tierName}价已生效，下单自动享受{tierDiscountRate}%优惠。', isActive: true },
];

export default function MessageTemplateManage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState({ open: false, template: null });
  const [previewModal, setPreviewModal] = useState({ open: false, type: 'retail', body: '' });
  const [form] = Form.useForm();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMessageTemplates();
      setTemplates(res.items || res || []);
    } catch {
      setTemplates(MOCK_TEMPLATES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  /* 编辑模板 */
  const handleEdit = (record) => {
    setEditModal({ open: true, template: record });
    form.setFieldsValue({
      bodyRetail: record.bodyRetail || '',
      bodyContractor: record.bodyContractor || '',
      bodyDecoration: record.bodyDecoration || '',
      bodyWholesale: record.bodyWholesale || '',
      bodyDefault: record.bodyDefault || '',
    });
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      await updateMessageTemplate(editModal.template.id, values);
      message.success('模板已更新');
      setEditModal({ open: false, template: null });
      fetchTemplates();
    } catch {
      message.success('模板已更新（Mock）');
      setEditModal({ open: false, template: null });
      fetchTemplates();
    }
  };

  /* 预览 */
  const handlePreview = (template) => {
    setPreviewModal({ open: true, type: 'retail', body: template.bodyRetail || template.bodyDefault || '' });
  };

  const columns = [
    { title: '模板编码', dataIndex: 'code', key: 'code', width: 160 },
    { title: '名称', dataIndex: 'name', key: 'name', width: 120 },
    {
      title: '触发事件', dataIndex: 'triggerEvent', key: 'triggerEvent', width: 130,
      render: v => EVENT_MAP[v] || v,
    },
    {
      title: '散客文案预览', dataIndex: 'bodyRetail', key: 'bodyRetail',
      render: v => v ? v.slice(0, 50) + (v.length > 50 ? '…' : '') : '—',
    },
    {
      title: '状态', dataIndex: 'isActive', key: 'isActive', width: 70,
      render: v => v ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>,
    },
    {
      title: '操作', key: 'actions', width: 180,
      render: (_, r) => (
        <>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handlePreview(r)}>预览</Button>
        </>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="话术模板管理" breadcrumb={['设置', '话术模板']} />

      <Card style={{ marginBottom: 16 }}>
        <p style={{ color: '#999' }}>
          话术原则：将平台有利条款包装为客户保障。「平台先行赔付」→ 暗示平台权威；「三道把关」→ 强化品控形象；「货不对板包退」→ 降低决策门槛。
        </p>
      </Card>

      <Table rowKey="id" columns={columns} dataSource={templates} loading={loading} />

      {/* 编辑弹窗 */}
      <Modal title={`编辑模板 — ${editModal.template?.name || ''}`} open={editModal.open}
        onOk={handleSave} onCancel={() => setEditModal({ open: false, template: null })} width={700}>
        <Form form={form} layout="vertical">
          <Form.Item name="bodyDefault" label="通用文案">
            <TextArea rows={2} placeholder="无客群匹配时使用" />
          </Form.Item>
          <Form.Item name="bodyRetail" label="散客文案">
            <TextArea rows={2} placeholder="{shopName} {orderNo} 等变量可用" />
          </Form.Item>
          <Form.Item name="bodyContractor" label="工长文案">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="bodyDecoration" label="装企文案">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="bodyWholesale" label="批发客群文案">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 预览弹窗 */}
      <Modal title="文案预览" open={previewModal.open}
        onCancel={() => setPreviewModal({ open: false, type: 'retail', body: '' })} footer={null} width={600}>
        <Select value={previewModal.type} onChange={v => {
          const t = editModal.template || {};
          const fieldMap = { retail: 'bodyRetail', contractor: 'bodyContractor', decoration_company: 'bodyDecoration', wholesale: 'bodyWholesale', default: 'bodyDefault' };
          setPreviewModal(prev => ({ ...prev, type: v, body: t[fieldMap[v]] || t.bodyDefault || '' }));
        }} options={TYPE_OPTIONS} style={{ width: 150, marginBottom: 16 }} />
        <Card>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.8 }}>{previewModal.body}</p>
        </Card>
      </Modal>
    </div>
  );
}
