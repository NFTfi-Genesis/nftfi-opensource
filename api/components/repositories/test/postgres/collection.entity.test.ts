import { getMetadataArgsStorage } from 'typeorm';
import { Collection } from '@nftfi.api/repositories/postgres/collection';

describe(Collection.name, () => {
  it('lowercases contract address via transformer', () => {
    const column = getMetadataArgsStorage().columns.find(c => c.target === Collection && c.propertyName === 'contract');
    const transformer = (
      Array.isArray(column?.options?.transformer) ? column?.options?.transformer[0] : column?.options?.transformer
    ) as { to: (value: string | null) => string | null; from: (value: string | null) => string | null };

    expect(transformer.to('0xABCDEF')).toBe('0xabcdef');
    expect(transformer.to(null)).toBeNull();
    expect(transformer.from('0xabcdef')).toBe('0xabcdef');
  });

  it('maps tokenRange getter to tokenRangeBegin/tokenRangeEnd', () => {
    const entity = new Collection();
    entity.tokenRangeBegin = '10';
    entity.tokenRangeEnd = '99';

    expect(entity.tokenRange).toEqual(['10', '99']);
  });

  it('sets tokenRangeBegin/tokenRangeEnd via tokenRange setter', () => {
    const entity = new Collection();

    entity.tokenRange = ['100', '200'];

    expect(entity.tokenRangeBegin).toBe('100');
    expect(entity.tokenRangeEnd).toBe('200');
  });
});
