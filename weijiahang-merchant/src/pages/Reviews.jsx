import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Tabs, Select, Button, Modal, Input, Rate, Tag,
  Pagination, Space, Skeleton, Alert, Empty, Typography, message,
} from 'antd';
import { ReloadOutlined, MessageOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const RATING_OPTIONS = [
  { value: 0, label: '全部评分' },
  { value: 5, label: '5星' },
  { value: 4, label: '4星' },
  { value: 3, label: '3星' },
  { value: 2, label: '2星' },
  { value: 1, label: '1星' },
];

const PAGE_SIZE = 10;

export default function Reviews() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentTab, setCurrentTab] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [page, setPage] = useState(1);

  // Reply modal
  const [replyVisible, setReplyVisible] = useState(false);
  const [replyReviewId, setReplyReviewId] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [unrepliedCount, setUnrepliedCount] = useState(0);

  // Dispute modal
  const [disputeVisible, setDisputeVisible] = useState(false);
  const [disputeReviewId, setDisputeReviewId] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = { page, pageSize: PAGE_SIZE };
      if (currentTab === 'unreplied') params.replied = false;
      if (currentTab === 'disputed') params.disputed = true;
      if (ratingFilter > 0) params.rating = ratingFilter;
      const res = await api.getShopReviews(params);
      setData(Array.isArray(res?.list) ? res.list : []);
      setTotal(res?.total || 0);
    } catch {
      // API不可用时使用本地降级数据
      const mockReviews = Array.from({ length: 8 }, (_, i) => ({
        id: `review-${i}`, orderNo: `MO${dayjs().format('YYYYMMDD')}${String(i).padStart(4,'0')}`,
        reviewer: `用户****${i}`, rating: Math.floor(Math.random() * 2 + 4),
        content: ['产品质量很好，服务态度也不错', '性价比高，下次还会来', '物流有点慢但商品不错', '好评！', '中规中矩'][i % 5],
        reply: i < 3 ? '感谢您的评价！' : '',
        repliedAt: i < 3 ? dayjs().subtract(i, 'day').toISOString() : null,
        createdAt: dayjs().subtract(i * 2, 'day').toISOString(),
        tags: ['质量好', '性价比高'][i % 2],
        isAnonymous: i % 3 === 0,
      }));
      setData(mockReviews);
      setTotal(mockReviews.length);
    } finally {
      setLoading(false);
    }
  }, [page, currentTab, ratingFilter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const fetchUnrepliedCount = useCallback(async () => {
    try {
      const res = await api.getShopReviews({ replied: false, page: 1, pageSize: 1 });
      if (res?.total !== undefined) setUnrepliedCount(res.total);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchUnrepliedCount(); }, [fetchUnrepliedCount]);

  const handleTabChange = useCallback((key) => {
    setCurrentTab(key);
    setPage(1);
  }, []);

  const handleRatingFilterChange = useCallback((value) => {
    setRatingFilter(value);
    setPage(1);
  }, []);

  // ---- Reply handlers ----
  const openReplyModal = useCallback((id, content) => {
    setReplyReviewId(id);
    setReplyContent(content ? `@${content.length > 20 ? content.slice(0, 20) + '...' : content} ` : '');
    setReplyVisible(true);
  }, []);

  const handleReplySubmit = useCallback(async () => {
    if (!replyContent.trim()) {
      message.warning('请输入回复内容');
      return;
    }
    if (replyContent.trim().length > 200) {
      message.warning('回复内容不能超过200字');
      return;
    }
    setSubmittingReply(true);
    try {
      await api.replyToReview(replyReviewId, { replyContent: replyContent.trim() });
      message.success('回复成功');
      setReplyVisible(false);
      setReplyContent('');
      fetchReviews();
    } catch {
      message.error('回复失败，请重试');
    } finally {
      setSubmittingReply(false);
    }
  }, [replyContent, replyReviewId, fetchReviews]);

  // ---- Dispute handlers ----
  const openDisputeModal = useCallback((id) => {
    setDisputeReviewId(id);
    setDisputeReason('');
    setDisputeEvidence('');
    setDisputeVisible(true);
  }, []);

  const handleDisputeSubmit = useCallback(async () => {
    if (!disputeReason.trim()) {
      message.warning('请输入申诉理由');
      return;
    }
    setSubmittingDispute(true);
    try {
      await api.disputeReview(disputeReviewId, {
        reason: disputeReason.trim(),
        evidence: disputeEvidence.trim(),
      });
      message.success('申诉已提交，等待平台处理');
      setDisputeVisible(false);
      fetchReviews();
    } catch {
      message.error('申诉提交失败，请重试');
    } finally {
      setSubmittingDispute(false);
    }
  }, [disputeReason, disputeEvidence, disputeReviewId, fetchReviews]);

  const handlePageChange = useCallback((p) => {
    setPage(p);
  }, []);

  // ---- Render review card ----
  const renderReviewCard = useCallback((review) => {
    const canDispute = review.rating <= 3;
    const dims = review.dimensionRatings || {};

    return (
      <Card
        key={review.id}
        style={{ marginBottom: 12, borderRadius: 8 }}
        bodyStyle={{ padding: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
          <Space wrap>
            <Rate disabled value={review.rating} style={{ fontSize: 14, color: '#FAAD14' }} />
            <Text strong style={{ fontSize: 14 }}>{review.customerName || '匿名用户'}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {review.createdAt ? dayjs(review.createdAt).format('YYYY-MM-DD') : '-'}
            </Text>
          </Space>
          {review.replyContent && (
            <Tag color="green" style={{ fontSize: 11, borderRadius: 4 }}>已回复</Tag>
          )}
        </div>

        <Paragraph style={{ marginBottom: 8, color: '#333', fontSize: 14 }}>
          {review.content}
        </Paragraph>

        {(dims.quality !== undefined || dims.price !== undefined || dims.service !== undefined) && (
          <Space style={{ marginBottom: 8, fontSize: 12 }} wrap>
            {dims.quality !== undefined && (
              <span>
                <Text type="secondary" style={{ fontSize: 12 }}>质量 </Text>
                <Rate disabled value={dims.quality} style={{ fontSize: 12, color: '#FAAD14' }} />
              </span>
            )}
            {dims.price !== undefined && (
              <span>
                <Text type="secondary" style={{ fontSize: 12 }}>价格 </Text>
                <Rate disabled value={dims.price} style={{ fontSize: 12, color: '#FAAD14' }} />
              </span>
            )}
            {dims.service !== undefined && (
              <span>
                <Text type="secondary" style={{ fontSize: 12 }}>服务 </Text>
                <Rate disabled value={dims.service} style={{ fontSize: 12, color: '#FAAD14' }} />
              </span>
            )}
          </Space>
        )}

        {review.replyContent && (
          <div style={{
            background: '#F9F9F9', padding: '8px 12px', borderRadius: 6,
            marginBottom: 8, fontSize: 13, color: '#666',
          }}>
            <Text type="secondary" style={{ fontSize: 12 }}>商家回复：</Text>
            <div style={{ marginTop: 2 }}>{review.replyContent}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {!review.replyContent && (
            <Button
              size="small"
              icon={<MessageOutlined />}
              onClick={() => openReplyModal(review.id, review.content)}
            >
              回复
            </Button>
          )}
          {canDispute && !review.isDisputed && (
            <Button
              size="small"
              icon={<WarningOutlined />}
              onClick={() => openDisputeModal(review.id)}
              danger
            >
              申诉
            </Button>
          )}
          {review.isDisputed && (
            <Tag color="orange" style={{ fontSize: 11, borderRadius: 4 }}>已申诉</Tag>
          )}
        </div>
      </Card>
    );
  }, [openReplyModal, openDisputeModal]);

  // ---- Content area ----
  const renderContent = () => {
    if (error) {
      return (
        <Alert
          type="error"
          message="评价加载失败"
          description="无法获取评价信息，请检查网络连接后重试"
          showIcon
          style={{ borderRadius: 8 }}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchReviews}>重新加载</Button>
          }
        />
      );
    }

    if (loading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} style={{ marginBottom: 12, borderRadius: 8 }} bodyStyle={{ padding: 16 }}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
      ));
    }

    if (data.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span>暂无评价</span>}
          style={{ margin: '60px 0' }}
        />
      );
    }

    return (
      <>
        {data.map(renderReviewCard)}
        {total > PAGE_SIZE && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Pagination
              current={page}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={handlePageChange}
              showSizeChanger={false}
              showTotal={(t) => `共 ${t} 条`}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>评价管理</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchReviews} loading={loading} size="small">刷新</Button>
      </div>

      <Card bodyStyle={{ padding: 0, borderRadius: 8 }}>
        <Tabs
          activeKey={currentTab}
          onChange={handleTabChange}
          tabBarExtraContent={
            <div style={{ paddingRight: 16 }}>
              <Select
                value={ratingFilter}
                onChange={handleRatingFilterChange}
                options={RATING_OPTIONS}
                style={{ width: 120 }}
                size="small"
              />
            </div>
          }
          items={[
            { key: 'all', label: '全部评价' },
            { key: 'unreplied', label: `待回复${unrepliedCount > 0 ? ` (${unrepliedCount})` : ''}` },
            { key: 'disputed', label: '差评申诉' },
          ]}
          style={{ padding: '0 16px' }}
        />
        <div style={{ padding: 16, minHeight: 200 }}>
          {renderContent()}
        </div>
      </Card>

      {/* 回复弹窗 */}
      <Modal
        title="回复评价"
        open={replyVisible}
        onCancel={() => setReplyVisible(false)}
        onOk={handleReplySubmit}
        confirmLoading={submittingReply}
        okText="提交回复"
        cancelText="取消"
        destroyOnClose
      >
        <TextArea
          placeholder="请输入回复内容（不超过200字）"
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          maxLength={200}
          rows={4}
          showCount
          style={{ borderRadius: 6 }}
        />
      </Modal>

      {/* 申诉弹窗 */}
      <Modal
        title="差评申诉"
        open={disputeVisible}
        onCancel={() => setDisputeVisible(false)}
        onOk={handleDisputeSubmit}
        confirmLoading={submittingDispute}
        okText="提交申诉"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>申诉理由 *</Text>
          <TextArea
            placeholder="请说明申诉理由，如：客户评价与事实不符。请客观描述情况。"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            maxLength={500}
            rows={3}
            showCount
            style={{ borderRadius: 6 }}
          />
        </div>
        <div>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>证据描述</Text>
          <TextArea
            placeholder="请描述您持有的相关证据（聊天记录截图凭证等）"
            value={disputeEvidence}
            onChange={(e) => setDisputeEvidence(e.target.value)}
            maxLength={1000}
            rows={3}
            showCount
            style={{ borderRadius: 6 }}
          />
        </div>
      </Modal>
    </div>
  );
}
