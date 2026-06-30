import React from 'react';
import { Skeleton } from 'antd';

/**
 * 统计卡片组件 — 统一的指标展示卡片
 * @param {string} title 指标名称
 * @param {string|number} value 数值
 * @param {React.ReactNode} icon 图标
 * @param {string} color 数值颜色
 * @param {boolean} loading 加载态
 * @param {function} formatter 数值格式化函数
 * @param {string} suffix 后缀文字
 * @param {function} onClick 点击回调
 */
export default function StatCard({ title, value, icon, color = '#FF6B35', loading, formatter, suffix, onClick }) {
  const displayValue = formatter ? formatter(value) : value;

  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <Skeleton loading={loading} active paragraph={{ rows: 1 }}>
        {icon && <span className="stat-icon" style={{ color }}>{icon}</span>}
        <div className="stat-value" style={{ color }}>
          {displayValue ?? '--'}
          {suffix && <small style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>{suffix}</small>}
        </div>
        <div className="stat-label">{title}</div>
      </Skeleton>
    </div>
  );
}
