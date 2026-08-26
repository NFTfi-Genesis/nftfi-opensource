import { getMetadataArgsStorage } from 'typeorm';
import { MarketLoan } from '@nftfi.api/repositories/postgres/market-loan';
import { CollectionAsset } from '@nftfi.api/repositories/postgres/collection-asset';

describe(MarketLoan.name, () => {
  it('lowercases contract addresses via transformer', () => {
    const column = getMetadataArgsStorage().columns.find(c => c.target === MarketLoan && c.propertyName === 'borrower');
    const transformer = (
      Array.isArray(column?.options?.transformer) ? column?.options?.transformer[0] : column?.options?.transformer
    ) as { to: (value: unknown) => unknown; from: (value: string) => string };

    expect(transformer.to('0xABCDEF')).toBe('0xabcdef');
    expect(transformer.to(null)).toBeNull();
    expect(transformer.from('0xabcdef')).toBe('0xabcdef');
  });

  it('has ManyToOne relation to CollectionAsset on asset property', () => {
    const relation = getMetadataArgsStorage().relations.find(
      r => r.target === MarketLoan && r.propertyName === 'asset'
    );

    expect(relation).toBeDefined();
    expect(relation!.relationType).toBe('many-to-one');
    expect((relation!.type as () => unknown)()).toBe(CollectionAsset);
    expect((relation!.inverseSideProperty as (entity: CollectionAsset) => unknown)({ id: 42 } as CollectionAsset)).toBe(
      42
    );
  });
});
