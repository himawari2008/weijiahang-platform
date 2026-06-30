import React from 'react';

/**
 * 为家航 Logo — 与客户端（小程序启动页）完全一致
 * 设计：橙红渐变圆角方底 → 白色房子 → 白色指南针圆环
 *
 * 使用方式：
 *   <Logo size={48} />          // 纯图标
 *   <Logo showText size={48} /> // 图标 + "为家航" 文字
 *   <Logo variant="light" />    // 深色背景 → 文字白色
 */

export default function Logo({ size = 48, showText = false, variant = 'dark', style }) {
  const textColor = variant === 'light' ? '#FFFFFF' : '#1A365D';
  const fontSize = Math.round(size * 0.38);

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: showText ? Math.round(size * 0.22) : 0,
      ...style,
    }}>
      {/* Logo 图标 — 与 icon-house-base.svg + icon-compass-ring.svg 合并 */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 1024 1024"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="wjh-bg-grad" x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="#FF8C5A" />
            <stop offset="35%" stopColor="#FF6B35" />
            <stop offset="100%" stopColor="#D94E20" />
          </linearGradient>
          <radialGradient id="wjh-glow" cx="0.35" cy="0.25" r="0.6">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 圆角方形底 */}
        <rect width="1024" height="1024" rx="230" fill="url(#wjh-bg-grad)" />
        <rect width="1024" height="1024" rx="230" fill="url(#wjh-glow)" />

        {/* ═══ 指南针外圈 ═══ */}
        <circle cx="512" cy="520" r="260" fill="none" stroke="#FFFFFF" strokeWidth="20" opacity="0.85" />
        <circle cx="512" cy="520" r="238" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.18" />
        {/* 东西轴线 */}
        <line x1="240" y1="520" x2="784" y2="520" stroke="#FFFFFF" strokeWidth="3" opacity="0.15" />
        {/* 北刻度 */}
        <rect x="502" y="248" width="20" height="24" rx="6" fill="#FFFFFF" />
        {/* 南刻度 */}
        <rect x="502" y="768" width="20" height="24" rx="6" fill="#FFFFFF" opacity="0.55" />
        {/* 东刻度 */}
        <rect x="744" y="510" width="24" height="20" rx="6" fill="#FFFFFF" opacity="0.45" />
        {/* 西刻度 */}
        <rect x="256" y="510" width="24" height="20" rx="6" fill="#FFFFFF" opacity="0.45" />
        {/* 南指针 */}
        <polygon points="512,540 480,730 544,730" fill="#FFFFFF" opacity="0.45" />

        {/* ═══ 房子（居中） ═══ */}
        {/* 屋顶 */}
        <polygon points="512,160 395,440 629,440" fill="#FFFFFF" />
        {/* 房身 */}
        <rect x="410" y="440" width="204" height="140" rx="12" fill="#FFFFFF" />
        {/* 门（品牌橙） */}
        <rect x="486" y="490" width="52" height="90" rx="26" fill="#FF6B35" />
        {/* 中心圆点 */}
        <circle cx="512" cy="540" r="18" fill="#FFFFFF" />
      </svg>

      {/* 品牌文字 */}
      {showText && (
        <span style={{
          fontSize,
          fontWeight: 700,
          color: textColor,
          letterSpacing: 1,
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}>
          为家航
        </span>
      )}
    </div>
  );
}
