import React from 'react';
import { Card, Skeleton, Empty, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

/**
 * 通用图表容器组件
 * 封装图表加载态、错误态、空态的展示
 *
 * @param {object} props
 * @param {string} props.title - 图表标题
 * @param {ReactNode} [props.extra] - 标题右侧额外内容
 * @param {boolean} [props.loading=false] - 加载态
 * @param {boolean} [props.error=false] - 错误态
 * @param {boolean} [props.isEmpty=false] - 空态
 * @param {function} [props.onRetry] - 重试回调
 * @param {string} [props.emptyText='暂无数据'] - 空态文字
 * @param {number} [props.height=300] - 图表区高度
 * @param {ReactNode} props.children - 图表内容
 * @param {object} [props.style] - 额外样式
 */
export default function ChartBox({
  title,
  extra,
  loading = false,
  error = false,
  isEmpty = false,
  onRetry,
  emptyText = '暂无数据',
  height = 300,
  children,
  style,
}) {
  const renderContent = () => {
    if (loading) return <Skeleton active paragraph={{ rows: 6 }} />;
    if (error) return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: '#999', marginBottom: 12 }}>数据加载失败</p>
        {onRetry && (
          <Button icon={<ReloadOutlined />} onClick={onRetry}>重试</Button>
        )}
      </div>
    );
    if (isEmpty) return <Empty description={emptyText} style={{ padding: 40 }} />;
    return <div style={{ height }}>{children}</div>;
  };

  return (
    <Card
      title={<span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>}
      extra={extra}
      style={{
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        marginBottom: 16,
        ...style,
      }}
    >
      {renderContent()}
    </Card>
  );
}
