import { Controller, Get, Delete, Query } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('审计日志')
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /** 查询审计日志（管理员） */
  @Get()
  @ApiOperation({ summary: '查询审计日志', description: '分页查询操作日志，支持按类型/操作人/日期筛选' })
  async query(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('operatorId') operatorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('result') result?: 'success' | 'failure',
  ) {
    return this.auditLogService.query({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      action,
      entity,
      operatorId,
      startDate,
      endDate,
      result,
    });
  }

  /** 清理过期日志 */
  @Delete('clean')
  @ApiOperation({ summary: '清理过期日志', description: '删除超过保留期的审计日志（默认90天）' })
  async clean(@Query('days') days?: string) {
    const count = await this.auditLogService.cleanOldLogs(
      days ? parseInt(days, 10) : 90,
    );
    return { message: `已清理 ${count} 条过期日志`, count };
  }
}
