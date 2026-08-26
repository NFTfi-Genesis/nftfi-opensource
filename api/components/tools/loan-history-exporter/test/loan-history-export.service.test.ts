import { readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Test } from '@nestjs/testing';
import { MarketLoan, MarketLoanRepository, MarketLoanStatus } from '@nftfi.api/repositories/postgres/market-loan';
import { LoanHistoryExportService } from '../src/loan-history-export.service';

const V1_ADDRESS = '0x88341d1a8F672D2780C8dC725902AAe72F143B0c';
const V2_ADDRESS = '0xf896527c49b44aAb3Cf22aE356Fa3AF8E331F280';

const HEADER =
  'loan_id,version,contract_address,lender,borrower,nft_contract,token_id,principal,currency,apr,duration_days,prorated,repayment,interest,origination_fee,admin_fee,started_at,maturity_at,status,repayment_date,foreclosure_date,started_tx,ended_tx';

async function* streamLoans(loans: MarketLoan[]): AsyncGenerator<MarketLoan> {
  for (const loan of loans) {
    yield loan;
  }
}

const buildLoan = (overrides: Partial<MarketLoan>): MarketLoan =>
  ({
    loanId: '5',
    contract: V1_ADDRESS.toLowerCase(),
    lender: '0xlender',
    borrower: '0xborrower',
    nftContract: '0xnft',
    nftTokenId: '7',
    principal: '1000000000000000000',
    currency: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    apr: 10,
    duration: 604800,
    prorated: false,
    repayment: '1100000000000000000',
    interest: '100000000000000000',
    originationFee: '0',
    adminFee: '25000000000000000',
    startedAt: new Date('2024-01-01T00:00:00.000Z'),
    dueAt: new Date('2024-01-08T00:00:00.000Z'),
    status: MarketLoanStatus.Active,
    endedAt: undefined,
    startedTx: '0xstartedtx',
    endedTx: undefined,
    ...overrides
  } as MarketLoan);

describe(LoanHistoryExportService.name, () => {
  let service: LoanHistoryExportService;
  let repository: { iterateByContract: jest.Mock };

  beforeEach(async () => {
    jest.resetAllMocks();

    repository = { iterateByContract: jest.fn().mockReturnValue(streamLoans([])) };

    const moduleRef = await Test.createTestingModule({
      providers: [LoanHistoryExportService, { provide: MarketLoanRepository, useValue: repository }]
    }).compile();

    service = moduleRef.get(LoanHistoryExportService);
  });

  // Runs the export with the given V1 loans and returns the written CSV lines.
  const exportLines = async (loans: MarketLoan[], name: string): Promise<string[]> => {
    repository.iterateByContract.mockImplementation((address: string) =>
      streamLoans(address === V1_ADDRESS ? loans : [])
    );
    const filePath = join(tmpdir(), `loan-history-${name}-${process.pid}.csv`);
    await service.exportToFile(filePath);
    return readFileSync(filePath, 'utf8').trimEnd().split('\n');
  };

  it('writes the header then loans grouped by version in registry order, and returns the count', async () => {
    const loansByAddress: Record<string, MarketLoan[]> = {
      [V1_ADDRESS]: [buildLoan({ loanId: '5' })],
      [V2_ADDRESS]: [buildLoan({ loanId: '9', contract: V2_ADDRESS.toLowerCase() })]
    };
    repository.iterateByContract.mockImplementation((address: string) => streamLoans(loansByAddress[address] ?? []));

    const filePath = join(tmpdir(), `loan-history-grouped-${process.pid}.csv`);
    const count = await service.exportToFile(filePath);

    const lines = readFileSync(filePath, 'utf8').trimEnd().split('\n');
    expect(lines[0]).toBe(HEADER);
    expect(lines[1]).toBe(
      '5,V1,0x88341d1a8f672d2780c8dc725902aae72f143b0c,0xlender,0xborrower,0xnft,7,1000000000000000000,0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2,10,7,false,1100000000000000000,100000000000000000,0,25000000000000000,2024-01-01T00:00:00.000Z,2024-01-08T00:00:00.000Z,active,,,0xstartedtx,'
    );
    expect(lines[2]).toContain(',V2,');
    expect(count).toBe(2);
  });

  it('queries every NFTfi contract in the registry once, in version order', async () => {
    await service.exportToFile(join(tmpdir(), `loan-history-calls-${process.pid}.csv`));

    expect(repository.iterateByContract).toHaveBeenCalledTimes(8);
    expect(repository.iterateByContract).toHaveBeenNthCalledWith(1, V1_ADDRESS);
    expect(repository.iterateByContract).toHaveBeenNthCalledWith(2, V2_ADDRESS);
  });

  it('writes only the header when there are no loans', async () => {
    const lines = await exportLines([], 'empty');

    expect(lines).toEqual([HEADER]);
  });

  it('fills repayment_date from endedAt for repaid loans and leaves foreclosure_date empty', async () => {
    const lines = await exportLines(
      [
        buildLoan({
          status: MarketLoanStatus.Repaid,
          endedAt: new Date('2024-01-20T12:00:00.000Z'),
          endedTx: '0xendedtx'
        })
      ],
      'repaid'
    );

    expect(lines[1]).toBe(
      '5,V1,0x88341d1a8f672d2780c8dc725902aae72f143b0c,0xlender,0xborrower,0xnft,7,1000000000000000000,0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2,10,7,false,1100000000000000000,100000000000000000,0,25000000000000000,2024-01-01T00:00:00.000Z,2024-01-08T00:00:00.000Z,repaid,2024-01-20T12:00:00.000Z,,0xstartedtx,0xendedtx'
    );
  });

  it('fills foreclosure_date from endedAt for liquidated loans and leaves repayment_date empty', async () => {
    const lines = await exportLines(
      [
        buildLoan({
          status: MarketLoanStatus.Liquidated,
          endedAt: new Date('2024-02-05T08:30:00.000Z'),
          endedTx: '0xendedtx'
        })
      ],
      'liquidated'
    );

    expect(lines[1]).toBe(
      '5,V1,0x88341d1a8f672d2780c8dc725902aae72f143b0c,0xlender,0xborrower,0xnft,7,1000000000000000000,0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2,10,7,false,1100000000000000000,100000000000000000,0,25000000000000000,2024-01-01T00:00:00.000Z,2024-01-08T00:00:00.000Z,liquidated,,2024-02-05T08:30:00.000Z,0xstartedtx,0xendedtx'
    );
  });

  it('leaves both end dates and a null maturity empty for defaulted loans, with raw status and duration in days', async () => {
    const lines = await exportLines([buildLoan({ status: MarketLoanStatus.Defaulted, dueAt: null })], 'defaulted');

    expect(lines[1]).toBe(
      '5,V1,0x88341d1a8f672d2780c8dc725902aae72f143b0c,0xlender,0xborrower,0xnft,7,1000000000000000000,0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2,10,7,false,1100000000000000000,100000000000000000,0,25000000000000000,2024-01-01T00:00:00.000Z,,defaulted,,,0xstartedtx,'
    );
  });
});
