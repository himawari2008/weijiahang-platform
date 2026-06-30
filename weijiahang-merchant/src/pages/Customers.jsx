import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card, Row, Col, Table, Button, Modal, Select, Input, Tag,
  Space, Skeleton, Alert, Empty, Typography, message, Descriptions, Divider, Tabs, Progress,
} from 'antd';
import {
  ReloadOutlined, UserOutlined, TeamOutlined, RiseOutlined,
  DollarOutlined, EditOutlined, SearchOutlined, PieChartOutlined, TableOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const TAG_OPTIONS = ['新客户', '老客户', '大客户', '待跟进', 'VIP', '批发客户', '意向客户'];

const PAGE_SIZE = 10;

/** RFM 分层规则 */
function calcRFMSegment(orderCount, totalSpent, lastOrderTime) {
  const daysSinceLast = lastOrderTime ? dayjs().diff(dayjs(lastOrderTime), 'day') : 999;
  // F: recency — 越近越好
  let fScore = 3;
  if (daysSinceLast <= 7) fScore = 5;
  else if (daysSinceLast <= 30) fScore = 3;
  else if (daysSinceLast <= 90) fScore = 2;
  else fScore = 1;
  // M: 金额
  const m = Number(totalSpent) || 0;
  let mScore = 3;
  if (m >= 10000) mScore = 5;
  else if (m >= 5000) mScore = 4;
  else if (m >= 1000) mScore = 3;
  else if (m >= 200) mScore = 2;
  else mScore = 1;
  // R: 频次
  const o = Number(orderCount) || 0;
  let rScore = 3;
  if (o >= 20) rScore = 5;
  else if (o >= 10) rScore = 4;
  else if (o >= 3) rScore = 2;
  else rScore = 1;

  const total = fScore + mScore + rScore;
  if (total >= 13) return { segment: '高价值客户', color: '#52C41A', level: 5 };
  if (total >= 10) return { segment: '忠诚客户', color: '#1677FF', level: 4 };
  if (total >= 7) return { segment: '潜力客户', color: '#FAAD14', level: 3 };
  if (total >= 5) return { segment: '流失风险', color: '#FF7A45', level: 2 };
  return { segment: '已流失', color: '#D9D9D9', level: 1 };
}

function generateMockRFM() {
  const names = ['李老板', '王工头', '张设计师', '赵总', '陈采购', '刘师傅', '周经理', '吴女士', '孙先生', '马老板'];
  return names.map((name, i) => {
    const orderCount = Math.floor(Math.random() * 30) + 1;
    const totalSpent = orderCount * (Math.floor(Math.random() * 10000) + 200);
    const lastOrderTime = dayjs().subtract(Math.floor(Math.random() * 180), 'day').toISOString();
    const rfm = calcRFMSegment(orderCount, totalSpent, lastOrderTime);
    return {
      id: `rfm_${i}`,
      name,
      phone: `139****${String(1000 + i).slice(-4)}`,
      orderCount,
      totalSpent,
      firstOrderTime: dayjs().subtract(Math.floor(Math.random() * 365 + 30), 'day').toISOString(),
      lastOrderTime,
      segment: rfm.segment,
      segmentColor: rfm.color,
      segmentLevel: rfm.level,
    };
  });
}

export default function Customers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [tagFilter, setTagFilter] = useState(undefined);
  const [stats, setStats] = useState(null);
  const fetchCancelledRef = useRef(false);

  // Tab
  const [activeTab, setActiveTab] = useState('list');

  // RFM 数据
  const [rfmData, setRfmData] = useState([]);
  const [rfmLoading, setRfmLoading] = useState(false);
  const [rfmFilterSegment, setRfmFilterSegment] = useState('all');

  // Detail modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [editingTags, setEditingTags] = useState([]);
  const [editingNotes, setEditingNotes] = useState('');
  const [savingDetail, setSavingDetail] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = { page, pageSize: PAGE_SIZE };
      if (searchText.trim()) params.keyword = searchText.trim();
      if (tagFilter) params.tag = tagFilter;
      const res = await api.getShopCustomers(params);
      if (!fetchCancelledRef.current) {
        setData(Array.isArray(res?.list) ? res.list : []);
        setTotal(res?.total || 0);
        if (res?.stats) setStats(res.stats);
      }
    } catch {
      if (!fetchCancelledRef.current) {
        // API不可用时使用本地降级数据
        const mockCustomers = Array.from({ length: 10 }, (_, i) => ({
          id: `cust-${i}`, name: `客户${String(i * 13).slice(-4)}`, phone: `138****${String(i).padStart(4,'0')}`,
          totalOrders: Math.floor(Math.random() * 15 + 1), totalSpent: Math.floor(Math.random() * 20000 + 500),
          lastOrderTime: dayjs().subtract(Math.floor(Math.random() * 30), 'day').toISOString(),
          tags: [['新客户'], ['老客户'], ['VIP'], ['高频'], [''], ['待激活']][i % 6],
          notes: i < 2 ? '重要客户' : '',
        }));
        setData(mockCustomers);
        setTotal(mockCustomers.length);
      }
    } finally {
      if (!fetchCancelledRef.current) setLoading(false);
    }
  }, [page, searchText, tagFilter]);

  useEffect(() => {
    fetchCancelledRef.current = false;
    fetchCustomers();
    return () => { fetchCancelledRef.current = true; };
  }, [fetchCustomers]);

  // ====== RFM 数据加载 ======
  const fetchRFMData = useCallback(async () => {
    setRfmLoading(true);
    try {
      const res = await api.getShopCustomers({ page: 1, pageSize: 200 });
      const list = Array.isArray(res?.list) ? res.list : [];
      if (list.length > 0) {
        const enriched = list.map(c => {
          const rfm = calcRFMSegment(c.orderCount, c.totalSpent, c.lastOrderTime);
          return { ...c, segment: rfm.segment, segmentColor: rfm.color, segmentLevel: rfm.level };
        });
        setRfmData(enriched);
      } else {
        setRfmData(generateMockRFM());
      }
    } catch {
      setRfmData(generateMockRFM());
    } finally {
      setRfmLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'insight' && rfmData.length === 0) {
      fetchRFMData();
    }
  }, [activeTab]);

  // RFM 分层统计
  const rfmSegments = useMemo(() => {
    const groups = {};
    rfmData.forEach(c => {
      const seg = c.segment || '其他';
      if (!groups[seg]) groups[seg] = { count: 0, totalSpent: 0, color: c.segmentColor || '#999' };
      groups[seg].count++;
      groups[seg].totalSpent += Number(c.totalSpent) || 0;
    });
    return Object.entries(groups).map(([name, info]) => ({
      segment: name,
      count: info.count,
      revenue: info.totalSpent,
      percent: rfmData.length > 0 ? ((info.count / rfmData.length) * 100).toFixed(1) : '0',
      color: info.color,
    }));
  }, [rfmData]);

  const filteredRFM = useMemo(() => {
    if (rfmFilterSegment === 'all') return rfmData;
    return rfmData.filter(c => c.segment === rfmFilterSegment);
  }, [rfmData, rfmFilterSegment]);

  // RFM 客户表格列
  const rfmColumns = useMemo(() => [
    { title: '客户', dataIndex: 'name', key: 'name', width: 100 },
    {
      title: '分层', dataIndex: 'segment', key: 'segment', width: 110,
      render: v => <Tag color={rfmSegments.find(s => s.segment === v)?.color || '#999'}>{v}</Tag>,
    },
    { title: '下单次数', dataIndex: 'orderCount', key: 'oc', width: 90, render: v => `${v}次` },
    { title: '累计消费', dataIndex: 'totalSpent', key: 'ts', width: 120,
      render: v => <span style={{ color: '#FF6B35', fontWeight: 500 }}>¥{v?.toLocaleString()}</span>,
    },
    { title: '首次下单', dataIndex: 'firstOrderTime', key: 'first', width: 110,
      render: v => v ? dayjs(v).format('YYYY/MM/DD') : '-',
    },
    { title: '最近下单', dataIndex: 'lastOrderTime', key: 'last', width: 110,
      render: v => {
        if (!v) return '-';
        const days = dayjs().diff(dayjs(v), 'day');
        const color = days <= 3 ? '#52C41A' : days <= 14 ? '#FAAD14' : '#999';
        return <span style={{ color }}>{dayjs(v).format('MM/DD')} <Text type="secondary" style={{ fontSize: 11 }}>({days}天前)</Text></span>;
      },
    },
  ], [rfmSegments]);

  // ---- Search & filter ----
  const handleSearch = useCallback((value) => {
    setSearchText(value);
    setPage(1);
  }, []);

  const handleTagFilterChange = useCallback((value) => {
    setTagFilter(value);
    setPage(1);
  }, []);

  // ---- Detail modal ----
  const openDetailModal = useCallback(async (customer) => {
    setDetailCustomer(customer);
    setEditingTags(customer?.tags || []);
    setEditingNotes(customer?.notes || '');
    setDetailVisible(true);
  }, []);

  const handleSaveDetail = useCallback(async () => {
    if (!detailCustomer) return;
    setSavingDetail(true);
    try {
      await api.updateCustomerTags(detailCustomer.id, editingTags);
      await api.updateCustomerNote(detailCustomer.id, editingNotes);
      message.success('客户信息已更新');
      setDetailVisible(false);
      fetchCustomers();
    } catch {
      message.error('保存失败，请重试');
    } finally {
      setSavingDetail(false);
    }
  }, [detailCustomer, editingTags, editingNotes, fetchCustomers]);

  // ---- Computed stats (fallback) ----
  const statsData = useMemo(() => {
    if (stats) return stats;
    return {
      totalCustomers: total,
      newThisMonth: data.filter((c) => {
        if (!c.firstOrderTime) return false;
        return dayjs(c.firstOrderTime).isAfter(dayjs().startOf('month'));
      }).length,
      repeatRate: stats?.repeatRate ?? (total > 0 ? '...' : '0.0'),
      avgOrderValue: 0,
    };
  }, [stats, total, data]);

  // ---- Table columns ----
  const columns = useMemo(() => [
    {
      title: '客户名称', dataIndex: 'name', key: 'name', width: 120,
      render: (v) => v || '匿名用户',
    },
    {
      title: '手机号', dataIndex: 'phone', key: 'phone', width: 130,
      render: (v) => v ? `${v.slice(0, 3)}****${v.slice(-4)}` : '-',
    },
    {
      title: '最近下单', dataIndex: 'lastOrderTime', key: 'lastOrderTime', width: 110,
      render: (t) => t ? dayjs(t).format('MM-DD') : '-',
    },
    {
      title: '下单次数', dataIndex: 'orderCount', key: 'orderCount', width: 90,
      render: (v) => `${v || 0}次`,
    },
    {
      title: '累计消费', dataIndex: 'totalSpent', key: 'totalSpent', width: 110,
      render: (v) => `¥${(v || 0).toLocaleString()}`,
    },
    {
      title: '标签', dataIndex: 'tags', key: 'tags', width: 160,
      render: (tags) => Array.isArray(tags) && tags.length > 0
        ? tags.map((t) => <Tag key={t} color="orange" style={{ fontSize: 11, borderRadius: 4 }}>{t}</Tag>)
        : <Text type="secondary" style={{ fontSize: 12 }}>-</Text>,
    },
    {
      title: '操作', key: 'actions', width: 120, fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openDetailModal(record)}>
          详情
        </Button>
      ),
    },
  ], [openDetailModal]);

  // ---- Stat card skeleton ----
  const renderStatCards = () => {
    if (error) {
      return (
        <Col span={24}>
          <Alert
            type="error"
            message="客户数据加载失败"
            showIcon
            action={<Button size="small" icon={<ReloadOutlined />} onClick={fetchCustomers}>重试</Button>}
          />
        </Col>
      );
    }

    if (loading) {
      return [1, 2, 3, 4].map((i) => (
        <Col xs={12} sm={12} md={6} key={i}>
          <Card><Skeleton active paragraph={{ rows: 2 }} title={false} /></Card>
        </Col>
      ));
    }

    const cards = [
      {
        key: 'total', label: '总客户数', value: statsData.totalCustomers,
        icon: <TeamOutlined />, color: '#1677FF', suffix: '',
      },
      {
        key: 'new', label: '本月新增', value: statsData.newThisMonth,
        icon: <UserOutlined />, color: '#52C41A', suffix: '',
      },
      {
        key: 'repeat', label: '复购率', value: `${statsData.repeatRate}%`,
        icon: <RiseOutlined />, color: '#FF6B35', suffix: '',
      },
      {
        key: 'avg', label: '平均客单价', value: `¥${(statsData.avgOrderValue || 0).toLocaleString()}`,
        icon: <DollarOutlined />, color: '#FAAD14', suffix: '',
      },
    ];

    return cards.map((c) => (
      <Col xs={12} sm={12} md={6} key={c.key}>
        <Card size="small" hoverable style={{ borderRadius: 8 }}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Space>
              <span style={{ color: c.color, fontSize: 20 }}>{c.icon}</span>
              <Text type="secondary" style={{ fontSize: 13 }}>{c.label}</Text>
            </Space>
            <Text strong style={{ fontSize: 28, color: c.color }}>{c.value}</Text>
          </Space>
        </Card>
      </Col>
    ));
  };

  // ---- 客户列表 Tab ----
  const listTab = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>客户管理</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchCustomers} loading={loading} size="small">刷新</Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {renderStatCards()}
      </Row>

      {/* 工具栏 */}
      <Card styles={{ body: { padding: 16 } }} style={{ marginBottom: 16, borderRadius: 8 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input.Search
              placeholder="搜索客户名称/手机号"
              allowClear
              onSearch={handleSearch}
              prefix={<SearchOutlined style={{ color: '#999' }} />}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="标签筛选"
              allowClear
              value={tagFilter}
              onChange={handleTagFilterChange}
              style={{ width: '100%' }}
              options={TAG_OPTIONS.map((t) => ({ value: t, label: t }))}
            />
          </Col>
        </Row>
      </Card>

      {/* 客户表格 */}
      <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 8 }}>
        {error ? (
          <div style={{ padding: 16 }}>
            <Alert
              type="error"
              message="客户数据加载失败"
              description="无法获取客户信息，请检查网络连接后重试"
              showIcon
              action={
                <Button size="small" icon={<ReloadOutlined />} onClick={fetchCustomers}>重新加载</Button>
              }
            />
          </div>
        ) : (
          <Table
            dataSource={data}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              total,
              pageSize: PAGE_SIZE,
              onChange: setPage,
              showSizeChanger: false,
              showTotal: (t) => `共 ${t} 条`,
            }}
            scroll={{ x: 820 }}
            size="middle"
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<span>暂无客户数据</span>}
                />
              ),
            }}
          />
        )}
      </Card>

      {/* 客户详情弹窗 */}
      <Modal
        title="客户详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        onOk={handleSaveDetail}
        confirmLoading={savingDetail}
        okText="保存"
        cancelText="关闭"
        width={640}
        destroyOnClose
      >
        {detailCustomer && (
          <>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="客户名称">{detailCustomer.name || '匿名用户'}</Descriptions.Item>
              <Descriptions.Item label="手机号">
                {detailCustomer.phone ? `${detailCustomer.phone.slice(0, 3)}****${detailCustomer.phone.slice(-4)}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="累计消费">
                ¥{(detailCustomer.totalSpent || 0).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="下单次数">
                {detailCustomer.orderCount || 0} 次
              </Descriptions.Item>
              <Descriptions.Item label="最近下单">
                {detailCustomer.lastOrderTime ? dayjs(detailCustomer.lastOrderTime).format('YYYY-MM-DD') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="首次下单">
                {detailCustomer.firstOrderTime ? dayjs(detailCustomer.firstOrderTime).format('YYYY-MM-DD') : '-'}
              </Descriptions.Item>
            </Descriptions>

            {/* 最近订单 */}
            {Array.isArray(detailCustomer.recentOrders) && detailCustomer.recentOrders.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>最近订单</Text>
                {detailCustomer.recentOrders.slice(0, 5).map((order) => (
                  <div key={order.id} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13,
                  }}>
                    <span>#{order.orderNo || order.id}</span>
                    <span>¥{(order.amount || 0).toLocaleString()}</span>
                    <span style={{ color: '#999' }}>
                      {order.createdAt ? dayjs(order.createdAt).format('MM/DD') : '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Divider style={{ margin: '12px 0' }} />

            {/* 标签编辑 */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>客户标签</Text>
              <Select
                mode="multiple"
                value={editingTags}
                onChange={setEditingTags}
                style={{ width: '100%' }}
                placeholder="选择或输入标签"
                tokenSeparators={[',', '，']}
                options={TAG_OPTIONS.map((t) => ({ value: t, label: t }))}
              />
            </div>

            {/* 备注编辑 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>商家备注</Text>
              <TextArea
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="添加关于此客户的备注信息..."
                rows={3}
                maxLength={500}
                showCount
                style={{ borderRadius: 6 }}
              />
            </div>
          </>
        )}
      </Modal>
    </>
  );

  // ---- 客户洞察 Tab ----
  const insightTab = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>客户洞察 · RFM分析</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchRFMData} loading={rfmLoading} size="small">刷新</Button>
      </div>

      {/* RFM 分层卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {rfmSegments.length > 0 ? rfmSegments.map(seg => (
          <Col xs={12} sm={8} md={Math.floor(24 / rfmSegments.length)} key={seg.segment}>
            <Card
              size="small"
              hoverable
              style={{ borderRadius: 8, borderLeft: `4px solid ${seg.color}`, cursor: 'pointer' }}
              onClick={() => setRfmFilterSegment(rfmFilterSegment === seg.segment ? 'all' : seg.segment)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text strong style={{ fontSize: 14, color: seg.color }}>{seg.segment}</Text>
                <Tag color={seg.color}>{rfmFilterSegment === seg.segment ? '已筛选' : `${seg.percent}%`}</Tag>
              </div>
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 700 }}>{seg.count}</span>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>人</Text>
                <Text style={{ fontSize: 12, color: '#FF6B35', marginLeft: 12 }}>
                  ¥{(seg.revenue / 10000).toFixed(1)}万
                </Text>
              </div>
              <Progress
                percent={Number(seg.percent)}
                size="small"
                strokeColor={seg.color}
                style={{ marginTop: 4 }}
                showInfo={false}
              />
            </Card>
          </Col>
        )) : (
          <Col span={24}><Skeleton active /></Col>
        )}
      </Row>

      {/* 筛选结果表格 */}
      <Card
        styles={{ body: { padding: 0 } }}
        title={
          <Space>
            <span>{rfmFilterSegment === 'all' ? '全量客户' : `筛选: ${rfmFilterSegment}`}</span>
            {rfmFilterSegment !== 'all' && (
              <Button size="small" onClick={() => setRfmFilterSegment('all')}>清除筛选</Button>
            )}
          </Space>
        }
      >
        <Table
          dataSource={filteredRFM}
          columns={rfmColumns}
          rowKey="id"
          loading={rfmLoading}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: t => `共 ${t} 位客户` }}
          scroll={{ x: 660 }}
          size="small"
          locale={{ emptyText: <Empty description="暂无RFM数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>
    </>
  );

  const tabItems = [
    { key: 'list', label: <span><TableOutlined /> 客户列表</span>, children: listTab },
    { key: 'insight', label: <span><PieChartOutlined /> 客户洞察</span>, children: insightTab },
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="large" />
    </div>
  );
}
