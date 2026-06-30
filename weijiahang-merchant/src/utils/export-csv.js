// ============================================
// CSV 导出工具 — 统一 Blob 下载逻辑
// 所有页面的 CSV 导出统一使用此模块
// ============================================
import dayjs from 'dayjs';

/**
 * 导出 CSV 文件
 * @param {string} filename - 文件名（不含扩展名，自动追加日期）
 * @param {string[]} columns - 列头数组
 * @param {string[][]} rows - 数据行二维数组
 * @param {{ bom?: boolean }} [opts] - 选项
 */
export function exportCSV(filename, columns, rows, opts = {}) {
  const { bom = true } = opts;

  // BOM 确保 Excel 正确识别中文编码
  const BOM = bom ? '﻿' : '';
  const header = columns.join(',') + '\n';
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          // 包含逗号/引号/换行的字段需要引号包裹
          const str = String(cell ?? '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob([BOM + header + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${dayjs().format('YYYY-MM-DD')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 下载 Blob（用于 API 返回的 blob 数据）
 * @param {Blob} blob - 二进制数据
 * @param {string} filename - 文件名
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
