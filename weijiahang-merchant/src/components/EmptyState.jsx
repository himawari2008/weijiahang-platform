import React from 'react';
import { Empty, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

/**
 * 通用空态引导组件
 * 用于列表/表格为空时的展示 + 引导操作
 *
 * @param {object} props
 * @param {string} [props.title='暂无数据'] - 主标题
 * @param {string} [props.description] - 描述文字
 * @param {string} [props.actionLabel] - 操作按钮文字
 * @param {function} [props.onAction] - 操作回调
 * @param {ReactNode} [props.icon] - 自定义图标
 */
export default function EmptyState({
  title = '暂无数据',
  description,
  actionLabel,
  onAction,
  icon,
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      background: '#fff',
      borderRadius: 12,
    }}>
      <Empty
        image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 4 }}>
              {title}
            </div>
            {description && (
              <div style={{ fontSize: 14, color: '#999' }}>{description}</div>
            )}
          </div>
        }
      >
        {actionLabel && onAction && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onAction}
            style={{ background: '#FF6B35', borderColor: '#FF6B35' }}>
            {actionLabel}
          </Button>
        )}
      </Empty>
    </div>
  );
}
