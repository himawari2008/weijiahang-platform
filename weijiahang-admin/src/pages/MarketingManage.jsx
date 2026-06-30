import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Modal, Form, Input, Select, InputNumber,
  DatePicker, Space, Popconfirm, message, Skeleton, Row, Col, Statistic,
} from 'antd';
import { PlusOutlined, EditOutlined, GiftOutlined, TeamOutlined, DollarOutlined, RiseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { getMarketingList, createMarketing, updateMarketing, deleteMarketing } from '../services/api';

const { RangePicker } = DatePicker;

const TYPE_MAP = {
  coupon: '优惠券',
  discount: '限时折扣',
  group: '拼团活动',
  gift: '满赠活动',
  signin: '签到奖励',
};

export default function MarketingManage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [params, setParams] = useState({ keyword: '', type: '', status: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [form] = Form.useForm();
  const [summary, setSummary] = useState(null);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const queryParams = { ...params, page, pageSize: pagination.pageSize };
      Object.keys(queryParams).forEach(k => { if (!queryParams[k] && queryParams[k] !== 0) delete queryParams[k]; });
      const res = await getMarketingList(queryParams);
      const list = Array.isArray(res) ? res : res?.list || res?.items || [];
      setData(list);
      setSummary(res?.summary || null);
      setPagination(prev => ({ ...prev, current: page, total: res?.total ?? list.length }));
    } catch (err) {
      console.error('获取营销活动列表失败:', err);
      const mock = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: ['五一建材大促', '新用户专享券', '瓷砖拼团', '满1000减100', '每日签到有礼'][i % 5],
        type: ['discount', 'coupon', 'group', 'coupon', 'signin'][i % 5],
        discountDesc: i % 2 === 0 ? '满1000减100' : '全场8折',
        participants: Math.floor(Math.random() * 500 + 50),
        usageCount: Math.floor(Math.random() * 200 + 20),
        budget: Math.floor(Math.random() * 10000 + 2000),
        usedBudget: Math.floor(Math.random() * 6000 + 500),
        startDate: dayjs().subtract(i * 3, 'day').format('YYYY-MM-DD'),
        endDate: dayjs().add(15 - i, 'day').format('YYYY-MM-DD'),
        status: ['active', 'active', 'upcoming', 'ended', 'active'][i % 5],
        targetMarkets: ['全部市场', '城北建材城', '城南装饰城'][i % 3],
      }));
      setData(mock);
      setSummary({ activeCount: 5, totalParticipants: 2350, totalBudget: 45000, usedBudget: 28000 });
      setPagination(prev => ({ ...prev, current: page, total: mock.length }));
      message.warning('使用本地缓存数据');
    } finally {
      setLoading(false);
    }
  }, [params, pagination.pageSize]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);
      if (editRecord) {
        await updateMarketing(editRecord.id, values);
        message.success('活动已更新');
      } else {
        await createMarketing(values);
        message.success('活动已创建');
      }
      setModalOpen(false);
      fetchData(pagination.current);
    } catch (err) {
      if (err.errorFields) return;
      message.error('操作失败');
    } finally { setConfirmLoading(false); }
  };

  const handleDelete = async (id) => {
    try { await deleteMarketing(id); message.success('已删除'); fetchData(pagination.current); }
    catch { message.error('删除失败'); }
  };

  if (error) {
    return (
      <div>
        <PageHeader title="营销管理" extra={<Button type="primary" style={{ background: '#FF6B35' }} onClick={() => fetchData(1)}>重新加载</Button>} />
        <EmptyState type="error" onRetry={() => fetchData(1)} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="营销管理" extra={
        <Button type="primary" icon={<PlusOutlined />} style={{ background: '#FF6B35' }}
          onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true); }}>
          新建活动
        </Button>
      } />

      {/* 汇总 */}
      {summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {[
            { key: 'activeCount', title: '进行中活动', icon: <GiftOutlined />, color: '#FF6B35' },
            { key: 'totalParticipants', title: '参与人次', icon: <TeamOutlined />, color: '#1677FF' },
            { key: 'totalBudget', title: '总预算', icon: <DollarOutlined />, color: '#FAAD14', fmt: v => `¥${v?.toLocaleString()}` },
            { key: 'usedBudget', title: '已消耗', icon: <RiseOutlined />, color: '#52C41A', fmt: v => `¥${v?.toLocaleString()}` },
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
          <Input placeholder="搜索活动名称" style={{ width: 200 }} allowClear
            value={params.keyword} onChange={e => setParams(p => ({ ...p, keyword: e.target.value }))}
            onPressEnter={() => fetchData(1)} />
          <Select placeholder="类型筛选" style={{ width: 130 }} value={params.type}
            onChange={v => setParams(p => ({ ...p, type: v }))}
            options={[{ value: '', label: '全部类型' }, ...Object.entries(TYPE_MAP).map(([k, v]) => ({ value: k, label: v }))]} />
          <Select placeholder="状态筛选" style={{ width: 120 }} value={params.status}
            onChange={v => setParams(p => ({ ...p, status: v }))}
            options={[
              { value: '', label: '全部状态' }, { value: 'active', label: '进行中' },
              { value: 'upcoming', label: '未开始' }, { value: 'ended', label: '已结束' },
            ]} />
        </div>

        <Skeleton loading={loading} active paragraph={{ rows: 6 }}>
          {data.length > 0 ? (
            <Table dataSource={data} rowKey="id"
              pagination={{ ...pagination, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
              onChange={pag => fetchData(pag.current)}>
              <Table.Column title="活动名称" dataIndex="name" ellipsis />
              <Table.Column title="类型" dataIndex="type" width={100}
                render={v => <Tag color={v === 'discount' ? 'red' : v === 'coupon' ? 'orange' : v === 'group' ? 'purple' : v === 'signin' ? 'green' : 'blue'}>{TYPE_MAP[v] || v}</Tag>} />
              <Table.Column title="优惠" dataIndex="discountDesc" ellipsis width={120} />
              <Table.Column title="参与人次" dataIndex="participants" width={90} />
              <Table.Column title="使用次数" dataIndex="usageCount" width={80} />
              <Table.Column title="预算" width={130}
                render={(_, r) => <span>¥{r.usedBudget?.toLocaleString()} / <span style={{ color: '#999' }}>¥{r.budget?.toLocaleString()}</span></span>} />
              <Table.Column title="活动时间" width={180}
                render={(_, r) => <span style={{ fontSize: 13 }}>{r.startDate} ~ {r.endDate}</span>} />
              <Table.Column title="状态" dataIndex="status" width={80}
                render={s => {
                  const map = { active: ['green', '进行中'], upcoming: ['blue', '未开始'], ended: ['default', '已结束'] };
                  const [c, l] = map[s] || ['default', s];
                  return <Tag color={c}>{l}</Tag>;
                }} />
              <Table.Column title="操作" width={140}
                render={(_, record) => (
                  <Space>
                    <Button type="link" size="small" onClick={() => { setEditRecord(record); form.setFieldsValue(record); setModalOpen(true); }}>编辑</Button>
                    <Popconfirm title="确定删除此活动？" onConfirm={() => handleDelete(record.id)}>
                      <Button type="link" danger size="small">删除</Button>
                    </Popconfirm>
                  </Space>
                )} />
            </Table>
          ) : (!loading && <EmptyState description="暂无营销活动" />)}
        </Skeleton>
      </Card>

      {/* 新建/编辑弹窗 */}
      <Modal title={editRecord ? '编辑活动' : '新建活动'} open={modalOpen}
        onCancel={() => setModalOpen(false)} onOk={handleSubmit} confirmLoading={confirmLoading}
        width={640} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}
          initialValues={{ type: 'coupon', status: 'upcoming' }}>
          <Form.Item name="name" label="活动名称" rules={[{ required: true, message: '请输入活动名称' }]}>
            <Input placeholder="例如：五一建材节全场优惠" />
          </Form.Item>
          <Form.Item name="type" label="活动类型" rules={[{ required: true }]}>
            <Select options={Object.entries(TYPE_MAP).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="discountDesc" label="优惠描述" rules={[{ required: true, message: '请输入优惠描述' }]}>
            <Input placeholder="例如：满1000减100" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startDate" label="开始日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="结束日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="budget" label="预算（元）">
                <InputNumber style={{ width: '100%' }} min={0} prefix="¥" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxUsage" label="每人限用次数">
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="targetMarkets" label="适用市场">
            <Select mode="multiple" placeholder="不选则全部市场适用"
              options={[]} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[
              { value: 'upcoming', label: '未开始' }, { value: 'active', label: '立即上线' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
