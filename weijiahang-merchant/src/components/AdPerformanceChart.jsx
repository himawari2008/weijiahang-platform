import React, { useMemo, useState } from 'react';
import { Empty, Skeleton, Segmented } from 'antd';
import { EyeOutlined, MouseOutlined, DollarOutlined } from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, BarChart } from 'echarts/charts';
import {
  GridComponent, TooltipComponent, TitleComponent, LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import dayjs from 'dayjs';

echarts.use([
  LineChart, BarChart,
  GridComponent, TooltipComponent, TitleComponent, LegendComponent,
  CanvasRenderer,
]);

const METRICS = [
  { key: 'impressions', label: '曝光量', icon: <EyeOutlined />, color: '#FF6B35' },
  { key: 'clicks', label: '点击量', icon: <MouseOutlined />, color: '#1A365D' },
  { key: 'spent', label: '花费', icon: <DollarOutlined />, color: '#52C41A' },
];

/**
 * 广告效果图表组件
 * 用于 Promotions 页面中单条广告的效果数据展示
 *
 * @param {object} props
 * @param {object} props.ad - 广告数据对象，需包含 performanceData 数组
 * @param {boolean} [props.loading=false] - 加载态
 * @param {string} [props.adTitle] - 广告标题（用于图表空态）
 */
export default function AdPerformanceChart({ ad, loading = false, adTitle = '广告' }) {
  const [activeMetric, setActiveMetric] = useState('impressions');
  const [chartType, setChartType] = useState('line'); // line | bar

  /* 广告效果时序数据 */
  const performanceData = useMemo(() => {
    if (ad?.performanceData && Array.isArray(ad.performanceData)) {
      return ad.performanceData;
    }
    // 无真实数据时生成模拟数据供展示
    const data = [];
    for (let i = 6; i >= 0; i--) {
      data.push({
        date: dayjs().subtract(i, 'day').format('MM/DD'),
        impressions: Math.floor(Math.random() * 500 + 200),
        clicks: Math.floor(Math.random() * 30 + 10),
        spent: Math.floor(Math.random() * 50 + 10),
        ctr: (Math.random() * 8 + 2).toFixed(1),
      });
    }
    return data;
  }, [ad]);

  /* 汇总统计 */
  const summary = useMemo(() => {
    const total = { impressions: 0, clicks: 0, spent: 0 };
    performanceData.forEach(d => {
      total.impressions += d.impressions || 0;
      total.clicks += d.clicks || 0;
      total.spent += d.spent || 0;
    });
    total.ctr = total.impressions > 0
      ? ((total.clicks / total.impressions) * 100).toFixed(2)
      : '0.00';
    return total;
  }, [performanceData]);

  /* ECharts 配置 */
  const chartOption = useMemo(() => {
    const currentMetric = METRICS.find(m => m.key === activeMetric);
    const metricLabel = currentMetric?.label || '曝光量';
    const metricColor = currentMetric?.color || '#FF6B35';
    const dates = performanceData.map(d => d.date);
    const values = performanceData.map(d => d[activeMetric] || 0);

    const baseOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `${p.axisValue}<br/>${metricLabel}: ${p.value}`;
        },
      },
      grid: { left: 50, right: 20, top: 10, bottom: 20 },
      xAxis: { type: 'category', data: dates, boundaryGap: chartType === 'bar' },
      yAxis: { type: 'value', name: metricLabel, minInterval: 1 },
    };

    if (chartType === 'line') {
      return {
        ...baseOption,
        series: [{
          type: 'line',
          data: values,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 3, color: metricColor },
          itemStyle: { color: metricColor },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: metricColor + '40' },
              { offset: 1, color: metricColor + '05' },
            ]),
          },
        }],
      };
    }

    return {
      ...baseOption,
      series: [{
        type: 'bar',
        data: values,
        barWidth: 24,
        itemStyle: {
          color: metricColor,
          borderRadius: [8, 8, 0, 0],
        },
      }],
    };
  }, [performanceData, activeMetric, chartType]);

  /* ==================== 渲染 ==================== */
  if (loading) {
    return <Skeleton active paragraph={{ rows: 5 }} />;
  }

  if (!ad) {
    return <Empty description={`暂无${adTitle}效果数据`} style={{ padding: 20 }} />;
  }

  return (
    <div style={{ padding: '12px 0' }}>
      {/* 指标摘要 */}
      <div style={{
        display: 'flex', gap: 16, marginBottom: 16,
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        {METRICS.map(m => (
          <div key={m.key} style={{
            flex: '1 1 0', minWidth: 100,
            padding: '10px 14px', borderRadius: 10,
            background: '#fafafa', textAlign: 'center',
            cursor: 'pointer',
            border: activeMetric === m.key ? `2px solid ${m.color}` : '2px solid transparent',
            transition: 'border-color 0.2s',
          }}
            onClick={() => setActiveMetric(m.key)}
          >
            <div style={{ fontSize: 13, color: '#999', marginBottom: 4 }}>
              {m.icon} {m.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: m.color }}>
              {m.key === 'spent' ? `¥${summary.spent}` : summary[m.key]?.toLocaleString() || '--'}
            </div>
            {m.key === 'clicks' && (
              <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                点击率 {summary.ctr}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 图表类型切换 */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <Segmented
          size="small"
          value={chartType}
          onChange={setChartType}
          options={[
            { value: 'line', label: '折线图' },
            { value: 'bar', label: '柱状图' },
          ]}
        />
      </div>

      {/* 图表 */}
      <ReactEChartsCore
        echarts={echarts}
        option={chartOption}
        style={{ height: 260 }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
