import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Row, Col, Statistic, Table, Tag, Select, DatePicker, Button,
  Skeleton, Empty, message, Space, Segmented,
} from 'antd';
import {
  ShopOutlined, TeamOutlined, ShoppingCartOutlined, DollarOutlined,
  EnvironmentOutlined, RiseOutlined, FallOutlined, BarChartOutlined,
  TableOutlined, DownloadOutlined, ReloadOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import {
  GridComponent, TooltipComponent, TitleComponent, LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import dayjs from 'dayjs';
import { getMarketAnalytics } from '../services/api';

echarts.use([
  LineChart, BarChart, PieChart,
  GridComponent, TooltipComponent, TitleComponent, LegendComponent,
  CanvasRenderer,
]);

const ORANGE = '#FF6B35';
const BLUE = '#1A365D';

const DATE_OPTIONS = [
  { value: 7, label: '近7天' },
  { value: 30, label: '近30天' },
  { value: 90, label: '近90天' },
];

/* ==================== 组件 ==================== */
export default function MarketAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [markets, setMarkets] = useState([]);
  const [dateRange, setDateRange] = useState(30);
  const [viewMode, setViewMode] = useState('chart'); // chart | table
  const [sortField, setSortField] = useState('revenue');
  const [trendData, setTrendData] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const marketRes = await getMarketAnalytics(dateRange);
      if (marketRes && Array.isArray(marketRes.markets)) {
        setMarkets(marketRes.markets);
        setTrendData(marketRes.trend || []);
      } else {
        throw new Error('数据格式异常');
      }
    } catch (err) {
      console.error('获取市场分析数据失败:', err);
      setMarkets([]);
      setTrendData([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [dateRange]);

  /* ---- 汇总统计 ---- */
  const totals = useMemo(() => ({
    totalShops: markets.reduce((s, m) => s + m.shopCount, 0),
    totalNavigators: markets.reduce((s, m) => s + m.navigatorCount, 0),
    totalOrders: markets.reduce((s, m) => s + m.orderCount, 0),
    totalRevenue: markets.reduce((s, m) => s + m.revenue, 0),
  }), [markets]);

  /* ---- 排序后数据 ---- */
  const sortedMarkets = useMemo(() => {
    const sorted = [...markets];
    const desc = sortField !== 'avgRating'; // 评分升序（越低越需要关注）
    sorted.sort((a, b) => {
      const va = Number(a[sortField]) || 0;
      const vb = Number(b[sortField]) || 0;
      return desc ? vb - va : va - vb;
    });
    return sorted;
  }, [markets, sortField]);

  /* ---- ECharts 趋势图配置 ---- */
  const trendChartOption = useMemo(() => {
    if (!trendData.length) return {};
    const marketNames = markets.slice(0, 5).map(m => m.name);
    const colors = [ORANGE, BLUE, '#52C41A', '#FAAD14', '#1677FF'];
    return {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, data: marketNames },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: trendData.map(d => d.date), boundaryGap: false },
      yAxis: { type: 'value', name: '订单数' },
      series: marketNames.map((name, i) => ({
        name,
        type: 'line',
        data: trendData.map(d => d[name] || 0),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3, color: colors[i] },
        itemStyle: { color: colors[i] },
      })),
    };
  }, [trendData, markets]);

  /* ---- ECharts 市场对比柱状图 ---- */
  const barChartOption = useMemo(() => {
    const names = markets.slice(0, 8).map(m => m.name);
    return {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0 },
      grid: { left: 60, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: names, axisLabel: { rotate: 15, fontSize: 11 } },
      yAxis: { type: 'value', name: '金额(元)' },
      series: [
        {
          name: '成交额',
          type: 'bar',
          data: markets.slice(0, 8).map(m => m.revenue),
          itemStyle: { color: ORANGE, borderRadius: [6, 6, 0, 0] },
          barWidth: 28,
        },
        {
          name: '订单数',
          type: 'bar',
          data: markets.slice(0, 8).map(m => m.orderCount),
          itemStyle: { color: BLUE, borderRadius: [6, 6, 0, 0] },
          barWidth: 28,
        },
      ],
    };
  }, [markets]);

  /* ---- 表格列 ---- */
  const columns = [
    {
      title: '市场名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontWeight: 600 }}><EnvironmentOutlined style={{ color: ORANGE, marginRight: 6 }} />{text}</span>,
    },
    {
      title: '商户数',
      dataIndex: 'shopCount',
      key: 'shopCount',
      sorter: (a, b) => a.shopCount - b.shopCount,
      render: v => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: '领航员',
      dataIndex: 'navigatorCount',
      key: 'navigatorCount',
      sorter: (a, b) => a.navigatorCount - b.navigatorCount,
    },
    {
      title: '订单数',
      dataIndex: 'orderCount',
      key: 'orderCount',
      sorter: (a, b) => a.orderCount - b.orderCount,
      render: v => <span style={{ fontWeight: 600, color: BLUE }}>{v}</span>,
    },
    {
      title: '成交额(元)',
      dataIndex: 'revenue',
      key: 'revenue',
      sorter: (a, b) => a.revenue - b.revenue,
      render: v => <span style={{ fontWeight: 600, color: ORANGE }}>¥{v?.toLocaleString() || 0}</span>,
    },
    {
      title: '增长',
      dataIndex: 'growth',
      key: 'growth',
      sorter: (a, b) => Number(a.growth) - Number(b.growth),
      render: v => (
        <Tag color={Number(v) >= 0 ? 'green' : 'red'} icon={Number(v) >= 0 ? <RiseOutlined /> : <FallOutlined />}>
          {Number(v) >= 0 ? '+' : ''}{v}%
        </Tag>
      ),
    },
    {
      title: '转化率',
      dataIndex: 'conversionRate',
      key: 'conversionRate',
      sorter: (a, b) => Number(a.conversionRate) - Number(b.conversionRate),
      render: v => `${v}%`,
    },
    {
      title: '评分',
      dataIndex: 'avgRating',
      key: 'avgRating',
      sorter: (a, b) => Number(a.avgRating) - Number(b.avgRating),
      render: v => (
        <span style={{ color: Number(v) >= 4.5 ? '#52C41A' : Number(v) >= 4 ? '#FAAD14' : '#FF4D4F' }}>
          ★ {v}
        </span>
      ),
    },
    {
      title: '信标数',
      dataIndex: 'beaconCount',
      key: 'beaconCount',
      sorter: (a, b) => a.beaconCount - b.beaconCount,
    },
  ];

  /* ---- CSV 导出 ---- */
  const handleExport = () => {
    const header = '市场名称,商户数,领航员,订单数,成交额,增长率,转化率,评分,信标数\n';
    const BOM = '﻿';
    const rows = sortedMarkets.map(m =>
      [m.name, m.shopCount, m.navigatorCount, m.orderCount, m.revenue, `${m.growth}%`, `${m.conversionRate}%`, m.avgRating, m.beaconCount].join(',')
    ).join('\n');
    const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `市场分析_${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
  };

  /* ==================== 渲染 ==================== */
  if (error && !markets.length) {
    return (
      <div>
        <h2 style={{ marginBottom: 24 }}>市场数据大盘</h2>
        <Empty description="数据加载失败">
          <p style={{ color: '#999', marginBottom: 12 }}>无法获取市场分析数据</p>
          <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}
            style={{ background: ORANGE, borderColor: ORANGE }}>
            重新加载
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div>
      {/* 页头 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0 }}>市场数据大盘</h2>
        <Space wrap>
          <Select
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 120 }}
            options={DATE_OPTIONS.map(d => ({ value: d.value, label: d.label }))}
          />
          <Segmented
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: 'chart', icon: <BarChartOutlined />, label: '图表' },
              { value: 'table', icon: <TableOutlined />, label: '表格' },
            ]}
          />
          <Button icon={<DownloadOutlined />} onClick={handleExport}>导出CSV</Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        </Space>
      </div>

      {/* 汇总卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { key: 'totalShops', label: '总商户', icon: <ShopOutlined />, color: '#1677FF' },
          { key: 'totalNavigators', label: '总领航员', icon: <TeamOutlined />, color: '#52C41A' },
          { key: 'totalOrders', label: '总订单', icon: <ShoppingCartOutlined />, color: '#FAAD14' },
          { key: 'totalRevenue', label: '总成交额', icon: <DollarOutlined />, color: ORANGE },
        ].map(item => (
          <Col xs={12} sm={12} md={6} key={item.key}>
            <Card style={{ borderRadius: 12, marginBottom: 12 }}>
              <Skeleton loading={loading} active paragraph={{ rows: 1 }}>
                <Statistic
                  title={item.label}
                  value={totals[item.key] ?? '--'}
                  prefix={item.icon}
                  valueStyle={{ color: item.color, fontWeight: 700 }}
                  formatter={item.key === 'totalRevenue' ? v => `¥${v?.toLocaleString() || 0}` : undefined}
                />
              </Skeleton>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 图表视图 */}
      {viewMode === 'chart' && (
        <>
          {/* 市场订单趋势（折线图） */}
          <Card
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>各市场订单趋势</span>}
            style={{ borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
          >
            <Skeleton loading={loading} active paragraph={{ rows: 8 }}>
              {trendData.length > 0 ? (
                <ReactEChartsCore
                  echarts={echarts}
                  option={trendChartOption}
                  style={{ height: 350 }}
                  notMerge
                />
              ) : (
                <Empty description="暂无趋势数据" style={{ padding: 40 }} />
              )}
            </Skeleton>
          </Card>

          {/* 成交额 + 订单量柱状图对比 */}
          <Card
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>市场对比（成交额 & 订单量）</span>}
            style={{ borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
          >
            <Skeleton loading={loading} active paragraph={{ rows: 8 }}>
              {markets.length > 0 ? (
                <ReactEChartsCore
                  echarts={echarts}
                  option={barChartOption}
                  style={{ height: 350 }}
                  notMerge
                />
              ) : (
                <Empty description="暂无对比数据" style={{ padding: 40 }} />
              )}
            </Skeleton>
          </Card>
        </>
      )}

      {/* 表格视图 */}
      {viewMode === 'table' && (
        <Card
          title={<span style={{ fontSize: 16, fontWeight: 600 }}>市场详细对比</span>}
          style={{ borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <Table
            dataSource={sortedMarkets}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={false}
            size="middle"
            locale={{ emptyText: <Empty description="暂无市场数据" /> }}
            scroll={{ x: 1000 }}
          />
        </Card>
      )}
    </div>
  );
}
