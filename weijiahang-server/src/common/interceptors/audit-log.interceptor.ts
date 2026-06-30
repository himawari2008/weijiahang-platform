import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';

/** 需要记录审计日志的 HTTP 方法（状态变更操作） */
const AUDIT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/** 敏感字段 — 其值在日志中会被脱敏 */
const SENSITIVE_FIELDS = [
  'password', 'secret', 'token', 'accessToken',
  'refreshToken', 'code', 'openid', 'unionid',
];

/**
 * 审计日志拦截器
 * 自动拦截所有写操作（POST/PUT/PATCH/DELETE），记录操作人和操作内容
 *
 * 脱敏策略：对 password、token、openid 等字段的值替换为 ***
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // 只记录写操作
    if (!AUDIT_METHODS.includes(method)) {
      return next.handle();
    }

    const startTime = Date.now();
    const path = request.url?.split('?')[0] || request.route?.path || '';
    const body = this.sanitizeBody(request.body);

    // 从 JWT 中提取操作人信息
    const user = (request as any).user;
    const operatorId = user?.userId || user?.sub;
    const operatorType = this.inferOperatorType(path);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.auditLogService.log({
          action: this.inferAction(method, path),
          entity: this.inferEntity(path),
          operatorId,
          operatorType,
          method,
          path,
          ip: this.getClientIp(request),
          requestBody: JSON.stringify(body),
          statusCode: 200,
          result: 'success',
          duration,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.auditLogService.log({
          action: this.inferAction(method, path),
          entity: this.inferEntity(path),
          operatorId,
          operatorType,
          method,
          path,
          ip: this.getClientIp(request),
          requestBody: JSON.stringify(body),
          statusCode: error?.status || 500,
          result: 'failure',
          errorMessage: error?.message || '未知错误',
          duration,
        });
        throw error; // 重新抛出，由异常过滤器处理
      }),
    );
  }

  /** 推导航作类型 */
  private inferAction(method: string, path: string): string {
    switch (method) {
      case 'POST': return path.includes('login') ? 'LOGIN' : 'CREATE';
      case 'PUT':
      case 'PATCH': return (path.includes('status') || path.includes('pause') || path.includes('resume')) ? 'STATUS_CHANGE' : 'UPDATE';
      case 'DELETE': return 'DELETE';
      default: return 'UNKNOWN';
    }
  }

  /** 从路径推断操作实体 */
  private inferEntity(path: string): string {
    const match = path.match(/\/api\/v1\/([a-z-]+)/);
    return match ? match[1] : 'unknown';
  }

  /** 推断操作人类型 */
  private inferOperatorType(path: string): string {
    if (path.includes('/admin')) return 'admin';
    if (path.includes('/navigator')) return 'navigator';
    if (path.includes('/shop') || path.includes('/ads') || path.includes('/products')) return 'shop';
    return 'user';
  }

  /** 脱敏请求体 */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = Array.isArray(body) ? [...body] : { ...body };
    for (const key of Object.keys(sanitized)) {
      if (SENSITIVE_FIELDS.includes(key)) {
        sanitized[key] = '***';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeBody(sanitized[key]);
      }
    }
    return sanitized;
  }

  /** 获取客户端真实IP */
  private getClientIp(request: Request): string {
    return (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || (request.headers['x-real-ip'] as string)
      || request.ip
      || request.socket?.remoteAddress
      || 'unknown';
  }
}
