import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card, Table, Tag, Button, Modal, Form, Upload, message, Space, Row, Col,
  Select, Input, DatePicker, Alert, Skeleton, Empty, Descriptions, Typography, Divider, Popconfirm,
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, DownloadOutlined, CheckOutlined,
  CameraOutlined, EyeOutlined, UploadOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import { exportCSV } from '../utils/export-csv';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// 降级 mock 订单数据
function generateMockOrders(count = 20) {
  return Array.from({ length: count }, (_, i) => ({
    id: `order-${i}`,
    orderNo: `MO${dayjs().format('YYYYMMDD')}${String(i).padStart(4, '0')}`,
    customer: `客户${String(i * 7).slice(-4)}`,
    amount: Math.floor(Math.random() * 8000 + 300),
    status: ['pending', 'accepted', 'preparing', 'completed', 'completed', 'completed', 'cancelled'][i % 7],
    time: dayjs().subtract(i * 5, 'hour').toISOString(),
    title: `建材采购订单 #${i + 1}`,
  }));
}

// 订单状态配置
const STATUS_CONFIG = {
  pending: { color: 'gold', label: '待接单' },
  preparing: { color: 'blue', label: '备货中' },
  ready: { color: 'cyan', label: '已备货' },
  serving: { color: 'geekblue', label: '服务中' },
  completed: { color: 'green', label: '已完成' },
  cancelled: { color: 'red', label: '已取消' },
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

const PAGE_SIZE = 20;

// 备货拍照分类
const FULFILLMENT_PHOTO_CATEGORIES = [
  { key: 'panorama', label: '全景照' },
  { key: 'detail', label: '细节照' },
  { key: 'label', label: '标签照' },
  { key: 'packaging', label: '包装照' },
];

export default function Orders() {
  const [form] = Form.useForm();
  const fetchCancelledRef = useRef(false);

  // 数据
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // 搜索与筛选
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const debounceRef = useRef(null);

  // 分页
  const [pagination, setPagination] = useState({ current: 1, pageSize: PAGE_SIZE, total: 0 });

  // 批量选择
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // 订单详情 Modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 备货拍照 Modal
  const [fulfillVisible, setFulfillVisible] = useState(false);
  const [fulfillOrder, setFulfillOrder] = useState(null);
  const [fulfillSaving, setFulfillSaving] = useState(false);
  const [fulfillPhotos, setFulfillPhotos] = useState({});

  // ---- 数据获取 ----
  const fetchOrders = useCallback(async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true);
    setError(false);
    try {
      const params = {
        page,
        pageSize,
        ...(searchText && { keyword: searchText }),
        ...(statusFilter.length > 0 && { status: statusFilter.join(',') }),
        ...(dateRange?.[0] && { startDate: dateRange[0].format('YYYY-MM-DD') }),
        ...(dateRange?.[1] && { endDate: dateRange[1].format('YYYY-MM-DD') }),
      };
      const res = await api.getShopOrders(params);
      if (!fetchCancelledRef.current) {
        const list = Array.isArray(res) ? res : (res?.list || res?.items || []);
        const total = res?.total ?? list.length;
        setOrders(list);
        setPagination(prev => ({ ...prev, total }));
      }
    } catch {
      if (!fetchCancelledRef.current) {
        // API不可用时使用本地降级数据
        const mock = generateMockOrders(pageSize);
        setOrders(mock);
        setPagination(prev => ({ ...prev, total: 99 }));
      }
    } finally {
      if (!fetchCancelledRef.current) setLoading(false);
    }
  }, [searchText, statusFilter, dateRange, pagination.current, pagination.pageSize]);

  useEffect(() => {
    fetchCancelledRef.current = false;
    fetchOrders(pagination.current, pagination.pageSize);
    return () => { fetchCancelledRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize]);

  // ---- 防抖搜索 ----
  const handleSearchChange = useCallback((value) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchText(value);
      setPagination(prev => ({ ...prev, current: 1 }));
    }, 300);
  }, []);

  // ---- 筛选变化 ----
  const handleStatusChange = useCallback((value) => {
    setStatusFilter(value || []);
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleDateChange = useCallback((dates) => {
    setDateRange(dates || null);
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  // ---- 订单详情 ----
  const openDetail = useCallback(async (record) => {
    setDetailLoading(true);
    setDetailVisible(true);
    try {
      const res = await api.getOrderDetail(record.id);
      setDetailOrder(res);
    } catch {
      // 降级：使用列表数据
      setDetailOrder(record);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailVisible(false);
    setDetailOrder(null);
  }, []);

  // ---- 确认接单 ----
  const handleAccept = useCallback(async (id) => {
    try {
      await api.updateOrderStatus(id, 'accepted');
      message.success('已接单，请尽快备货');
      closeDetail();
      fetchOrders(pagination.current, pagination.pageSize);
      setSelectedRowKeys(prev => prev.filter(k => k !== id));
    } catch {
      message.error('接单失败，请重试');
    }
  }, [closeDetail, fetchOrders, pagination.current, pagination.pageSize]);

  // ---- 批量确认 ----
  const handleBatchConfirm = useCallback(async () => {
    const pendingIds = selectedRowKeys.filter(id => {
      const order = orders.find(o => o.id === id);
      return order?.status === 'pending';
    });
    if (pendingIds.length === 0) {
      message.warning('选中的订单中没有待接单的订单');
      return;
    }
    try {
      await api.batchConfirmOrders(pendingIds);
      message.success(`已确认 ${pendingIds.length} 个订单`);
      setSelectedRowKeys([]);
      fetchOrders(pagination.current, pagination.pageSize);
    } catch {
      message.error('批量确认失败，请重试');
    }
  }, [selectedRowKeys, orders, fetchOrders, pagination.current, pagination.pageSize]);

  // ---- 备货拍照 ----
  const openFulfill = useCallback((record) => {
    setFulfillOrder(record);
    setFulfillPhotos({});
    setFulfillVisible(true);
  }, []);

  const closeFulfill = useCallback(() => {
    setFulfillVisible(false);
    setFulfillOrder(null);
    setFulfillPhotos({});
    form.resetFields();
  }, [form]);

  const handleFulfillPhotoChange = useCallback((categoryKey, info) => {
    const fileList = info?.fileList?.slice(-1) || [];
    setFulfillPhotos(prev => ({ ...prev, [categoryKey]: fileList }));
  }, []);

  const handleFulfillSubmit = useCallback(async () => {
    if (!fulfillOrder?.id) return;
    const filledCategories = FULFILLMENT_PHOTO_CATEGORIES.filter(c => fulfillPhotos[c.key]?.length > 0);
    if (filledCategories.length === 0) {
      message.warning('请至少上传一张备货照片');
      return;
    }
    setFulfillSaving(true);
    try {
      // 构建 FormData 上传
      const formData = new FormData();
      filledCategories.forEach(cat => {
        const file = fulfillPhotos[cat.key]?.[0]?.originFileObj;
        if (file) formData.append(cat.key, file);
      });
      await api.fulfillOrder(fulfillOrder.id, formData);
      message.success('备货信息已提交，等待领航员取货');
      closeFulfill();
      fetchOrders(pagination.current, pagination.pageSize);
    } catch {
      message.error('备货提交失败，请重试');
    } finally {
      setFulfillSaving(false);
    }
  }, [fulfillOrder, fulfillPhotos, closeFulfill, fetchOrders, pagination.current, pagination.pageSize]);

  // ---- CSV 导出 ----
  const handleExportCSV = useCallback(async () => {
    try {
      const params = {
        ...(searchText && { keyword: searchText }),
        ...(statusFilter.length > 0 && { status: statusFilter.join(',') }),
        ...(dateRange?.[0] && { startDate: dateRange[0].format('YYYY-MM-DD') }),
        ...(dateRange?.[1] && { endDate: dateRange[1].format('YYYY-MM-DD') }),
      };
      await exportCSV('/orders/export', params, `订单导出_${dayjs().format('YYYYMMDD_HHmmss')}.csv`);
      message.success('订单已导出');
    } catch {
      message.error('导出失败，请重试');
    }
  }, [searchText, statusFilter, dateRange]);

  // ---- 表格定义 ----
  const columns = useMemo(() => [
    {
      title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 160, ellipsis: true,
    },
    {
      title: '客户', dataIndex: 'customer', key: 'customer', width: 120, ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '服务类型', dataIndex: 'serviceType', key: 'serviceType', width: 100,
      render: (v) => {
        const typeMap = { inspection: '验货', install: '安装', delivery: '配送', guide: '领航' };
        return <Tag>{typeMap[v] || v || '-'}</Tag>;
      },
    },
    {
      title: '金额', dataIndex: 'amount', key: 'amount', width: 100,
      render: (v) => <span style={{ fontWeight: 500 }}>¥{v?.toLocaleString() || 0}</span>,
    },
    {
      title: '备货状态', key: 'fulfillment', width: 100, align: 'center',
      render: (_, r) => {
        if (r.fulfilled) {
          return <Tag icon={<CheckOutlined />} color="success">已备货</Tag>;
        }
        if (r.status === 'accepted' || r.status === 'preparing') {
          return (
            <Button type="link" size="small" icon={<CameraOutlined />}
                    onClick={(e) => { e.stopPropagation(); openFulfill(r); }}>
              去拍照
            </Button>
          );
        }
        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: '订单状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s) => {
        const cfg = STATUS_CONFIG[s];
        return <Tag color={cfg?.color || 'default'}>{cfg?.label || s}</Tag>;
      },
    },
    {
      title: '时间', dataIndex: 'time', key: 'time', width: 140,
      render: (t) => t ? dayjs(t).format('MM/DD HH:mm') : '-',
    },
    {
      title: '操作', key: 'action', width: 80, fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" icon={<EyeOutlined />}
                onClick={(e) => { e.stopPropagation(); openDetail(record); }}>
          详情
        </Button>
      ),
    },
  ], [openDetail, openFulfill]);

  // ---- 分页变化 ----
  const handleTableChange = useCallback((pag) => {
    setPagination(prev => ({ ...prev, current: pag.current, pageSize: pag.pageSize }));
  }, []);

  // ---- 批量选择变化 ----
  const onSelectChange = useCallback((keys) => {
    setSelectedRowKeys(keys);
  }, []);

  // ---- 渲染备货照片上传 ----
  const renderFulfillmentUpload = () => {
    const categories = FULFILLMENT_PHOTO_CATEGORIES;
    return (
      <Row gutter={[16, 16]}>
        {categories.map(cat => (
          <Col span={12} key={cat.key}>
            <Form.Item label={cat.label}>
              <Upload
                listType="picture-card"
                maxCount={1}
                fileList={fulfillPhotos[cat.key] || []}
                onChange={(info) => handleFulfillPhotoChange(cat.key, info)}
                beforeUpload={(file) => {
                  const isImage = file.type.startsWith('image/');
                  if (!isImage) message.error('请上传图片文件');
                  return isImage || Upload.LIST_IGNORE;
                }}
                onRemove={() => {
                  setFulfillPhotos(prev => ({ ...prev, [cat.key]: [] }));
                }}
              >
                {(fulfillPhotos[cat.key]?.length || 0) < 1 && (
                  <div style={{ textAlign: 'center' }}>
                    <UploadOutlined style={{ fontSize: 20 }} />
                    <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>上传{cat.label}</div>
                  </div>
                )}
              </Upload>
            </Form.Item>
          </Col>
        ))}
      </Row>
    );
  };

  // ---- 渲染订单详情 ----
  const renderDetail = () => {
    if (detailLoading) {
      return <Skeleton active paragraph={{ rows: 8 }} />;
    }
    const o = detailOrder;
    if (!o) return <Empty description="未获取到订单详情" />;
    return (
      <div>
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="订单号" span={2}>{o.orderNo}</Descriptions.Item>
          <Descriptions.Item label="客户姓名">{o.customer || '-'}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{o.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="服务类型">{o.serviceType || '-'}</Descriptions.Item>
          <Descriptions.Item label="订单金额">¥{o.amount?.toLocaleString() || 0}</Descriptions.Item>
          <Descriptions.Item label="订单状态" span={2}>
            <Tag color={STATUS_CONFIG[o.status]?.color}>{STATUS_CONFIG[o.status]?.label || o.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间" span={2}>
            {o.createdAt ? dayjs(o.createdAt).format('YYYY-MM-DD HH:mm') : (o.time || '-')}
          </Descriptions.Item>
        </Descriptions>

        {o.items && o.items.length > 0 && (
          <>
            <Divider orientation="left" style={{ fontSize: 13, color: '#666' }}>商品清单</Divider>
            <Table
              dataSource={o.items}
              rowKey={(item, idx) => item.id || idx}
              pagination={false}
              size="small"
              columns={[
                { title: '商品', dataIndex: 'name', ellipsis: true },
                { title: '规格', dataIndex: 'spec', render: (v) => v || '-' },
                { title: '数量', dataIndex: 'quantity', width: 60 },
                { title: '单价', dataIndex: 'price', width: 80, render: (v) => `¥${v}` },
              ]}
            />
          </>
        )}

        {o.timeline && o.timeline.length > 0 && (
          <>
            <Divider orientation="left" style={{ fontSize: 13, color: '#666' }}>订单轨迹</Divider>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              {o.timeline.map((t, i) => (
                <li key={i} style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>
                  <Text strong style={{ color: '#333' }}>{t.action}</Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>{dayjs(t.time).format('MM/DD HH:mm')}</Text>
                </li>
              ))}
            </ul>
          </>
        )}

        {o.fulfillmentPhotos && o.fulfillmentPhotos.length > 0 && (
          <>
            <Divider orientation="left" style={{ fontSize: 13, color: '#666' }}>备货照片</Divider>
            <Row gutter={[8, 8]}>
              {o.fulfillmentPhotos.map((url, i) => (
                <Col key={i}>
                  <img src={url} alt={`备货照片${i + 1}`}
                       style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6 }} />
                </Col>
              ))}
            </Row>
          </>
        )}
      </div>
    );
  };

  // ---- 渲染 ----
  return (
    <div>
      {/* 标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>订单管理</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => {
            setPagination(prev => ({ ...prev, current: 1 }));
            fetchOrders(1, PAGE_SIZE);
          }} loading={loading} size="small">
            刷新
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportCSV} size="small">
            导出CSV
          </Button>
        </Space>
      </div>

      {/* 搜索与筛选工具栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              prefix={<SearchOutlined style={{ color: '#999' }} />}
              placeholder="搜索订单号/客户..."
              allowClear
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Select
              mode="multiple"
              placeholder="全部状态"
              allowClear
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={handleStatusChange}
              options={STATUS_OPTIONS}
              maxTagCount={2}
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={handleDateChange}
              placeholder={['开始日期', '结束日期']}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space>
              {selectedRowKeys.length > 0 && (
                <Popconfirm
                  title={`批量确认 ${selectedRowKeys.filter(k => orders.find(o => o.id === k)?.status === 'pending').length} 个待接单订单？`}
                  onConfirm={handleBatchConfirm}
                  okText="确认"
                  cancelText="取消"
                >
                  <Button icon={<CheckOutlined />} type="primary" ghost>
                    批量确认 ({selectedRowKeys.length})
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 订单表格 */}
      <Card styles={{ body: { padding: 0 } }}>
        {error ? (
          <Alert
            type="error"
            message="订单列表加载失败"
            showIcon
            style={{ margin: 16 }}
            action={
              <Button size="small" icon={<ReloadOutlined />}
                      onClick={() => fetchOrders(1, PAGE_SIZE)}>
                重新加载
              </Button>
            }
          />
        ) : (
          <Table
            dataSource={orders}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条订单`,
            }}
            onChange={handleTableChange}
            rowSelection={{
              selectedRowKeys,
              onChange: onSelectChange,
            }}
            scroll={{ x: 900 }}
            size="middle"
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    searchText || statusFilter.length > 0 || dateRange
                      ? <span>未找到匹配的订单，请调整筛选条件</span>
                      : <span>暂无订单</span>
                  }
                />
              ),
            }}
          />
        )}
      </Card>

      {/* 订单详情 Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#FF6B35' }} />
            订单详情
          </Space>
        }
        open={detailVisible}
        onCancel={closeDetail}
        footer={
          detailOrder?.status === 'pending'
            ? [
                <Button key="cancel" onClick={closeDetail}>关闭</Button>,
                <Button key="accept" type="primary"
                        style={{ background: '#FF6B35', borderColor: '#FF6B35' }}
                        onClick={() => handleAccept(detailOrder.id)}>
                  确认接单
                </Button>,
              ]
            : [
                <Button key="close" onClick={closeDetail}>关闭</Button>,
              ]
        }
        width={700}
        destroyOnClose
      >
        {renderDetail()}
      </Modal>

      {/* 备货拍照 Modal */}
      <Modal
        title={
          <Space>
            <CameraOutlined style={{ color: '#FF6B35' }} />
            备货拍照 — {fulfillOrder?.orderNo || ''}
          </Space>
        }
        open={fulfillVisible}
        onCancel={closeFulfill}
        onOk={handleFulfillSubmit}
        confirmLoading={fulfillSaving}
        okText="提交备货"
        cancelText="取消"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Alert
            type="info"
            showIcon
            message="请拍摄并上传以下4类照片，确保清晰完整"
            style={{ marginBottom: 16 }}
          />
          {renderFulfillmentUpload()}
        </Form>
      </Modal>
    </div>
  );
}
