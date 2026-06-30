import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Modal, Descriptions, Image, Space,
  message, Select, Skeleton, Empty, Input, Form,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getPendingNavigators, approveNavigator } from '../services/api';

export default function NavigatorVerify() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [params, setParams] = useState({ keyword: '', status: 'pending' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const queryParams = { ...params, page, pageSize: pagination.pageSize };
      Object.keys(queryParams).forEach((k) => {
        if (!queryParams[k] && queryParams[k] !== 0) delete queryParams[k];
      });
      const res = await getPendingNavigators(queryParams);
      const list = Array.isArray(res) ? res : res?.list || res?.items || [];
      setData(list);
      if (res?.total !== undefined) {
        setPagination((prev) => ({ ...prev, current: page, total: res.total }));
      } else {
        setPagination((prev) => ({ ...prev, current: page, total: list.length }));
      }
    } catch (err) {
      console.error('获取领航员审核列表失败:', err);
      message.error('获取数据失败，请重试');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [params, pagination.pageSize]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const handleVerify = async (id, approved) => {
    if (approved === false) {
      setRejectModal(id);
      setRejectReason('');
      return;
    }
    setConfirmLoading(true);
    try {
      await approveNavigator(id, true, '');
      message.success('已通过审核');
      setDetail(null);
      fetchData(pagination.current);
    } catch (err) {
      message.error('操作失败，请重试');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      message.warning('请填写驳回理由');
      return;
    }
    setConfirmLoading(true);
    try {
      await approveNavigator(rejectModal, false, rejectReason);
      message.success('已驳回');
      setRejectModal(null);
      setDetail(null);
      fetchData(pagination.current);
    } catch (err) {
      message.error('操作失败，请重试');
    } finally {
      setConfirmLoading(false);
    }
  };

  const statusRender = (s) => {
    // 后端 status: 0=待审核, 1=已通过, -1=已驳回
    const map = { 0: ['gold', '待审核'], 1: ['green', '已通过'], '-1': ['red', '已驳回'] };
    const [color, label] = map[String(s)] || map[s] || ['default', s];
    return <Tag color={color}>{label}</Tag>;
  };

  if (error) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2>领航员审核</h2>
        </div>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>领航员审核</h2>
        <Space>
          <Input
            placeholder="搜索姓名/手机"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            allowClear
            value={params.keyword}
            onChange={(e) => setParams((p) => ({ ...p, keyword: e.target.value }))}
            onPressEnter={() => fetchData(1)}
          />
          <Select
            placeholder="状态筛选"
            style={{ width: 150 }}
            value={params.status}
            onChange={(v) => setParams((p) => ({ ...p, status: v }))}
            options={[
              { value: 'pending', label: '待审核' },
              { value: 'approved', label: '已通过' },
              { value: 'rejected', label: '已驳回' },
              { value: '', label: '全部' },
            ]}
          />
        </Space>
      </div>
      <Card>
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
              onRow={(r) => ({
                onClick: () => setDetail(r),
                style: { cursor: 'pointer' },
              })}
            >
              <Table.Column title="姓名" dataIndex="realName" />
              <Table.Column title="手机" dataIndex="phone" />
              <Table.Column
                title="常驻市场"
                dataIndex="homeMarkets"
                render={(m) =>
                  Array.isArray(m) ? m.map((t) => <Tag key={t}>{t}</Tag>) : m
                }
              />
              <Table.Column
                title="技能"
                dataIndex="skills"
                render={(s) =>
                  Array.isArray(s) ? s.map((t) => <Tag key={t}>{t}</Tag>) : s
                }
              />
              <Table.Column title="评分" dataIndex="rating" render={(v) => v ?? '--'} />
              <Table.Column title="完成单数" dataIndex="totalOrders" render={(v) => v ?? 0} />
              <Table.Column title="状态" dataIndex="status" render={statusRender} />
              <Table.Column title="提交时间" dataIndex="createdAt" />
            </Table>
          ) : (
            !loading && <Empty description="暂无数据" />
          )}
        </Skeleton>
      </Card>

      {/* 审核详情 Modal */}
      <Modal
        title="审核详情"
        open={!!detail}
        onCancel={() => setDetail(null)}
        width={500}
        footer={
          detail?.status === 'pending'
            ? [
                <Button key="reject" danger onClick={() => handleVerify(detail.id, false)}>
                  驳回
                </Button>,
                <Button
                  key="approve"
                  type="primary"
                  style={{ background: '#52C41A' }}
                  loading={confirmLoading}
                  onClick={() => handleVerify(detail.id, true)}
                >
                  通过审核
                </Button>,
              ]
            : null
        }
      >
        {detail && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="姓名">{detail.realName}</Descriptions.Item>
            <Descriptions.Item label="手机">{detail.phone || '--'}</Descriptions.Item>
            <Descriptions.Item label="身份证正面">
              {detail.idCardFront ? (
                <Image src={detail.idCardFront} fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" width={200} />
              ) : (
                '暂无图片'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="身份证反面">
              {detail.idCardBack ? (
                <Image src={detail.idCardBack} fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" width={200} />
              ) : (
                '暂无图片'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="人脸核验">
              {detail.faceVerified ? '已通过' : '待核验'}
            </Descriptions.Item>
            <Descriptions.Item label="背景审查">
              {detail.backgroundCheck ?? '无犯罪记录'}
            </Descriptions.Item>
            <Descriptions.Item label="驳回理由">
              {detail.rejectReason || '--'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 驳回理由 Modal */}
      <Modal
        title="填写驳回理由"
        open={!!rejectModal}
        onCancel={() => setRejectModal(null)}
        onOk={handleReject}
        confirmLoading={confirmLoading}
        okText="确认驳回"
        okButtonProps={{ danger: true }}
      >
        <Form.Item
          label="驳回理由"
          required
          validateStatus={rejectReason.trim() ? 'success' : 'error'}
          help={!rejectReason.trim() ? '请填写驳回理由' : undefined}
        >
          <Input.TextArea
            rows={3}
            placeholder="请填写驳回理由，领航员可在小程序查看"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </Form.Item>
      </Modal>
    </div>
  );
}
