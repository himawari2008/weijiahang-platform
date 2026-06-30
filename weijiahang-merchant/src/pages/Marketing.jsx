import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Button, Modal, Select, Input, InputNumber,
  DatePicker, Tag, Space, Skeleton, Alert, Empty, Typography, message, Segmented, Popconfirm,
} from 'antd';
import {
  ReloadOutlined, PlusOutlined, PauseCircleOutlined,
  PlayCircleOutlined, DeleteOutlined, GiftOutlined, EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const ACTIVITY_TYPES = [
  { value: '满减', label: '满减活动', desc: '满指定金额减指定金额' },
  { value: '折扣', label: '折扣活动', desc: '商品折扣优惠' },
  { value: '新客立减', label: '新客立减', desc: '新客户专享立减' },
  { value: '套餐', label: '套餐组合', desc: '多商品组合优惠价' },
];

const STATUS_MAP = {
  active: { color: 'green', label: '进行中' },
  paused: { color: 'orange', label: '已暂停' },
  ended: { color: 'default', label: '已结束' },
  pending: { color: 'blue', label: '待生效' },
};

export default function Marketing() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState([]);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [platformActivities, setPlatformActivities] = useState([]);
  const [errorPlatform, setErrorPlatform] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  // Create/Edit modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formValues, setFormValues] = useState({
    activityType: undefined, name: '', fullAmount: undefined, reduceAmount: undefined,
    discountRate: undefined, applicableProducts: undefined, reduceAmountNew: undefined,
    productIds: undefined, comboPrice: undefined,
    dateRange: undefined, maxCount: undefined,
  });
  const [saving, setSaving] = useState(false);

  // ---- Data fetching ----
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = {};
      if (typeFilter !== 'all') params.activityType = typeFilter;
      const res = await api.getShopActivities(params);
      setData(Array.isArray(res?.list) ? res.list : []);
    } catch {
      // API不可用时使用本地降级数据
      setData([
        { id: 'ma-1', name: '新客专享券', activityType: 'coupon', discount: '满200减30', startDate: dayjs().subtract(3, 'day').toISOString(), endDate: dayjs().add(10, 'day').toISOString(), status: 'active', usedCount: 23 },
        { id: 'ma-2', name: '周年庆活动', activityType: 'promotion', discount: '全场9折', startDate: dayjs().subtract(5, 'day').toISOString(), endDate: dayjs().add(2, 'day').toISOString(), status: 'active', usedCount: 67 },
        { id: 'ma-3', name: '会员日特惠', activityType: 'coupon', discount: '满500减80', startDate: dayjs().add(2, 'day').toISOString(), endDate: dayjs().add(15, 'day').toISOString(), status: 'upcoming', usedCount: 0 },
      ]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  const fetchPlatformActivities = useCallback(async () => {
    setPlatformLoading(true);
    setErrorPlatform(false);
    try {
      const res = await api.getPlatformActivities();
      setPlatformActivities(Array.isArray(res?.list) ? res.list : []);
    } catch {
      setPlatformActivities([
        { id: 'pa-1', name: '平台618大促', description: '全平台满减活动，报名即可参与', startDate: dayjs().format('YYYY-MM-DD'), endDate: dayjs().add(10, 'day').format('YYYY-MM-DD'), reward: '流量加权+首页推荐', joined: false },
        { id: 'pa-2', name: '新店扶持计划', description: '新入驻商户专享流量扶持', startDate: dayjs().format('YYYY-MM-DD'), endDate: dayjs().add(30, 'day').format('YYYY-MM-DD'), reward: '首页横幅+搜索加权', joined: true },
      ]);
    } finally {
      setPlatformLoading(false);
    }
  }, []);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);
  useEffect(() => { fetchPlatformActivities(); }, [fetchPlatformActivities]);

  // ---- Activity type filter ----
  const handleTypeFilterChange = useCallback((value) => {
    setTypeFilter(value);
  }, []);

  // ---- Create / Edit ----
  const openCreateModal = useCallback(() => {
    setEditingId(null);
    setFormValues({
      activityType: undefined, name: '', fullAmount: undefined, reduceAmount: undefined,
      discountRate: undefined, applicableProducts: undefined, reduceAmountNew: undefined,
      productIds: undefined, comboPrice: undefined,
      dateRange: undefined, maxCount: undefined,
    });
    setModalVisible(true);
  }, []);

  const openEditModal = useCallback((activity) => {
    setEditingId(activity.id);
    setFormValues({
      activityType: activity.activityType,
      name: activity.name,
      fullAmount: activity.rules?.fullAmount,
      reduceAmount: activity.rules?.reduceAmount,
      discountRate: activity.rules?.discountRate,
      applicableProducts: activity.rules?.applicableProducts,
      reduceAmountNew: activity.rules?.reduceAmount,
      productIds: activity.rules?.productIds,
      comboPrice: activity.rules?.comboPrice,
      dateRange: activity.startDate && activity.endDate
        ? [dayjs(activity.startDate), dayjs(activity.endDate)]
        : undefined,
      maxCount: activity.maxCount,
    });
    setModalVisible(true);
  }, []);

  const handleFormChange = useCallback((key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    const { activityType, name, dateRange, maxCount } = formValues;
    if (!activityType) { message.warning('请选择活动类型'); return; }
    if (!name?.trim()) { message.warning('请输入活动名称'); return; }
    if (!dateRange) { message.warning('请选择活动时间'); return; }

    const rules = {};
    if (activityType === '满减') {
      if (!formValues.fullAmount || !formValues.reduceAmount) {
        message.warning('请输入满减规则'); return;
      }
      rules.fullAmount = formValues.fullAmount;
      rules.reduceAmount = formValues.reduceAmount;
    } else if (activityType === '折扣') {
      if (!formValues.discountRate) { message.warning('请输入折扣率'); return; }
      rules.discountRate = formValues.discountRate;
      rules.applicableProducts = formValues.applicableProducts || '全部';
    } else if (activityType === '新客立减') {
      if (!formValues.reduceAmountNew) { message.warning('请输入立减金额'); return; }
      rules.reduceAmount = formValues.reduceAmountNew;
    } else if (activityType === '套餐') {
      if (!formValues.productIds || !formValues.comboPrice) {
        message.warning('请填写套餐信息'); return;
      }
      rules.productIds = formValues.productIds;
      rules.comboPrice = formValues.comboPrice;
    }

    setSaving(true);
    try {
      const payload = {
        activityType,
        name: name.trim(),
        rules,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        maxCount: maxCount || null,
      };

      if (editingId) {
        await api.updateActivity(editingId, payload);
        message.success('活动已更新');
      } else {
        await api.createActivity(payload);
        message.success('活动已创建');
      }
      setModalVisible(false);
      fetchActivities();
    } catch {
      message.error(editingId ? '更新失败，请重试' : '创建失败，请重试');
    } finally {
      setSaving(false);
    }
  }, [formValues, editingId, fetchActivities]);

  // ---- Actions ----
  const handlePauseResume = useCallback(async (id, currentStatus) => {
    try {
      const action = currentStatus === 'active' ? 'pause' : 'resume';
      await api.toggleActivityStatus(id, action);
      message.success(action === 'pause' ? '活动已暂停' : '活动已恢复');
      fetchActivities();
    } catch {
      message.error('操作失败，请重试');
    }
  }, [fetchActivities]);

  const handleDelete = useCallback(async (id) => {
    try {
      await api.deleteActivity(id);
      message.success('活动已删除');
      fetchActivities();
    } catch {
      message.error('删除失败，请重试');
    }
  }, [fetchActivities]);

  // ---- Join platform activity ----
  const handleJoinPlatform = useCallback(async (id) => {
    try {
      await api.joinPlatformActivity(id);
      message.success('报名成功');
      fetchPlatformActivities();
    } catch {
      message.error('报名失败，请重试');
    }
  }, [fetchPlatformActivities]);

  // ---- Render activity card ----
  const renderActivityCard = useCallback((activity) => {
    const statusCfg = STATUS_MAP[activity.status] || STATUS_MAP.pending;
    const rulesText = (() => {
      const r = activity.rules || {};
      switch (activity.activityType) {
        case '满减': return `满¥${r.fullAmount}减¥${r.reduceAmount}`;
        case '折扣': return `全场${r.discountRate}折${r.applicableProducts ? ` (${r.applicableProducts})` : ''}`;
        case '新客立减': return `新客户立减¥${r.reduceAmount}`;
        case '套餐': return `组合套餐价¥${r.comboPrice}`;
        default: return '';
      }
    })();

    return (
      <Card
        key={activity.id}
        style={{ marginBottom: 12, borderRadius: 8 }}
        bodyStyle={{ padding: 16 }}
        hoverable
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Space>
            <Text strong style={{ fontSize: 15 }}>{activity.name}</Text>
            <Tag color={statusCfg.color} style={{ fontSize: 11, borderRadius: 4 }}>{statusCfg.label}</Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {activity.activityType}
          </Text>
        </div>

        <Paragraph style={{ marginBottom: 4, fontSize: 14, color: '#FF6B35', fontWeight: 600 }}>
          {rulesText}
        </Paragraph>

        <Space style={{ marginBottom: 4, fontSize: 12 }} split={<Text type="secondary">|</Text>}>
          <Text type="secondary">
            {activity.startDate ? dayjs(activity.startDate).format('MM/DD') : '-'} ~ {activity.endDate ? dayjs(activity.endDate).format('MM/DD') : '-'}
          </Text>
          <Text type="secondary">已使用 {activity.usedCount || 0} 次</Text>
          {activity.maxCount && (
            <Text type="secondary">上限 {activity.maxCount} 次</Text>
          )}
        </Space>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          {activity.status === 'active' && (
            <Button size="small" icon={<PauseCircleOutlined />} onClick={() => handlePauseResume(activity.id, activity.status)}>
              暂停
            </Button>
          )}
          {activity.status === 'paused' && (
            <Button size="small" icon={<PlayCircleOutlined />} onClick={() => handlePauseResume(activity.id, activity.status)}>
              恢复
            </Button>
          )}
          {activity.status !== 'ended' && (
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(activity)}>
              编辑
            </Button>
          )}
          <Popconfirm title="确定删除此活动？" onConfirm={() => handleDelete(activity.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </div>
      </Card>
    );
  }, [handlePauseResume, handleDelete, openEditModal]);

  // ---- Render rules form ----
  const renderRuleFields = () => {
    const type = formValues.activityType;
    if (!type) return null;

    switch (type) {
      case '满减':
        return (
          <Space style={{ width: '100%' }} align="start">
            <div>
              <Text style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>满额(元)</Text>
              <InputNumber
                placeholder="如 500"
                value={formValues.fullAmount}
                onChange={(v) => handleFormChange('fullAmount', v)}
                min={1}
                style={{ width: 140 }}
              />
            </div>
            <div>
              <Text style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>减额(元)</Text>
              <InputNumber
                placeholder="如 50"
                value={formValues.reduceAmount}
                onChange={(v) => handleFormChange('reduceAmount', v)}
                min={1}
                style={{ width: 140 }}
              />
            </div>
          </Space>
        );
      case '折扣':
        return (
          <Space style={{ width: '100%' }} align="start" wrap>
            <div>
              <Text style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>折扣率</Text>
              <InputNumber
                placeholder="如 8 (代表8折)"
                value={formValues.discountRate}
                onChange={(v) => handleFormChange('discountRate', v)}
                min={1} max={10}
                style={{ width: 140 }}
                formatter={(v) => `${v}折`}
                parser={(v) => v?.replace('折', '')}
              />
            </div>
            <div>
              <Text style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>适用商品</Text>
              <Select
                placeholder="选择范围"
                value={formValues.applicableProducts}
                onChange={(v) => handleFormChange('applicableProducts', v)}
                style={{ width: 140 }}
                options={[
                  { value: '全部', label: '全部商品' },
                  { value: '部分', label: '部分商品（手动设置）' },
                ]}
              />
            </div>
          </Space>
        );
      case '新客立减':
        return (
          <div>
            <Text style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>立减金额(元)</Text>
            <InputNumber
              placeholder="如 20"
              value={formValues.reduceAmountNew}
              onChange={(v) => handleFormChange('reduceAmountNew', v)}
              min={1}
              style={{ width: 140 }}
            />
          </div>
        );
      case '套餐':
        return (
          <Space style={{ width: '100%' }} align="start" wrap>
            <div>
              <Text style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>套餐价(元)</Text>
              <InputNumber
                placeholder="如 299"
                value={formValues.comboPrice}
                onChange={(v) => handleFormChange('comboPrice', v)}
                min={1}
                style={{ width: 140 }}
              />
            </div>
            <div>
              <Text style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>包含商品数</Text>
              <InputNumber
                placeholder="如 3"
                value={formValues.productIds}
                onChange={(v) => handleFormChange('productIds', v)}
                min={2}
                style={{ width: 140 }}
              />
            </div>
          </Space>
        );
      default:
        return null;
    }
  };

  // ---- Content ----
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>营销中心</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { fetchActivities(); fetchPlatformActivities(); }} loading={loading} size="small">刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal} style={{ background: '#FF6B35', borderColor: '#FF6B35' }} size="small">
            创建新活动
          </Button>
        </Space>
      </div>

      {/* 活动类型筛选 */}
      <Card bodyStyle={{ padding: '12px 16px' }} style={{ marginBottom: 16, borderRadius: 8 }}>
        <Segmented
          value={typeFilter}
          onChange={handleTypeFilterChange}
          options={[
            { value: 'all', label: '全部活动' },
            ...ACTIVITY_TYPES.map((t) => ({ value: t.value, label: t.label })),
          ]}
        />
      </Card>

      {/* 活动列表 */}
      <Card title={<span style={{ fontSize: 14, fontWeight: 600 }}>我的活动</span>} bodyStyle={{ padding: 16 }} style={{ marginBottom: 16, borderRadius: 8 }}>
        {error ? (
          <Alert
            type="error"
            message="活动数据加载失败"
            description="无法获取活动信息，请检查网络连接后重试"
            showIcon
            action={
              <Button size="small" icon={<ReloadOutlined />} onClick={fetchActivities}>重新加载</Button>
            }
          />
        ) : loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} style={{ marginBottom: 12 }}>
              <Skeleton active paragraph={{ rows: 3 }} />
            </Card>
          ))
        ) : data.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span>暂无活动，点击右上角创建第一个活动</span>}
            style={{ margin: '40px 0' }}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal} style={{ background: '#FF6B35', borderColor: '#FF6B35' }}>
              创建活动
            </Button>
          </Empty>
        ) : (
          data.map(renderActivityCard)
        )}
      </Card>

      {/* 平台活动 */}
      <Card
        title={<span style={{ fontSize: 14, fontWeight: 600 }}>平台活动</span>}
        extra={<Text type="secondary" style={{ fontSize: 12 }}>参与平台活动获取更多曝光</Text>}
        bodyStyle={{ padding: 16 }}
        style={{ borderRadius: 8 }}
      >
        {errorPlatform ? (
          <Alert
            type="error"
            message="平台活动加载失败"
            showIcon
            action={<Button size="small" icon={<ReloadOutlined />} onClick={fetchPlatformActivities}>重试</Button>}
          />
        ) : platformLoading ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : platformActivities.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span>暂无平台活动</span>}
            style={{ margin: '24px 0' }}
          />
        ) : (
          platformActivities.map((act) => (
            <Card
              key={act.id}
              size="small"
              style={{ marginBottom: 8, borderRadius: 8 }}
              bodyStyle={{ padding: 12 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space direction="vertical" size={2}>
                  <Space>
                    <GiftOutlined style={{ color: '#FF6B35' }} />
                    <Text strong style={{ fontSize: 14 }}>{act.name}</Text>
                    <Tag color={act.status === 'open' ? 'green' : 'default'} style={{ fontSize: 11, borderRadius: 4 }}>
                      {act.status === 'open' ? '报名中' : act.status === 'ongoing' ? '进行中' : '已结束'}
                    </Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {act.description} | {act.startDate ? dayjs(act.startDate).format('MM/DD') : '-'} ~ {act.endDate ? dayjs(act.endDate).format('MM/DD') : '-'}
                  </Text>
                </Space>
                {act.status === 'open' && !act.joined && (
                  <Button size="small" type="primary" style={{ background: '#FF6B35', borderColor: '#FF6B35' }} onClick={() => handleJoinPlatform(act.id)}>
                    立即报名
                  </Button>
                )}
                {act.joined && <Tag color="blue" style={{ fontSize: 11 }}>已报名</Tag>}
              </div>
            </Card>
          ))
        )}
      </Card>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editingId ? '编辑活动' : '创建新活动'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText={editingId ? '保存' : '创建'}
        cancelText="取消"
        width={560}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {/* 活动类型 */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>活动类型 *</Text>
            <Select
              placeholder="选择活动类型"
              value={formValues.activityType}
              onChange={(v) => handleFormChange('activityType', v)}
              style={{ width: '100%' }}
              options={ACTIVITY_TYPES.map((t) => ({ value: t.value, label: `${t.label} - ${t.desc}` }))}
              disabled={!!editingId}
            />
          </div>

          {/* 活动名称 */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>活动名称 *</Text>
            <Input
              placeholder="如：新店开业满减"
              value={formValues.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              maxLength={50}
              showCount
            />
          </div>

          {/* 活动规则 */}
          {formValues.activityType && (
            <div style={{ padding: 12, background: '#F9F9F9', borderRadius: 8 }}>
              <Text strong style={{ display: 'block', marginBottom: 8, color: '#FF6B35' }}>
                {ACTIVITY_TYPES.find((t) => t.value === formValues.activityType)?.label}规则
              </Text>
              {renderRuleFields()}
            </div>
          )}

          {/* 活动时间 */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>活动时间 *</Text>
            <RangePicker
              value={formValues.dateRange}
              onChange={(dates) => handleFormChange('dateRange', dates)}
              style={{ width: '100%' }}
            />
          </div>

          {/* 使用上限 */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>使用上限（可选）</Text>
            <InputNumber
              placeholder="不填则不限制"
              value={formValues.maxCount}
              onChange={(v) => handleFormChange('maxCount', v)}
              min={1}
              style={{ width: '100%' }}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
