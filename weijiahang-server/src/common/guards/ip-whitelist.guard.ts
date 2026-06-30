import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * 管理员 IP 白名单守卫
 *
 * 用法：
 *   @UseGuards(IpWhitelistGuard)
 *   @Controller('admin')
 *   export class AdminController {}
 *
 * 环境变量：
 *   ADMIN_IP_WHITELIST=127.0.0.1,10.0.0.1,192.168.1.0/24
 */
@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly logger = new Logger(IpWhitelistGuard.name);
  private whitelist: string[];

  constructor(private readonly reflector?: Reflector) {
    this.loadWhitelist();
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);

    if (!clientIp) {
      this.logger.warn('无法获取客户端 IP');
      return false;
    }

    // 从最新环境变量重新加载（支持运行时更新）
    this.loadWhitelist();

    // 本地回环永远放行
    if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
      return true;
    }

    const allowed = this.isAllowed(clientIp);
    if (!allowed) {
      this.logger.warn(`拒绝未授权 IP 访问管理接口: ${clientIp}`);
    }
    return allowed;
  }

  private loadWhitelist(): void {
    const raw = process.env.ADMIN_IP_WHITELIST || '127.0.0.1,::1';
    this.whitelist = raw.split(',').map(s => s.trim()).filter(Boolean);
  }

  /**
   * 检查 IP 是否在白名单中
   * 支持完整 IP 和 CIDR 子网
   */
  private isAllowed(ip: string): boolean {
    for (const entry of this.whitelist) {
      if (entry.includes('/')) {
        // CIDR 子网匹配
        if (this.ipInCidr(ip, entry)) return true;
      } else {
        // 精确匹配
        if (ip === entry) return true;
      }
    }
    return false;
  }

  /** 从请求中提取客户端真实 IP（考虑代理） */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    const realIp = req.headers['x-real-ip'] as string;
    if (realIp) return realIp;
    return req.ip || req.socket?.remoteAddress || '';
  }

  /** 简单 CIDR 子网匹配（IPv4） */
  private ipInCidr(ip: string, cidr: string): boolean {
    try {
      const [subnet, bits] = cidr.split('/');
      const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1) >>> 0;
      const ipNum = this.ipToNum(ip);
      const subnetNum = this.ipToNum(subnet);
      return (ipNum & mask) === (subnetNum & mask);
    } catch {
      return false;
    }
  }

  private ipToNum(ip: string): number {
    const parts = ip.split('.');
    return ((+parts[0] << 24) >>> 0) + (+parts[1] << 16) + (+parts[2] << 8) + (+parts[3]);
  }
}
