import { getMetadataArgsStorage } from 'typeorm';
import { EthereumEvent } from '@nftfi.api/repositories/postgres/ethereum-event';

describe(EthereumEvent.name, () => {
  it('lowercases contract address via transformer', () => {
    const column = getMetadataArgsStorage().columns.find(
      c => c.target === EthereumEvent && c.propertyName === 'contract'
    );
    const transformer = (
      Array.isArray(column?.options?.transformer) ? column?.options?.transformer[0] : column?.options?.transformer
    ) as { to: (value: string) => string; from: (value: string) => string };

    expect(transformer.to('0xABCDEF')).toBe('0xabcdef');
    expect(transformer.from('0xabcdef')).toBe('0xabcdef');
  });
});
