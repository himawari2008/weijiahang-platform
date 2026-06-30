import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * 角色装饰器 — 标记路由需要的角色
 * 配合 RolesGuard 使用
 * @example @Roles('admin') 或 @Roles('admin', 'operator')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
