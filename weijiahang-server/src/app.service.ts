import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  getHello(): string {
    return '为家航 API v1.0 — 为家领航';
  }

  async healthCheck() {
    // 检查数据库连接
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    let dbType: string = 'unknown';
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        dbStatus = 'connected';
        dbType = this.dataSource.options.type || 'unknown';
      }
    } catch {
      dbStatus = 'disconnected';
    }

    // 内存使用
    const memoryUsage = process.memoryUsage();

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      service: '为家航-API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        type: dbType,
        status: dbStatus,
      },
      memory: {
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
      },
    };
  }
}
