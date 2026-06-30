import React from 'react';
import { Button, Space, Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

/**
 * 页面头部组件 — 统一页面标题 + 面包屑 + 操作区
 * @param {string} title 页面标题
 * @param {Array} breadcrumb 面包屑 [{label, path?}]
 * @param {React.ReactNode} extra 右侧操作区
 * @param {boolean} showHome 是否显示首页面包屑
 */
export default function PageHeader({ title, breadcrumb, extra, showHome = true }) {
  const nav = useNavigate();
  const items = [];
  if (showHome) items.push({ title: <><HomeOutlined style={{ marginRight: 4 }} />运营后台</>, onClick: () => nav('/') });
  if (breadcrumb) {
    breadcrumb.forEach((b, i) => {
      items.push({
        title: b.path ? <a onClick={() => nav(b.path)}>{b.label}</a> : b.label,
      });
    });
  }
  items.push({ title: title });

  return (
    <div className="page-header">
      <div>
        {items.length > 1 && (
          <Breadcrumb items={items} style={{ marginBottom: 4 }} />
        )}
        <h2>{title}</h2>
      </div>
      {extra && <Space wrap>{extra}</Space>}
    </div>
  );
}
