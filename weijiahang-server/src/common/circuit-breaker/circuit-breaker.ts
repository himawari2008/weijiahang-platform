import { Logger } from '@nestjs/common';

/**
 * 熔断器状态
 * CLOSED: 正常通行
 * OPEN: 熔断中，直接拒绝请求
 * HALF_OPEN: 半开，允许探测请求通过
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitConfig {
  /** 失败阈值（触发熔断的错误次数） */
  failureThreshold: number;
  /** 熔断持续时间（毫秒），过后进入半开状态 */
  openTimeout: number;
  /** 半开状态下允许的探测请求数 */
  halfOpenMaxRequests: number;
  /** 滑动窗口大小（毫秒），统计该时间内的失败数 */
  windowSize: number;
}

const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: 5,
  openTimeout: 60000,      // 60秒
  halfOpenMaxRequests: 3,
  windowSize: 60000,
};

/**
 * 熔断器
 *
 * 防护外部依赖（第三方API、数据库等）雪崩
 * 状态机: CLOSED →（失败达阈值）→ OPEN →（超时后）→ HALF_OPEN →（探测成功）→ CLOSED
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = [];       // 失败时间戳数组（滑动窗口）
  private lastFailureTime: number = 0;
  private halfOpenCount: number = 0;
  private readonly config: CircuitConfig;
  private readonly name: string;
  private readonly logger: Logger;

  constructor(name: string, config?: Partial<CircuitConfig>) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = new Logger(`CircuitBreaker:${name}`);
  }

  /** 检查是否允许请求通过 */
  isAllowed(): boolean {
    this.cleanWindow();

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN: {
        const elapsed = Date.now() - this.lastFailureTime;
        if (elapsed >= this.config.openTimeout) {
          this.state = CircuitState.HALF_OPEN;
          this.halfOpenCount = 0;
          this.logger.log(`[${this.name}] 熔断器进入半开状态`);
          return true;
        }
        return false;
      }

      case CircuitState.HALF_OPEN:
        return this.halfOpenCount < this.config.halfOpenMaxRequests;

      default:
        return true;
    }
  }

  /** 记录成功 */
  recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCount++;
      if (this.halfOpenCount >= this.config.halfOpenMaxRequests) {
        this.state = CircuitState.CLOSED;
        this.failures = [];
        this.logger.log(`[${this.name}] 熔断器已恢复（CLOSED）`);
      }
    }
  }

  /** 记录失败 */
  recordFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;
    this.cleanWindow();

    if (
      this.state === CircuitState.CLOSED &&
      this.failures.length >= this.config.failureThreshold
    ) {
      this.state = CircuitState.OPEN;
      this.logger.warn(
        `[${this.name}] 熔断器触发！${this.config.failureThreshold}次失败，暂停${this.config.openTimeout / 1000}秒`,
      );
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.logger.warn(`[${this.name}] 半开状态探测失败，重新熔断`);
    }
  }

  /** 重置熔断器（管理员手动重置） */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.halfOpenCount = 0;
    this.logger.log(`[${this.name}] 熔断器已手动重置`);
  }

  /** 获取当前状态 */
  getStatus(): { name: string; state: string; failures: number; lastFailure: number } {
    this.cleanWindow();
    return {
      name: this.name,
      state: this.state,
      failures: this.failures.length,
      lastFailure: this.lastFailureTime,
    };
  }

  /** 清理滑动窗口外的旧失败记录 */
  private cleanWindow(): void {
    const cutoff = Date.now() - this.config.windowSize;
    this.failures = this.failures.filter((t) => t > cutoff);
  }
}

/**
 * 熔断器注册表 — 按端点名称管理多个熔断器
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  getOrCreate(name: string, config?: Partial<CircuitConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }

  getAllStatus(): ReturnType<CircuitBreaker['getStatus']>[] {
    return Array.from(this.breakers.values()).map((b) => b.getStatus());
  }

  resetAll(): void {
    this.breakers.forEach((b) => b.reset());
  }
}

/** 全局单例注册表 */
export const circuitBreakerRegistry = new CircuitBreakerRegistry();
