import React from 'react';
import { Card, Statistic, Space, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * 通用统计卡片组件
 * 用于 Dashboard / Finance / Customers 等页面的统计卡片
 *
 * @param {object} props
 * @param {string} props.title - 标题
 * @param {number|string} props.value - 数值
 * @param {string} [props.prefix] - 前缀（如 ¥）
 * @param {string} [props.suffix] - 后缀
 * @param {number} [props.precision=0] - 小数位数
 * @param {ReactNode} [props.icon] - 图标
 * @param {string} [props.color] - 主题色
 * @param {number} [props.trend] - 趋势值（正数上升，负数下降）
 * @param {string} [props.trendLabel] - 趋势标签文字
 * @param {boolean} [props.loading=false] - 加载态
 * @param {object} [props.style] - 额外样式
 */
export default function StatCard({
  title,
  value = 0,
  prefix = '',
  suffix = '',
  precision = 0,
  icon,
  color = '#FF6B35',
  trend,
  trendLabel = '较昨日',
  loading = false,
  style,
}) {
  const trendUp = trend > 0;
  const trendFlat = trend === 0;
  const trendColor = trendUp ? '#52C41A' : trendFlat ? '#999' : '#FF4D4F';

  return (
    <Card
      loading={loading}
      style={{
        borderRadius: 12,
        borderTop: `4px solid ${color}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        ...style,
      }}
    >
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space>
          {icon && <span style={{ color, fontSize: 20 }}>{icon}</span>}
          <Text type="secondary" style={{ fontSize: 14 }}>{title}</Text>
        </Space>

        <Statistic
          value={value}
          prefix={prefix}
          suffix={suffix}
          precision={precision}
          valueStyle={{ color, fontWeight: 700, fontSize: 28 }}
        />

        {trend !== undefined && trend !== null && (
          <Space size={4}>
            {trendFlat ? (
              <MinusOutlined style={{ color: trendColor, fontSize: 12 }} />
            ) : trendUp ? (
              <ArrowUpOutlined style={{ color: trendColor, fontSize: 12 }} />
            ) : (
              <ArrowDownOutlined style={{ color: trendColor, fontSize: 12 }} />
            )}
            <Text style={{ color: trendColor, fontSize: 13, fontWeight: 600 }}>
              {Math.abs(trend)}%
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{trendLabel}</Text>
          </Space>
        )}
      </Space>
    </Card>
  );
}
