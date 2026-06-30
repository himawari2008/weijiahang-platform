import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser } from '../../database/entities/admin-user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 角色守卫 — 验证当前登录用户是否拥有指定角色
 * 需要先通过 JwtAuthGuard（确保 request.user 存在）
 * 使用方式: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin')
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(AdminUser)
    private readonly adminUserRepo: Repository<AdminUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // @Public() 标记的端点无需角色验证
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 没有标记角色 => 允许通过（由 JwtAuthGuard 兜底认证）
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('未登录');
    }

    // JWT payload中的role优先匹配（无需查库）
    if (user.role && requiredRoles.includes(user.role)) {
      return true;
    }

    // 回退：从AdminUser表查找（兼容旧token不含role的场景）
    const admin = await this.adminUserRepo.findOne({
      where: { id: user.userId, status: 1 },
    });

    if (!admin) {
      throw new ForbiddenException('无管理员权限');
    }

    const hasRole = requiredRoles.some((role) => admin.role === role);
    if (!hasRole) {
      throw new ForbiddenException(`需要 ${requiredRoles.join(' 或 ')} 角色权限`);
    }

    request.admin = admin;
    return true;
  }
}
