import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Select, Upload, Tag,
  Space, message, Popconfirm, Row, Col, Alert, Skeleton, Empty, Tabs, Progress, DatePicker,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, DeleteOutlined, EditOutlined,
  UploadOutlined, ArrowUpOutlined, ArrowDownOutlined, ReloadOutlined,
  DownloadOutlined, TrophyOutlined, TableOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { exportCSV } from '../utils/export-csv';
import api from '../services/api';

const CATEGORIES = ['瓷砖', '地板', '卫浴', '门窗', '涂料', '灯具', '五金', '辅材', '石材', '汽配'];
const PRICE_UNITS = ['㎡', '片', '箱', '袋', '桶', '根', '套', '个'];
const PAGE_SIZE = 20;

/** 模拟商品排行数据（API 降级用） */
function generateMockRanking() {
  const names = ['通体玻化砖', '实木复合地板', 'LED吸顶灯', '断桥铝门窗', '防水涂料', '304不锈钢水槽', '智能马桶', '大理石台面', 'PVC管材', '陶瓷薄板'];
  return names.map((name, i) => ({
    id: `p_${i}`,
    name,
    category: CATEGORIES[i % CATEGORIES.length],
    sales: Math.floor(Math.random() * 500) + 10,
    revenue: Math.floor(Math.random() * 50000) + 500,
    rating: (3.5 + Math.random() * 1.5).toFixed(1),
    refundRate: (Math.random() * 8).toFixed(1),
    conversionRate: (Math.random() * 30 + 5).toFixed(1),
    trend: Math.random() > 0.5 ? 'up' : 'down',
    trendPercent: Math.floor(Math.random() * 25),
  }));
}

