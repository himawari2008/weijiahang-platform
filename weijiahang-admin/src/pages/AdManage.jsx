import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Modal, Form, Input, Select, InputNumber,
  DatePicker, Space, Popconfirm, message, Skeleton, Switch, Image,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { getAdList, createAd, updateAd, deleteAd } from '../services/api';

const { RangePicker } = DatePicker;

const STATUS_MAP = {
  active: ['green', '投放中'],
  paused: ['gold', '已暂停'],
  ended: ['default', '已结束'],
  draft: ['blue', '草稿'],
};

const TYPE_MAP = {
  banner: '首页Banner',
  popup: '弹窗广告',
  product: '商品推荐',
  shop: '店铺推广',
};

export default function AdManage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [params, setParams] = useState({ keyword: '', status: '', type: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [form] = Form.useForm();

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const queryParams = { ...params, page, pageSize: pagination.pageSize };
      Object.keys(queryParams).forEach(k => { if (!queryParams[k] && queryParams[k] !== 0) delete queryParams[k]; });
      const res = await getAdList(queryParams);
      const list = Array.isArray(res) ? res : res?.list || res?.items || [];
      setData(list);
      setPagination(prev => ({ ...prev, current: page, total: res?.total ?? list.length }));
    } catch (err) {
      console.error('获取广告列表失败:', err);
      // 降级Mock
      const mock = Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        title: `建材节特惠广告-${i + 1}`,
        type: ['banner', 'popup', 'product', 'shop'][i % 4],
        position: `首页第${i + 1}位`,
        targetMarket: ['城北建材城', '城南装饰城', '东部家居广场'][i % 3],
        impressions: Math.floor(Math.random() * 20000 + 1000),
        clicks: Math.floor(Math.random() * 2000 + 50),
        ctr: (Math.random() * 8 + 2).toFixed(1),
        status: ['active', 'active', 'paused', 'ended', 'draft'][i % 5],
        startDate: dayjs().subtract(i * 5, 'day').format('YYYY-MM-DD'),
        endDate: dayjs().add(10 - i, 'day').format('YYYY-MM-DD'),
        imageUrl: '',
      }));
      setData(mock);
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
        await updateAd(editRecord.id, values);
        message.success('广告已更新');
      } else {
        await createAd(values);
        message.success('广告已创建');
      }
      setModalOpen(false);
      fetchData(pagination.current);
    } catch (err) {
      if (err.errorFields) return;
      message.error('操作失败');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAd(id);
      message.success('已删除');
      fetchData(pagination.current);
    } catch { message.error('删除失败'); }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await updateAd(id, { status: newStatus });
      message.success(newStatus === 'active' ? '已开始投放' : '已暂停');
      fetchData(pagination.current);
    } catch { message.error('操作失败'); }
  };

  if (error) {
    return (
      <div>
        <PageHeader title="广告管理" extra={<Button type="primary" style={{ background: '#FF6B35' }} onClick={() => fetchData(1)}>重新加载</Button>} />
        <EmptyState type="error" onRetry={() => fetchData(1)} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="广告管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} style={{ background: '#FF6B35' }}
            onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true); }}>
            新建广告
          </Button>
        }
      />

      <Card className="admin-card">
        <div className="toolbar">
          <Input placeholder="搜索广告标题" style={{ width: 200 }} allowClear
            value={params.keyword} onChange={e => setParams(p => ({ ...p, keyword: e.target.value }))}
            onPressEnter={() => fetchData(1)} />
          <Select placeholder="类型筛选" style={{ width: 140 }} value={params.type}
            onChange={v => setParams(p => ({ ...p, type: v }))}
            options={[
              { value: '', label: '全部类型' },
              ...Object.entries(TYPE_MAP).map(([k, v]) => ({ value: k, label: v })),
            ]} />
          <Select placeholder="状态筛选" style={{ width: 120 }} value={params.status}
            onChange={v => setParams(p => ({ ...p, status: v }))}
            options={[
              { value: '', label: '全部状态' },
              { value: 'active', label: '投放中' },
              { value: 'paused', label: '已暂停' },
              { value: 'ended', label: '已结束' },
            ]} />
        </div>

        <Skeleton loading={loading} active paragraph={{ rows: 6 }}>
          {data.length > 0 ? (
            <Table dataSource={data} rowKey="id"
              pagination={{ ...pagination, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
              onChange={pag => fetchData(pag.current)}>
              <Table.Column title="广告标题" dataIndex="title" ellipsis />
              <Table.Column title="类型" dataIndex="type" width={100}
                render={v => <Tag>{TYPE_MAP[v] || v}</Tag>} />
              <Table.Column title="位置" dataIndex="position" width={100} />
              <Table.Column title="目标市场" dataIndex="targetMarket" width={120} />
              <Table.Column title="曝光量" dataIndex="impressions" width={90}
                render={v => v?.toLocaleString()} sorter={(a, b) => a.impressions - b.impressions} />
              <Table.Column title="点击量" dataIndex="clicks" width={80}
                render={v => v?.toLocaleString()} />
              <Table.Column title="点击率" dataIndex="ctr" width={80}
                render={v => <span style={{ color: Number(v) > 5 ? '#52C41A' : '#FAAD14' }}>{v}%</span>} />
              <Table.Column title="状态" dataIndex="status" width={90}
                render={s => { const [c, l] = STATUS_MAP[s] || ['default', s]; return <Tag color={c}>{l}</Tag>; }} />
              <Table.Column title="投放时间" width={160}
                render={(_, r) => `${r.startDate} ~ ${r.endDate}`} />
              <Table.Column title="操作" width={180}
                render={(_, record) => (
                  <Space>
                    <Button type="link" size="small" onClick={() => { setEditRecord(record); form.setFieldsValue(record); setModalOpen(true); }}>编辑</Button>
                    <Button type="link" size="small"
                      onClick={() => handleToggleStatus(record.id, record.status)}>
                      {record.status === 'active' ? '暂停' : '投放'}
                    </Button>
                    <Popconfirm title="确定删除此广告？" onConfirm={() => handleDelete(record.id)}>
                      <Button type="link" danger size="small">删除</Button>
                    </Popconfirm>
                  </Space>
                )} />
            </Table>
          ) : (!loading && <EmptyState description="暂无广告数据" />)}
        </Skeleton>
      </Card>

      {/* 新建/编辑弹窗 */}
      <Modal title={editRecord ? '编辑广告' : '新建广告'} open={modalOpen}
        onCancel={() => setModalOpen(false)} onOk={handleSubmit} confirmLoading={confirmLoading}
        width={640} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}
          initialValues={{ type: 'banner', status: 'draft' }}>
          <Form.Item name="title" label="广告标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="例如：五一建材大促" />
          </Form.Item>
          <Form.Item name="type" label="广告类型" rules={[{ required: true }]}>
            <Select options={Object.entries(TYPE_MAP).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="position" label="展示位置">
            <Input placeholder="例如：首页顶部Banner" />
          </Form.Item>
          <Form.Item name="targetMarket" label="目标市场">
            <Select mode="multiple" placeholder="不选则全市场投放"
              options={['城北建材城', '城南装饰城', '东部家居广场', '西部建材港'].map(m => ({ value: m, label: m }))} />
          </Form.Item>
          <Form.Item name="imageUrl" label="广告图片URL">
            <Input placeholder="上传广告图片后填入URL" />
          </Form.Item>
          <Form.Item name="linkUrl" label="跳转链接">
            <Input placeholder="点击广告后跳转的页面路径" />
          </Form.Item>
          <Space size="large">
            <Form.Item name="startDate" label="开始日期">
              <DatePicker />
            </Form.Item>
            <Form.Item name="endDate" label="结束日期">
              <DatePicker />
            </Form.Item>
          </Space>
          <Form.Item name="budget" label="预算（元）">
            <InputNumber style={{ width: 200 }} min={0} prefix="¥" placeholder="0表示不限" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[
              { value: 'draft', label: '草稿' },
              { value: 'active', label: '立即投放' },
              { value: 'paused', label: '暂停' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
