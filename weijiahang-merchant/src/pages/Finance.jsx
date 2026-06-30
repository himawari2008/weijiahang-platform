import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card, Row, Col, Table, Tabs, Button, Modal, Select, InputNumber,
  Space, Skeleton, Alert, Empty, Typography, Tag, message, Statistic,
} from 'antd';
import {
  ReloadOutlined, DownloadOutlined, DollarOutlined,
  ArrowUpOutlined, WalletOutlined, BankOutlined, AlipayOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../utils/echarts-init';
import dayjs from 'dayjs';
import api from '../services/api';
import { exportCSV } from '../utils/export-csv';

const { Text } = Typography;

const ORANGE = '#FF6B35';
const ORANGE_GRADIENT = {
  type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
  colorStops: [
    { offset: 0, color: ORANGE },
    { offset: 1, color: 'rgba(255,107,53,0.1)' },
  ],
};

const WITHDRAWAL_METHODS = [
  { value: 'wechat', label: '微信零钱', icon: <WalletOutlined /> },
  { value: 'bank', label: '银行卡', icon: <BankOutlined /> },
  { value: 'alipay', label: '支付宝', icon: <AlipayOutlined /> },
];

const TRANSACTION_STATUS_MAP = {
  completed: { color: 'green', label: '已完成' },
  pending: { color: 'gold', label: '处理中' },
  failed: { color: 'red', label: '失败' },
  refunded: { color: 'orange', label: '已退款' },
};

const WITHDRAWAL_STATUS_MAP = {
  success: { color: 'green', label: '提现成功' },
  processing: { color: 'blue', label: '处理中' },
  failed: { color: 'red', label: '失败' },
};

const PAGE_SIZE = 10;
const TRANS_PAGE_SIZE = 10;

export default function Finance() {
  const [currentTab, setCurrentTab] = useState('overview');
  const fetchCancelledRef = useRef(false);

  // ---- Tab 1: Summary ----
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  // ---- Tab 2: Transactions ----
  const [transLoading, setTransLoading] = useState(false);
  const [transError, setTransError] = useState(false);
  const [transData, setTransData] = useState([]);
  const [transTotal, setTransTotal] = useState(0);
  const [transPage, setTransPage] = useState(1);
  const [dateRange, setDateRange] = useState(null);

  // ---- Tab 3: Withdrawals ----
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState(false);
  const [withdrawData, setWithdrawData] = useState([]);
  const [withdrawTotal, setWithdrawTotal] = useState(0);
  const [withdrawPage, setWithdrawPage] = useState(1);

  // Withdrawal modal
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(undefined);
  const [withdrawMethod, setWithdrawMethod] = useState(undefined);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // ====== Data fetching ======

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(false);
    try {
      const res = await api.getFinanceSummary();
      if (!fetchCancelledRef.current) setSummaryData(res);
    } catch {
      if (!fetchCancelledRef.current) {
        setSummaryError(true);
        setSummaryData(null);
      }
    } finally {
      if (!fetchCancelledRef.current) setSummaryLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTransLoading(true);
    setTransError(false);
    try {
      const params = { page: transPage, pageSize: TRANS_PAGE_SIZE };
      // 日期范围：支持 DatePicker 返回的 dayjs 数组 和 Select 返回的快捷字符串
      if (Array.isArray(dateRange) && dateRange.length === 2) {
        if (dateRange[0]) params.startDate = dateRange[0].format('YYYY-MM-DD');
        if (dateRange[1]) params.endDate = dateRange[1].format('YYYY-MM-DD');
      } else if (dateRange && typeof dateRange === 'string') {
        const today = dayjs();
        const map = {
          today: [today, today],
          week: [today.subtract(6, 'day'), today],
          month: [today.subtract(29, 'day'), today],
        };
        const range = map[dateRange];
        if (range) {
          params.startDate = range[0].format('YYYY-MM-DD');
          params.endDate = range[1].format('YYYY-MM-DD');
        }
      }
      const res = await api.getFinanceTransactions(params);
      if (!fetchCancelledRef.current) {
        setTransData(Array.isArray(res?.list) ? res.list : []);
        setTransTotal(res?.total || 0);
      }
    } catch {
      if (!fetchCancelledRef.current) {
        setTransError(true);
        setTransData([]);
      }
    } finally {
      if (!fetchCancelledRef.current) setTransLoading(false);
    }
  }, [transPage, dateRange]);

  const fetchWithdrawals = useCallback(async () => {
    setWithdrawLoading(true);
    setWithdrawError(false);
    try {
      const params = { page: withdrawPage, pageSize: PAGE_SIZE };
      const res = await api.getWithdrawals(params);
      if (!fetchCancelledRef.current) {
        setWithdrawData(Array.isArray(res?.list) ? res.list : []);
        setWithdrawTotal(res?.total || 0);
      }
    } catch {
      if (!fetchCancelledRef.current) {
        setWithdrawError(true);
        setWithdrawData([]);
      }
    } finally {
      if (!fetchCancelledRef.current) setWithdrawLoading(false);
    }
  }, [withdrawPage]);

  useEffect(() => {
    fetchCancelledRef.current = false;
    if (currentTab === 'overview') fetchSummary();
    else if (currentTab === 'transactions') fetchTransactions();
    else if (currentTab === 'withdrawals') fetchWithdrawals();
    return () => { fetchCancelledRef.current = true; };
  }, [currentTab]);

  const handleTabChange = useCallback((key) => {
    setCurrentTab(key);
  }, []);

  // ====== Summary computed ======
  const summaryStats = useMemo(() => {
    const d = summaryData || {};
    return [
      { key: 'today', label: '今日收入', value: d.todayRevenue ?? 0, prefix: '¥', color: '#1677FF', icon: <DollarOutlined /> },
      { key: 'month', label: '本月收入', value: d.monthRevenue ?? 0, prefix: '¥', color: '#52C41A', icon: <DollarOutlined /> },
      { key: 'pending', label: '待结算', value: d.pendingSettlement ?? 0, prefix: '¥', color: '#FAAD14', icon: <DollarOutlined /> },
      { key: 'withdrawn', label: '已提现', value: d.withdrawn ?? 0, prefix: '¥', color: ORANGE, icon: <DollarOutlined /> },
    ];
  }, [summaryData]);

  const lineOption = useMemo(() => {
    const chartData = summaryData?.revenueTrend || [];
    const hasData = chartData.length > 0;
    return {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v) => `¥${(v || 0).toLocaleString()}`,
      },
      grid: { left: 60, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: 'category',
        data: hasData ? chartData.map((d) => d.date) : ['暂无'],
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: '收入(元)',
        nameTextStyle: { fontSize: 11 },
      },
      series: [{
        type: 'line',
        smooth: true,
        data: hasData ? chartData.map((d) => d.amount) : [0],
        areaStyle: { color: ORANGE_GRADIENT },
        itemStyle: { color: ORANGE },
        lineStyle: { width: 3 },
        markLine: hasData && chartData.length > 1 ? {
          silent: true,
          data: [{ type: 'average', name: '日均' }],
          lineStyle: { color: '#999', type: 'dashed' },
          label: { formatter: '日均: ¥{c}', fontSize: 11 },
        } : undefined,
      }],
    };
  }, [summaryData]);

  // ====== Transaction columns ======
  const transColumns = useMemo(() => [
    {
      title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 150,
      render: (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 160, ellipsis: true,
    },
    {
      title: '服务类型', dataIndex: 'serviceType', key: 'serviceType', width: 100,
    },
    {
      title: '金额', dataIndex: 'amount', key: 'amount', width: 100,
      render: (v) => `¥${(v || 0).toLocaleString()}`,
    },
    {
      title: '平台佣金', dataIndex: 'commission', key: 'commission', width: 100,
      render: (v) => `¥${(v || 0).toLocaleString()}`,
    },
    {
      title: '到手', dataIndex: 'netAmount', key: 'netAmount', width: 100,
      render: (v) => <Text strong style={{ color: '#52C41A' }}>¥{(v || 0).toLocaleString()}</Text>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (s) => {
        const cfg = TRANSACTION_STATUS_MAP[s];
        return <Tag color={cfg?.color || 'default'} style={{ fontSize: 11, borderRadius: 4 }}>{cfg?.label || s}</Tag>;
      },
    },
  ], []);

  // ====== Withdrawal columns ======
  const withdrawColumns = useMemo(() => [
    {
      title: '申请时间', dataIndex: 'createdAt', key: 'createdAt', width: 150,
      render: (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '金额', dataIndex: 'amount', key: 'amount', width: 100,
      render: (v) => <Text strong>¥{(v || 0).toLocaleString()}</Text>,
    },
    {
      title: '方式', dataIndex: 'method', key: 'method', width: 100,
      render: (m) => {
        const found = WITHDRAWAL_METHODS.find((wm) => wm.value === m);
        return found ? (
          <Space size={4}>
            {found.icon}
            <span>{found.label}</span>
          </Space>
        ) : (m || '-');
      },
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s) => {
        const cfg = WITHDRAWAL_STATUS_MAP[s];
        return <Tag color={cfg?.color || 'default'} style={{ fontSize: 11, borderRadius: 4 }}>{cfg?.label || s}</Tag>;
      },
    },
    {
      title: '完成时间', dataIndex: 'completedAt', key: 'completedAt', width: 150,
      render: (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-',
    },
  ], []);

  // ====== CSV export ======
  const handleExportCSV = useCallback(async () => {
    try {
      const params = {};
      if (dateRange?.[0]) params.startDate = dateRange[0].format('YYYY-MM-DD');
      if (dateRange?.[1]) params.endDate = dateRange[1].format('YYYY-MM-DD');
      await exportCSV('/finance/transactions/export', params, `交易记录_${dayjs().format('YYYYMMDDHHmmss')}.csv`);
      message.success('导出成功');
    } catch {
      message.error('导出失败，请重试');
    }
  }, [dateRange]);

  // ====== Withdrawal handlers ======
  const openWithdrawModal = useCallback(() => {
    setWithdrawAmount(undefined);
    setWithdrawMethod(undefined);
    setWithdrawVisible(true);
  }, []);

  const handleWithdraw = useCallback(async () => {
    if (!withdrawAmount || withdrawAmount <= 0) {
      message.warning('请输入有效的提现金额');
      return;
    }
    if (!withdrawMethod) {
      message.warning('请选择提现方式');
      return;
    }
    const maxWithdraw = summaryData?.pendingSettlement ?? 0;
    if (withdrawAmount > maxWithdraw) {
      message.warning(`可提现金额不足，当前可提现 ¥${maxWithdraw.toLocaleString()}`);
      return;
    }
    setSubmittingWithdraw(true);
    try {
      await api.applyWithdrawal({
        amount: withdrawAmount,
        method: withdrawMethod,
      });
      message.success('提现申请已提交');
      setWithdrawVisible(false);
      fetchSummary();
      fetchWithdrawals();
    } catch {
      message.error('提现申请失败，请重试');
    } finally {
      setSubmittingWithdraw(false);
    }
  }, [withdrawAmount, withdrawMethod, summaryData, fetchSummary, fetchWithdrawals]);

  // ====== Tab content renderers ======

  const renderOverview = () => (
    <div>
      {/* 4统计卡片 */}
      {summaryError ? (
        <Alert
          type="error"
          message="财务数据加载失败"
          showIcon
          style={{ marginBottom: 24 }}
          action={<Button size="small" icon={<ReloadOutlined />} onClick={fetchSummary}>重试</Button>}
        />
      ) : (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {summaryLoading
            ? [1, 2, 3, 4].map((i) => (
                <Col xs={12} sm={12} md={6} key={i}>
                  <Card><Skeleton active paragraph={{ rows: 2 }} title={false} /></Card>
                </Col>
              ))
            : summaryStats.map((s) => (
                <Col xs={12} sm={12} md={6} key={s.key}>
                  <Card size="small" hoverable style={{ borderRadius: 8 }}>
                    <Statistic
                      title={<span style={{ fontSize: 13 }}>{s.label}</span>}
                      value={s.value}
                      prefix={s.prefix}
                      precision={2}
                      valueStyle={{ color: s.color, fontSize: 24 }}
                    />
                  </Card>
                </Col>
              ))
          }
        </Row>
      )}

      {/* 收入趋势图 */}
      <Card
        title={<span style={{ fontSize: 14, fontWeight: 600 }}>收入趋势</span>}
        size="small"
        style={{ borderRadius: 8 }}
      >
        {summaryLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : summaryError ? (
          <Alert
            type="error"
            message="收入数据加载失败"
            showIcon
            action={<Button size="small" icon={<ReloadOutlined />} onClick={fetchSummary}>重试</Button>}
          />
        ) : (
          <ReactEChartsCore
            echarts={echarts}
            option={lineOption}
            style={{ height: 320, width: '100%' }}
            notMerge
          />
        )}
      </Card>
    </div>
  );

  const renderTransactions = () => (
    <div>
      {/* 筛选栏 */}
      <Card styles={{ body: { padding: 12 } }} style={{ marginBottom: 16, borderRadius: 8 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={12} sm={8} md={6}>
            <Select
              placeholder="选择日期范围"
              allowClear
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates);
                setTransPage(1);
              }}
              style={{ width: '100%' }}
              options={[
                { value: null, label: '全部时间' },
                { value: 'today', label: '今日' },
                { value: 'week', label: '近7天' },
                { value: 'month', label: '近30天' },
              ]}
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Button icon={<DownloadOutlined />} onClick={handleExportCSV} size="small">
              导出CSV
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 交易表格 */}
      <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 8 }}>
        {transError ? (
          <div style={{ padding: 16 }}>
            <Alert
              type="error"
              message="交易记录加载失败"
              showIcon
              action={<Button size="small" icon={<ReloadOutlined />} onClick={fetchTransactions}>重新加载</Button>}
            />
          </div>
        ) : (
          <Table
            dataSource={transData}
            columns={transColumns}
            rowKey="id"
            loading={transLoading}
            pagination={{
              current: transPage,
              total: transTotal,
              pageSize: TRANS_PAGE_SIZE,
              onChange: setTransPage,
              showSizeChanger: false,
              showTotal: (t) => `共 ${t} 条`,
            }}
            scroll={{ x: 800 }}
            size="small"
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<span>暂无交易记录</span>}
                />
              ),
            }}
          />
        )}
      </Card>
    </div>
  );

  const renderWithdrawals = () => {
    const maxWithdraw = summaryData?.pendingSettlement ?? 0;

    return (
      <div>
        {/* 可提现金额大卡 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} md={8}>
            <Card style={{
              borderRadius: 8, textAlign: 'center',
              background: 'linear-gradient(135deg, #FFF6F0 0%, #FFF 100%)',
              border: `1px solid ${ORANGE}`,
            }}>
              <Text type="secondary" style={{ fontSize: 14 }}>可提现余额</Text>
              <div style={{ fontSize: 40, fontWeight: 700, color: ORANGE, margin: '8px 0' }}>
                ¥{maxWithdraw.toLocaleString()}
              </div>
              <Button
                type="primary"
                icon={<WalletOutlined />}
                onClick={openWithdrawModal}
                disabled={maxWithdraw <= 0}
                style={{ background: '#FF6B35', borderColor: '#FF6B35', borderRadius: 6 }}
              >
                申请提现
              </Button>
            </Card>
          </Col>
        </Row>

        {/* 提现记录表格 */}
        <Card title={<span style={{ fontSize: 14, fontWeight: 600 }}>提现记录</span>} styles={{ body: { padding: 0 } }} style={{ borderRadius: 8 }}>
          {withdrawError ? (
            <div style={{ padding: 16 }}>
              <Alert
                type="error"
                message="提现记录加载失败"
                showIcon
                action={<Button size="small" icon={<ReloadOutlined />} onClick={fetchWithdrawals}>重新加载</Button>}
              />
            </div>
          ) : (
            <Table
              dataSource={withdrawData}
              columns={withdrawColumns}
              rowKey="id"
              loading={withdrawLoading}
              pagination={{
                current: withdrawPage,
                total: withdrawTotal,
                pageSize: PAGE_SIZE,
                onChange: setWithdrawPage,
                showSizeChanger: false,
                showTotal: (t) => `共 ${t} 条`,
              }}
              scroll={{ x: 600 }}
              size="small"
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<span>暂无提现记录</span>}
                  />
                ),
              }}
            />
          )}
        </Card>

        {/* 提现弹窗 */}
        <Modal
          title="申请提现"
          open={withdrawVisible}
          onCancel={() => setWithdrawVisible(false)}
          onOk={handleWithdraw}
          confirmLoading={submittingWithdraw}
          okText="提交申请"
          cancelText="取消"
          destroyOnClose
        >
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>提现金额 *</Text>
              <InputNumber
                placeholder={`可提现 ¥${maxWithdraw.toLocaleString()}`}
                value={withdrawAmount}
                onChange={setWithdrawAmount}
                min={1}
                max={maxWithdraw}
                precision={2}
                style={{ width: '100%' }}
                formatter={(v) => `¥ ${v}`}
                parser={(v) => v?.replace(/¥\s?/g, '')}
              />
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                可提现余额: ¥{maxWithdraw.toLocaleString()}
              </Text>
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>提现方式 *</Text>
              <Select
                placeholder="选择提现方式"
                value={withdrawMethod}
                onChange={setWithdrawMethod}
                style={{ width: '100%' }}
                options={WITHDRAWAL_METHODS.map((m) => ({
                  value: m.value,
                  label: (
                    <Space size={6}>
                      {m.icon}
                      {m.label}
                    </Space>
                  ),
                }))}
              />
            </div>
          </Space>
        </Modal>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>财务管理</h2>
      </div>

      <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 8 }}>
        <Tabs
          activeKey={currentTab}
          onChange={handleTabChange}
          items={[
            { key: 'overview', label: '收入总览', children: <div style={{ padding: 16 }}>{renderOverview()}</div> },
            { key: 'transactions', label: '交易记录', children: <div style={{ padding: 16 }}>{renderTransactions()}</div> },
            { key: 'withdrawals', label: '提现管理', children: <div style={{ padding: 16 }}>{renderWithdrawals()}</div> },
          ]}
          tabBarExtraContent={
            <Button icon={<ReloadOutlined />} onClick={() => {
              if (currentTab === 'overview') fetchSummary();
              if (currentTab === 'transactions') fetchTransactions();
              if (currentTab === 'withdrawals') fetchWithdrawals();
            }} loading={summaryLoading || transLoading || withdrawLoading} size="small" style={{ marginRight: 16 }}>
              刷新
            </Button>
          }
          style={{ padding: '0 16px' }}
        />
      </Card>
    </div>
  );
}
