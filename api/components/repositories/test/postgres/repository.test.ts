import { Repository } from '../../src/postgres/repository';
import { PaginationOptions } from '../../src/postgres/types';

class TestRepository extends Repository {
  iterate<T>(findFn: (options: PaginationOptions) => Promise<T[]>): AsyncGenerator<T> {
    return this._iterate(findFn);
  }
}

describe(Repository.name, () => {
  let repository: TestRepository;

  beforeEach(() => {
    repository = new TestRepository();
  });

  describe('_iterate', () => {
    it('yields entries across paginated batches and advances offset', async () => {
      const batch1 = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
      const batch2 = Array.from({ length: 50 }, (_, i) => ({ id: i + 101 }));
      const findFn = jest
        .fn<Promise<{ id: number }[]>, [PaginationOptions]>()
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2);

      const result: { id: number }[] = [];
      for await (const item of repository.iterate(findFn)) {
        result.push(item);
      }

      expect(result).toEqual([...batch1, ...batch2]);
      expect(findFn).toHaveBeenCalledTimes(2);
      expect(findFn).toHaveBeenNthCalledWith(1, { skip: 0, limit: 100 });
      expect(findFn).toHaveBeenNthCalledWith(2, { skip: 100, limit: 100 });
    });

    it('returns immediately when first batch is empty', async () => {
      const findFn = jest.fn<Promise<number[]>, [PaginationOptions]>().mockResolvedValueOnce([]);

      const result: number[] = [];
      for await (const item of repository.iterate(findFn)) {
        result.push(item);
      }

      expect(result).toEqual([]);
      expect(findFn).toHaveBeenCalledTimes(1);
      expect(findFn).toHaveBeenCalledWith({ skip: 0, limit: 100 });
    });

    it('continues while batch size equals page size and stops when it becomes smaller', async () => {
      const batch1 = Array.from({ length: 100 }, (_, i) => i + 1);
      const batch2 = Array.from({ length: 100 }, (_, i) => i + 101);
      const batch3 = [201];
      const findFn = jest
        .fn<Promise<number[]>, [PaginationOptions]>()
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)
        .mockResolvedValueOnce(batch3);

      const result: number[] = [];
      for await (const item of repository.iterate(findFn)) {
        result.push(item);
      }

      expect(result).toEqual([...batch1, ...batch2, ...batch3]);
      expect(findFn).toHaveBeenCalledTimes(3);
      expect(findFn).toHaveBeenNthCalledWith(1, { skip: 0, limit: 100 });
      expect(findFn).toHaveBeenNthCalledWith(2, { skip: 100, limit: 100 });
      expect(findFn).toHaveBeenNthCalledWith(3, { skip: 200, limit: 100 });
    });
  });
});
