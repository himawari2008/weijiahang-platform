import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Skeleton, Empty, Button, message, Segmented, Space } from 'antd';
import {
  UserOutlined, TeamOutlined, ShopOutlined, DollarOutlined,
  ShoppingCartOutlined, RiseOutlined, FallOutlined, ReloadOutlined,
  BarChartOutlined, TableOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import dayjs from 'dayjs';
import { getDashboard, getPendingTasks } from '../services/api';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';

echarts.use([LineChart, BarChart, PieChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const ORANGE = '#FF6B35';
const BLUE = '#1A365D';

/* ==================== 模拟趋势数据 ==================== */
function mockTrend(days) {
  const result = [];
  for (let d = days - 1; d >= 0; d--) {
    result.push({
      date: dayjs().subtract(d, 'day').format('MM/DD'),
      revenue: Math.floor(Math.random() * 30000 + 10000),
      orders: Math.floor(Math.random() * 40 + 20),
      users: Math.floor(Math.random() * 20 + 5),
    });
  }
  return result;
}

/* ==================== 组件 ==================== */
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [viewMode, setViewMode] = useState('chart');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [dashboardData, tasksData] = await Promise.all([
        getDashboard(),
        getPendingTasks(),
      ]);
      setStats(dashboardData);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      // API 未返回趋势数据时使用mock
      setTrendData(dashboardData?.trend || mockTrend(14));
    } catch (err) {
      console.error('获取大盘数据失败:', err);
      // 降级Mock
      setStats({
        totalUsers: 12860, totalShops: 356, totalNavigators: 182,
        todayOrders: 247, todayRevenue: 68500, growthRate: 12.5,
        conversionRate: 8.3, activeNavigators: 95,
      });
      setTasks([
        { id: 1, type: '商家审核', desc: '新入驻商家待审核 5 家', status: 'urgent', time: '10分钟前' },
        { id: 2, type: '领航员审核', desc: '新注册领航员待审核 3 人', status: 'pending', time: '30分钟前' },
        { id: 3, type: '订单纠纷', desc: '用户投诉纠纷 2 笔', status: 'urgent', time: '1小时前' },
        { id: 4, type: '提现审核', desc: '领航员提现申请 8 笔', status: 'pending', time: '2小时前' },
        { id: 5, type: '结算审核', desc: '周期结算待审核 4 笔', status: 'pending', time: '3小时前' },
      ]);
      setTrendData(mockTrend(14));
      message.warning('使用本地缓存数据');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ---- ECharts 折线图配置 ---- */
  const lineChartOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, data: ['成交额', '订单数', '新用户'] },
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: trendData.map(d => d.date), boundaryGap: false },
    yAxis: [
      { type: 'value', name: '金额(元)', axisLabel: { formatter: v => `${(v / 1000).toFixed(0)}k` } },
      { type: 'value', name: '数量' },
    ],
    series: [
      {
        name: '成交额', type: 'line', yAxisIndex: 0,
        data: trendData.map(d => d.revenue || 0),
        smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { width: 3, color: ORANGE },
        itemStyle: { color: ORANGE },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(255,107,53,0.25)' }, { offset: 1, color: 'rgba(255,107,53,0.02)' }
        ])},
      },
      {
        name: '订单数', type: 'line', yAxisIndex: 1,
        data: trendData.map(d => d.orders || 0),
        smooth: true, symbol: 'diamond', symbolSize: 6,
        lineStyle: { width: 2.5, color: BLUE },
        itemStyle: { color: BLUE },
      },
      {
        name: '新用户', type: 'line', yAxisIndex: 1,
        data: trendData.map(d => d.users || 0),
        smooth: true, symbol: 'triangle', symbolSize: 6,
        lineStyle: { width: 2, color: '#52C41A', type: 'dashed' },
        itemStyle: { color: '#52C41A' },
      },
    ],
  }), [trendData]);

  /* ---- ECharts 饼图(品类分布) ---- */
  const pieChartOption = useMemo(() => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      center: ['50%', '43%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
      label: { show: true, formatter: '{b}\n{d}%' },
      data: [
        { value: stats?.ceramicOrders || 85, name: '陶瓷', itemStyle: { color: ORANGE } },
        { value: stats?.woodOrders || 62, name: '地板', itemStyle: { color: BLUE } },
        { value: stats?.bathOrders || 45, name: '卫浴', itemStyle: { color: '#52C41A' } },
        { value: stats?.paintOrders || 30, name: '涂料', itemStyle: { color: '#FAAD14' } },
        { value: stats?.otherOrders || 25, name: '其他', itemStyle: { color: '#1677FF' } },
      ],
    }],
  }), [stats]);

  if (error && !stats) {
    return (
      <div>
        <PageHeader title="运营大盘" extra={
          <Button type="primary" icon={<ReloadOutlined />} style={{ background: ORANGE }} onClick={fetchData}>重新加载</Button>
        } />
        <Empty description="数据加载失败" style={{ padding: 60 }}>
          <Button type="primary" onClick={fetchData}>重试</Button>
        </Empty>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="运营大盘" extra={
        <Space>
          <Segmented value={viewMode} onChange={setViewMode}
            options={[
              { value: 'chart', icon: <BarChartOutlined />, label: '图表' },
              { value: 'table', icon: <TableOutlined />, label: '概览' },
            ]} />
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        </Space>
      } />

      {/* 核心指标卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { key: 'totalUsers', title: '平台用户', icon: <UserOutlined />, color: '#1677FF' },
          { key: 'totalShops', title: '入驻商家', icon: <ShopOutlined />, color: '#52C41A' },
          { key: 'activeNavigators', title: '在线领航员', icon: <TeamOutlined />, color: '#FAAD14' },
          { key: 'todayRevenue', title: '今日成交额', icon: <DollarOutlined />, color: ORANGE, fmt: v => v != null ? `¥${(Number(v) || 0).toLocaleString()}` : '--' },
        ].map(item => (
          <Col xs={12} sm={12} md={6} key={item.key}>
            <StatCard
              title={item.title}
              value={stats?.[item.key]}
              icon={item.icon}
              color={item.color}
              loading={loading}
              formatter={item.fmt}
            />
          </Col>
        ))}
      </Row>

      {/* 次要指标 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { key: 'todayOrders', title: '今日订单', icon: <ShoppingCartOutlined />, color: BLUE },
          { key: 'growthRate', title: '环比增长', icon: stats?.growthRate >= 0 ? <RiseOutlined /> : <FallOutlined />, color: '#FF6B35', fmt: v => v != null ? `${Number(v) >= 0 ? '+' : ''}${v}%` : '--' },
          { key: 'conversionRate', title: '转化率', icon: <RiseOutlined />, color: '#52C41A', fmt: v => v != null ? `${v}%` : '--' },
          { key: 'activeNavigators', title: '活跃领航员', icon: <TeamOutlined />, color: '#1677FF' },
        ].map(item => (
          <Col xs={12} sm={12} md={6} key={item.key}>
            <StatCard
              title={item.title}
              value={stats?.[item.key]}
              icon={item.icon}
              color={item.color}
              loading={loading}
              formatter={item.fmt}
            />
          </Col>
        ))}
      </Row>

      {/* 图表视图 */}
      {viewMode === 'chart' && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          {/* 趋势折线图 */}
          <Col xs={24} lg={16}>
            <Card className="admin-card" title={<span style={{ fontWeight: 600 }}>近14天趋势</span>} style={{ marginBottom: 16 }}>
              <Skeleton loading={loading} active paragraph={{ rows: 8 }}>
                {trendData.length > 0 ? (
                  <ReactEChartsCore echarts={echarts} option={lineChartOption} style={{ height: 350 }} notMerge />
                ) : (
                  <Empty description="暂无趋势数据" style={{ padding: 40 }} />
                )}
              </Skeleton>
            </Card>
          </Col>

          {/* 品类分布饼图 */}
          <Col xs={24} lg={8}>
            <Card className="admin-card" title={<span style={{ fontWeight: 600 }}>品类分布</span>} style={{ marginBottom: 16 }}>
              <Skeleton loading={loading} active paragraph={{ rows: 8 }}>
                <ReactEChartsCore echarts={echarts} option={pieChartOption} style={{ height: 350 }} notMerge />
              </Skeleton>
            </Card>
          </Col>
        </Row>
      )}

      {/* 待处理事项表格 */}
      <Card className="admin-card" title={<span style={{ fontWeight: 600 }}>待处理事项</span>}>
        <Skeleton loading={loading} active paragraph={{ rows: 5 }}>
          {tasks.length > 0 ? (
            <Table dataSource={tasks} pagination={false} size="middle" rowKey="id">
              <Table.Column title="类型" dataIndex="type" width={120}
                render={v => <Tag color="blue">{v}</Tag>} />
              <Table.Column title="描述" dataIndex="desc" ellipsis />
              <Table.Column title="时间" dataIndex="time" width={120} />
              <Table.Column title="状态" dataIndex="status" width={90}
                render={s => s === 'urgent' ? <Tag color="red">紧急</Tag> : <Tag color="gold">待处理</Tag>} />
            </Table>
          ) : (
            !loading && <Empty description="暂无待处理事项，平台运行良好 🎉" />
          )}
        </Skeleton>
      </Card>
    </div>
  );
}
