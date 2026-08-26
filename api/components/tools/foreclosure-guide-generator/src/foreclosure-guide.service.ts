import { Injectable, Logger } from '@nestjs/common';
import { MarketLoan, MarketLoanProtocol, MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { NFTFI_LOAN_VERSION_BY_ADDRESS, NFTFI_LOAN_VERSIONS } from './constants';
import { ForeclosureLoan, ForeclosureSection, renderForeclosureGuide } from './foreclosure-markdown';

const UNMAPPED_SECTION_TITLE = 'Unmapped contracts';

@Injectable()
export class ForeclosureGuideService {
  private readonly logger = new Logger(ForeclosureGuideService.name);

  constructor(private readonly marketLoanRepository: MarketLoanRepository) {}

  /** Builds the foreclosure guide Markdown for every unsettled (active or defaulted) NFTfi loan. */
  async generateMarkdown(now: Date): Promise<string> {
    const sections = await this.collectSections();
    return renderForeclosureGuide({ generatedAt: now, sections });
  }

  /** Streams unsettled loans in batches (to spare the database) and buckets them by contract version. */
  private async collectSections(): Promise<ForeclosureSection[]> {
    const loansByAddress = new Map<string, ForeclosureLoan[]>();
    const unmapped: ForeclosureLoan[] = [];
    let total = 0;

    for await (const loan of this.marketLoanRepository.iterateUnsettled(MarketLoanProtocol.Nftfi)) {
      total += 1;
      const version = NFTFI_LOAN_VERSION_BY_ADDRESS.get(loan.contract.toLowerCase());
      if (!version) {
        this.logger.warn(`Loan ${loan.loanId} sits on unmapped contract ${loan.contract}`);
        unmapped.push(this.toForeclosureLoan(loan, loan.contract, null));
        continue;
      }
      const bucket = loansByAddress.get(version.address.toLowerCase()) ?? [];
      // Use the registry's checksummed address and known function anchor for foreclosure links.
      bucket.push(this.toForeclosureLoan(loan, version.address, version.etherscanFunctionAnchor));
      loansByAddress.set(version.address.toLowerCase(), bucket);
    }

    this.logger.log(`Found ${total} unsettled NFTfi loans`);

    const sections: ForeclosureSection[] = NFTFI_LOAN_VERSIONS.map(version => ({
      title: version.label,
      liquidateFunction: version.liquidateFunction,
      loanIdType: version.loanIdType,
      contract: version.address,
      loans: this.sortByLoanId(loansByAddress.get(version.address.toLowerCase()) ?? [])
    }));

    if (unmapped.length > 0) {
      sections.push({
        title: UNMAPPED_SECTION_TITLE,
        liquidateFunction: null,
        loanIdType: null,
        contract: null,
        loans: this.sortByLoanId(unmapped)
      });
    }

    return sections;
  }

  private toForeclosureLoan(loan: MarketLoan, contract: string, etherscanAnchor: string | null): ForeclosureLoan {
    return {
      loanId: loan.loanId,
      lender: loan.lender,
      contract,
      etherscanAnchor,
      collectionName: loan.asset?.collection?.name || 'Unknown collection',
      assetName: loan.asset?.name || '',
      nftContract: loan.nftContract,
      nftTokenId: loan.nftTokenId
    };
  }

  private sortByLoanId(loans: ForeclosureLoan[]): ForeclosureLoan[] {
    return [...loans].sort((a, b) => Number(a.loanId) - Number(b.loanId));
  }
}
