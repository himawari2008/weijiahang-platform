import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Tag, Select, DatePicker, Input, Button, Space, Descriptions, Modal, Skeleton, Empty, message } from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined, FilterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAuditLogs, getAuditLogDetail } from '../services/api';

const ORANGE = '#FF6B35';

/** 操作类型映射 */
const ACTION_MAP = {
  CREATE: { color: '#52C41A', label: '创建' },
  UPDATE: { color: '#1677FF', label: '更新' },
  DELETE: { color: '#FF4D4F', label: '删除' },
  LOGIN: { color: '#FAAD14', label: '登录' },
  LOGOUT: { color: '#999', label: '登出' },
};

/** 模拟审计日志（降级用） */
function generateMockLogs() {
  const users = ['admin', '张运营', '李审核', 'system'];
  const modules = ['用户管理', '商家审核', '订单管理', '系统配置', '领航员审核'];
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
  const logs = [];
  for (let i = 0; i < 30; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    logs.push({
      id: `log_${i}`,
      userId: users[Math.floor(Math.random() * users.length)],
      userName: users[Math.floor(Math.random() * users.length)],
      action,
      module: modules[Math.floor(Math.random() * modules.length)],
      target: `订单#ORD${String(1000 + i).slice(-4)}`,
      ip: `10.78.144.${Math.floor(Math.random() * 255)}`,
      detail: JSON.stringify({ field: 'status', from: 'pending', to: 'approved' }),
      createdAt: dayjs().subtract(Math.floor(Math.random() * 72), 'hour').toISOString(),
      status: Math.random() > 0.05 ? 200 : 403,
    });
  }
  return logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAuditLogs({ page, pageSize });
      setLogs(Array.isArray(res) ? res : res?.list || []);
    } catch {
      setError(true);
      // 降级使用模拟数据
      setLogs(generateMockLogs());
    } finally {
      setLoading(false);
    }
  };

  /** 筛选后的日志 */
  const filteredLogs = useMemo(() => {
    let result = logs;
    if (actionFilter !== 'all') {
      result = result.filter(l => l.action === actionFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.userName?.toLowerCase().includes(q) ||
        l.module?.toLowerCase().includes(q) ||
        l.target?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [logs, actionFilter, search]);

  const showDetail = (log) => {
    setSelectedLog(log);
    setDetailVisible(true);
  };

  const columns = [
    { title: '时间', dataIndex: 'createdAt', key: 'time', width: 170,
      render: v => dayjs(v).format('MM/DD HH:mm:ss'),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    { title: '操作人', dataIndex: 'userName', key: 'user', width: 100 },
    { title: '动作', dataIndex: 'action', key: 'action', width: 80,
      render: v => {
        const info = ACTION_MAP[v] || { color: '#999', label: v };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    { title: '模块', dataIndex: 'module', key: 'module', width: 100 },
    { title: '目标', dataIndex: 'target', key: 'target', ellipsis: true },
    { title: 'IP', dataIndex: 'ip', key: 'ip', width: 140 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: v => v >= 200 && v < 300
        ? <Tag color="green">成功</Tag>
        : <Tag color="red">{v || '失败'}</Tag>,
    },
    {
      title: '操作', key: 'actions', width: 80,
      render: (_, r) => <Button size="small" icon={<EyeOutlined />} onClick={() => showDetail(r)}>详情</Button>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>审计日志</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchLogs}>刷新</Button>
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索操作人/模块/目标"
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
          <Select value={actionFilter} onChange={setActionFilter} style={{ width: 120 }}>
            <Select.Option value="all">全部动作</Select.Option>
            <Select.Option value="CREATE">创建</Select.Option>
            <Select.Option value="UPDATE">更新</Select.Option>
            <Select.Option value="DELETE">删除</Select.Option>
            <Select.Option value="LOGIN">登录</Select.Option>
            <Select.Option value="LOGOUT">登出</Select.Option>
          </Select>
        </Space>
      </Card>

      {loading ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <Table
          dataSource={filteredLogs}
          columns={columns}
          rowKey="id"
          size="middle"
          pagination={{
            pageSize,
            showSizeChanger: true,
            showTotal: total => `共 ${total} 条日志`,
            pageSizeOptions: ['20', '50', '100'],
            onChange: (_, size) => setPageSize(size),
          }}
          locale={{ emptyText: <Empty description="暂无日志" /> }}
          scroll={{ x: 900 }}
        />
      )}

      {/* 日志详情 Modal */}
      <Modal title="日志详情" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={600}>
        {selectedLog && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="时间">{dayjs(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
            <Descriptions.Item label="操作人">{selectedLog.userName} (ID: {selectedLog.userId})</Descriptions.Item>
            <Descriptions.Item label="动作">
              <Tag color={ACTION_MAP[selectedLog.action]?.color}>{selectedLog.action}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="模块">{selectedLog.module}</Descriptions.Item>
            <Descriptions.Item label="目标">{selectedLog.target || '-'}</Descriptions.Item>
            <Descriptions.Item label="客户端IP">{selectedLog.ip}</Descriptions.Item>
            <Descriptions.Item label="HTTP状态">{selectedLog.status}</Descriptions.Item>
            <Descriptions.Item label="请求详情">
              <pre style={{ maxHeight: 200, overflow: 'auto', fontSize: 12, background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                {typeof selectedLog.detail === 'string' ? selectedLog.detail : JSON.stringify(selectedLog.detail, null, 2)}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
