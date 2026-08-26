import fs from 'fs/promises';
import v8 from 'v8';
import { DynamicModule, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from './config';

const CGROUP_V2_MAX_PATH = '/sys/fs/cgroup/memory.max';
const CGROUP_V2_CURRENT_PATH = '/sys/fs/cgroup/memory.current';
const CGROUP_V1_LIMIT_PATH = '/sys/fs/cgroup/memory/memory.limit_in_bytes';
const CGROUP_V1_USAGE_PATH = '/sys/fs/cgroup/memory/memory.usage_in_bytes';
// cgroup v1 "unlimited" sentinel: PAGE_COUNTER_MAX × PAGE_SIZE
const CGROUP_V1_UNLIMITED_SENTINEL = 9223372036854771712;
const USAGE_CACHE_MS = 250;

interface UsageSnapshot {
  bytes: number;
  expiresAt: number;
}

interface CapacityReport {
  memoryLimitBytes: number | null;
  memoryUsedBytes: number | null;
  memoryRatio: number | null;
  heapLimitBytes: number;
  heapUsedBytes: number;
  heapRatio: number;
}

@Injectable()
export class PodResourceGuardService implements OnModuleInit {
  private readonly logger = new Logger(PodResourceGuardService.name);
  private memoryLimitBytes: number | null = null;
  private memoryCurrentPath: string | null = null;
  private cachedUsage: UsageSnapshot | null = null;
  private readonly heapLimitBytes: number;

  constructor(private readonly configService: ConfigService) {
    this.heapLimitBytes = v8.getHeapStatistics().heap_size_limit;
  }

  static forRoot(): DynamicModule {
    return {
      module: PodResourceGuardService,
      global: true,
      providers: [PodResourceGuardService],
      exports: [PodResourceGuardService]
    };
  }

  async onModuleInit(): Promise<void> {
    const override = this.configService.get<Config['resourceGuard']['memoryLimitOverrideBytes']>(
      'resourceGuard.memoryLimitOverrideBytes'
    );
    if (override && override > 0) {
      this.memoryLimitBytes = override;
      this.logger.log(`Pod memory limit set from env override: ${override} bytes`);
      return;
    }

    const detected = await this.detectCgroupLimit();
    if (detected) {
      this.memoryLimitBytes = detected.limitBytes;
      this.memoryCurrentPath = detected.currentPath;
      this.logger.log(
        `Detected cgroup ${detected.version} memory limit ${detected.limitBytes} bytes (V8 heap limit ${this.heapLimitBytes} bytes)`
      );
    } else {
      this.logger.warn(
        `No cgroup memory limit detected — container memory check disabled. V8 heap limit ${this.heapLimitBytes} bytes still enforced.`
      );
    }
  }

  async hasCapacity(operation: string): Promise<boolean> {
    const config = this.configService.get<Config['resourceGuard']>('resourceGuard')!;
    if (!config.enabled) return true;

    const report = await this.readCapacity();

    if (report.heapRatio >= config.heapThreshold) {
      const pct = (report.heapRatio * 100).toFixed(1);
      this.logger.warn(
        `Refusing ${operation}: V8 heap at ${pct}% of ${this.heapLimitBytes} bytes (threshold ${config.heapThreshold})`
      );
      return false;
    }

    if (report.memoryRatio !== null && report.memoryRatio >= config.memoryThreshold) {
      const pct = (report.memoryRatio * 100).toFixed(1);
      this.logger.warn(
        `Refusing ${operation}: container memory at ${pct}% of ${report.memoryLimitBytes} bytes (threshold ${config.memoryThreshold})`
      );
      return false;
    }

    return true;
  }

  async readCapacity(): Promise<CapacityReport> {
    const heapStats = v8.getHeapStatistics();
    const heapUsedBytes = heapStats.used_heap_size;
    const heapRatio = heapUsedBytes / this.heapLimitBytes;

    let memoryUsedBytes: number | null = null;
    let memoryRatio: number | null = null;
    if (this.memoryLimitBytes && this.memoryCurrentPath) {
      memoryUsedBytes = await this.readMemoryUsage(this.memoryCurrentPath);
      if (memoryUsedBytes !== null) {
        memoryRatio = memoryUsedBytes / this.memoryLimitBytes;
      }
    }

    return {
      memoryLimitBytes: this.memoryLimitBytes,
      memoryUsedBytes,
      memoryRatio,
      heapLimitBytes: this.heapLimitBytes,
      heapUsedBytes,
      heapRatio
    };
  }

  private async detectCgroupLimit(): Promise<{ version: 'v1' | 'v2'; limitBytes: number; currentPath: string } | null> {
    const v2 = await this.readFileTrimmed(CGROUP_V2_MAX_PATH);
    if (v2 !== null && v2 !== 'max') {
      const limit = parseInt(v2, 10);
      if (Number.isFinite(limit) && limit > 0) {
        return { version: 'v2', limitBytes: limit, currentPath: CGROUP_V2_CURRENT_PATH };
      }
    }

    const v1 = await this.readFileTrimmed(CGROUP_V1_LIMIT_PATH);
    if (v1 !== null) {
      const limit = parseInt(v1, 10);
      if (Number.isFinite(limit) && limit > 0 && limit < CGROUP_V1_UNLIMITED_SENTINEL) {
        return { version: 'v1', limitBytes: limit, currentPath: CGROUP_V1_USAGE_PATH };
      }
    }

    return null;
  }

  private async readMemoryUsage(path: string): Promise<number | null> {
    const now = Date.now();
    if (this.cachedUsage && now < this.cachedUsage.expiresAt) {
      return this.cachedUsage.bytes;
    }
    const raw = await this.readFileTrimmed(path);
    if (raw === null) return null;
    const value = parseInt(raw, 10);
    if (!Number.isFinite(value)) return null;
    this.cachedUsage = { bytes: value, expiresAt: now + USAGE_CACHE_MS };
    return value;
  }

  private async readFileTrimmed(path: string): Promise<string | null> {
    try {
      const raw = await fs.readFile(path, 'utf8');
      return raw.trim();
    } catch {
      return null;
    }
  }
}
