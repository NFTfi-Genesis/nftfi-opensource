import fs from 'fs/promises';
import v8 from 'v8';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PodResourceGuardService } from '../src/pod-resource-guard.service';

jest.mock('fs/promises');
jest.mock('v8');

const readFileMock = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
const getHeapStatisticsMock = v8.getHeapStatistics as jest.MockedFunction<typeof v8.getHeapStatistics>;

const buildHeapStats = (used: number, limit: number): ReturnType<typeof v8.getHeapStatistics> => ({
  total_heap_size: limit,
  total_heap_size_executable: 0,
  total_physical_size: used,
  total_available_size: limit - used,
  used_heap_size: used,
  heap_size_limit: limit,
  malloced_memory: 0,
  peak_malloced_memory: 0,
  does_zap_garbage: 0,
  number_of_native_contexts: 0,
  number_of_detached_contexts: 0
});

const buildGuard = async (
  configOverrides: Record<string, unknown> = {},
  heapLimitBytes = 1_000_000_000
): Promise<PodResourceGuardService> => {
  getHeapStatisticsMock.mockReturnValue(buildHeapStats(0, heapLimitBytes));

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        load: [
          (): object => ({
            resourceGuard: {
              enabled: true,
              memoryThreshold: 0.85,
              heapThreshold: 0.85,
              memoryLimitOverrideBytes: null,
              ...configOverrides
            }
          })
        ]
      })
    ],
    providers: [PodResourceGuardService]
  }).compile();

  return moduleRef.get(PodResourceGuardService);
};

describe(PodResourceGuardService.name, () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  describe('onModuleInit', () => {
    it('detects cgroup v2 memory limit', async () => {
      const guard = await buildGuard();
      readFileMock.mockImplementation(async path => {
        if (path === '/sys/fs/cgroup/memory.max') return '536870912\n';
        throw new Error('not found');
      });

      await guard.onModuleInit();

      readFileMock.mockResolvedValueOnce('1000000\n');
      const report = await guard.readCapacity();
      expect(report.memoryLimitBytes).toBe(536870912);
      expect(report.memoryUsedBytes).toBe(1000000);
    });

    it('falls back to cgroup v1 when v2 reports "max"', async () => {
      const guard = await buildGuard();
      readFileMock.mockImplementation(async path => {
        if (path === '/sys/fs/cgroup/memory.max') return 'max\n';
        if (path === '/sys/fs/cgroup/memory/memory.limit_in_bytes') return '268435456\n';
        throw new Error('not found');
      });

      await guard.onModuleInit();

      readFileMock.mockResolvedValueOnce('5000\n');
      const report = await guard.readCapacity();
      expect(report.memoryLimitBytes).toBe(268435456);
      expect(report.memoryUsedBytes).toBe(5000);
    });

    it('ignores cgroup v1 unlimited sentinel and disables container memory check', async () => {
      const guard = await buildGuard();
      readFileMock.mockImplementation(async path => {
        if (path === '/sys/fs/cgroup/memory.max') throw new Error('not found');
        if (path === '/sys/fs/cgroup/memory/memory.limit_in_bytes') return '9223372036854771712\n';
        throw new Error('not found');
      });

      await guard.onModuleInit();

      const report = await guard.readCapacity();
      expect(report.memoryLimitBytes).toBe(null);
      expect(report.memoryUsedBytes).toBe(null);
      expect(report.memoryRatio).toBe(null);
    });

    it('uses env override when set', async () => {
      const guard = await buildGuard({ memoryLimitOverrideBytes: 123456789 });

      await guard.onModuleInit();

      const report = await guard.readCapacity();
      expect(report.memoryLimitBytes).toBe(123456789);
    });
  });

  describe('hasCapacity', () => {
    it('returns false when container memory exceeds threshold', async () => {
      const guard = await buildGuard();
      readFileMock.mockImplementation(async path => {
        if (path === '/sys/fs/cgroup/memory.max') return '1000\n';
        throw new Error('not found');
      });
      await guard.onModuleInit();
      readFileMock.mockResolvedValueOnce('900\n');

      await expect(guard.hasCapacity('test-op')).resolves.toBe(false);
    });

    it('returns false when V8 heap exceeds threshold', async () => {
      const guard = await buildGuard({}, 1000);
      await guard.onModuleInit();
      getHeapStatisticsMock.mockReturnValue(buildHeapStats(900, 1000));

      await expect(guard.hasCapacity('test-op')).resolves.toBe(false);
    });

    it('returns true when both memory and heap are below threshold', async () => {
      const guard = await buildGuard({}, 1000);
      readFileMock.mockImplementation(async path => {
        if (path === '/sys/fs/cgroup/memory.max') return '1000\n';
        throw new Error('not found');
      });
      await guard.onModuleInit();
      readFileMock.mockResolvedValueOnce('100\n');
      getHeapStatisticsMock.mockReturnValue(buildHeapStats(100, 1000));

      await expect(guard.hasCapacity('test-op')).resolves.toBe(true);
    });

    it('returns true when disabled via config', async () => {
      const guard = await buildGuard({ enabled: false });
      await guard.onModuleInit();
      getHeapStatisticsMock.mockReturnValue(buildHeapStats(999, 1000));

      await expect(guard.hasCapacity('test-op')).resolves.toBe(true);
    });

    it('returns true when heap is below the configured threshold', async () => {
      const guard = await buildGuard({ heapThreshold: 0.95 }, 1000);
      await guard.onModuleInit();
      getHeapStatisticsMock.mockReturnValue(buildHeapStats(900, 1000));

      await expect(guard.hasCapacity('test-op')).resolves.toBe(true);
    });
  });

  describe('forRoot', () => {
    it('returns a global dynamic module that provides and exports the service', () => {
      const dynamicModule = PodResourceGuardService.forRoot();

      expect(dynamicModule).toEqual({
        module: PodResourceGuardService,
        global: true,
        providers: [PodResourceGuardService],
        exports: [PodResourceGuardService]
      });
    });
  });

  describe('readCapacity caching', () => {
    it('serves memory usage from the in-memory cache within the cache window', async () => {
      const guard = await buildGuard({}, 1000);
      readFileMock.mockImplementation(async path => {
        if (path === '/sys/fs/cgroup/memory.max') return '1000\n';
        throw new Error('not found');
      });
      await guard.onModuleInit();

      readFileMock.mockResolvedValueOnce('400\n');
      const first = await guard.readCapacity();
      expect(first.memoryUsedBytes).toBe(400);

      const second = await guard.readCapacity();
      expect(second.memoryUsedBytes).toBe(400);
      expect(readFileMock).toHaveBeenCalledTimes(2);
    });
  });
});
