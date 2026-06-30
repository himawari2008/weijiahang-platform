import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { winstonLogger } from '../../common/logger/winston.logger';

export interface CreateAuditLogInput {
  action: string;
  entity?: string;
  entityId?: string;
  operatorId?: string;
  operatorType?: string;
  method: string;
  path: string;
  ip?: string;
  requestBody?: string;
  statusCode: number;
  result?: 'success' | 'failure';
  errorMessage?: string;
  duration?: number;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  /**
   * 记录一条审计日志（写入数据库 + Winston文件）
   */
  async log(input: CreateAuditLogInput): Promise<AuditLog> {
    // 脱敏处理：截断过长的请求体
    const sanitizedBody = input.requestBody
      ? input.requestBody.substring(0, 2000)
      : undefined;

    const entry = this.auditRepo.create({
      ...input,
      requestBody: sanitizedBody,
      result: input.result || 'success',
    });

    const saved = await this.auditRepo.save(entry);

    // 同步写入 Winston 日志文件
    winstonLogger.info('AUDIT', {
      label: 'audit',
      id: saved.id,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      operatorId: input.operatorId,
      method: input.method,
      path: input.path,
      statusCode: input.statusCode,
      result: input.result,
      duration: input.duration,
    });

    return saved;
  }

  /**
   * 查询审计日志（分页 + 筛选）
   */
  async query(params: {
    page?: number;
    pageSize?: number;
    action?: string;
    entity?: string;
    operatorId?: string;
    startDate?: string;
    endDate?: string;
    result?: 'success' | 'failure';
  }): Promise<{ list: AuditLog[]; total: number }> {
    const { page = 1, pageSize = 20 } = params;
    const where: FindOptionsWhere<AuditLog> = {};

    if (params.action) where.action = params.action;
    if (params.entity) where.entity = params.entity;
    if (params.operatorId) where.operatorId = params.operatorId;
    if (params.result) where.result = params.result;

    if (params.startDate || params.endDate) {
      (where as any).createdAt = Between(
        new Date(params.startDate || '2020-01-01'),
        new Date(params.endDate || '2099-12-31'),
      );
    }

    const [list, total] = await this.auditRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { list, total };
  }

  /**
   * 查询单条审计日志详情
   */
  async findById(id: string): Promise<AuditLog | null> {
    return this.auditRepo.findOne({ where: { id } as any });
  }

  /**
   * 清理过期日志（保留最近N天）
   */
  async cleanOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await this.auditRepo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoff', { cutoff: cutoff.toISOString() })
      .execute();

    return result.affected || 0;
  }
}
