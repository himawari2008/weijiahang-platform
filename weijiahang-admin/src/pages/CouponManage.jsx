import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, InputNumber, Select, DatePicker, Switch, message, Row, Col } from 'antd';
import { GiftOutlined, PlusOutlined } from '@ant-design/icons';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '../services/api';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';

const { RangePicker } = DatePicker;

const COUPON_TYPES = [
  { label: '新人券', value: 'new_user' },
  { label: '满减券', value: 'full_reduction' },
  { label: '品类券', value: 'category' },
  { label: '现金券', value: 'cash' },
  { label: '免邮券', value: 'shipping_free' },
];

const SCOPE_OPTIONS = [
  { label: '全场通用', value: 'global' },
  { label: '指定店铺', value: 'shop' },
  { label: '指定品类', value: 'category' },
  { label: '指定商品', value: 'product' },
];

const MOCK_COUPONS = [
  { id: 'c1', name: '新人专享券', type: 'new_user', value: 50, minAmount: 200, discountType: 'amount', status: 1, usedCount: 328, totalCount: 1000 },
  { id: 'c2', name: '618建材大促', type: 'full_reduction', value: 200, minAmount: 1000, discountType: 'amount', status: 1, usedCount: 1205, totalCount: 5000 },
  { id: 'c3', name: '瓷砖品类9折', type: 'category', value: 10, minAmount: 0, discountType: 'percentage', maxDiscount: 200, status: 1, usedCount: 86, totalCount: 0 },
];

export default function CouponManage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCoupons();
      setCoupons(res.items || []);
    } catch (err) {
      console.error('获取优惠券列表失败:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  /* 创建/编辑 */
  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (values.dateRange) {
      values.validFrom = values.dateRange[0].format('YYYY-MM-DD');
      values.validTo = values.dateRange[1].format('YYYY-MM-DD');
    }
    delete values.dateRange;

    try {
      if (editing) {
        await updateCoupon(editing.id, values);
        message.success('优惠券已更新');
      } else {
        await createCoupon(values);
        message.success('优惠券已创建');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      fetchCoupons();
    } catch (err) {
      message.error(err?.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后用户将无法再领取该优惠券',
      onOk: async () => {
        try {
          await deleteCoupon(id);
          message.success('已删除');
          fetchCoupons();
        } catch (err) {
          message.error('删除失败，请重试');
        }
      },
    });
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      dateRange: record.validFrom ? [record.validFrom, record.validTo] : undefined,
    });
    setModalOpen(true);
  };

  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.status === 1).length,
    totalUsed: coupons.reduce((s, c) => s + (c.usedCount || 0), 0),
    unlimited: coupons.filter(c => c.totalCount === 0).length,
  };

  const columns = [
    { title: '券名称', dataIndex: 'name', key: 'name', width: 160 },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 80,
      render: v => COUPON_TYPES.find(t => t.value === v)?.label || v,
    },
    {
      title: '优惠', key: 'value', width: 120,
      render: (_, r) => r.discountType === 'percentage' ? `${r.value}%` : `¥${r.value}`,
    },
    { title: '最低消费', dataIndex: 'minAmount', key: 'minAmount', width: 90, render: v => `¥${v || 0}` },
    { title: '已领/总量', key: 'count', width: 100, render: (_, r) => `${r.usedCount || 0}/${r.totalCount === 0 ? '∞' : r.totalCount}` },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 70,
      render: v => <Tag color={v === 1 ? 'green' : 'red'}>{v === 1 ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作', key: 'actions', width: 150,
      render: (_, r) => (
        <>
          <Button type="link" size="small" onClick={() => openEdit(r)}>编辑</Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(r.id)}>删除</Button>
        </>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="优惠券管理" breadcrumb={['运营', '优惠券']}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>创建优惠券</Button>}
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}><StatCard title="优惠券总数" value={stats.total} icon={<GiftOutlined />} color="#FF6B35" /></Col>
        <Col xs={12} sm={6}><StatCard title="启用中" value={stats.active} color="#2D8B4A" /></Col>
        <Col xs={12} sm={6}><StatCard title="已领取" value={stats.totalUsed} color="#1890FF" suffix="张" /></Col>
        <Col xs={12} sm={6}><StatCard title="不限量券" value={stats.unlimited} color="#722ED1" suffix="张" /></Col>
      </Row>

      {error ? (
        <EmptyState type="error" onRetry={fetchCoupons} />
      ) : (
        <Table rowKey="id" columns={columns} dataSource={coupons} loading={loading} />
      )}

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editing ? '编辑优惠券' : '创建优惠券'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="券名称" rules={[{ required: true }]}>
            <Input placeholder="如：新人专享券" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="券类型" rules={[{ required: true }]}>
                <Select options={COUPON_TYPES} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="discountType" label="折扣方式" initialValue="amount">
                <Select options={[{ label: '固定金额', value: 'amount' }, { label: '百分比', value: 'percentage' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="value" label="优惠值" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} placeholder="金额或百分比" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="minAmount" label="最低消费" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxDiscount" label="最大折扣">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="百分比券封顶" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="dateRange" label="有效期" rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="totalCount" label="发行量" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0=无限" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="perUserLimit" label="每人限领" initialValue={1}>
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="usageScope" label="适用范围" initialValue="global">
                <Select options={SCOPE_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="platformSubsidized" label="平台补贴" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
