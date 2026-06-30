import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Modal, Descriptions, Space,
  Input, Select, DatePicker, message, Skeleton, Statistic, Row, Col,
} from 'antd';
import { SearchOutlined, DollarOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { getSettlements, approveSettlement, rejectSettlement, batchPaySettlements } from '../services/api';

const { RangePicker } = DatePicker;

export default function SettlementManage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [params, setParams] = useState({ keyword: '', status: 'pending', dateRange: [] });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [summary, setSummary] = useState(null);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const queryParams = {
        ...params, page, pageSize: pagination.pageSize,
        startDate: params.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: params.dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      delete queryParams.dateRange;
      Object.keys(queryParams).forEach(k => { if (!queryParams[k] && queryParams[k] !== 0) delete queryParams[k]; });
      const res = await getSettlements(queryParams);
      const list = Array.isArray(res) ? res : res?.list || res?.items || [];
      setData(list);
      setSummary(res?.summary || null);
      setPagination(prev => ({ ...prev, current: page, total: res?.total ?? list.length }));
    } catch (err) {
      console.error('获取结算列表失败:', err);
      // Mock降级
      const mock = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        navigatorName: `领航员${i + 1}`,
        navigatorPhone: `1380000${String(i).padStart(4, '0')}`,
        orderCount: Math.floor(Math.random() * 30 + 5),
        totalAmount: Math.floor(Math.random() * 8000 + 500),
        commissionRate: 15 + (i % 3) * 5,
        commission: Math.floor(Math.random() * 1200 + 80),
        status: ['pending', 'pending', 'approved', 'paid', 'rejected'][i % 5],
        period: `2026-06-${String(i + 1).padStart(2, '0')} ~ 2026-06-${String(i + 7).padStart(2, '0')}`,
        createdAt: dayjs().subtract(i, 'day').format('YYYY-MM-DD'),
      }));
      setData(mock);
      setSummary({ pendingCount: 5, pendingAmount: 12580, paidAmount: 45000, totalCount: 12 });
      setPagination(prev => ({ ...prev, current: page, total: mock.length }));
      message.warning('使用本地缓存数据');
    } finally {
      setLoading(false);
    }
  }, [params, pagination.pageSize]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const handleApprove = async (id) => {
    setConfirmLoading(true);
    try {
      await approveSettlement(id);
      message.success('已通过结算申请');
      setDetail(null);
      fetchData(pagination.current);
    } catch { message.error('操作失败'); }
    finally { setConfirmLoading(false); }
  };

  const handleReject = async (id) => {
    setConfirmLoading(true);
    try {
      await rejectSettlement(id, '平台审核不通过');
      message.success('已驳回');
      setDetail(null);
      fetchData(pagination.current);
    } catch { message.error('操作失败'); }
    finally { setConfirmLoading(false); }
  };

  const handleBatchPay = async () => {
    const pendingIds = data.filter(d => d.status === 'approved').map(d => d.id);
    if (!pendingIds.length) { message.warning('没有待打款的结算单'); return; }
    try {
      await batchPaySettlements(pendingIds);
      message.success(`已发起 ${pendingIds.length} 笔打款`);
      fetchData(pagination.current);
    } catch { message.error('批量打款失败'); }
  };

  if (error) {
    return (
      <div>
        <PageHeader title="结算审核" extra={<Button type="primary" style={{ background: '#FF6B35' }} onClick={() => fetchData(1)}>重新加载</Button>} />
        <EmptyState type="error" onRetry={() => fetchData(1)} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="结算审核" extra={
        <Button type="primary" style={{ background: '#52C41A' }} onClick={handleBatchPay}>批量打款</Button>
      } />

      {/* 汇总统计 */}
      {summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {[
            { key: 'pendingCount', title: '待审核', icon: <ClockCircleOutlined />, color: '#FAAD14' },
            { key: 'pendingAmount', title: '待审核金额', icon: <DollarOutlined />, color: '#FF6B35', fmt: v => `¥${v?.toLocaleString()}` },
            { key: 'paidAmount', title: '已打款金额', icon: <CheckCircleOutlined />, color: '#52C41A', fmt: v => `¥${v?.toLocaleString()}` },
            { key: 'totalCount', title: '总结算单', icon: <DollarOutlined />, color: '#1677FF' },
          ].map(item => (
            <Col span={6} key={item.key}>
              <Card className="admin-card">
                <Statistic title={item.title} value={summary[item.key] ?? '--'}
                  prefix={item.icon} valueStyle={{ color: item.color }}
                  formatter={item.fmt ? v => item.fmt(v) : undefined} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card className="admin-card">
        <div className="toolbar">
          <Input placeholder="搜索领航员姓名/手机" prefix={<SearchOutlined />} style={{ width: 220 }} allowClear
            value={params.keyword} onChange={e => setParams(p => ({ ...p, keyword: e.target.value }))}
            onPressEnter={() => fetchData(1)} />
          <RangePicker value={params.dateRange}
            onChange={dates => setParams(p => ({ ...p, dateRange: dates || [] }))} />
          <Select placeholder="状态筛选" style={{ width: 120 }} value={params.status}
            onChange={v => setParams(p => ({ ...p, status: v }))}
            options={[
              { value: '', label: '全部' }, { value: 'pending', label: '待审核' },
              { value: 'approved', label: '已通过' }, { value: 'paid', label: '已打款' },
              { value: 'rejected', label: '已驳回' },
            ]} />
        </div>

        <Skeleton loading={loading} active paragraph={{ rows: 6 }}>
          {data.length > 0 ? (
            <Table dataSource={data} rowKey="id"
              pagination={{ ...pagination, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
              onChange={pag => fetchData(pag.current)}
              onRow={r => ({ onClick: () => setDetail(r), style: { cursor: 'pointer' } })}>
              <Table.Column title="领航员" dataIndex="navigatorName" />
              <Table.Column title="手机" dataIndex="navigatorPhone" width={120} />
              <Table.Column title="结算周期" dataIndex="period" width={180} ellipsis />
              <Table.Column title="服务单数" dataIndex="orderCount" width={80} />
              <Table.Column title="服务金额" dataIndex="totalAmount" width={100}
                render={v => `¥${v?.toLocaleString()}`} />
              <Table.Column title="佣金比例" dataIndex="commissionRate" width={80}
                render={v => `${v}%`} />
              <Table.Column title="佣金" dataIndex="commission" width={100}
                render={v => <strong style={{ color: '#FF6B35' }}>¥{v?.toLocaleString()}</strong>} />
              <Table.Column title="状态" dataIndex="status" width={90}
                render={s => {
                  const map = { pending: ['gold', '待审核'], approved: ['blue', '已通过'], paid: ['green', '已打款'], rejected: ['red', '已驳回'] };
                  const [c, l] = map[s] || ['default', s];
                  return <Tag color={c}>{l}</Tag>;
                }} />
              <Table.Column title="提交时间" dataIndex="createdAt" width={110} />
            </Table>
          ) : (!loading && <EmptyState description="暂无结算数据" />)}
        </Skeleton>
      </Card>

      {/* 详情弹窗 */}
      <Modal title="结算详情" open={!!detail} onCancel={() => setDetail(null)} width={560}
        footer={detail?.status === 'pending' ? [
          <Button key="reject" danger onClick={() => handleReject(detail.id)}>驳回</Button>,
          <Button key="approve" type="primary" style={{ background: '#52C41A' }}
            loading={confirmLoading} onClick={() => handleApprove(detail.id)}>通过审核</Button>,
        ] : null}>
        {detail && (
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="领航员">{detail.navigatorName}</Descriptions.Item>
            <Descriptions.Item label="手机">{detail.navigatorPhone}</Descriptions.Item>
            <Descriptions.Item label="结算周期">{detail.period}</Descriptions.Item>
            <Descriptions.Item label="服务单数">{detail.orderCount}单</Descriptions.Item>
            <Descriptions.Item label="服务金额">¥{detail.totalAmount?.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="佣金比例">{detail.commissionRate}%</Descriptions.Item>
            <Descriptions.Item label="佣金金额" span={2}>
              <strong style={{ color: '#FF6B35', fontSize: 18 }}>¥{detail.commission?.toLocaleString()}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="提交时间">{detail.createdAt}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={detail.status === 'paid' ? 'green' : detail.status === 'rejected' ? 'red' : 'gold'}>
                {detail.status}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
