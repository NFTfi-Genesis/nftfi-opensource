import { PaginationOptions } from './types';

export class Repository {
  protected async *_iterate<T>(findFn: (options: PaginationOptions) => Promise<T[]>): AsyncGenerator<T> {
    let offset = 0;
    const batchSize = 100;

    while (true) {
      const data = await findFn({
        skip: offset,
        limit: batchSize
      });

      for (const entry of data) {
        yield entry;
      }

      if (data.length < batchSize) {
        return;
      }

      offset += data.length;
    }
  }
}
