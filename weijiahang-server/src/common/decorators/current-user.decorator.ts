import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 当前用户装饰器
 * 从请求头 x-user-id 获取当前登录用户ID
 * 用法：@CurrentUserId() userId: string
 *
 * FIX: 之前所有控制器从 @Body('userId') 读取用户ID，
 * 存在严重认证旁路漏洞——客户端可冒充任意用户。
 * 现在统一从请求头获取，由认证中间件注入。
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // 优先级：请求头 > 全局模拟用户 > 演示默认值
    const userId =
      request.headers['x-user-id'] ||
      (global as any).__currentUserId ||
      'demo-user-001';
    return userId;
  },
);
