import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * CSRF 保护中间件
 *
 * 对所有 POST/PUT/DELETE 请求验证 CSRF token
 * - GET/HEAD/OPTIONS 请求跳过
 * - 公开端点（auth 相关）跳过
 * - 从 X-CSRF-Token 请求头读取 token
 * - Token 通过 GET /auth/csrf-token 获取
 * - 使用 HMAC-SHA256 防篡改
 *
 * 密钥来源（优先级）：
 * 1. 环境变量 CSRF_SECRET（生产必须设置）
 * 2. 启动时随机生成（开发环境，每次重启后旧 token 失效）
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);

  /** 跳过 CSRF 检查的路径前缀 */
  private readonly skipPaths = [
    '/api/v1/auth/wx-login',
    '/api/v1/auth/refresh',
    '/api/v1/auth/merchant-login',
    '/api/v1/auth/csrf-token',
    '/api/v1/admin/login',
    '/api/docs',
  ];

  /** 安全方法，不修改服务端状态 */
  private readonly safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  /** CSRF 签名密钥 — 静态共享，供 controller 调用 generateToken() */
  private static _secret: string;

  private get secret(): string {
    return CsrfMiddleware._secret;
  }

  constructor() {
    // 仅在首次构造时初始化（中间件由 NestJS 管理，通常只构造一次）
    if (!CsrfMiddleware._secret) {
      if (process.env.CSRF_SECRET) {
        CsrfMiddleware._secret = process.env.CSRF_SECRET;
      } else {
        // 开发环境：自动生成随机密钥。每次重启后旧 token 失效。
        CsrfMiddleware._secret = crypto.randomBytes(32).toString('hex');
        this.logger.warn(
          '⚠️ 未设置 CSRF_SECRET 环境变量，已自动生成临时密钥。\n' +
          '   生产环境请务必在 .env 中设置 CSRF_SECRET 为固定随机字符串。',
        );
      }
    }
  }

  use(req: Request, res: Response, next: NextFunction) {
    // 安全方法跳过
    if (this.safeMethods.includes(req.method)) {
      return next();
    }

    // 公开端点跳过
    const path = req.originalUrl || req.url;
    for (const skip of this.skipPaths) {
      if (path.startsWith(skip)) {
        return next();
      }
    }

    // 验证 CSRF token
    const token = req.headers['x-csrf-token'] as string;
    if (!token) {
      throw new HttpException(
        { code: 403, message: '缺少 CSRF 验证令牌', timestamp: new Date().toISOString() },
        HttpStatus.FORBIDDEN,
      );
    }

    if (!this.verifyToken(token)) {
      throw new HttpException(
        { code: 403, message: 'CSRF 验证令牌无效', timestamp: new Date().toISOString() },
        HttpStatus.FORBIDDEN,
      );
    }

    next();
  }

  /**
   * 生成 CSRF token（静态方法，供 controller 调用）
   * 格式：timestamp.signature
   */
  static generateToken(): string {
    const ts = Date.now().toString(36);
    const sig = crypto
      .createHmac('sha256', CsrfMiddleware._secret)
      .update(ts)
      .digest('hex')
      .slice(0, 16);
    return `${ts}.${sig}`;
  }

  /**
   * 验证 CSRF token
   * token 有效期 24 小时
   */
  private verifyToken(token: string): boolean {
    try {
      const [ts, sig] = token.split('.');
      if (!ts || !sig) return false;

      // 检查过期（24小时）
      const timestamp = parseInt(ts, 36);
      const age = Date.now() - timestamp;
      if (age < 0 || age > 24 * 60 * 60 * 1000) {
        return false;
      }

      // 验证签名
      const expected = crypto
        .createHmac('sha256', this.secret)
        .update(ts)
        .digest('hex')
        .slice(0, 16);

      return crypto.timingSafeEqual(
        Buffer.from(sig),
        Buffer.from(expected),
      );
    } catch {
      return false;
    }
  }
}
