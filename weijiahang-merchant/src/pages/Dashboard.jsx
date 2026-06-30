import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, Row, Col, Table, Tag, Skeleton, Alert, Button, Segmented, Space, Empty, Typography } from 'antd';
import {
  EyeOutlined, ShoppingCartOutlined, DollarOutlined, StarOutlined,
  ArrowUpOutlined, ArrowDownOutlined, ReloadOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../utils/echarts-init';
import dayjs from 'dayjs';
import api from '../services/api';

const { Text } = Typography;

// 生成降级 mock 数据（API 不可用时使用）
function generateMockDashboard() {
  const revenueTrend = [];
  for (let i = 29; i >= 0; i--) {
    const d = dayjs().subtract(i, 'day');
    revenueTrend.push({ date: d.format('MM/DD'), amount: Math.floor(Math.random() * 3000 + 500) });
  }
  const statuses = { completed: 45, pending: 8, accepted: 12, cancelled: 3 };
  const categorySales = [
    { name: '瓷砖', sales: 12500 },
    { name: '地板', sales: 9800 },
    { name: '卫浴', sales: 7200 },
    { name: '涂料', sales: 5600 },
    { name: '门窗', sales: 4300 },
    { name: '辅材', sales: 2100 },
  ];
  const funnel = [
    { value: 1200, name: '曝光' },
    { value: 450, name: '点击' },
    { value: 180, name: '导航到店' },
    { value: 80, name: '到店咨询' },
    { value: 23, name: '成交' },
  ];
  const recentOrders = Array.from({ length: 8 }, (_, i) => ({
    id: `mock-${i}`,
    orderNo: `MO${String(Date.now()).slice(-8)}${i}`,
    customer: `客户****${i}`,
    amount: Math.floor(Math.random() * 5000 + 200),
    status: ['pending', 'accepted', 'completed', 'completed', 'completed'][i % 5],
    time: dayjs().subtract(i * 3, 'hour').toISOString(),
  }));
  return {
    stats: {
      exposure: 432, orders: 8, revenue: 14580, rating: 4.8,
      exposureTrend: -3.2, ordersTrend: 2, revenueTrend: 8.5, ratingTrend: 0.1,
    },
    revenueTrend, orderStatusCount: statuses, categorySales, funnel, recentOrders,
  };
}

// 订单状态配置
const STATUS_CONFIG = {
  pending: { color: 'gold', label: '待确认' },
  accepted: { color: 'blue', label: '服务中' },
  completed: { color: 'green', label: '已完成' },
  cancelled: { color: 'red', label: '已取消' },
};

// 品牌橙色渐变
const ORANGE_GRADIENT = { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#FF6B35' }, { offset: 1, color: 'rgba(255,107,53,0.1)' }] };
const ORANGE = '#FF6B35';

// 漏斗图颜色阶梯
const FUNNEL_COLORS = ['#FF6B35', '#FF8C60', '#FFAB8B', '#FFC9B5', '#FFE0D6'];

// 统计卡片配置
const STAT_CARDS = [
  { key: 'exposure', label: '今日曝光', icon: <EyeOutlined />, color: '#1677FF', prefix: '' },
  { key: 'orders', label: '今日订单', icon: <ShoppingCartOutlined />, color: '#52C41A', prefix: '' },
  { key: 'revenue', label: '本月成交额', icon: <DollarOutlined />, color: ORANGE, prefix: '¥' },
  { key: 'rating', label: '店铺评分', icon: <StarOutlined />, color: '#FAAD14', prefix: '' },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState('7d');
  const abortFlag = useRef(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.getDashboard();
      if (abortFlag.current) return;
      setData(res || generateMockDashboard());
    } catch {
      if (abortFlag.current) return;
      // API 不可用时使用本地降级数据，不阻塞看板展示
      setData(generateMockDashboard());
    } finally {
      if (!abortFlag.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    abortFlag.current = false;
    fetchDashboard();
    return () => { abortFlag.current = true; };
  }, [fetchDashboard]);

  // ---- 计算统计数据 ----
  const statsData = useMemo(() => {
    if (!data?.stats) return STAT_CARDS.map(c => ({ ...c, value: 0, trend: 0, trendLabel: '' }));
    const s = data.stats;
    return [
      { ...STAT_CARDS[0], value: s.exposure || 0, trend: s.exposureTrend || 0, trendLabel: 'vs 昨日' },
      { ...STAT_CARDS[1], value: s.orders || 0, trend: s.ordersTrend || 0, trendLabel: 'vs 昨日' },
      { ...STAT_CARDS[2], value: s.revenue || 0, trend: s.revenueTrend || 0, trendLabel: 'vs 上月' },
      { ...STAT_CARDS[3], value: s.rating || '--', trend: s.ratingTrend || 0, trendLabel: '' },
    ];
  }, [data]);

  // ---- 收入趋势 (折线图) ----
  const revenueOption = useMemo(() => {
    const chartData = data?.revenueTrend || [];
    const filtered = dateRange === '7d' ? chartData.slice(-7) : chartData;
    const dates = filtered.map(d => d.date);
    const revenues = filtered.map(d => d.amount);
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v) => `¥${v?.toLocaleString() || 0}` },
      grid: { left: 60, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: dates.length ? dates : ['暂无'], axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', name: '收入(元)', nameTextStyle: { fontSize: 11 } },
      series: [{
        type: 'line', smooth: true,
        data: revenues.length ? revenues : [0],
        areaStyle: { color: ORANGE_GRADIENT },
        itemStyle: { color: ORANGE },
        lineStyle: { width: 3 },
        markLine: revenues.length > 1 ? {
          silent: true,
          data: [{ type: 'average', name: '日均' }],
          lineStyle: { color: '#999', type: 'dashed' },
          label: { formatter: '日均: ¥{c}', fontSize: 11 },
        } : undefined,
      }],
    };
  }, [data, dateRange]);

  // ---- 订单状态分布 (饼图) ----
  const pieOption = useMemo(() => {
    const statusCount = data?.orderStatusCount || {};
    const hasData = Object.values(statusCount).some(v => v > 0);
    if (!hasData) {
      return {
        tooltip: { trigger: 'item' },
        series: [{
          type: 'pie', radius: ['45%', '75%'],
          label: { formatter: '{b}\n{d}%' },
          data: [{ value: 1, name: '暂无数据', itemStyle: { color: '#E8E8E8' } }],
        }],
      };
    }
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} 单 ({d}%)' },
      series: [{
        type: 'pie', radius: ['45%', '75%'], center: ['50%', '50%'],
        label: { formatter: '{b}\n{d}%', fontSize: 11 },
        data: [
          { value: statusCount.completed || 0, name: '已完成', itemStyle: { color: '#52C41A' } },
          { value: statusCount.pending || 0, name: '待确认', itemStyle: { color: '#FAAD14' } },
          { value: statusCount.accepted || 0, name: '服务中', itemStyle: { color: '#1677FF' } },
          { value: statusCount.cancelled || 0, name: '已取消', itemStyle: { color: '#FF4D4F' } },
        ].filter(d => d.value > 0),
      }],
    };
  }, [data]);

  // ---- 品类销售 (柱状图) ----
  const barOption = useMemo(() => {
    const categories = data?.categorySales || [];
    const hasData = categories.length > 0;
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v) => `¥${v?.toLocaleString() || 0}` },
      grid: { left: 60, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: hasData ? categories.map(c => c.name) : ['暂无'], axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', name: '销售额(元)', nameTextStyle: { fontSize: 11 } },
      series: [{
        type: 'bar',
        data: hasData ? categories.map(c => c.sales) : [0],
        itemStyle: { color: ORANGE, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 40,
      }],
    };
  }, [data]);

  // ---- 流量转化漏斗 ----
  const funnelOption = useMemo(() => {
    const funnelData = data?.funnel || [
      { value: 1200, name: '曝光' },
      { value: 450, name: '点击' },
      { value: 180, name: '导航到店' },
      { value: 80, name: '到店咨询' },
      { value: 23, name: '成交' },
    ];
    const hasData = funnelData.some(d => d.value > 0);
    if (!hasData) {
      return {
        series: [{
          type: 'funnel', left: '10%', width: '80%', sort: 'descending',
          label: { formatter: '{b}: 0' },
          data: [{ value: 1, name: '暂无数据', itemStyle: { color: '#E8E8E8' } }],
        }],
      };
    }
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      series: [{
        type: 'funnel', left: '10%', width: '80%', sort: 'descending',
        label: { formatter: '{b}: {c}', fontSize: 12 },
        data: funnelData.map((item, i) => ({
          ...item,
          itemStyle: { color: FUNNEL_COLORS[i % FUNNEL_COLORS.length] },
        })),
      }],
    };
  }, [data]);

  // ---- 近期订单表格 ----
  const recentOrders = useMemo(() => data?.recentOrders || [], [data]);
  const orderColumns = useMemo(() => [
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 180, ellipsis: true },
    { title: '客户', dataIndex: 'customer', key: 'customer', width: 120 },
    { title: '金额', dataIndex: 'amount', key: 'amount', width: 100, render: (v) => `¥${v?.toLocaleString() || 0}` },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s) => {
        const cfg = STATUS_CONFIG[s];
        return <Tag color={cfg?.color || 'default'}>{cfg?.label || s}</Tag>;
      },
    },
    {
      title: '时间', dataIndex: 'time', key: 'time', width: 160,
      render: (t) => t ? dayjs(t).format('MM/DD HH:mm') : '-',
    },
  ], []);

  // ---- 渲染统计卡片 ----
  const renderStatCards = () => {
    if (loading) {
      return STAT_CARDS.map((c) => (
        <Col xs={12} sm={12} md={6} key={c.key}>
          <Card><Skeleton active paragraph={{ rows: 2 }} title={false} /></Card>
        </Col>
      ));
    }
    return statsData.map((s) => {
      const isPositive = s.trend >= 0;
      const displayValue = s.prefix === '¥'
        ? `¥${(s.value || 0).toLocaleString()}`
        : s.value !== '--' ? (s.value || 0).toLocaleString() : '--';
      return (
        <Col xs={12} sm={12} md={6} key={s.key}>
          <Card size="small" hoverable>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space>
                <span style={{ color: s.color, fontSize: 20 }}>{s.icon}</span>
                <Text type="secondary" style={{ fontSize: 13 }}>{s.label}</Text>
              </Space>
              <Text strong style={{ fontSize: 28, color: s.color }}>{displayValue}</Text>
              {s.trendLabel && (
                <Space size={4}>
                  <Text style={{ fontSize: 12, color: isPositive ? '#52C41A' : '#FF4D4F' }}>
                    {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {Math.abs(s.trend).toFixed(1)}%
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{s.trendLabel}</Text>
                </Space>
              )}
            </Space>
          </Card>
        </Col>
      );
    });
  };

  // ---- 渲染图表包装 ----
  const renderChartBox = (title, option, extra) => (
    <Card
      title={<span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>}
      size="small"
      extra={extra}
      style={{ height: '100%' }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <ReactEChartsCore echarts={echarts} option={option} style={{ height: 300, width: '100%' }} notMerge />
      )}
    </Card>
  );

  // ---- 错误状态 ----
  if (error) {
    return (
      <div>
        <h2 style={{ marginBottom: 24, fontSize: 20, fontWeight: 700 }}>数据看板</h2>
        <Alert
          type="error"
          message="数据加载失败"
          description="无法获取数据看板信息，请检查网络连接后重试"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchDashboard}>重新加载</Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>数据看板</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchDashboard} loading={loading} size="small">刷新</Button>
      </div>

      {/* 顶部统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {renderStatCards()}
      </Row>

      {/* 第一行图表：收入趋势 + 订单分布 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          {renderChartBox(
            '收入趋势',
            revenueOption,
            <Segmented
              value={dateRange}
              onChange={setDateRange}
              options={[
                { value: '7d', label: '近7日' },
                { value: '30d', label: '近30日' },
              ]}
              size="small"
            />
          )}
        </Col>
        <Col xs={24} lg={10}>
          {renderChartBox('订单状态分布', pieOption)}
        </Col>
      </Row>

      {/* 第二行图表：品类销售 + 流量漏斗 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          {renderChartBox('品类销售排行', barOption)}
        </Col>
        <Col xs={24} lg={10}>
          {renderChartBox('流量转化漏斗', funnelOption)}
        </Col>
      </Row>

      {/* 近期订单 */}
      <Card
        title={<span style={{ fontSize: 14, fontWeight: 600 }}>近期订单</span>}
        size="small"
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <Table
            dataSource={recentOrders}
            columns={orderColumns}
            rowKey={(r) => r.id || r.orderNo}
            pagination={false}
            size="small"
            scroll={{ x: 660 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<span>暂无订单数据</span>}
                />
              ),
            }}
          />
        )}
      </Card>
    </div>
  );
}
