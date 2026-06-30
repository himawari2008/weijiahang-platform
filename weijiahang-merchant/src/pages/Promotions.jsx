import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Row, Col, Button, Modal, Select, InputNumber, DatePicker, Table, Tag, message,
  Statistic, Empty, Alert, Skeleton, Space, Popconfirm, Segmented, Typography, Progress
} from 'antd';
import {
  HomeOutlined, PushpinOutlined, SearchOutlined,
  PlayCircleOutlined, PauseCircleOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, DollarOutlined, RiseOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../utils/echarts-init';
import dayjs from 'dayjs';
import api from '../services/api';

const { Text } = Typography;
const ORANGE = '#FF6B35';

// 广告产品定价（动态配置）
const AD_PRODUCTS = [
  { key: 'home', name: '首页推荐位', desc: '市场首页热门店铺展示，高流量曝光', price: '¥500-2000/月', icon: <HomeOutlined />, color: '#FF6B35' },
  { key: 'category', name: '品类置顶', desc: '品类列表前3位，精准触达目标客户', price: '¥1000-3000/月', icon: <PushpinOutlined />, color: '#1677FF' },
  { key: 'search', name: '搜索竞价', desc: '搜索结果优先展示，按点击付费', price: '¥0.5-2/点击', icon: <SearchOutlined />, color: '#52C41A' },
];

// 广告类型映射
const AD_TYPE_MAP = {
  home: { label: '首页推荐', icon: <HomeOutlined /> },
  category: { label: '品类置顶', icon: <PushpinOutlined /> },
  search: { label: '搜索竞价', icon: <SearchOutlined /> },
};

/** 生成广告效果降级时序数据 */
function generateMockPerformance() {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    data.push({
      date: dayjs().subtract(i, 'day').format('MM/DD'),
      impressions: Math.floor(Math.random() * 500 + 200),
      clicks: Math.floor(Math.random() * 30 + 10),
      spent: Math.floor(Math.random() * 50 + 10),
      ctr: (Math.random() * 8 + 2).toFixed(1),
    });
  }
  return data;
}

