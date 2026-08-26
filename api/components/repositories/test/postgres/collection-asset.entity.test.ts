import { getMetadataArgsStorage } from 'typeorm';
import { CollectionAsset } from '@nftfi.api/repositories/postgres/collection-asset';
import { Collection } from '@nftfi.api/repositories/postgres/collection';

describe(CollectionAsset.name, () => {
  it('lowercases contract via transformer', () => {
    const column = getMetadataArgsStorage().columns.find(
      c => c.target === CollectionAsset && c.propertyName === 'contract'
    );
    const transformer = (
      Array.isArray(column?.options?.transformer) ? column?.options?.transformer[0] : column?.options?.transformer
    ) as { to: (value: string | null) => string | null; from: (value: string | null) => string | null };

    expect(transformer.to('0xABCDEF')).toBe('0xabcdef');
    expect(transformer.from('0xabcdef')).toBe('0xabcdef');
  });

  it('defines required many-to-one relation to Collection with collection_id join column', () => {
    const relation = getMetadataArgsStorage().relations.find(
      r => r.target === CollectionAsset && r.propertyName === 'collection'
    );
    const joinColumn = getMetadataArgsStorage().joinColumns.find(
      jc => jc.target === CollectionAsset && jc.propertyName === 'collection'
    );

    expect(relation?.relationType).toBe('many-to-one');
    expect(relation?.options?.nullable).toBe(false);
    const relationType =
      typeof relation?.type === 'function' ? (relation.type as unknown as () => unknown)() : relation?.type;
    expect(relationType).toBe(Collection);
    expect(joinColumn?.name).toBe('collection_id');
  });
});
