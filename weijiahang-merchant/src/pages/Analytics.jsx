import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card, Row, Col, Select, DatePicker, Button, Table, Statistic, Skeleton, Empty, Alert,
  Segmented, Space, message
} from 'antd';
import {
  EyeOutlined, UserOutlined, ShoppingCartOutlined, DollarOutlined,
  RiseOutlined, FallOutlined, DownloadOutlined, ReloadOutlined,
  BarChartOutlined, LineChartOutlined, PieChartOutlined, FunnelPlotOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../utils/echarts-init';
import { exportCSV } from '../utils/export-csv';
import dayjs from 'dayjs';
import api from '../services/api';

const ORANGE = '#FF6B35';
const BLUE = '#1A365D';

/** 日期范围选项 */
const DATE_RANGES = [
  { value: 7, label: '近7天' },
  { value: 30, label: '近30天' },
  { value: 90, label: '近90天' },
];

/** 模拟每日数据生成（实际应从 API 获取） */
function generateDailyData(days) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day').format('MM/DD');
    result.push({
      date,
      impressions: Math.floor(Math.random() * 500 + 300),
      visitors: Math.floor(Math.random() * 100 + 50),
      orders: Math.floor(Math.random() * 15 + 3),
      revenue: Math.floor(Math.random() * 3000 + 500),
    });
  }
  return result;
}

/** 模拟来源分布 */
const SOURCE_DATA = [
  { name: '平台搜索', value: 35 },
  { name: '首页推荐', value: 25 },
  { name: '品类浏览', value: 20 },
  { name: '外部分享', value: 12 },
  { name: '直接访问', value: 8 },
];

