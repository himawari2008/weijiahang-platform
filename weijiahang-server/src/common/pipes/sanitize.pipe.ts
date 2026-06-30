import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * XSS 净化管道 — 剥离输入中的 HTML 标签和危险字符
 *
 * 安全策略：
 * - 移除所有 HTML 标签（<script>、<img onerror> 等）
 * - 编码 HTML 特殊字符（< > & " '）
 * - 递归处理嵌套对象和数组
 *
 * 注意：此管道应用于全局，自动净化所有用户输入
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  /** 匹配 HTML 标签的正则 */
  private static readonly HTML_TAG_RE = /<[^>]*>/g;

  /** HTML 特殊字符映射 */
  private static readonly CHAR_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };

  /** 匹配需要编码的特殊字符 */
  private static readonly SPECIAL_CHARS_RE = /[&<>"']/g;

  transform(value: any, metadata: ArgumentMetadata) {
    // 只处理 body/query/param 中的字符串
    if (typeof value === 'string') {
      return this.sanitize(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.transform(item, metadata));
    }

    if (value !== null && typeof value === 'object') {
      const sanitized: Record<string, any> = {};
      for (const key of Object.keys(value)) {
        sanitized[key] = this.transform(value[key], metadata);
      }
      return sanitized;
    }

    // 数字、布尔、null、undefined 直接放行
    return value;
  }

  /**
   * 净化单个字符串：
   * 1. 移除所有 HTML 标签
   * 2. 编码 HTML 特殊字符
   */
  private sanitize(input: string): string {
    if (!input || typeof input !== 'string') return input;

    // 1. 剥离 HTML 标签
    let cleaned = input.replace(SanitizePipe.HTML_TAG_RE, '');

    // 2. 编码剩余的特殊字符（防止属性注入）
    cleaned = cleaned.replace(SanitizePipe.SPECIAL_CHARS_RE, (char) =>
      SanitizePipe.CHAR_MAP[char] || char,
    );

    return cleaned;
  }
}
