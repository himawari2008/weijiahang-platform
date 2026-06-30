import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 公开路由装饰器 — 标记不需要 JWT 认证的端点
 * 配合 JwtAuthGuard 全局守卫使用
 *
 * @example @Public() — 标记整个控制器或单个路由为公开访问
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
