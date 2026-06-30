import React from 'react';
import { Empty, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

/**
 * 空态/错误态占位组件
 * @param {string} type 'empty' | 'error'
 * @param {string} description 描述文案
 * @param {function} onRetry 重试回调
 * @param {React.ReactNode} extra 额外操作
 */
export default function EmptyState({ type = 'empty', description, onRetry, extra }) {
  if (type === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Empty description={description || '数据加载失败，请重试'}>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {onRetry && (
              <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}
                style={{ background: '#FF6B35', borderColor: '#FF6B35' }}>
                重新加载
              </Button>
            )}
            {extra}
          </div>
        </Empty>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <Empty description={description || '暂无数据'}>
        {extra}
      </Empty>
    </div>
  );
}
