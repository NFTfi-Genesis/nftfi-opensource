import { getMetadataArgsStorage } from 'typeorm';
import { FxRate } from '@nftfi.api/repositories/postgres/fx-rate';

describe(FxRate.name, () => {
  it('transforms createdAt from string to Date', () => {
    const column = getMetadataArgsStorage().columns.find(c => c.target === FxRate && c.propertyName === 'createdAt');
    const transformer = column?.options?.transformer as { to: (value: Date) => Date; from: (value: string) => Date };
    const dateStr = '2024-01-01T00:00:00.000Z';
    const dateObj = new Date(dateStr);

    expect(transformer.to(dateObj)).toBe(dateObj);
    expect(transformer.from(dateStr)).toEqual(new Date(dateStr));
  });
});