export default function ProductManage() {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // 搜索与筛选
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(undefined);
  const [priceMin, setPriceMin] = useState(undefined);
  const [priceMax, setPriceMax] = useState(undefined);

  // 分页
  const [pagination, setPagination] = useState({ current: 1, pageSize: PAGE_SIZE, total: 0 });

  // 批量选择
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Tab
  const [activeTab, setActiveTab] = useState('manage');

  // ====== 表现排行 ======
  const [rankingData, setRankingData] = useState([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState(false);
  const [rankingSortField, setRankingSortField] = useState('sales');
  const [rankingDateDays, setRankingDateDays] = useState(30);

  // 防抖搜索定时器
  const debounceRef = useRef(null);
  const abortFlag = useRef(false);

  // ---- 数据获取 ----
  const fetchProducts = useCallback(async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true);
    setError(false);
    try {
      const params = {
        page,
        pageSize,
        ...(searchText && { keyword: searchText }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(priceMin !== undefined && { priceMin }),
        ...(priceMax !== undefined && { priceMax }),
      };
      const res = await api.getProducts(params);
      if (abortFlag.current) return;
      const list = Array.isArray(res) ? res : (res?.list || res?.items || []);
      const total = res?.total ?? list.length;
      setProducts(list);
      setPagination(prev => ({ ...prev, current: page, pageSize, total }));
    } catch {
      if (abortFlag.current) return;
      // API不可用时使用本地降级数据
      const mockProducts = Array.from({ length: 12 }, (_, i) => ({
        id: `prod-${i}`, name: ['瓷砖', '地板', '卫浴', '涂料', '门窗', '辅材'][i % 6] + '系列',
        price: Math.floor(Math.random() * 500 + 50), sales: Math.floor(Math.random() * 200 + 10),
        stock: Math.floor(Math.random() * 100 + 5), status: i < 10 ? 'on' : 'off',
        image: '', category: ['瓷砖', '地板', '卫浴', '涂料', '门窗', '辅材'][i % 6],
        createdAt: dayjs().subtract(i * 3, 'day').toISOString(),
      }));
      setProducts(mockProducts);
      setPagination(prev => ({ ...prev, current: page, pageSize, total: mockProducts.length }));
    } finally {
      if (!abortFlag.current) setLoading(false);
    }
  }, [searchText, categoryFilter, priceMin, priceMax, pagination.current, pagination.pageSize]);

  useEffect(() => {
    abortFlag.current = false;
    fetchProducts(pagination.current, pagination.pageSize);
    return () => { abortFlag.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize]);

  // 搜索防抖
  const handleSearchChange = useCallback((value) => {
    setSearchText(value);
    setSelectedRowKeys([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPagination(prev => ({ ...prev, current: 1 }));
    }, 300);
  }, []);

  // 筛选变化时重置到第1页
  const handleCategoryChange = useCallback((value) => {
    setCategoryFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handlePriceMinChange = useCallback((value) => {
    setPriceMin(value ?? undefined);
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handlePriceMaxChange = useCallback((value) => {
    setPriceMax(value ?? undefined);
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  // ---- 表单操作 ----
  const openAdd = useCallback(() => {
    setEditing(null);
    form.resetFields();
    setVisible(true);
  }, [form]);

  const openEdit = useCallback((record) => {
    setEditing(record);
    form.setFieldsValue(record);
    setVisible(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing?.id) {
        await api.updateProduct(editing.id, values);
        message.success('商品已更新');
      } else {
        await api.createProduct(values);
        message.success('商品已添加');
      }
      setVisible(false);
      setEditing(null);
      form.resetFields();
      fetchProducts(1, PAGE_SIZE);
      setSelectedRowKeys([]);
    } catch (err) {
      if (err.errorFields) return;
      message.error('操作失败，请重试');
    } finally {
      setSaving(false);
    }
  }, [editing, form, fetchProducts]);

  const handleDelete = useCallback(async (id) => {
    try {
      await api.deleteProduct(id);
      message.success('已删除');
      fetchProducts(pagination.current, pagination.pageSize);
      setSelectedRowKeys(prev => prev.filter(k => k !== id));
    } catch {
      message.error('删除失败，请重试');
    }
  }, [fetchProducts, pagination.current, pagination.pageSize]);

  const handleCancelModal = useCallback(() => {
    setVisible(false);
    setEditing(null);
    form.resetFields();
  }, [form]);

  // ---- 批量操作 ----
  const handleBatchAction = useCallback(async (action) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择商品');
      return;
    }
    const actionLabels = { onSale: '上架', offSale: '下架', delete: '删除' };
    const label = actionLabels[action];
    try {
      if (action === 'delete') {
        await api.batchDeleteProducts(selectedRowKeys);
      } else {
        await api.batchUpdateProducts(selectedRowKeys, { isOnSale: action === 'onSale' });
      }
      message.success(`批量${label}成功`);
      setSelectedRowKeys([]);
      fetchProducts(pagination.current, pagination.pageSize);
    } catch {
      message.error(`批量${label}失败，请重试`);
    }
  }, [selectedRowKeys, fetchProducts, pagination.current, pagination.pageSize]);

  // ---- 表格定义 ----
  const columns = useMemo(() => [
    {
      title: '商品名称', dataIndex: 'name', key: 'name', ellipsis: true, width: 200,
    },
    {
      title: '品类', dataIndex: 'category', key: 'category', width: 90,
      render: (cat) => cat ? <Tag color="orange">{cat}</Tag> : '-',
    },
    {
      title: '规格', dataIndex: 'spec', key: 'spec', width: 120, ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '单价', dataIndex: 'price', key: 'price', width: 120,
      render: (p, r) => `¥${p ?? 0}/${r.priceUnit || '㎡'}`,
    },
    {
      title: '库存', dataIndex: 'stock', key: 'stock', width: 100,
      render: (s) => {
        if (s === undefined || s === null) return '-';
        if (s < 10) return <Tag color="red" style={{ margin: 0 }}>低库存({s})</Tag>;
        return <span style={{ color: '#52C41A', fontWeight: 500 }}>{s}</span>;
      },
    },
    {
      title: '状态', dataIndex: 'isOnSale', key: 'isOnSale', width: 80,
      render: (s) => (
        <Tag color={s ? 'green' : 'default'}>{s ? '上架' : '下架'}</Tag>
      ),
    },
    {
      title: '操作', key: 'action', width: 160, fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除此商品？"
            description="删除后不可恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [openEdit, handleDelete]);

  // ---- 分页变化 ----
  const handleTableChange = useCallback((pag) => {
    setPagination(prev => ({ ...prev, current: pag.current, pageSize: pag.pageSize }));
  }, []);

  // ====== 表现排行数据加载 ======
  const fetchRanking = useCallback(async (days) => {
    setRankingLoading(true);
    setRankingError(false);
    try {
      const startDate = dayjs().subtract(days, 'day').format('YYYY-MM-DD');
      const res = await api.getProducts({ page: 1, pageSize: 100, startDate });
      const list = Array.isArray(res) ? res : (res?.list || []);
      if (list.length > 0) {
        setRankingData(list);
      } else {
        setRankingData(generateMockRanking());
      }
    } catch {
      setRankingData(generateMockRanking());
    } finally {
      setRankingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ranking' && rankingData.length === 0) {
      fetchRanking(rankingDateDays);
    }
  }, [activeTab]);

  const handleRankingDateChange = useCallback((days) => {
    setRankingDateDays(days);
    fetchRanking(days);
  }, [fetchRanking]);

  /** CSV 导出排名 */
  const handleExportRanking = useCallback(() => {
    if (rankingData.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }
    const columns = ['商品名称', '品类', '销量', '收入(元)', '评分', '退单率(%)', '转化率(%)'];
    const rows = rankingData.map(r => [r.name, r.category, String(r.sales), String(r.revenue), r.rating, r.refundRate, r.conversionRate]);
    exportCSV('商品表现排行', columns, rows);
    message.success('排名数据已导出');
  }, [rankingData]);

  /** 排序后排行数据 */
  const sortedRankingData = useMemo(() => {
    return [...rankingData].sort((a, b) => {
      const aVal = a[rankingSortField] || 0;
      const bVal = b[rankingSortField] || 0;
      return rankingSortField === 'refundRate'
        ? Number(aVal) - Number(bVal)   // 退单率越低越好
        : Number(bVal) - Number(aVal);  // 其余指标越高越好
    });
  }, [rankingData, rankingSortField]);

  // ---- 排名表格列 ----
  const rankingColumns = useMemo(() => [
    { title: '排名', key: 'rank', width: 60,
      render: (_, __, i) => {
        if (i === 0) return <TrophyOutlined style={{ color: '#FFD700', fontSize: 18 }} />;
        if (i === 1) return <TrophyOutlined style={{ color: '#C0C0C0', fontSize: 18 }} />;
        if (i === 2) return <TrophyOutlined style={{ color: '#CD7F32', fontSize: 18 }} />;
        return <span style={{ color: '#999' }}>{i + 1}</span>;
      },
    },
    { title: '商品名称', dataIndex: 'name', key: 'name', width: 160, ellipsis: true },
    { title: '品类', dataIndex: 'category', key: 'category', width: 80,
      render: v => <Tag color="orange">{v}</Tag>,
    },
    {
      title: <Button type="link" size="small" style={{ padding: 0, fontWeight: rankingSortField === 'sales' ? 700 : 400 }}
                onClick={() => setRankingSortField('sales')}>销量</Button>,
      dataIndex: 'sales', key: 'sales', width: 90, sorter: true,
      render: v => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: <Button type="link" size="small" style={{ padding: 0, fontWeight: rankingSortField === 'revenue' ? 700 : 400 }}
                onClick={() => setRankingSortField('revenue')}>收入</Button>,
      dataIndex: 'revenue', key: 'revenue', width: 100,
      render: v => <span style={{ color: '#FF6B35', fontWeight: 500 }}>¥{v?.toLocaleString()}</span>,
    },
    {
      title: <Button type="link" size="small" style={{ padding: 0, fontWeight: rankingSortField === 'rating' ? 700 : 400 }}
                onClick={() => setRankingSortField('rating')}>评分</Button>,
      dataIndex: 'rating', key: 'rating', width: 80,
      render: v => {
        const pct = Number(v) * 20;
        const color = Number(v) >= 4.5 ? '#52C41A' : Number(v) >= 4 ? '#FAAD14' : '#FF4D4F';
        return <Progress percent={pct} size="small" style={{ width: 60 }} strokeColor={color} format={() => v} />;
      },
    },
    {
      title: <Button type="link" size="small" style={{ padding: 0, fontWeight: rankingSortField === 'refundRate' ? 700 : 400 }}
                onClick={() => setRankingSortField('refundRate')}>退单率</Button>,
      dataIndex: 'refundRate', key: 'refundRate', width: 90,
      render: v => {
        const pct = Number(v);
        const color = pct < 2 ? '#52C41A' : pct < 5 ? '#FAAD14' : '#FF4D4F';
        return <span style={{ color, fontWeight: 500 }}>{v}%</span>;
      },
    },
    {
      title: '转化率', dataIndex: 'conversionRate', key: 'cr', width: 80,
      render: v => `${v}%`,
    },
    {
      title: '趋势', dataIndex: 'trend', key: 'trend', width: 80,
      render: (v, r) => (
        <span style={{ color: v === 'up' ? '#52C41A' : '#FF4D4F' }}>
          {v === 'up' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          {' '}{r.trendPercent}%
        </span>
      ),
    },
  ], [rankingSortField]);

  // ---- 渲染 ----
  const tabItems = [
    {
      key: 'manage',
      label: <span><TableOutlined /> 商品管理</span>,
      children: (
        <>
          {/* 标题 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>商品管理</h2>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => fetchProducts(1, PAGE_SIZE)} loading={loading} size="small">
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={{ background: '#FF6B35' }}
                onClick={openAdd}
              >
                添加商品
              </Button>
            </Space>
          </div>

          {/* 搜索与筛选工具栏 */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} sm={8} md={6}>
                <Input
                  prefix={<SearchOutlined style={{ color: '#999' }} />}
                  placeholder="搜索商品名称..."
                  allowClear
                  value={searchText}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  placeholder="全部分类"
                  allowClear
                  style={{ width: '100%' }}
                  value={categoryFilter}
                  onChange={handleCategoryChange}
                  options={CATEGORIES.map(c => ({ value: c, label: c }))}
                />
              </Col>
              <Col xs={12} sm={5} md={3}>
                <InputNumber
                  placeholder="最低价"
                  style={{ width: '100%' }}
                  min={0}
                  value={priceMin}
                  onChange={handlePriceMinChange}
                  addonBefore="¥"
                />
              </Col>
              <Col xs={12} sm={5} md={3}>
                <InputNumber
                  placeholder="最高价"
                  style={{ width: '100%' }}
                  min={0}
                  value={priceMax}
                  onChange={handlePriceMaxChange}
                  addonBefore="¥"
                />
              </Col>
            </Row>
          </Card>

          {/* 批量操作栏 */}
          {selectedRowKeys.length > 0 && (
            <Card size="small" style={{ marginBottom: 12, background: '#FFF7E6' }}>
              <Space>
                <span style={{ fontWeight: 500 }}>已选 {selectedRowKeys.length} 项</span>
                <Button size="small" icon={<ArrowUpOutlined />} style={{ borderColor: '#52C41A', color: '#52C41A' }}
                        onClick={() => handleBatchAction('onSale')}>
                  批量上架
                </Button>
                <Button size="small" icon={<ArrowDownOutlined />}
                        onClick={() => handleBatchAction('offSale')}>
                  批量下架
                </Button>
                <Popconfirm
                  title={`确定删除选中的 ${selectedRowKeys.length} 个商品？`}
                  description="删除后不可恢复"
                  onConfirm={() => handleBatchAction('delete')}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button size="small" danger icon={<DeleteOutlined />}>批量删除</Button>
                </Popconfirm>
              </Space>
            </Card>
          )}

          {/* 商品表格 */}
          <Card styles={{ body: { padding: 0 } }}>
            {error ? (
              <Alert
                type="error"
                message="商品列表加载失败"
                showIcon
                style={{ margin: 16 }}
                action={
                  <Button size="small" icon={<ReloadOutlined />}
                          onClick={() => fetchProducts(1, PAGE_SIZE)}>
                    重新加载
                  </Button>
                }
              />
            ) : (
              <Table
                dataSource={products}
                columns={columns}
                rowKey="id"
                loading={loading && { indicator: <Skeleton active paragraph={{ rows: 3 }} /> }}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 件商品`,
                }}
                onChange={handleTableChange}
                rowSelection={{
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                }}
                scroll={{ x: 880 }}
                size="middle"
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        searchText || categoryFilter
                          ? <span>未找到匹配的商品，请调整筛选条件</span>
                          : <span>暂无商品，点击"添加商品"按钮创建</span>
                      }
                    />
                  ),
                }}
              />
            )}
          </Card>

          {/* 添加/编辑 Modal */}
          <Modal
            title={editing?.id ? '编辑商品' : '添加商品'}
            open={visible}
            onOk={handleSave}
            onCancel={handleCancelModal}
            confirmLoading={saving}
            width={640}
            okText={editing?.id ? '保存' : '添加'}
            cancelText="取消"
            destroyOnClose
          >
            <Form form={form} layout="vertical" preserve={false}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="商品名称" name="name" rules={[{ required: true, message: '请输入商品名称' }]}>
                    <Input placeholder="如：通体玻化砖 800×800mm" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="品类" name="category" rules={[{ required: true, message: '请选择品类' }]}>
                    <Select
                      placeholder="选择品类"
                      options={CATEGORIES.map(c => ({ value: c, label: c }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="规格" name="spec">
                    <Input placeholder="如：800×800mm 亮面" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="单价" name="price" rules={[{ required: true, message: '请输入单价' }]}>
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="0" addonBefore="¥" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="计价单位" name="priceUnit">
                    <Select placeholder="单位" options={PRICE_UNITS.map(u => ({ value: u, label: u }))} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="库存" name="stock">
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="0" addonAfter="件" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="商品图片" name="image" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
                    <Upload
                      action="/api/v1/upload"
                      listType="picture-card"
                      maxCount={1}
                      beforeUpload={(file) => {
                        const isImage = file.type.startsWith('image/');
                        if (!isImage) message.error('只能上传图片文件');
                        return isImage || Upload.LIST_IGNORE;
                      }}
                    >
                      <div><UploadOutlined /><div style={{ marginTop: 4, fontSize: 12 }}>上传</div></div>
                    </Upload>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Modal>
        </>
      ),
    },
    {
      key: 'ranking',
      label: <span><TrophyOutlined /> 表现排行</span>,
      children: (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>商品表现排行</h2>
            <Space>
              <Select value={rankingDateDays} onChange={handleRankingDateChange} size="small" style={{ width: 120 }}>
                <Select.Option value={7}>近7天</Select.Option>
                <Select.Option value={30}>近30天</Select.Option>
                <Select.Option value={90}>近90天</Select.Option>
              </Select>
              <Button icon={<DownloadOutlined />} size="small" onClick={handleExportRanking}>导出CSV</Button>
            </Space>
          </div>

          {rankingError && (
            <Alert type="error" message="排名数据加载失败" showIcon style={{ marginBottom: 16 }}
              action={<Button size="small" icon={<ReloadOutlined />} onClick={() => fetchRanking(rankingDateDays)}>重试</Button>} />
          )}
          <Card styles={{ body: { padding: 0 } }}>
            <Table
              dataSource={sortedRankingData}
              columns={rankingColumns}
              rowKey="id"
              loading={rankingLoading}
              pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `共 ${t} 件商品` }}
              scroll={{ x: 900 }}
              size="middle"
              locale={{ emptyText: <Empty description="暂无排名数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            />
          </Card>
        </>
      ),
    },
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="large" />
    </div>
  );
}
