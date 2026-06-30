import React from 'react';
import { Space, Typography, Button, Breadcrumb } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * 通用页面标题栏组件
 * 提供统一的面包屑 + 标题 + 操作按钮布局
 *
 * @param {object} props
 * @param {string} props.title - 页面标题
 * @param {string} [props.subtitle] - 副标题/描述
 * @param {Array<{title:string, path?:string}>} [props.breadcrumb] - 面包屑
 * @param {Array<ReactNode>} [props.actions] - 操作按钮
 * @param {function} [props.onRefresh] - 刷新回调
 * @param {boolean} [props.refreshing=false] - 刷新中
 */
export default function PageHeader({
  title,
  subtitle,
  breadcrumb,
  actions = [],
  onRefresh,
  refreshing = false,
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumb
          items={breadcrumb.map((b) => ({ ...b }))}
          style={{ marginBottom: 8 }}
        />
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
            {title}
          </Title>
          {subtitle && (
            <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
              {subtitle}
            </Text>
          )}
        </div>

        <Space>
          {onRefresh && (
            <Button
              icon={<ReloadOutlined spin={refreshing} />}
              onClick={onRefresh}
              loading={refreshing}
            >
              刷新
            </Button>
          )}
          {actions}
        </Space>
      </div>
    </div>
  );
}
