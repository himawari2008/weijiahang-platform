import { createLogger, format, transports, Logger } from 'winston';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Winston 日志系统
 * 输出通道：
 * - 控制台（彩色，开发友好）
 * - 文件：logs/error.log（仅错误）
 * - 文件：logs/combined.log（全部日志）
 * - 文件：logs/audit.log（审计专用，仅 audit 标签）
 */

const logDir = path.resolve(process.cwd(), 'logs');

// 确保日志目录存在
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/** 日志格式 — 带时间戳和颜色 */
const consoleFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.colorize(),
  format.printf(({ timestamp, level, message, context, ...meta }) => {
    const ctx = context ? `[${context}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${ctx} ${message}${metaStr}`;
  }),
);

const fileFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.json(),
);

/** Winston 日志实例 */
export const winstonLogger: Logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // 控制台输出（开发环境彩色）
    new transports.Console({
      format: consoleFormat,
    }),
    // 错误日志文件
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      format: fileFormat,
    }),
    // 全量日志文件
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      format: fileFormat,
    }),
    // 审计专用日志文件
    new transports.File({
      filename: path.join(logDir, 'audit.log'),
      level: 'info',
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 20,
      format: fileFormat,
    }),
  ],
});

/**
 * 记录审计日志（同时写入数据库和文件）
 * @param data - 审计日志数据
 */
export function logAudit(data: {
  action: string;
  entity: string;
  entityId?: string;
  operatorId?: string;
  operatorType?: string;
  method: string;
  path: string;
  ip?: string;
  requestBody?: string;
  statusCode: number;
  result: 'success' | 'failure';
  errorMessage?: string;
  duration?: number;
}) {
  winstonLogger.info('audit', {
    label: 'audit',
    ...data,
    timestamp: new Date().toISOString(),
  });
}

export default winstonLogger;
