import { plainToInstance } from 'class-transformer';
import { ListingV01ItemDto } from '../src/listing-v1/dtos/listing-v01.dto';

describe('ListingV01ItemDto', () => {
  it('transforms plain object to DTO with nested types', () => {
    const plain = {
      id: 'abc123',
      date: { listed: '2026-04-13T10:00:00Z' },
      nft: { id: '7332', address: '0x8a90', name: 'Doodle', project: { name: 'Doodles' } },
      borrower: { address: '0x5f79' },
      terms: { loan: { duration: 7, repayment: null, principal: null, currency: null, unit: null } },
      nftfi: { contract: { name: 'v2-3.loan.fixed' } }
    };

    const dto = plainToInstance(ListingV01ItemDto, plain);

    expect(dto.id).toBe('abc123');
    expect(dto.nft.name).toBe('Doodle');
    expect(dto.nft.project.name).toBe('Doodles');
    expect(dto.borrower.address).toBe('0x5f79');
    expect(dto.terms.loan.duration).toBe(7);
    expect(dto.nftfi.contract.name).toBe('v2-3.loan.fixed');
  });
});
