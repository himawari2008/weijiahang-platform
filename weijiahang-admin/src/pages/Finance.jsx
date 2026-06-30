import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Row, Col, Statistic, DatePicker, Select, Button,
  message, Skeleton, Empty, Modal, Space,
} from 'antd';
import { DollarOutlined, RiseOutlined, FallOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getFinanceOverview, getFinanceRecords, processWithdraw } from '../services/api';

const { RangePicker } = DatePicker;

export default function Finance() {
  const [overview, setOverview] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recordLoading, setRecordLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [params, setParams] = useState({ type: '', dateRange: [] });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      const data = await getFinanceOverview();
      setOverview(data);
    } catch (err) {
      console.error('获取财务概览失败:', err);
    }
  }, []);

  const fetchRecords = useCallback(async (page = 1) => {
    setRecordLoading(true);
    try {
      const queryParams = {
        ...params,
        page,
        pageSize: pagination.pageSize,
        startDate: params.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: params.dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      delete queryParams.dateRange;
      Object.keys(queryParams).forEach((k) => {
        if (!queryParams[k] && queryParams[k] !== 0) delete queryParams[k];
      });
      const res = await getFinanceRecords(queryParams);
      const list = Array.isArray(res) ? res : res?.list || res?.items || [];
      setRecords(list);
      if (res?.total !== undefined) {
        setPagination((prev) => ({ ...prev, current: page, total: res.total }));
      } else {
        setPagination((prev) => ({ ...prev, current: page, total: list.length }));
      }
    } catch (err) {
      console.error('获取财务记录失败:', err);
      message.error('获取财务记录失败');
      setError(true);
    } finally {
      setRecordLoading(false);
    }
  }, [params, pagination.pageSize]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      await Promise.all([fetchOverview(), fetchRecords(1)]);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [fetchOverview, fetchRecords]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleWithdraw = async (id, approved) => {
    setConfirmLoading(true);
    try {
      await processWithdraw(id, approved);
      message.success(approved ? '已通过提现申请' : '已拒绝提现申请');
      fetchRecords(pagination.current);
      fetchOverview();
    } catch (err) {
      message.error('操作失败，请重试');
    } finally {
      setConfirmLoading(false);
    }
  };

  const statCards = [
    { key: 'totalRevenue', title: '本月平台收入', icon: <DollarOutlined />, color: '#FF6B35' },
    { key: 'promotionIncome', title: '推广收入', icon: <RiseOutlined />, color: '#1677FF' },
    { key: 'pendingSettlement', title: '领航员待结算', icon: <FallOutlined />, color: '#FAAD14' },
    { key: 'withdrawn', title: '已提现', icon: <CheckCircleOutlined />, color: '#52C41A' },
  ];

  if (error && !records.length) {
    return (
      <div>
        <h2 style={{ marginBottom: 24 }}>财务对账</h2>
        <Empty description="加载失败">
          <Button type="primary" style={{ background: '#FF6B35' }} onClick={fetchAll}>
            重新加载
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>财务对账</h2>

      {/* 概览卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {statCards.map((item) => (
          <Col span={6} key={item.key}>
            <Card>
              <Skeleton loading={loading} active paragraph={{ rows: 1 }}>
                {overview ? (
                  <Statistic
                    title={item.title}
                    value={overview[item.key] ?? '--'}
                    prefix={item.icon}
                    valueStyle={{ color: item.color }}
                  />
                ) : (
                  <Statistic title={item.title} value="--" />
                )}
              </Skeleton>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 财务记录 + 提现审核 */}
      <Card title="财务记录 / 提现审核">
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <RangePicker
            value={params.dateRange}
            onChange={(dates) => setParams((p) => ({ ...p, dateRange: dates || [] }))}
          />
          <Select
            placeholder="类型筛选"
            style={{ width: 150 }}
            value={params.type}
            onChange={(v) => setParams((p) => ({ ...p, type: v }))}
            options={[
              { value: '', label: '全部' },
              { value: 'commission', label: '领航员佣金' },
              { value: 'ad', label: '推广收入' },
              { value: 'withdraw', label: '提现' },
            ]}
          />
        </div>
        <Skeleton loading={recordLoading} active paragraph={{ rows: 6 }}>
          {records.length > 0 ? (
            <Table
              dataSource={records}
              rowKey={(r) => r.id || r.key || Math.random()}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showTotal: (t) => `共 ${t} 条`,
              }}
              onChange={(pag) => fetchRecords(pag.current)}
            >
              <Table.Column title="类型" dataIndex="type" />
              <Table.Column
                title="金额"
                dataIndex="amount"
                render={(v) => (v != null ? (typeof v === 'number' ? `¥${v.toLocaleString()}` : v) : '--')}
              />
              <Table.Column title="对象" dataIndex="target" ellipsis />
              <Table.Column title="关联订单" dataIndex="orderNo" render={(v) => v || '-'} />
              <Table.Column title="时间" dataIndex="time" />
              <Table.Column
                title="状态"
                dataIndex="status"
                render={(s) => {
                  const settled = s === '已结算' || s === '已到账' || s === 'settled' || s === 'paid';
                  return (
                    <Tag color={settled ? 'green' : 'gold'}>
                      {s || '--'}
                    </Tag>
                  );
                }}
              />
              <Table.Column
                title="操作"
                render={(_, record) =>
                  record.status === '待审核' || record.status === 'pending' ? (
                    <Space>
                      <Button
                        type="link"
                        size="small"
                        style={{ color: '#52C41A' }}
                        loading={confirmLoading}
                        onClick={() => handleWithdraw(record.id, true)}
                      >
                        通过
                      </Button>
                      <Button
                        type="link"
                        danger
                        size="small"
                        loading={confirmLoading}
                        onClick={() => handleWithdraw(record.id, false)}
                      >
                        拒绝
                      </Button>
                    </Space>
                  ) : (
                    <span style={{ color: '#999' }}>--</span>
                  )
                }
              />
            </Table>
          ) : (
            !recordLoading && <Empty description="暂无财务记录" />
          )}
        </Skeleton>
      </Card>
    </div>
  );
}
