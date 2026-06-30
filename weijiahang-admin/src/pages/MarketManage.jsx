import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Modal, Form, Input, InputNumber, Select, Space,
  Popconfirm, message, Skeleton, Empty,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getMarkets, getActiveCities, createMarket, updateMarket, deleteMarket } from '../services/api';

export default function MarketManage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [cities, setCities] = useState([]);  // 城市下拉选项
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getMarkets();
      const list = Array.isArray(res) ? res : res?.list || res?.items || [];
      setData(list);
    } catch (err) {
      console.error('获取市场列表失败:', err);
      message.error('获取数据失败，请重试');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  /** 加载城市列表（供下拉选择） */
  const fetchCities = useCallback(async () => {
    try {
      const res = await getActiveCities();
      const list = res?.cities || [];
      setCities(list.map(c => ({ label: c.name + (c.status === 1 ? '' : '（未开通）'), value: c.name })));
    } catch (err) {
      console.error('获取城市列表失败:', err);
      // 降级：保留手动输入能力
    }
  }, []);

  useEffect(() => { fetchData(); fetchCities(); }, [fetchData, fetchCities]);

  const handleAdd = () => {
    setEditRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditRecord(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);
      if (editRecord) {
        await updateMarket(editRecord.id, values);
        message.success('市场信息已更新');
      } else {
        await createMarket(values);
        message.success('市场已添加');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      if (err.errorFields) return; // 表单验证错误
      message.error('操作失败，请重试');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMarket(id);
      message.success('市场已删除');
      fetchData();
    } catch (err) {
      message.error('删除失败，请重试');
    }
  };

  if (error) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2>市场管理</h2>
        </div>
        <Empty description="加载失败">
          <Button type="primary" style={{ background: '#FF6B35' }} onClick={fetchData}>
            重新加载
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>市场管理</h2>
        <Button type="primary" icon={<PlusOutlined />} style={{ background: '#FF6B35' }} onClick={handleAdd}>
          添加市场
        </Button>
      </div>
      <Card>
        <Skeleton loading={loading} active paragraph={{ rows: 6 }}>
          {data.length > 0 ? (
            <Table
              dataSource={data}
              rowKey={(r) => r.id || r.key || Math.random()}
              pagination={{ showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
            >
              <Table.Column title="市场名称" dataIndex="name" ellipsis />
              <Table.Column title="城市" dataIndex="city" />
              <Table.Column title="区域" dataIndex="district" />
              <Table.Column
                title="面积(㎡)"
                dataIndex="areaSqm"
                render={(v) => (v != null ? Number(v).toLocaleString() : '--')}
              />
              <Table.Column title="店铺数" dataIndex="shopCount" render={(v) => v ?? '--'} />
              <Table.Column
                title="信标数"
                dataIndex="beaconCount"
                render={(v) => {
                  const count = Number(v) || 0;
                  return <Tag color={count === 0 ? 'red' : 'green'}>{count}</Tag>;
                }}
              />
              <Table.Column
                title="操作"
                render={(_, record) => (
                  <Space>
                    <Button type="link" size="small" onClick={() => handleEdit(record)}>
                      编辑
                    </Button>
                    <Button type="link" size="small" onClick={() => message.info('上传平面图、管理信标')}>
                      管理
                    </Button>
                    <Popconfirm title="确定删除此市场？" onConfirm={() => handleDelete(record.id)}>
                      <Button type="link" danger size="small">
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                )}
              />
            </Table>
          ) : (
            !loading && <Empty description="暂无市场数据" />
          )}
        </Skeleton>
      </Card>

      <Modal
        title={editRecord ? '编辑市场' : '添加市场'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={confirmLoading}
        width={500}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="市场名称"
            rules={[{ required: true, message: '请输入市场名称' }]}
          >
            <Input placeholder="例如：大明宫建材市场" />
          </Form.Item>
          <Form.Item
            name="city"
            label="城市"
            rules={[{ required: true, message: '请选择城市' }]}
          >
            <Select
              placeholder="选择城市"
              options={cities}
              showSearch
              allowClear
              notFoundContent="暂无城市数据，请先在系统配置中添加"
            />
          </Form.Item>
          <Form.Item name="district" label="区域">
            <Input placeholder="例如：未央区" />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input placeholder="详细地址" />
          </Form.Item>
          <Form.Item name="areaSqm" label="面积(㎡)">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="请输入面积" />
          </Form.Item>
          <Form.Item name="floors" label="楼层数">
            <InputNumber style={{ width: '100%' }} min={1} placeholder="请输入楼层数量" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
