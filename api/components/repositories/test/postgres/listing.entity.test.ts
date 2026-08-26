import { getMetadataArgsStorage } from 'typeorm';
import { Listing } from '@nftfi.api/repositories/postgres/listing';
import { CollectionAsset } from '@nftfi.api/repositories/postgres/collection-asset';

describe(Listing.name, () => {
  it('lowercases nftContract via transformer', () => {
    const column = getMetadataArgsStorage().columns.find(c => c.target === Listing && c.propertyName === 'nftContract');
    const transformer = (
      Array.isArray(column?.options?.transformer) ? column?.options?.transformer[0] : column?.options?.transformer
    ) as { to: (value: string | null) => string | null };

    expect(transformer.to('0xABCDEF')).toBe('0xabcdef');
  });

  it('lowercases borrower via transformer', () => {
    const column = getMetadataArgsStorage().columns.find(c => c.target === Listing && c.propertyName === 'borrower');
    const transformer = (
      Array.isArray(column?.options?.transformer) ? column?.options?.transformer[0] : column?.options?.transformer
    ) as { to: (value: string | null) => string | null };

    expect(transformer.to('0xABCDEF')).toBe('0xabcdef');
  });

  it('lowercases currency via transformer', () => {
    const column = getMetadataArgsStorage().columns.find(c => c.target === Listing && c.propertyName === 'currency');
    const transformer = (
      Array.isArray(column?.options?.transformer) ? column?.options?.transformer[0] : column?.options?.transformer
    ) as { to: (value: string | null) => string | null };

    expect(transformer.to('0xABCDEF')).toBe('0xabcdef');
    expect(transformer.to(null)).toBeNull();
  });

  it('defines required many-to-one relation to CollectionAsset with asset_id join column', () => {
    const relation = getMetadataArgsStorage().relations.find(r => r.target === Listing && r.propertyName === 'asset');
    const joinColumn = getMetadataArgsStorage().joinColumns.find(
      jc => jc.target === Listing && jc.propertyName === 'asset'
    );

    expect(relation?.relationType).toBe('many-to-one');
    expect(relation?.options?.nullable).toBe(false);
    const relationType =
      typeof relation?.type === 'function' ? (relation.type as unknown as () => unknown)() : relation?.type;
    expect(relationType).toBe(CollectionAsset);
    expect(joinColumn?.name).toBe('asset_id');
  });
});
