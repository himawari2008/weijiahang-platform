import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'dev-secret'),
    });
  }

  /**
   * JWT 验证回调
   * 1. 验证 token 签名和有效期（passport-jwt 自动完成）
   * 2. 检查 tokenVersion 是否匹配（防强制登出后旧token复用）
   */
  async validate(payload: { sub: string; openid: string; tv?: number; role?: string; username?: string }) {
    // 检查 tokenVersion（如果 payload 中包含）
    if (payload.tv !== undefined) {
      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
        select: ['id', 'tokenVersion', 'status'],
      });

      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      if (user.status !== 1) {
        throw new UnauthorizedException('账号已被禁用');
      }

      if (user.tokenVersion !== payload.tv) {
        throw new UnauthorizedException('Token已失效，请重新登录');
      }
    }

    return { userId: payload.sub, openid: payload.openid, role: payload.role || 'customer' };
  }
}
