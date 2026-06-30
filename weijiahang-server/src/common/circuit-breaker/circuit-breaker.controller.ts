import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { circuitBreakerRegistry } from './circuit-breaker';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

/**
 * 熔断器管理接口（管理员专用）
 * GET /admin/circuit-breaker/status — 查看所有熔断器状态
 * POST /admin/circuit-breaker/:name/reset — 重置指定熔断器
 * POST /admin/circuit-breaker/reset-all — 重置全部熔断器
 */
@ApiTags('熔断器管理')
@ApiBearerAuth()
@Controller('admin/circuit-breaker')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class CircuitBreakerController {
  @Get('status')
  @ApiOperation({ summary: '查看所有熔断器状态' })
  getStatus() {
    return circuitBreakerRegistry.getAllStatus();
  }

  @Post(':name/reset')
  @ApiOperation({ summary: '重置指定熔断器' })
  reset(@Param('name') name: string) {
    circuitBreakerRegistry.getOrCreate(name).reset();
    return { message: `熔断器 [${name}] 已重置` };
  }

  @Post('reset-all')
  @ApiOperation({ summary: '重置全部熔断器' })
  resetAll() {
    circuitBreakerRegistry.resetAll();
    return { message: '所有熔断器已重置' };
  }
}
