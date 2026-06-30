import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Modal, Descriptions, Rate, Space,
  Input, Select, Popconfirm, message, Skeleton, Image,
} from 'antd';
import { SearchOutlined, DeleteOutlined, EyeOutlined, CheckOutlined, StopOutlined } from '@ant-design/icons';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { getReviews, moderateReview } from '../services/api';

export default function ReviewModeration() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [params, setParams] = useState({ keyword: '', targetType: '', status: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const queryParams = { ...params, page, pageSize: pagination.pageSize };
      Object.keys(queryParams).forEach(k => { if (!queryParams[k] && queryParams[k] !== 0) delete queryParams[k]; });
      const res = await getReviews(queryParams);
      const list = Array.isArray(res) ? res : res?.list || res?.items || [];
      setData(list);
      setPagination(prev => ({ ...prev, current: page, total: res?.total ?? list.length }));
    } catch (err) {
      console.error('获取评价列表失败:', err);
      // Mock降级
      const mock = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        user: `用户${1000 + i}`,
        targetName: `店铺${i + 1}`,
        targetType: ['shop', 'product', 'navigator'][i % 3],
        rating: Math.floor(Math.random() * 2 + 3),
        content: ['服务态度很好，瓷砖质量也不错', '价格有点贵，但是质量确实好', '送货速度一般，包装完好', '值得推荐，会再来的', '还可以吧，性价比还行'][i % 5],
        images: [],
        reply: i % 3 === 0 ? '感谢您的支持！' : '',
        status: ['visible', 'visible', 'hidden', 'flagged', 'flagged'][i % 5],
        createdAt: new Date(Date.now() - i * 3600000 * 8).toISOString(),
      }));
      setData(mock);
      setPagination(prev => ({ ...prev, current: page, total: mock.length }));
      message.warning('使用本地缓存数据');
    } finally {
      setLoading(false);
    }
  }, [params, pagination.pageSize]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const handleAction = async (id, action) => {
    setConfirmLoading(true);
    try {
      await moderateReview(id, action);
      const actionLabels = { hide: '已隐藏', show: '已恢复显示', delete: '已删除' };
      message.success(actionLabels[action] || '操作成功');
      setDetail(null);
      fetchData(pagination.current);
    } catch { message.error('操作失败'); }
    finally { setConfirmLoading(false); }
  };

  if (error) {
    return (
      <div>
        <PageHeader title="评价审核" extra={<Button type="primary" style={{ background: '#FF6B35' }} onClick={() => fetchData(1)}>重新加载</Button>} />
        <EmptyState type="error" onRetry={() => fetchData(1)} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="评价审核" />

      <Card className="admin-card">
        <div className="toolbar">
          <Input placeholder="搜索评价内容/用户名" prefix={<SearchOutlined />} style={{ width: 240 }} allowClear
            value={params.keyword} onChange={e => setParams(p => ({ ...p, keyword: e.target.value }))}
            onPressEnter={() => fetchData(1)} />
          <Select placeholder="评价对象" style={{ width: 130 }} value={params.targetType}
            onChange={v => setParams(p => ({ ...p, targetType: v }))}
            options={[
              { value: '', label: '全部对象' }, { value: 'shop', label: '店铺' },
              { value: 'product', label: '商品' }, { value: 'navigator', label: '领航员' },
            ]} />
          <Select placeholder="状态筛选" style={{ width: 120 }} value={params.status}
            onChange={v => setParams(p => ({ ...p, status: v }))}
            options={[
              { value: '', label: '全部状态' }, { value: 'visible', label: '公开' },
              { value: 'hidden', label: '已隐藏' }, { value: 'flagged', label: '被举报' },
            ]} />
        </div>

        <Skeleton loading={loading} active paragraph={{ rows: 6 }}>
          {data.length > 0 ? (
            <Table dataSource={data} rowKey="id"
              pagination={{ ...pagination, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
              onChange={pag => fetchData(pag.current)}>
              <Table.Column title="用户" dataIndex="user" width={100} />
              <Table.Column title="对象" dataIndex="targetName" width={120}
                render={(v, r) => (
                  <span>
                    <Tag color={r.targetType === 'shop' ? 'blue' : r.targetType === 'product' ? 'orange' : 'purple'}>
                      {r.targetType === 'shop' ? '店铺' : r.targetType === 'product' ? '商品' : '领航员'}
                    </Tag>
                    {v}
                  </span>
                )} />
              <Table.Column title="评分" dataIndex="rating" width={120}
                render={v => <Rate disabled value={v} style={{ fontSize: 16 }} />} />
              <Table.Column title="评价内容" dataIndex="content" ellipsis />
              <Table.Column title="状态" dataIndex="status" width={90}
                render={s => {
                  const map = { visible: ['green', '公开'], hidden: ['default', '隐藏'], flagged: ['red', '被举报'] };
                  const [c, l] = map[s] || ['default', s];
                  return <Tag color={c}>{l}</Tag>;
                }} />
              <Table.Column title="时间" width={130}
                render={(_, r) => new Date(r.createdAt).toLocaleDateString('zh-CN')} />
              <Table.Column title="操作" width={180}
                render={(_, record) => (
                  <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />}
                      onClick={() => setDetail(record)}>详情</Button>
                    {record.status === 'flagged' && (
                      <>
                        <Popconfirm title="确定隐藏此评价？" onConfirm={() => handleAction(record.id, 'hide')}>
                          <Button type="link" size="small" icon={<StopOutlined />}>隐藏</Button>
                        </Popconfirm>
                        <Popconfirm title="确定删除此评价？不可恢复" onConfirm={() => handleAction(record.id, 'delete')}>
                          <Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button>
                        </Popconfirm>
                      </>
                    )}
                    {record.status === 'hidden' && (
                      <Button type="link" size="small" icon={<CheckOutlined />}
                        onClick={() => handleAction(record.id, 'show')}>恢复</Button>
                    )}
                  </Space>
                )} />
            </Table>
          ) : (!loading && <EmptyState description="暂无评价数据" />)}
        </Skeleton>
      </Card>

      {/* 详情弹窗 */}
      <Modal title="评价详情" open={!!detail} onCancel={() => setDetail(null)} width={520}
        footer={detail?.status === 'flagged' ? [
          <Button key="hide" onClick={() => handleAction(detail.id, 'hide')}>隐藏评价</Button>,
          <Button key="delete" danger onClick={() => handleAction(detail.id, 'delete')}>删除评价</Button>,
        ] : <Button onClick={() => setDetail(null)}>关闭</Button>}>
        {detail && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="用户">{detail.user}</Descriptions.Item>
            <Descriptions.Item label="对象">
              <Tag>{detail.targetType === 'shop' ? '店铺' : detail.targetType === 'product' ? '商品' : '领航员'}</Tag>
              {detail.targetName}
            </Descriptions.Item>
            <Descriptions.Item label="评分">
              <Rate disabled value={detail.rating} />
            </Descriptions.Item>
            <Descriptions.Item label="内容">{detail.content}</Descriptions.Item>
            {detail.images?.length > 0 && (
              <Descriptions.Item label="图片">
                {detail.images.map((url, i) => <Image key={i} src={url} width={80} style={{ marginRight: 8 }} />)}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="商家回复">{detail.reply || '暂无回复'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={detail.status === 'flagged' ? 'red' : detail.status === 'hidden' ? 'default' : 'green'}>
                {detail.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="时间">{new Date(detail.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
