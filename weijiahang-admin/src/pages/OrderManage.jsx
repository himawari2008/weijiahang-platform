import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Modal, Descriptions, Select, Space,
  message, Skeleton, Empty,
} from 'antd';
import { getDisputes, resolveDispute } from '../services/api';

export default function OrderManage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [filter, setFilter] = useState('dispute');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const queryParams = { filter, page, pageSize: pagination.pageSize };
      Object.keys(queryParams).forEach((k) => {
        if (!queryParams[k] && queryParams[k] !== 0) delete queryParams[k];
      });
      const res = await getDisputes(queryParams);
      const list = Array.isArray(res) ? res : res?.list || res?.items || [];
      setData(list);
      if (res?.total !== undefined) {
        setPagination((prev) => ({ ...prev, current: page, total: res.total }));
      } else {
        setPagination((prev) => ({ ...prev, current: page, total: list.length }));
      }
    } catch (err) {
      console.error('获取纠纷列表失败:', err);
      message.error('获取数据失败，请重试');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filter, pagination.pageSize]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const handleArbitrate = async (id, result) => {
    setConfirmLoading(true);
    try {
      const resolution = {
        resolution: result === 'refund' ? 'refund' : 'reject',
        reason: result === 'refund' ? '平台判定退款' : '平台判定申诉驳回',
      };
      await resolveDispute(id, resolution);
      message.success(result === 'refund' ? '已退款' : '已驳回申诉');
      setDetail(null);
      fetchData(pagination.current);
    } catch (err) {
      message.error('操作失败，请重试');
    } finally {
      setConfirmLoading(false);
    }
  };

  if (error) {
    return (
      <div>
        <h2 style={{ marginBottom: 16 }}>订单纠纷处理</h2>
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
      <h2 style={{ marginBottom: 16 }}>订单纠纷处理</h2>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Select
            placeholder="筛选"
            style={{ width: 150 }}
            value={filter}
            onChange={(v) => setFilter(v)}
            options={[
              { value: 'dispute', label: '有纠纷' },
              { value: 'all', label: '全部订单' },
            ]}
          />
        </div>
        <Skeleton loading={loading} active paragraph={{ rows: 6 }}>
          {data.length > 0 ? (
            <Table
              dataSource={data}
              rowKey={(r) => r.id || r.key || r.orderNo || Math.random()}
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
              <Table.Column title="订单号" dataIndex="orderNo" ellipsis />
              <Table.Column title="用户" dataIndex="user" />
              <Table.Column title="商家" dataIndex="shop" ellipsis />
              <Table.Column title="领航员" dataIndex="navigator" render={(v) => v || '-'} />
              <Table.Column
                title="金额"
                dataIndex="amount"
                render={(v) => (v != null ? `¥${typeof v === 'number' ? v.toLocaleString() : v}` : '--')}
              />
              <Table.Column
                title="纠纷"
                dataIndex="dispute"
                render={(d) =>
                  d ? <Tag color="red">有纠纷</Tag> : <Tag color="green">正常</Tag>
                }
              />
              <Table.Column
                title="状态"
                dataIndex="status"
                render={(s) => <Tag>{s || '--'}</Tag>}
              />
            </Table>
          ) : (
            !loading && <Empty description="暂无纠纷订单" />
          )}
        </Skeleton>
      </Card>

      <Modal
        title="订单详情 / 纠纷仲裁"
        open={!!detail}
        onCancel={() => setDetail(null)}
        width={500}
        footer={
          detail?.dispute
            ? [
                <Button
                  key="reject"
                  loading={confirmLoading}
                  onClick={() => handleArbitrate(detail.id, 'reject')}
                >
                  驳回申诉
                </Button>,
                <Button
                  key="refund"
                  type="primary"
                  danger
                  loading={confirmLoading}
                  onClick={() => handleArbitrate(detail.id, 'refund')}
                >
                  同意退款
                </Button>,
              ]
            : null
        }
      >
        {detail && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="订单号">{detail.orderNo}</Descriptions.Item>
            <Descriptions.Item label="用户">{detail.user || '--'}</Descriptions.Item>
            <Descriptions.Item label="商家">{detail.shop || '--'}</Descriptions.Item>
            <Descriptions.Item label="领航员">{detail.navigator || '-'}</Descriptions.Item>
            <Descriptions.Item label="金额">
              {detail.amount != null ? `¥${typeof detail.amount === 'number' ? detail.amount.toLocaleString() : detail.amount}` : '--'}
            </Descriptions.Item>
            <Descriptions.Item label="配送方式">{detail.delivery || '--'}</Descriptions.Item>
            <Descriptions.Item label="保障链状态">
              {(detail.guaranteeChain || '商家备货 -> 取货验货 -> 收货纠纷').split('->').join(' -> ')}
            </Descriptions.Item>
            <Descriptions.Item label="纠纷描述">
              {detail.disputeDesc || detail.disputeReason || '用户发起纠纷投诉'}
            </Descriptions.Item>
            <Descriptions.Item label="纠纷状态">
              {detail.disputeStatus ? <Tag>{detail.disputeStatus}</Tag> : (detail.dispute ? <Tag color="red">待处理</Tag> : '--')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
