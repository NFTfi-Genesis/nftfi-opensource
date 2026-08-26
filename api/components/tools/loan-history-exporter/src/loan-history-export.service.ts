import { appendFile, writeFile } from 'fs/promises';
import { Injectable, Logger } from '@nestjs/common';
import { json2csv } from 'json-2-csv';
import { MarketLoan, MarketLoanRepository, MarketLoanStatus } from '@nftfi.api/repositories/postgres/market-loan';
import { NFTFI_LOAN_VERSIONS } from './constants';

const FLUSH_BATCH_SIZE = 1000;
const SECONDS_PER_DAY = 86400;

/** One CSV row, keyed by column name; serialized by `json-2-csv` in `CSV_KEYS` order. */
interface LoanCsvRecord {
  loan_id: string;
  version: string;
  contract_address: string;
  lender: string;
  borrower: string;
  nft_contract: string;
  token_id: string;
  principal: string;
  currency: string;
  apr: string;
  duration_days: string;
  prorated: string;
  repayment: string;
  interest: string;
  origination_fee: string;
  admin_fee: string;
  started_at: string;
  maturity_at: string;
  status: string;
  repayment_date: string;
  foreclosure_date: string;
  started_tx: string;
  ended_tx: string;
}

/** Column order written to the CSV. Every value is a raw `market_loans` fact (no derived valuations). */
const CSV_KEYS: (keyof LoanCsvRecord)[] = [
  'loan_id',
  'version',
  'contract_address',
  'lender',
  'borrower',
  'nft_contract',
  'token_id',
  'principal',
  'currency',
  'apr',
  'duration_days',
  'prorated',
  'repayment',
  'interest',
  'origination_fee',
  'admin_fee',
  'started_at',
  'maturity_at',
  'status',
  'repayment_date',
  'foreclosure_date',
  'started_tx',
  'ended_tx'
];

const toIso = (date: Date | null | undefined): string => (date ? new Date(date).toISOString() : '');

@Injectable()
export class LoanHistoryExportService {
  private readonly logger = new Logger(LoanHistoryExportService.name);

  constructor(private readonly marketLoanRepository: MarketLoanRepository) {}

  /**
   * Streams the full NFTfi loan history to a CSV file at `filePath`, returning the row count. Loans
   * are buffered into batches and each batch is serialized with `json-2-csv` and appended, so the
   * whole history is never held in memory at once.
   */
  async exportToFile(filePath: string): Promise<number> {
    let total = 0;
    let started = false;
    let buffer: LoanCsvRecord[] = [];

    const flush = async (): Promise<void> => {
      if (buffer.length === 0) return;
      const chunk = json2csv(buffer, { keys: CSV_KEYS, prependHeader: !started });
      await (started ? appendFile(filePath, `\n${chunk}`) : writeFile(filePath, chunk));
      started = true;
      buffer = [];
    };

    for (const version of NFTFI_LOAN_VERSIONS) {
      let count = 0;
      for await (const loan of this.marketLoanRepository.iterateByContract(version.address)) {
        buffer.push(this.toCsvRecord(loan, version.label));
        count += 1;
        total += 1;
        if (buffer.length >= FLUSH_BATCH_SIZE) await flush();
      }
      this.logger.log(`${version.label} (${version.address}): ${count} loans`);
    }

    await flush();
    if (!started) await writeFile(filePath, json2csv([], { keys: CSV_KEYS }));

    this.logger.log(`Exported ${total} NFTfi loans`);
    return total;
  }

  private toCsvRecord(loan: MarketLoan, versionLabel: string): LoanCsvRecord {
    return {
      loan_id: loan.loanId,
      version: versionLabel,
      contract_address: loan.contract,
      lender: loan.lender,
      borrower: loan.borrower,
      nft_contract: loan.nftContract,
      token_id: loan.nftTokenId,
      principal: loan.principal,
      currency: loan.currency,
      apr: String(loan.apr),
      duration_days: String(loan.duration / SECONDS_PER_DAY),
      prorated: String(loan.prorated),
      repayment: loan.repayment,
      interest: loan.interest,
      origination_fee: loan.originationFee,
      admin_fee: loan.adminFee,
      started_at: toIso(loan.startedAt),
      maturity_at: toIso(loan.dueAt),
      status: loan.status,
      // Both end dates derive from the single `endedAt`, split by status.
      repayment_date: loan.status === MarketLoanStatus.Repaid ? toIso(loan.endedAt) : '',
      foreclosure_date: loan.status === MarketLoanStatus.Liquidated ? toIso(loan.endedAt) : '',
      started_tx: loan.startedTx,
      ended_tx: loan.endedTx ?? ''
    };
  }
}
