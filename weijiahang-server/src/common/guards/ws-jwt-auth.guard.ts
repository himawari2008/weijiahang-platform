import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

/**
 * WebSocket JWT 认证守卫
 *
 * 在 handleConnection 中调用，验证连接时传入的 token
 *
 * 用法：
 *   const token = client.handshake.query.token as string;
 *   const payload = this.wsAuthGuard.validateToken(token);
 *
 * 连接时附带 token：
 *   ws://host:3000/orders?type=navigator&id=xxx&token=jwt_token_here
 */
@Injectable()
export class WsJwtAuthGuard {
  private readonly logger = new Logger(WsJwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 验证 WebSocket 连接的 JWT token
   * @param token - 从 handshake.query.token 提取的 JWT
   * @returns 解码后的 payload { sub, openid }
   * @throws WsException 如果 token 无效
   */
  validateToken(token: string | undefined): { sub: string; openid: string } {
    if (!token) {
      this.logger.warn('WebSocket 连接缺少 token');
      throw new WsException('认证失败：缺少 token');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET', 'dev-secret');
      const payload = this.jwtService.verify(token, { secret });
      return { sub: payload.sub, openid: payload.openid };
    } catch (err: any) {
      this.logger.warn(`WebSocket token 验证失败: ${err.message}`);
      throw new WsException('认证失败：token 无效或已过期');
    }
  }
}