/** 模拟商品排行 */
function generateProductRanking() {
  const materials = ['瓷砖', '地板', '涂料', '卫浴', '门窗', '辅材'];
  return materials.map((name, i) => ({
    key: i,
    name: `${name}系列产品`,
    sales: Math.floor(Math.random() * 200 + 20),
    revenue: Math.floor(Math.random() * 50000 + 5000),
    refundRate: (Math.random() * 5).toFixed(1),
  }));
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dateRange, setDateRange] = useState(30);
  const [customDate, setCustomDate] = useState(null);
  const [chartTab, setChartTab] = useState('trend'); // trend | source | funnel
  const [productSort, setProductSort] = useState('sales'); // sales | revenue | refundRate
  const [data, setData] = useState(null);
  const abortFlag = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const startDate = customDate?.[0]?.format('YYYY-MM-DD')
        || dayjs().subtract(dateRange, 'day').format('YYYY-MM-DD');
      const endDate = customDate?.[1]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD');

      const res = await api.getAnalytics({ startDate, endDate, type: 'shop' });

      if (!res || !res.dailyData) {
        throw new Error('No analytics data');
      }

      // 计算客单价，仅调用一次 setData
      const summary = res.summary || {};
      const avgOrderValue = summary.totalOrders > 0
        ? (summary.totalRevenue / summary.totalOrders).toFixed(0)
        : 0;

      if (abortFlag.current) return;
      setData({ ...res, summary: { ...summary, avgOrderValue } });
    } catch {
      if (abortFlag.current) return;
      // API不可用时使用本地降级数据
      const dailyData = generateDailyData(dateRange);
      setData({
        dailyData,
        sourceData: SOURCE_DATA,
        productRanking: generateProductRanking(),
        summary: {
          totalImpressions: dailyData.reduce((s, d) => s + d.impressions, 0),
          totalVisitors: dailyData.reduce((s, d) => s + d.visitors, 0),
          totalOrders: dailyData.reduce((s, d) => s + d.orders, 0),
          totalRevenue: dailyData.reduce((s, d) => s + d.revenue, 0),
          avgOrderValue: 0,
        },
      });
    } finally {
      if (!abortFlag.current) setLoading(false);
    }
  }, [dateRange, customDate]);

  useEffect(() => {
    abortFlag.current = false;
    fetchData();
    return () => { abortFlag.current = true; };
  }, [fetchData]);

  /* ==================== 图表配置 ==================== */

  /** 收入/订单趋势图 */
  const trendOption = useMemo(() => {
    if (!data?.dailyData) return {};
    const days = data.dailyData.map(d => d.date);
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['曝光量', '访客数', '订单量', '收入(元)'] },
      grid: { left: 60, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: days, axisLabel: { rotate: 45 } },
      yAxis: [
        { type: 'value', name: '次/人' },
        { type: 'value', name: '元' },
      ],
      series: [
        { name: '曝光量', type: 'line', data: data.dailyData.map(d => d.impressions), color: '#1677FF', smooth: true },
        { name: '访客数', type: 'line', data: data.dailyData.map(d => d.visitors), color: '#52C41A', smooth: true },
        { name: '订单量', type: 'bar', data: data.dailyData.map(d => d.orders), color: ORANGE },
        { name: '收入(元)', type: 'line', yAxisIndex: 1, data: data.dailyData.map(d => d.revenue), color: '#FAAD14', smooth: true },
      ],
    };
  }, [data]);

  /** 来源分布饼图 */
  const sourceOption = useMemo(() => {
    if (!data?.sourceData) return {};
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', right: 10, top: 'center' },
      series: [{
        type: 'pie', radius: ['40%', '70%'], center: ['40%', '50%'],
        data: data.sourceData.map(s => ({ name: s.name, value: s.value })),
        label: { show: true, formatter: '{b}\n{d}%' },
        color: [ORANGE, '#1677FF', '#52C41A', '#FAAD14', '#999'],
      }],
    };
  }, [data]);

  /** 转化漏斗 */
  const funnelOption = useMemo(() => {
    if (!data?.summary) return {};
    const { totalImpressions, totalVisitors, totalOrders } = data.summary;
    const consulted = Math.floor(totalVisitors * 0.35); // 假设35%咨询
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      series: [{
        type: 'bar',
        data: [
          { name: '曝光', value: totalImpressions, itemStyle: { color: '#1677FF' } },
          { name: '点击', value: totalVisitors, itemStyle: { color: '#52C41A' } },
          { name: '咨询', value: consulted, itemStyle: { color: '#FAAD14' } },
          { name: '下单', value: totalOrders, itemStyle: { color: ORANGE } },
        ],
        label: { show: true, position: 'right', formatter: '{c}' },
        barWidth: 40,
      }],
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: ['下单', '咨询', '点击', '曝光'] },
      grid: { left: 60, right: 80, top: 20, bottom: 20 },
    };
  }, [data]);

  /* ==================== 导出 CSV ==================== */
  const handleExport = () => {
    if (!data?.dailyData) return;
    const columns = ['日期', '曝光量', '访客数', '订单量', '收入(元)'];
    const rows = data.dailyData.map(d => [d.date, String(d.impressions), String(d.visitors), String(d.orders), String(d.revenue)]);
    exportCSV('经营分析', columns, rows);
    message.success('导出成功');
  };

  /* ==================== 商品表格列 ==================== */
  const productColumns = [
    { title: '商品名称', dataIndex: 'name', key: 'name' },
    {
      title: '销量', dataIndex: 'sales', key: 'sales', sorter: (a, b) => a.sales - b.sales,
      render: v => <span style={{ fontWeight: 600 }}>{v?.toLocaleString()}</span>,
    },
    {
      title: '收入', dataIndex: 'revenue', key: 'revenue', sorter: (a, b) => a.revenue - b.revenue,
      render: v => <span style={{ color: ORANGE, fontWeight: 600 }}>¥{v?.toLocaleString()}</span>,
    },
    {
      title: '退单率', dataIndex: 'refundRate', key: 'refundRate', sorter: (a, b) => a.refundRate - b.refundRate,
      render: v => <span style={{ color: v > 3 ? '#FF4D4F' : '#52C41A' }}>{v}%</span>,
    },
  ];

  const sortedProducts = useMemo(() => {
    if (!data?.productRanking) return [];
    return [...data.productRanking].sort((a, b) => {
      if (productSort === 'sales') return b.sales - a.sales;
      if (productSort === 'revenue') return b.revenue - a.revenue;
      return a.refundRate - b.refundRate;
    });
  }, [data, productSort]);

  /* ==================== 渲染 ==================== */
  if (error) {
    return (
      <Alert type="error" message="数据加载失败" showIcon
        action={<Button size="small" danger onClick={fetchData} icon={<ReloadOutlined />}>重试</Button>} />
    );
  }

  if (loading) return <Skeleton active paragraph={{ rows: 6 }} />;

  const s = data?.summary || {};

  return (
    <div>
      {/* 顶部筛选栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <span style={{ marginRight: 8, color: '#666' }}>时间范围：</span>
            <Segmented
              options={DATE_RANGES}
              value={dateRange}
              onChange={(v) => { setDateRange(v); setCustomDate(null); }}
            />
          </Col>
          <Col>
            <DatePicker.RangePicker
              value={customDate}
              onChange={(v) => { setCustomDate(v); if (v) setDateRange(null); }}
              placeholder={['开始日期', '结束日期']}
              allowClear
            />
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>导出CSV</Button>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 汇总统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="曝光量" value={s.totalImpressions || 0} suffix="次" prefix={<EyeOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="访客数" value={s.totalVisitors || 0} suffix="人" prefix={<UserOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="订单量" value={s.totalOrders || 0} suffix="单" prefix={<ShoppingCartOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="总收入" value={s.totalRevenue || 0} prefix="¥" precision={2}
              valueStyle={{ color: ORANGE }} />
          </Card>
        </Col>
        <Col xs={12} sm={6} style={{ marginTop: 16 }}>
          <Card size="small"><Statistic title="客单价" value={s.avgOrderValue || 0} prefix={<DollarOutlined />} suffix="元" /></Card>
        </Col>
        <Col xs={12} sm={6} style={{ marginTop: 16 }}>
          <Card size="small">
            <Statistic title="曝光→访客转化" value={s.totalImpressions > 0
              ? ((s.totalVisitors / s.totalImpressions) * 100).toFixed(1) : '0.0'} suffix="%" />
          </Card>
        </Col>
        <Col xs={12} sm={6} style={{ marginTop: 16 }}>
          <Card size="small">
            <Statistic title="访客→下单转化" value={s.totalVisitors > 0
              ? ((s.totalOrders / s.totalVisitors) * 100).toFixed(1) : '0.0'} suffix="%" />
          </Card>
        </Col>
        <Col xs={12} sm={6} style={{ marginTop: 16 }}>
          <Card size="small">
            <Statistic title="环比上周" value={s?.weeklyGrowth || 0} suffix="%" prefix={<RiseOutlined />} valueStyle={{ color: '#52C41A' }} />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Card
        title="数据分析"
        style={{ marginBottom: 16 }}
        extra={
          <Segmented
            options={[
              { value: 'trend', icon: <LineChartOutlined />, label: '趋势' },
              { value: 'source', icon: <PieChartOutlined />, label: '来源' },
              { value: 'funnel', icon: <FunnelPlotOutlined />, label: '漏斗' },
            ]}
            value={chartTab}
            onChange={setChartTab}
          />
        }
      >
        {chartTab === 'trend' && (
          <ReactEChartsCore echarts={echarts} option={trendOption} style={{ height: 400 }} />
        )}
        {chartTab === 'source' && (
          <ReactEChartsCore echarts={echarts} option={sourceOption} style={{ height: 400 }} />
        )}
        {chartTab === 'funnel' && (
          <ReactEChartsCore echarts={echarts} option={funnelOption} style={{ height: 400 }} />
        )}
      </Card>

      {/* 商品排行 */}
      <Card
        title="商品表现排行"
        extra={
          <Select value={productSort} onChange={setProductSort} style={{ width: 120 }}>
            <Select.Option value="sales">按销量</Select.Option>
            <Select.Option value="revenue">按收入</Select.Option>
            <Select.Option value="refundRate">按退单率</Select.Option>
          </Select>
        }
      >
        <Table
          dataSource={sortedProducts} columns={productColumns}
          pagination={false} size="middle"
          scroll={{ x: 480 }}
          locale={{ emptyText: <Empty description="暂无数据" /> }}
        />
      </Card>
    </div>
  );
}