export default function Promotions() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adType, setAdType] = useState('all');
  const [createVisible, setCreateVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editModal, setEditModal] = useState({ visible: false, ad: null });
  const [chartVisible, setChartVisible] = useState(false);
  const [chartAd, setChartAd] = useState(null);

  // 表单
  const [form, setForm] = useState({ position: undefined, budget: undefined, dailyBudget: undefined, dateRange: undefined });

  const fetchAds = async () => {
    setLoading(true); setError(false);
    let cancelled = false;
    try {
      const res = await api.getMyAds();
      if (!cancelled) setAds(Array.isArray(res) ? res : []);
    } catch { if (!cancelled) { setAds([
      { id: 'ad-1', title: '店铺首页推荐', position: 'home_banner', budget: 500, dailyBudget: 50, spent: 320, impressions: 4500, clicks: 230, status: 'active', startDate: dayjs().subtract(5, 'day').toISOString(), endDate: dayjs().add(25, 'day').toISOString(), performanceData: generateMockPerformance() },
      { id: 'ad-2', title: '品类搜索置顶', position: 'search_top', budget: 300, dailyBudget: 30, spent: 120, impressions: 2100, clicks: 85, status: 'active', startDate: dayjs().subtract(2, 'day').toISOString(), endDate: dayjs().add(28, 'day').toISOString(), performanceData: generateMockPerformance() },
    ]); } }
    finally { if (!cancelled) setLoading(false); }
  };

  useEffect(() => { fetchAds(); }, []);

  // 筛选
  const filteredAds = useMemo(() => {
    if (adType === 'all') return ads;
    return ads.filter(a => a.adType === adType || a.adPosition === adType);
  }, [ads, adType]);

  // 统计数据
  const stats = useMemo(() => ({
    totalImpressions: ads.reduce((s, a) => s + (a.impressions || 0), 0),
    totalClicks: ads.reduce((s, a) => s + (a.clicks || 0), 0),
    totalSpent: ads.reduce((s, a) => s + (Number(a.spent) || 0), 0),
    activeCount: ads.filter(a => a.status === 1).length,
    ctr: ads.reduce((s, a) => s + (a.impressions || 0), 0) > 0
      ? ((ads.reduce((s, a) => s + (a.clicks || 0), 0) / ads.reduce((s, a) => s + (a.impressions || 0), 0)) * 100).toFixed(2)
      : '0.00',
  }), [ads]);

  /* ---- 创建推广 ---- */
  const handleCreate = async () => {
    if (!form.position) { message.warning('请选择推广位置'); return; }
    if (!form.budget) { message.warning('请设置预算'); return; }
    setCreating(true);
    try {
      await api.createAd({
        adPosition: form.position,
        adType: form.position === 'search' ? 'cpc' : 'cpm',
        budget: form.budget,
        dailyBudget: form.dailyBudget || form.budget / 30,
        startDate: form.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: form.dateRange?.[1]?.format('YYYY-MM-DD'),
      });
      message.success('推广已开通');
      setCreateVisible(false);
      setForm({ position: undefined, budget: undefined, dailyBudget: undefined, dateRange: undefined });
      fetchAds();
    } catch { message.error('开通失败'); }
    finally { setCreating(false); }
  };

  /* ---- 暂停/恢复 ---- */
  const handleToggleStatus = async (ad) => {
    const isPaused = ad.status === 0;
    try {
      if (isPaused) {
        await api.resumeAd(ad.id);
        message.success('已恢复投放');
      } else {
        await api.pauseAd(ad.id);
        message.success('已暂停投放');
      }
      fetchAds();
    } catch { message.error('操作失败'); }
  };

  /* ---- 查看效果图表 ---- */
  const showChart = (ad) => {
    setChartAd(ad);
    setChartVisible(true);
  };

  const chartOption = useMemo(() => {
    if (!chartAd) return {};
    // 模拟每日数据（实际应从 API 获取）
    const days = [];
    for (let i = 6; i >= 0; i--) {
      days.push(dayjs().subtract(i, 'day').format('MM/DD'));
    }
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['曝光', '点击', '花费'] },
      grid: { left: 50, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: days },
      yAxis: [
        { type: 'value', name: '次' },
        { type: 'value', name: '元' },
      ],
      series: [
        { name: '曝光', type: 'line', data: [120, 200, 150, 180, 220, 190, 250], color: '#1677FF', smooth: true },
        { name: '点击', type: 'bar', data: [12, 20, 15, 18, 22, 19, 25], color: ORANGE },
        { name: '花费', type: 'line', yAxisIndex: 1, data: [6, 10, 7.5, 9, 11, 9.5, 12.5], color: '#52C41A', smooth: true },
      ],
    };
  }, [chartAd]);

  /* ---- 表格列 ---- */
  const columns = [
    {
      title: '推广位置', dataIndex: 'adPosition',
      render: (v) => {
        const info = AD_TYPE_MAP[v] || { label: v, icon: null };
        return <Space>{info.icon}<span>{info.label}</span></Space>;
      }
    },
    { title: '预算', dataIndex: 'budget', render: (v) => `¥${Number(v || 0).toFixed(0)}` },
    { title: '已花费', dataIndex: 'spent', render: (v) => <span style={{ color: ORANGE, fontWeight: 600 }}>¥{Number(v || 0).toFixed(2)}</span> },
    { title: '曝光', dataIndex: 'impressions', render: (v) => v?.toLocaleString() || 0 },
    { title: '点击', dataIndex: 'clicks', render: (v) => v?.toLocaleString() || 0 },
    {
      title: 'CTR', key: 'ctr',
      render: (_, r) => {
        const ctr = r.impressions > 0 ? ((r.clicks / r.impressions) * 100).toFixed(2) : '0.00';
        return <Progress percent={parseFloat(ctr)} size="small" style={{ width: 80 }} format={() => ctr + '%'} />;
      }
    },
    {
      title: '状态', dataIndex: 'status',
      render: (s) => s === 1 ? <Tag color="green">投放中</Tag> : <Tag color="default">已暂停</Tag>
    },
    {
      title: '操作', key: 'actions',
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => showChart(r)}>效果</Button>
          <Button size="small" icon={r.status === 1 ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => handleToggleStatus(r)}>
            {r.status === 1 ? '暂停' : '恢复'}
          </Button>
        </Space>
      )
    },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}><Card size="small"><Statistic title="曝光" value={stats.totalImpressions} suffix="次" prefix={<EyeOutlined />} /></Card></Col>
        <Col xs={12} sm={8} lg={4}><Card size="small"><Statistic title="点击" value={stats.totalClicks} suffix="次" prefix={<RiseOutlined />} /></Card></Col>
        <Col xs={12} sm={8} lg={4}><Card size="small"><Statistic title="转化率" value={stats.ctr} suffix="%" prefix={<SearchOutlined />} /></Card></Col>
        <Col xs={12} sm={8} lg={4}><Card size="small"><Statistic title="花费" value={stats.totalSpent} prefix="¥" precision={2} valueStyle={{ color: ORANGE }} /></Card></Col>
        <Col xs={12} sm={8} lg={4}><Card size="small"><Statistic title="投放中" value={stats.activeCount} suffix={`/${ads.length}`} valueStyle={{ color: '#52C41A' }} /></Card></Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Button type="primary" icon={<RiseOutlined />} onClick={() => setCreateVisible(true)}
              style={{ background: ORANGE, borderColor: ORANGE }}>新建推广</Button>
          </Card>
        </Col>
      </Row>

      {/* 推广产品 */}
      <Card title="推广产品" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          {AD_PRODUCTS.map(p => (
            <Col xs={24} sm={12} md={8} key={p.key}>
              <Card hoverable style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 48, color: p.color }}>{p.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 18, margin: '12px 0 4px' }}>{p.name}</div>
                <div style={{ color: '#999', fontSize: 13 }}>{p.desc}</div>
                <div style={{ color: ORANGE, fontWeight: 700, margin: '8px 0', fontSize: 16 }}>{p.price}</div>
                <Button type="primary" style={{ background: p.color, borderColor: p.color }}
                  onClick={() => { setForm(prev => ({ ...prev, position: p.key })); setCreateVisible(true); }}>
                  立即开通
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 投放记录 */}
      <Card
        title="投放记录"
        extra={
          <Segmented
            options={[
              { value: 'all', label: '全部' },
              { value: 'home', label: '首页' },
              { value: 'category', label: '置顶' },
              { value: 'search', label: '竞价' },
            ]}
            value={adType}
            onChange={setAdType}
          />
        }
      >
        {error ? (
          <Alert type="error" message="加载失败" showIcon action={<Button size="small" danger onClick={fetchAds}>重试</Button>} />
        ) : loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <Table dataSource={filteredAds} rowKey="id" columns={columns}
            locale={{ emptyText: <Empty description="暂无投放记录，点击上方'新建推广'开始" /> }}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 800 }}
          />
        )}
      </Card>

      {/* 创建推广 Modal */}
      <Modal title="开通推广" open={createVisible} onCancel={() => setCreateVisible(false)}
        onOk={handleCreate} confirmLoading={creating} okText="确认开通" cancelText="取消">
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">推广位置</Text>
          <Select placeholder="选择推广位置" style={{ width: '100%', marginTop: 8 }}
            value={form.position}
            onChange={(v) => setForm(prev => ({ ...prev, position: v }))}
            options={AD_PRODUCTS.map(p => ({ value: p.key, label: `${p.name} — ${p.price}` }))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">总预算（元）</Text>
          <InputNumber placeholder="建议 ¥500-3000" style={{ width: '100%', marginTop: 8 }}
            value={form.budget} onChange={(v) => setForm(prev => ({ ...prev, budget: v }))}
            min={50} max={10000} prefix="¥" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">日预算（元，可选）</Text>
          <InputNumber placeholder="不填则均分" style={{ width: '100%', marginTop: 8 }}
            value={form.dailyBudget} onChange={(v) => setForm(prev => ({ ...prev, dailyBudget: v }))}
            min={10} max={500} prefix="¥" />
        </div>
        <div>
          <Text type="secondary">投放周期</Text>
          <DatePicker.RangePicker style={{ width: '100%', marginTop: 8 }}
            value={form.dateRange}
            onChange={(v) => setForm(prev => ({ ...prev, dateRange: v }))} />
        </div>
      </Modal>

      {/* 效果图表 Modal */}
      <Modal title={`${chartAd?.adPosition || ''} — 7日效果趋势`} open={chartVisible}
        onCancel={() => setChartVisible(false)} footer={null} width={700}>
        {chartAd && <ReactEChartsCore echarts={echarts} option={chartOption} style={{ height: 350 }} />}
      </Modal>
    </div>
  );
}
