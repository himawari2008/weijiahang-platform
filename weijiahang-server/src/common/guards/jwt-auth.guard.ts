import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT认证守卫 — 全局守卫，自动拦截所有非 @Public() 标记的接口
 *
 * 行为：
 * - 有 @Public() 装饰器 → 跳过认证，直接放行
 * - 无 @Public() 装饰器 → 执行 JWT 验证，失败则返回 401
 *
 * 注册为全局 APP_GUARD 后，无需在每个控制器手动添加 @UseGuards
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 检查是否标记为公开路由
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 非公开路由：执行 JWT 验证
    return super.canActivate(context);
  }

  /**
   * 自定义 401 错误响应，统一格式
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('请先登录');
    }
    return user;
  }
}

/**
 * 可选认证守卫 — 登录或未登录均可访问，但尝试解析token
 * 用于"登录后展示更多"的场景（如个性化推荐）
 */
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    // 解析失败不报错，user 为 null
    return user || null;
  }
}
