import { getMetadataArgsStorage } from 'typeorm';
import { CollectionFloorPrice } from '@nftfi.api/repositories/postgres/collection-floor-price';
import { Collection } from '@nftfi.api/repositories/postgres/collection';

describe(CollectionFloorPrice.name, () => {
  it('defines required many-to-one relation to Collection with collection_id join column', () => {
    const relation = getMetadataArgsStorage().relations.find(
      r => r.target === CollectionFloorPrice && r.propertyName === 'collection'
    );
    const joinColumn = getMetadataArgsStorage().joinColumns.find(
      jc => jc.target === CollectionFloorPrice && jc.propertyName === 'collection'
    );

    expect(relation?.relationType).toBe('many-to-one');
    expect(relation?.options?.nullable).toBe(false);
    const relationType =
      typeof relation?.type === 'function' ? (relation.type as unknown as () => unknown)() : relation?.type;
    expect(relationType).toBe(Collection);
    expect(joinColumn?.name).toBe('collection_id');
  });
});
