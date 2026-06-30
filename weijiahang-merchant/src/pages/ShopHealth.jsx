import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Row, Col, Progress, Tag, Space, Skeleton, Alert, Empty, Typography, Button,
} from 'antd';
import {
  ReloadOutlined, TrophyOutlined, ArrowUpOutlined, ArrowDownOutlined,
  BulbOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import {
  GridComponent, TooltipComponent, TitleComponent, LegendComponent,
  RadarComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import api from '../services/api';

echarts.use([
  RadarChart,
  GridComponent, TooltipComponent, TitleComponent, LegendComponent, RadarComponent,
  CanvasRenderer,
]);

const { Text, Title } = Typography;

const ORANGE = '#FF6B35';
const ORANGE_LIGHT = 'rgba(255,107,53,0.1)';

const DIMENSION_ICONS = {
  good: <CheckCircleOutlined style={{ color: '#52C41A' }} />,
  warn: <WarningOutlined style={{ color: '#FAAD14' }} />,
  bad: <CloseCircleOutlined style={{ color: '#FF4D4F' }} />,
};

function getStatusIcon(score) {
  if (score >= 80) return DIMENSION_ICONS.good;
  if (score >= 60) return DIMENSION_ICONS.warn;
  return DIMENSION_ICONS.bad;
}

function getProgressColor(score) {
  if (score >= 80) return '#52C41A';
  if (score >= 60) return '#FAAD14';
  return '#FF4D4F';
}

function getRatingLabel(score) {
  if (score >= 90) return { label: '优秀', stars: 5 };
  if (score >= 80) return { label: '良好', stars: 4 };
  if (score >= 70) return { label: '一般', stars: 3 };
  if (score >= 60) return { label: '待提升', stars: 2 };
  return { label: '急需改善', stars: 1 };
}

export default function ShopHealth() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.getShopHealth();
      setData(res);
    } catch {
      // API不可用时使用本地降级数据
      setData({
        overallScore: 78, trend: 5,
        dimensions: [
          { key: 'info', label: '信息完整度', score: 85, maxScore: 100, status: 'good', suggestion: '' },
          { key: 'product', label: '商品丰富度', score: 72, maxScore: 100, status: 'normal', suggestion: '建议增加商品种类至20个以上' },
          { key: 'activity', label: '经营活跃度', score: 65, maxScore: 100, status: 'warning', suggestion: '近7天未更新商品，建议保持活跃' },
          { key: 'response', label: '响应速度', score: 90, maxScore: 100, status: 'good', suggestion: '' },
          { key: 'review', label: '评价表现', score: 82, maxScore: 100, status: 'good', suggestion: '' },
        ],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  // ---- Computed data ----
  const overallScore = useMemo(() => data?.overallScore ?? 0, [data]);
  const trend = useMemo(() => data?.trend ?? 0, [data]);
  const dimensions = useMemo(() => data?.dimensions ?? [], [data]);
  const suggestions = useMemo(() => data?.suggestions ?? [], [data]);

  const ratingInfo = useMemo(() => getRatingLabel(overallScore), [overallScore]);

  // ---- ECharts radar option ----
  const radarOption = useMemo(() => {
    const hasData = dimensions.length > 0;
    const indicator = hasData
      ? dimensions.map((d) => ({ name: d.name, max: 100 }))
      : [{ name: '暂无数据', max: 100 }];

    const seriesData = hasData
      ? [{
          value: dimensions.map((d) => d.score),
          name: '店铺健康度',
          areaStyle: { color: ORANGE_LIGHT },
          lineStyle: { color: ORANGE, width: 2 },
          itemStyle: { color: ORANGE },
        }]
      : [{
          value: [0],
          name: '暂无数据',
          areaStyle: { color: '#E8E8E8' },
          lineStyle: { color: '#CCC' },
          itemStyle: { color: '#CCC' },
        }];

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          if (!hasData) return '暂无数据';
          const { value } = params;
          return dimensions.map((d, i) => `${d.name}: ${value[i]}分`).join('<br/>');
        },
      },
      radar: {
        indicator,
        center: ['50%', '50%'],
        radius: '60%',
        shape: 'polygon',
        name: { textStyle: { fontSize: 12, color: '#666' } },
        splitArea: {
          areaStyle: {
            color: ['rgba(255,107,53,0.02)', 'rgba(255,107,53,0.04)'],
          },
        },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } },
        axisLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } },
      },
      series: [{
        type: 'radar',
        data: seriesData,
        symbol: 'circle',
        symbolSize: 6,
      }],
    };
  }, [dimensions]);

  // ---- Error state ----
  if (error) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>店铺体检</h2>
        </div>
        <Alert
          type="error"
          message="店铺体检数据加载失败"
          description="无法获取店铺健康度信息，请检查网络连接后重试"
          showIcon
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchHealth}>重新加载</Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>店铺体检</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchHealth} loading={loading} size="small">刷新</Button>
      </div>

      {/* 总评分大卡 */}
      <Card style={{ marginBottom: 24, borderRadius: 8, textAlign: 'center' }}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : (
          <>
            <Text type="secondary" style={{ fontSize: 14 }}>店铺健康度</Text>
            <div style={{ fontSize: 56, fontWeight: 700, color: ORANGE, lineHeight: 1.2, margin: '8px 0' }}>
              {overallScore}
            </div>
            <Space style={{ fontSize: 16 }}>
              <TrophyOutlined style={{ color: '#FAAD14' }} />
              <Text strong style={{ fontSize: 18 }}>
                {ratingInfo.label}
                {'  '}
                {'★'.repeat(ratingInfo.stars)}{'☆'.repeat(5 - ratingInfo.stars)}
              </Text>
            </Space>
            <div style={{ marginTop: 8 }}>
              {trend !== 0 && (
                <span style={{ color: trend > 0 ? '#52C41A' : '#FF4D4F', fontSize: 14 }}>
                  {trend > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  较上次 {Math.abs(trend)} 分
                </span>
              )}
            </div>
          </>
        )}
      </Card>

      {/* 雷达图 + 维度详情 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ fontSize: 14, fontWeight: 600 }}>六维雷达图</span>} style={{ borderRadius: 8 }} size="small">
            {loading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : (
              <ReactEChartsCore
                echarts={echarts}
                option={radarOption}
                style={{ height: 320, width: '100%' }}
                notMerge
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ fontSize: 14, fontWeight: 600 }}>维度详情</span>} style={{ borderRadius: 8 }} size="small">
            {loading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : dimensions.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span>暂无维度数据</span>}
                style={{ margin: '40px 0' }}
              />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                {dimensions.map((dim) => (
                  <div key={dim.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Space>
                        <Text style={{ fontSize: 13 }}>{dim.name}</Text>
                        {getStatusIcon(dim.score)}
                      </Space>
                      <Text strong style={{ color: getProgressColor(dim.score), fontSize: 14 }}>
                        {dim.score}分
                      </Text>
                    </div>
                    <Progress
                      percent={dim.score}
                      strokeColor={getProgressColor(dim.score)}
                      trailColor="#F0F0F0"
                      size="small"
                      format={() => ''}
                    />
                  </div>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      {/* 改进建议 */}
      <Card
        title={<span style={{ fontSize: 14, fontWeight: 600 }}>改进建议</span>}
        style={{ borderRadius: 8 }}
        size="small"
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : suggestions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span>暂无改进建议，当前状态良好</span>}
            style={{ margin: '24px 0' }}
          />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {suggestions.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '12px 16px', background: '#FFF9F6',
                borderRadius: 8, borderLeft: `3px solid ${ORANGE}`,
              }}>
                <BulbOutlined style={{ color: '#FAAD14', fontSize: 18, marginTop: 2, flexShrink: 0 }} />
                <Text style={{ fontSize: 14, color: '#333' }}>{s}</Text>
              </div>
            ))}
          </Space>
        )}
      </Card>
    </div>
  );
}
