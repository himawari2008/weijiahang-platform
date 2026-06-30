import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Modal, Form, Input, InputNumber, Select,
  Space, Popconfirm, message, Skeleton, Statistic, Row, Col, Switch,
} from 'antd';
import { PlusOutlined, EnvironmentOutlined, WifiOutlined, AimOutlined } from '@ant-design/icons';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { getBeacons, createBeacon, updateBeacon, deleteBeacon, getMarketsList } from '../services/api';

export default function BeaconManage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [params, setParams] = useState({ keyword: '', marketId: '', status: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [markets, setMarkets] = useState([]);
  const [form] = Form.useForm();
  const [summary, setSummary] = useState(null);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const queryParams = { ...params, page, pageSize: pagination.pageSize };
      Object.keys(queryParams).forEach(k => { if (!queryParams[k] && queryParams[k] !== 0) delete queryParams[k]; });
      const res = await getBeacons(queryParams);
      const list = Array.isArray(res) ? res : res?.list || res?.items || [];
      setData(list);
      setSummary(res?.summary || null);
      setPagination(prev => ({ ...prev, current: page, total: res?.total ?? list.length }));
    } catch (err) {
      console.error('获取信标列表失败:', err);
      const mock = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        uuid: `BEACON-${String(1000 + i).slice(-4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        name: `信标-A${i + 1}`,
        marketName: ['城北建材城', '城南装饰城', '东部家居广场'][i % 3],
        floor: `F${(i % 4) + 1}`,
        zone: ['A区', 'B区', 'C区', '陶瓷区', '卫浴区'][i % 5],
        x: (Math.random() * 100).toFixed(1),
        y: (Math.random() * 60).toFixed(1),
        txPower: -59 + Math.floor(i / 3) * 2,
        battery: Math.floor(Math.random() * 60 + 40),
        status: i % 5 === 0 ? 'offline' : 'online',
        lastSeen: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(),
      }));
      setData(mock);
      setSummary({ total: 12, online: 10, offline: 2, lowBattery: 3 });
      setPagination(prev => ({ ...prev, current: page, total: mock.length }));
      message.warning('使用本地缓存数据');
    } finally {
      setLoading(false);
    }
  }, [params, pagination.pageSize]);

  const fetchMarkets = async () => {
    try {
      const res = await getMarketsList();
      setMarkets(Array.isArray(res) ? res : res?.list || []);
    } catch { /* 忽略 */ }
  };

  useEffect(() => { fetchData(1); fetchMarkets(); }, [fetchData]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);
      if (editRecord) {
        await updateBeacon(editRecord.id, values);
        message.success('信标已更新');
      } else {
        await createBeacon(values);
        message.success('信标已添加');
      }
      setModalOpen(false);
      fetchData(pagination.current);
    } catch (err) {
      if (err.errorFields) return;
      message.error('操作失败');
    } finally { setConfirmLoading(false); }
  };

  const handleDelete = async (id) => {
    try { await deleteBeacon(id); message.success('已删除'); fetchData(pagination.current); }
    catch { message.error('删除失败'); }
  };

  if (error) {
    return (
      <div>
        <PageHeader title="信标管理" extra={<Button type="primary" style={{ background: '#FF6B35' }} onClick={() => fetchData(1)}>重新加载</Button>} />
        <EmptyState type="error" onRetry={() => fetchData(1)} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="信标管理" extra={
        <Button type="primary" icon={<PlusOutlined />} style={{ background: '#FF6B35' }}
          onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true); }}>
          添加信标
        </Button>
      } />

      {/* 汇总卡片 */}
      {summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {[
            { key: 'total', title: '信标总数', icon: <WifiOutlined />, color: '#1677FF' },
            { key: 'online', title: '在线', icon: <WifiOutlined />, color: '#52C41A' },
            { key: 'offline', title: '离线', icon: <WifiOutlined />, color: '#FF4D4F' },
            { key: 'lowBattery', title: '低电量', icon: <AimOutlined />, color: '#FAAD14' },
          ].map(item => (
            <Col span={6} key={item.key}>
              <Card className="admin-card">
                <Statistic title={item.title} value={summary[item.key] ?? '--'}
                  prefix={item.icon} valueStyle={{ color: item.color }} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card className="admin-card">
        <div className="toolbar">
          <Input placeholder="搜索信标名称/UUID" style={{ width: 240 }} allowClear
            value={params.keyword} onChange={e => setParams(p => ({ ...p, keyword: e.target.value }))}
            onPressEnter={() => fetchData(1)} />
          <Select placeholder="选择市场" style={{ width: 160 }} value={params.marketId}
            onChange={v => setParams(p => ({ ...p, marketId: v }))}
            options={[{ value: '', label: '全部市场' }, ...markets.map(m => ({ value: m.id, label: m.name }))]} />
          <Select placeholder="状态筛选" style={{ width: 120 }} value={params.status}
            onChange={v => setParams(p => ({ ...p, status: v }))}
            options={[{ value: '', label: '全部' }, { value: 'online', label: '在线' }, { value: 'offline', label: '离线' }]} />
        </div>

        <Skeleton loading={loading} active paragraph={{ rows: 6 }}>
          {data.length > 0 ? (
            <Table dataSource={data} rowKey="id"
              pagination={{ ...pagination, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
              onChange={pag => fetchData(pag.current)}>
              <Table.Column title="名称" dataIndex="name" width={100} />
              <Table.Column title="UUID" dataIndex="uuid" ellipsis width={220} />
              <Table.Column title="所属市场" dataIndex="marketName" width={130} />
              <Table.Column title="楼层" dataIndex="floor" width={60} />
              <Table.Column title="区域" dataIndex="zone" width={80} />
              <Table.Column title="坐标(x,y)" width={120}
                render={(_, r) => `${r.x || 0}, ${r.y || 0}`} />
              <Table.Column title="发射功率" dataIndex="txPower" width={80}
                render={v => `${v ?? '--'} dBm`} />
              <Table.Column title="电量" dataIndex="battery" width={80}
                render={v => {
                  const pct = Number(v) || 0;
                  return <span style={{ color: pct < 20 ? '#FF4D4F' : pct < 50 ? '#FAAD14' : '#52C41A' }}>{pct}%</span>;
                }} />
              <Table.Column title="状态" dataIndex="status" width={80}
                render={s => <Tag color={s === 'online' ? 'green' : 'red'}>{s === 'online' ? '在线' : '离线'}</Tag>} />
              <Table.Column title="最后上报" width={140}
                render={(_, r) => {
                  try { return new Date(r.lastSeen).toLocaleString('zh-CN'); }
                  catch { return r.lastSeen || '--'; }
                }} />
              <Table.Column title="操作" width={140}
                render={(_, record) => (
                  <Space>
                    <Button type="link" size="small" onClick={() => { setEditRecord(record); form.setFieldsValue(record); setModalOpen(true); }}>编辑</Button>
                    <Popconfirm title="确定删除此信标？" onConfirm={() => handleDelete(record.id)}>
                      <Button type="link" danger size="small">删除</Button>
                    </Popconfirm>
                  </Space>
                )} />
            </Table>
          ) : (!loading && <EmptyState description="暂无线标数据" />)}
        </Skeleton>
      </Card>

      {/* 添加/编辑弹窗 */}
      <Modal title={editRecord ? '编辑信标' : '添加信标'} open={modalOpen}
        onCancel={() => setModalOpen(false)} onOk={handleSubmit} confirmLoading={confirmLoading}
        width={520} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="信标名称" rules={[{ required: true }]}>
            <Input placeholder="例如：一楼A区入口" />
          </Form.Item>
          <Form.Item name="uuid" label="信标UUID" rules={[{ required: true }]}>
            <Input placeholder="蓝牙信标唯一标识" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="marketId" label="所属市场" rules={[{ required: true }]}>
                <Select placeholder="选择市场"
                  options={markets.map(m => ({ value: m.id, label: m.name }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="floor" label="楼层">
                <Select options={['F1', 'F2', 'F3', 'F4', 'B1'].map(f => ({ value: f, label: f }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="zone" label="区域">
                <Input placeholder="例如：A区/陶瓷区" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="txPower" label="发射功率(dBm)">
                <InputNumber style={{ width: '100%' }} min={-100} max={0} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="x" label="X坐标(米)">
                <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="y" label="Y坐标(米)">
                <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
