import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Button, Modal, Descriptions, Select, message, Row, Col, Space } from 'antd';
import { ShoppingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { getProductOrders, updateProductOrderStatus } from '../services/api';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';

const STATUS_MAP = {
  pending_merchant: { label: '待商家确认', color: 'orange' },
  merchant_confirmed: { label: '待付款', color: 'blue' },
  paid: { label: '已付款', color: 'cyan' },
  preparing: { label: '备货中', color: 'geekblue' },
  shipped: { label: '已发货', color: 'purple' },
  received: { label: '已收货', color: 'green' },
  completed: { label: '已完成', color: 'default' },
  cancelled: { label: '已取消', color: 'red' },
  refunding: { label: '退款中', color: 'orange' },
  refunded: { label: '已退款', color: 'default' },
};

const MOCK_ORDERS = [
  { id: '1', orderNo: 'WJHPD20260621001', customerType: 'retail', status: 'paid', itemsTotal: 4298, finalAmount: 4348, deliveryMethod: 'navigator_deliver', payStatus: 1, createdAt: '2026-06-21 14:30' },
  { id: '2', orderNo: 'WJHPD20260620002', customerType: 'contractor', status: 'shipped', itemsTotal: 12800, tierDiscount: 640, finalAmount: 12160, deliveryMethod: 'self_pickup', payStatus: 1, createdAt: '2026-06-20 09:15' },
  { id: '3', orderNo: 'WJHPD20260619003', customerType: 'wholesale', status: 'refunding', itemsTotal: 85000, tierDiscount: 10200, finalAmount: 74800, deliveryMethod: 'logistics', payStatus: 1, createdAt: '2026-06-19 16:00' },
  { id: '4', orderNo: 'WJHPD20260618004', customerType: 'retail', status: 'cancelled', itemsTotal: 899, finalAmount: 899, deliveryMethod: 'self_pickup', payStatus: 0, cancelReason: '用户取消', createdAt: '2026-06-18 11:00' },
];

export default function ProductOrderManage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = {};
      if (statusFilter !== 'all') queryParams.status = statusFilter;
      const res = await getProductOrders(queryParams);
      setOrders(res.items || []);
    } catch (err) {
      console.error('获取采购订单失败:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleRefund = async (orderId, approved) => {
    Modal.confirm({
      title: approved ? '确认退款' : '驳回退款',
      content: approved ? '将退款给用户并归还库存' : '驳回退款申请',
      onOk: async () => {
        try {
          if (approved) {
            await updateProductOrderStatus(orderId, 'refunded');
          }
          message.success(approved ? '已退款' : '已驳回');
          fetchOrders();
        } catch (err) {
          message.error(err?.response?.data?.message || '操作失败');
        }
      },
    });
  };

  const stats = {
    total: orders.length,
    refunding: orders.filter(o => o.status === 'refunding').length,
    completed: orders.filter(o => o.status === 'completed').length,
    totalAmount: orders.reduce((s, o) => s + (o.finalAmount || 0), 0),
  };

  const columns = [
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 170 },
    {
      title: '客群', dataIndex: 'customerType', key: 'customerType', width: 70,
      render: v => {
        const labels = { retail: '散客', contractor: '工长', decoration_company: '装企', wholesale: '批发' };
        return labels[v] || v;
      },
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: v => {
        const info = STATUS_MAP[v] || { label: v, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    { title: '商品总额', dataIndex: 'itemsTotal', key: 'itemsTotal', width: 100, render: v => `¥${(v || 0).toLocaleString()}` },
    { title: '实付金额', dataIndex: 'finalAmount', key: 'finalAmount', width: 100, render: v => `¥${(v || 0).toLocaleString()}` },
    { title: '配送方式', dataIndex: 'deliveryMethod', key: 'deliveryMethod', width: 80, render: v => v === 'self_pickup' ? '自提' : '配送' },
    {
      title: '支付', dataIndex: 'payStatus', key: 'payStatus', width: 60,
      render: v => v === 1 ? <Tag color="green">已付</Tag> : <Tag color="red">未付</Tag>,
    },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 150 },
    {
      title: '操作', key: 'actions', width: 180, fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setSelectedOrder(r); setDetailOpen(true); }}>详情</Button>
          {r.status === 'refunding' && (
            <>
              <Button type="link" size="small" style={{ color: '#2D8B4A' }} icon={<CheckCircleOutlined />}
                onClick={() => handleRefund(r.id, true)}>同意退款</Button>
              <Button type="link" size="small" danger icon={<CloseCircleOutlined />}
                onClick={() => handleRefund(r.id, false)}>驳回</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="采购订单管理" breadcrumb={['运营', '采购订单']} />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}><StatCard title="今日订单" value={stats.total} icon={<ShoppingOutlined />} color="#FF6B35" /></Col>
        <Col xs={12} sm={6}><StatCard title="退款中" value={stats.refunding} color="#FAAD14" /></Col>
        <Col xs={12} sm={6}><StatCard title="已完成" value={stats.completed} color="#2D8B4A" /></Col>
        <Col xs={12} sm={6}><StatCard title="交易额" value={stats.totalAmount} color="#1890FF" formatter={v => `¥${(v || 0).toLocaleString()}`} /></Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <span>状态筛选：</span>
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 160 }}
            options={[{ label: '全部', value: 'all' }, ...Object.entries(STATUS_MAP).map(([k, v]) => ({ label: v.label, value: k }))]}
          />
        </Space>
      </Card>

      {error ? (
        <EmptyState type="error" onRetry={fetchOrders} />
      ) : (
        <Table rowKey="id" columns={columns} dataSource={orders} loading={loading} scroll={{ x: 1000 }} />
      )}

      {/* 详情弹窗 */}
      <Modal title="订单详情" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={600}>
        {selectedOrder && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="订单号">{selectedOrder.orderNo}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={STATUS_MAP[selectedOrder.status]?.color}>{STATUS_MAP[selectedOrder.status]?.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="客群类型">{selectedOrder.customerType}</Descriptions.Item>
            <Descriptions.Item label="配送方式">{selectedOrder.deliveryMethod}</Descriptions.Item>
            <Descriptions.Item label="商品总额">¥{selectedOrder.itemsTotal}</Descriptions.Item>
            <Descriptions.Item label="等级折扣">¥{selectedOrder.tierDiscount || 0}</Descriptions.Item>
            <Descriptions.Item label="实付金额">¥{selectedOrder.finalAmount}</Descriptions.Item>
            <Descriptions.Item label="支付状态">{selectedOrder.payStatus === 1 ? '已付' : '未付'}</Descriptions.Item>
            {selectedOrder.cancelReason && <Descriptions.Item label="取消原因" span={2}>{selectedOrder.cancelReason}</Descriptions.Item>}
            <Descriptions.Item label="创建时间" span={2}>{selectedOrder.createdAt}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
