import { Test } from '@nestjs/testing';
import { MarketLoan, MarketLoanProtocol, MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { ForeclosureGuideService } from '../src/foreclosure-guide.service';

const buildLoan = (overrides: Partial<MarketLoan>): MarketLoan =>
  ({
    loanId: '1',
    lender: '0xlender',
    contract: '0x88341d1a8f672d2780c8dc725902aae72f143b0c',
    nftContract: '0xnft',
    nftTokenId: '5',
    asset: { name: 'CryptoPunks #5', collection: { name: 'CryptoPunks' } },
    ...overrides
  } as MarketLoan);

async function* streamLoans(loans: MarketLoan[]): AsyncGenerator<MarketLoan> {
  for (const loan of loans) {
    yield loan;
  }
}

describe(ForeclosureGuideService.name, () => {
  let service: ForeclosureGuideService;
  let repository: { iterateUnsettled: jest.Mock };

  beforeEach(async () => {
    jest.resetAllMocks();

    repository = { iterateUnsettled: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [ForeclosureGuideService, { provide: MarketLoanRepository, useValue: repository }]
    }).compile();

    service = moduleRef.get(ForeclosureGuideService);
  });

  it('streams unsettled nftfi loans', async () => {
    repository.iterateUnsettled.mockReturnValue(streamLoans([]));

    await service.generateMarkdown(new Date('2026-06-02T00:00:00.000Z'));

    expect(repository.iterateUnsettled).toHaveBeenCalledWith('nftfi');
    expect(repository.iterateUnsettled).toHaveBeenCalledWith(MarketLoanProtocol.Nftfi);
  });

  it('groups loans under their contract version and sorts each section by numeric loan id', async () => {
    repository.iterateUnsettled.mockReturnValue(
      streamLoans([
        buildLoan({ loanId: '2', contract: '0x88341d1a8f672d2780c8dc725902aae72f143b0c' }),
        buildLoan({ loanId: '10', contract: '0x88341d1a8f672d2780c8dc725902aae72f143b0c' })
      ])
    );

    const markdown = await service.generateMarkdown(new Date('2026-06-02T00:00:00.000Z'));

    expect(markdown).toContain('### V1');
    expect(markdown).toContain('- V1: 2');
    expect(markdown.indexOf('| 2 |')).toBeLessThan(markdown.indexOf('| 10 |'));
  });

  it('uses the checksummed contract and known anchor for the foreclose link', async () => {
    repository.iterateUnsettled.mockReturnValue(
      streamLoans([buildLoan({ loanId: '7', contract: '0xd0a40eb7fd94ee97102ba8e9342243a2b2e22207' })])
    );

    const markdown = await service.generateMarkdown(new Date('2026-06-02T00:00:00.000Z'));

    expect(markdown).toContain('### V2.3');
    expect(markdown).toContain(
      '[Foreclose](https://etherscan.io/address/0xd0a40eB7FD94eE97102BA8e9342243A2b2E22207#writeContract#F9)'
    );
  });

  it('falls back to "Unknown collection" when the asset relation is missing', async () => {
    repository.iterateUnsettled.mockReturnValue(
      streamLoans([
        buildLoan({
          loanId: '7',
          contract: '0x9f10d706d789e4c76a1a6434cd1a9841c875c0a6',
          asset: undefined
        })
      ])
    );

    const markdown = await service.generateMarkdown(new Date('2026-06-02T00:00:00.000Z'));

    expect(markdown).toContain('### V3 (Asset)');
    expect(markdown).toContain('Unknown collection #5');
  });

  it('emits loans on unrecognised contracts under an Unmapped contracts section', async () => {
    repository.iterateUnsettled.mockReturnValue(
      streamLoans([buildLoan({ loanId: '3', contract: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' })])
    );

    const markdown = await service.generateMarkdown(new Date('2026-06-02T00:00:00.000Z'));

    expect(markdown).toContain('### Unmapped contracts');
    expect(markdown).toContain('- Unmapped contracts: 1');
  });
});
