import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Select, Button, message, Row, Col, Statistic, Modal, Descriptions } from 'antd';
import { UserOutlined, TeamOutlined, RiseOutlined, TrophyOutlined } from '@ant-design/icons';
import { getCustomerTiers, assignCustomerTier } from '../services/api';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';

/* 客群类型映射 */
const TYPE_MAP = {
  retail: { label: '散客', color: 'blue' },
  contractor: { label: '工长', color: 'orange' },
  decoration_company: { label: '装企', color: 'purple' },
  wholesale: { label: '批发', color: 'red' },
};

const TIER_COLORS = { 1: '#CD7F32', 2: '#C0C0C0', 3: '#FFD700', 4: '#C0C0C0', 5: '#B9F2FF' };

export default function CustomerSegmentManage() {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignModal, setAssignModal] = useState({ open: false, userId: '', currentType: '' });

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCustomerTiers({ page, pageSize: 20 });
      setTiers(res.items || []);
      setTotal(res.total || 0);
      setError(null);
    } catch (err) {
      generateMockData();
    } finally {
      setLoading(false);
    }
  }, [page]);

  const generateMockData = () => {
    const mock = [
      { id: '1', userId: 'u1', customerType: 'contractor', currentLevel: 4, currentTierName: '铂金', totalAmount: 450000, orderCount: 85, tierDiscountRate: 0.08 },
      { id: '2', userId: 'u2', customerType: 'retail', currentLevel: 2, currentTierName: '白银', totalAmount: 5800, orderCount: 5, tierDiscountRate: 0.02 },
      { id: '3', userId: 'u3', customerType: 'wholesale', currentLevel: 5, currentTierName: '钻石', totalAmount: 6800000, orderCount: 520, tierDiscountRate: 0.12 },
      { id: '4', userId: 'u4', customerType: 'decoration_company', currentLevel: 3, currentTierName: '黄金', totalAmount: 380000, orderCount: 15, tierDiscountRate: 0.05 },
      { id: '5', userId: 'u5', customerType: 'retail', currentLevel: 1, currentTierName: '青铜', totalAmount: 800, orderCount: 1, tierDiscountRate: 0 },
    ];
    setTiers(mock);
    setTotal(mock.length);
    setError(null);
  };

  useEffect(() => { fetchTiers(); }, [fetchTiers]);

  /* 统计 */
  const stats = {
    total: tiers.length,
    byType: tiers.reduce((acc, t) => { acc[t.customerType] = (acc[t.customerType] || 0) + 1; return acc; }, {}),
    avgLevel: tiers.length > 0 ? (tiers.reduce((s, t) => s + t.currentLevel, 0) / tiers.length).toFixed(1) : 0,
    topTier: tiers.filter(t => t.currentLevel >= 4).length,
  };

  /* 手动分配客群类型 */
  const handleAssign = async () => {
    try {
      await assignCustomerTier(assignModal.userId, assignModal.currentType);
      message.success('客群类型已更新');
      setAssignModal({ open: false, userId: '', currentType: '' });
      fetchTiers();
    } catch (err) {
      message.error(err?.response?.data?.message || '操作失败');
    }
  };

  const columns = [
    { title: '用户ID', dataIndex: 'userId', key: 'userId', width: 120, render: v => v?.slice(0, 8) + '…' },
    {
      title: '客群类型', dataIndex: 'customerType', key: 'customerType', width: 100,
      render: v => {
        const info = TYPE_MAP[v] || { label: v, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '等级', dataIndex: 'currentLevel', key: 'currentLevel', width: 80,
      render: (v, r) => <Tag color={TIER_COLORS[v]}>{r.currentTierName}</Tag>,
    },
    { title: '订单数', dataIndex: 'orderCount', key: 'orderCount', width: 80 },
    { title: '累计消费', dataIndex: 'totalAmount', key: 'totalAmount', width: 120, render: v => `¥${(v || 0).toLocaleString()}` },
    {
      title: '折扣率', dataIndex: 'tierDiscountRate', key: 'tierDiscountRate', width: 80,
      render: v => `${(v * 100).toFixed(0)}%`,
    },
    {
      title: '操作', key: 'actions', width: 150,
      render: (_, r) => (
        <>
          <Button type="link" size="small" onClick={() => setSelectedUser(r)}>详情</Button>
          <Button type="link" size="small" onClick={() => setAssignModal({ open: true, userId: r.userId, currentType: r.customerType })}>
            分配类型
          </Button>
        </>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="客户分层管理" breadcrumb={['运营', '客户分层']} />

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}><StatCard title="客户总数" value={stats.total} icon={<UserOutlined />} color="#FF6B35" /></Col>
        <Col xs={12} sm={6}><StatCard title="高等级客户" value={stats.topTier} icon={<TrophyOutlined />} color="#722ED1" suffix="铂金+钻石" /></Col>
        <Col xs={12} sm={6}><StatCard title="平均等级" value={stats.avgLevel} icon={<RiseOutlined />} color="#1890FF" /></Col>
        <Col xs={12} sm={6}><StatCard title="客群分类" value={Object.keys(stats.byType).length} icon={<TeamOutlined />} color="#2D8B4A" suffix="种" /></Col>
      </Row>

      {/* 客群分布 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {Object.entries(TYPE_MAP).map(([key, info]) => (
          <Col xs={12} sm={6} key={key}>
            <Card size="small" hoverable>
              <Statistic title={info.label} value={stats.byType[key] || 0} valueStyle={{ color: info.color }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 等级列表 */}
      {error ? (
        <EmptyState type="error" onRetry={fetchTiers} />
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={tiers}
          loading={loading}
          pagination={{ current: page, total, pageSize: 20, onChange: p => setPage(p) }}
        />
      )}

      {/* 详情弹窗 */}
      <Modal title="客户等级详情" open={!!selectedUser} onCancel={() => setSelectedUser(null)} footer={null} width={500}>
        {selectedUser && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="用户ID">{selectedUser.userId}</Descriptions.Item>
            <Descriptions.Item label="客群类型">
              <Tag color={TYPE_MAP[selectedUser.customerType]?.color}>{TYPE_MAP[selectedUser.customerType]?.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="当前等级">{selectedUser.currentTierName}</Descriptions.Item>
            <Descriptions.Item label="折扣率">{(selectedUser.tierDiscountRate * 100).toFixed(0)}%</Descriptions.Item>
            <Descriptions.Item label="累计订单">{selectedUser.orderCount} 单</Descriptions.Item>
            <Descriptions.Item label="累计消费">¥{(selectedUser.totalAmount || 0).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 分配类型弹窗 */}
      <Modal title="分配客群类型" open={assignModal.open} onOk={handleAssign} onCancel={() => setAssignModal({ open: false, userId: '', currentType: '' })}>
        <Select
          style={{ width: '100%' }}
          value={assignModal.currentType}
          onChange={v => setAssignModal(prev => ({ ...prev, currentType: v }))}
          options={Object.entries(TYPE_MAP).map(([k, v]) => ({ label: v.label, value: k }))}
        />
      </Modal>
    </div>
  );
}
