import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Input, Select, Button, Space, message,
  Popconfirm, Skeleton, Empty, Modal, Descriptions,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getUserList, updateUserStatus } from '../services/api';

export default function UserManage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [params, setParams] = useState({ keyword: '', city: '', status: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const queryParams = { ...params, page, pageSize: pagination.pageSize };
      Object.keys(queryParams).forEach((k) => {
        if (!queryParams[k] && queryParams[k] !== 0) delete queryParams[k];
      });
      const res = await getUserList(queryParams);
      const list = Array.isArray(res) ? res : res?.list || res?.items || [];
      setData(list);
      if (res?.total !== undefined) {
        setPagination((prev) => ({ ...prev, current: page, total: res.total }));
      } else {
        setPagination((prev) => ({ ...prev, current: page, total: list.length }));
      }
    } catch (err) {
      console.error('获取用户列表失败:', err);
      message.error('获取数据失败，请重试');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [params, pagination.pageSize]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    try {
      await updateUserStatus(id, newStatus);
      message.success(newStatus === 1 ? '已启用用户' : '已禁用用户');
      fetchData(pagination.current);
    } catch (err) {
      message.error('操作失败，请重试');
    }
  };

  const statusRender = (s) => {
    if (s === 1) return <Tag color="green">正常</Tag>;
    if (s === 0) return <Tag color="red">禁用</Tag>;
    return <Tag>{s}</Tag>;
  };

  if (error) {
    return (
      <div>
        <h2 style={{ marginBottom: 16 }}>用户管理</h2>
        <Empty description="加载失败">
          <Button type="primary" style={{ background: '#FF6B35' }} onClick={() => fetchData(1)}>
            重新加载
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>用户管理</h2>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <Input
            placeholder="搜索昵称/手机号"
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            allowClear
            value={params.keyword}
            onChange={(e) => setParams((p) => ({ ...p, keyword: e.target.value }))}
            onPressEnter={() => fetchData(1)}
          />
          <Input
            placeholder="城市"
            style={{ width: 120 }}
            allowClear
            value={params.city}
            onChange={(e) => setParams((p) => ({ ...p, city: e.target.value }))}
            onPressEnter={() => fetchData(1)}
          />
          <Select
            placeholder="状态"
            style={{ width: 120 }}
            value={params.status}
            onChange={(v) => setParams((p) => ({ ...p, status: v }))}
            options={[
              { value: '', label: '全部' },
              { value: '1', label: '正常' },
              { value: '0', label: '禁用' },
            ]}
          />
        </div>
        <Skeleton loading={loading} active paragraph={{ rows: 6 }}>
          {data.length > 0 ? (
            <Table
              dataSource={data}
              rowKey={(r) => r.id || r.key || Math.random()}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showTotal: (t) => `共 ${t} 条`,
              }}
              onChange={(pag) => fetchData(pag.current)}
            >
              <Table.Column title="昵称" dataIndex="nickname" ellipsis />
              <Table.Column title="手机" dataIndex="phone" />
              <Table.Column title="城市" dataIndex="city" />
              <Table.Column title="订单数" dataIndex="totalOrders" render={(v) => v ?? 0} />
              <Table.Column title="状态" dataIndex="status" render={statusRender} />
              <Table.Column title="注册时间" dataIndex="createdAt" />
              <Table.Column
                title="操作"
                render={(_, record) => (
                  <Space>
                    <Button type="link" size="small" onClick={() => { setSelectedUser(record); setDetailOpen(true); }}>详情</Button>
                    <Popconfirm
                      title={`确定${record.status === 1 ? '禁用' : '启用'}此用户？`}
                      onConfirm={() => handleToggleStatus(record.id, record.status)}
                    >
                      <Button type="link" danger={record.status === 1} size="small">
                        {record.status === 1 ? '禁用' : '启用'}
                      </Button>
                    </Popconfirm>
                  </Space>
                )}
              />
            </Table>
          ) : (
            !loading && <Empty description="暂无用户数据" />
          )}
        </Skeleton>
      </Card>

      <Modal
        title="用户详情"
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setSelectedUser(null); }}
        footer={null}
        width={500}
      >
        {selectedUser && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="昵称">{selectedUser.nickname || '--'}</Descriptions.Item>
            <Descriptions.Item label="手机号">{selectedUser.phone || '--'}</Descriptions.Item>
            <Descriptions.Item label="城市">{selectedUser.city || '--'}</Descriptions.Item>
            <Descriptions.Item label="订单数">{selectedUser.totalOrders ?? 0}</Descriptions.Item>
            <Descriptions.Item label="消费总额">{selectedUser.totalSpent ? `¥${selectedUser.totalSpent}` : '--'}</Descriptions.Item>
            <Descriptions.Item label="客群类型">{selectedUser.customerType || 'retail'}</Descriptions.Item>
            <Descriptions.Item label="注册时间">{selectedUser.createdAt || '--'}</Descriptions.Item>
            <Descriptions.Item label="状态">{selectedUser.status === 1 ? '正常' : '禁用'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
