import { addSeconds } from 'date-fns';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ArchivedEvent,
  ContractRepository,
  EventArchiveRepositoryToken,
  type EventArchiveRepository
} from '@nftfi.api/modules/ethers-observer';
import {
  MarketLoan,
  MarketLoanProtocol,
  MarketLoanRepository,
  MarketLoanStatus
} from '@nftfi.api/repositories/postgres/market-loan';
import { NftfiSmartNftIdRepository } from '@nftfi.api/repositories/postgres/nftfi-smart-nft-id';
import { EthersFacade } from '@nftfi.api/modules/ethers-provider';
import { ListingsFacade } from '@nftfi.api/facades/listings';
import { ListingDeletedReason } from '@nftfi.api/repositories/postgres/listing';
import { LoanNotificationService } from '../../loan-notification';
import { LoanHelperService } from '../loan-helper.service';
import { LoanMath } from '../loan-math';
import { NftfiLoanMath } from './nftfi-loan-math';
import { NftfiLoanCoordinator } from './nftfi-loan-coordinator';
import { NftfiLoanV23RefinanceContract } from './loan-v2-3-refinance';
import { NftfiLoanV3RefinanceContract } from './loan-v3-refinance';
import { NftfiLoanV31RefinanceContract } from './loan-v31-refinance';
import type {
  LoanLiquidatedMetadata,
  LoanLiquidatedPayload,
  LoanRefinancedEventPayload,
  LoanRefinancedPayload,
  LoanRenegotiatedMetadata,
  LoanRenegotiatedPayload,
  LoanRepaidMetadata,
  LoanRepaidPayload,
  LoanStartedMetadata,
  LoanStartedPayload
} from './nftfi-loan.types';

const RefiContracts = [NftfiLoanV23RefinanceContract, NftfiLoanV3RefinanceContract, NftfiLoanV31RefinanceContract];
const REFI_LOOKUP_ATTEMPTS = 3;
const REFI_LOOKUP_DELAY_MS = 5000;
const NOTIFICATION_BLOCK_RANGE = 10000;

@Injectable()
export class NftfiLoanService {
  private refiContractAddresses: string[] = [];
  private readonly logger = new Logger(NftfiLoanService.name);

  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly ethersFacade: EthersFacade,
    private readonly loanRepository: MarketLoanRepository,
    private readonly loanHelper: LoanHelperService,
    private readonly notificationService: LoanNotificationService,
    private readonly loanCoordinator: NftfiLoanCoordinator,
    private readonly smartNftDataRepository: NftfiSmartNftIdRepository,
    private readonly listingsFacade: ListingsFacade,
    @Inject(EventArchiveRepositoryToken) private readonly eventArchiveRepository: EventArchiveRepository
  ) {}

  async create(payload: LoanStartedPayload, metadata: LoanStartedMetadata): Promise<void> {
    const asset = await this.loanHelper.getAsset(
      payload.nftCollateralContract,
      payload.nftCollateralId,
      `${metadata.contract}#${payload.loanId}`
    );

    const startedAt = new Date(Number(payload.loanStartTime) * 1000);
    const duration = Number(payload.loanDuration);
    const amounts = await this.loanHelper.getAmounts(
      {
        principal: payload.loanPrincipalAmount,
        repayment: '0',
        repaymentMax: payload.maximumRepaymentAmount,
        interest: LoanMath.calculateInterest(payload.loanPrincipalAmount, payload.maximumRepaymentAmount),
        originationFee: payload.originationFee,
        adminFee: NftfiLoanMath.calculateFee(payload.loanPrincipalAmount, payload.loanAdminFeeInBasisPoints)
      },
      payload.loanERC20Denomination,
      startedAt
    );

    const loan = await this.loanRepository.upsert({
      lender: payload.lender,
      borrower: payload.borrower,
      loanId: String(payload.loanId),
      protocol: MarketLoanProtocol.Nftfi,
      contract: metadata.contract,
      currency: payload.loanERC20Denomination,
      nftContract: payload.nftCollateralContract,
      nftTokenId: payload.nftCollateralId,
      asset: { id: asset.id },
      ...amounts,
      apr: NftfiLoanMath.calculateApr(payload.loanPrincipalAmount, payload.maximumRepaymentAmount, duration),
      eapr: NftfiLoanMath.calculateEffectiveApr(
        payload.loanPrincipalAmount,
        payload.maximumRepaymentAmount,
        duration,
        payload.originationFee
      ),
      prorated: payload.isProRata,
      status: MarketLoanStatus.Active,
      startedAt,
      startedTx: metadata.tx,
      dueAt: addSeconds(startedAt, duration),
      duration
    });

    const smartNftId = await this.loanCoordinator.getSmartNftId(metadata.contract, String(payload.loanId));
    if (smartNftId) {
      await this.smartNftDataRepository.create(loan, smartNftId);
    }

    await this.loanHelper.invalidateCache();
    await this.loanHelper.deleteWinningOffer({
      lender: payload.lender,
      nftContract: payload.nftCollateralContract,
      nftTokenId: payload.nftCollateralId,
      currency: payload.loanERC20Denomination,
      principal: payload.loanPrincipalAmount,
      repaymentMax: payload.maximumRepaymentAmount,
      duration
    });
    if (await this.ethersFacade.isWithinBlockRange(metadata.blockNumber, NOTIFICATION_BLOCK_RANGE)) {
      await this.listingsFacade.deleteByNftKey(
        payload.nftCollateralContract,
        payload.nftCollateralId,
        ListingDeletedReason.LoanStarted
      );
      await this.notificationService.notifyLoanStarted(metadata.eventId, loan);
    }
  }

  async createV3(payload: LoanStartedPayload, metadata: LoanStartedMetadata): Promise<void> {
    const borrower = await this.tryResolveRefiBorrower(payload, metadata);

    await this.create({ ...payload, borrower }, metadata);
  }

  async renegotiate(payload: LoanRenegotiatedPayload, metadata: LoanRenegotiatedMetadata): Promise<void> {
    const loan = await this.loanHelper.getLoanByKey(metadata.contract, payload.loanId);
    const amounts = await this.loanHelper.getAmounts(
      {
        repayment: '0',
        repaymentMax: payload.newMaximumRepaymentAmount,
        interest: LoanMath.calculateInterest(loan.principal, payload.newMaximumRepaymentAmount)
      },
      loan.currency,
      metadata.emittedAt
    );

    const updatedLoan = await this.loanRepository.updateByKey(metadata.contract, payload.loanId, {
      status: MarketLoanStatus.Active,
      ...amounts,
      apr: NftfiLoanMath.calculateApr(loan.principal, payload.newMaximumRepaymentAmount, payload.newLoanDuration),
      eapr: NftfiLoanMath.calculateEffectiveApr(
        loan.principal,
        payload.newMaximumRepaymentAmount,
        payload.newLoanDuration,
        loan.originationFee
      ),
      prorated: payload.isProRata,
      duration: payload.newLoanDuration,
      dueAt: addSeconds(loan.startedAt, payload.newLoanDuration)
    });
    await this.loanHelper.invalidateCache();
    await this.loanHelper.acceptRenegotiation(payload.loanId, metadata.contract);
    if (await this.ethersFacade.isWithinBlockRange(metadata.blockNumber, NOTIFICATION_BLOCK_RANGE)) {
      await this.notificationService.notifyLoanRenegotiated(metadata.eventId, updatedLoan);
    }
  }

  async liquidate(payload: LoanLiquidatedPayload, metadata: LoanLiquidatedMetadata): Promise<void> {
    const updatedLoan = await this.loanRepository.updateByKey(metadata.contract, payload.loanId, {
      status: MarketLoanStatus.Liquidated,
      endedAt: metadata.emittedAt,
      endedTx: metadata.tx
    });
    await this.loanHelper.invalidateCache();
    if (await this.ethersFacade.isWithinBlockRange(metadata.blockNumber, NOTIFICATION_BLOCK_RANGE)) {
      await this.notificationService.notifyLoanLiquidated(metadata.eventId, updatedLoan);
    }
  }

  async repay(payload: LoanRepaidPayload, metadata: LoanRepaidMetadata): Promise<void> {
    const loan = await this.loanHelper.getLoanByKey(metadata.contract, payload.loanId);
    const amounts = await this.loanHelper.getAmounts(
      {
        repayment: payload.amountPaidToLender,
        interest: LoanMath.calculateInterest(payload.loanPrincipalAmount, payload.amountPaidToLender),
        adminFee: payload.adminFee
      },
      loan.currency,
      metadata.emittedAt
    );

    const updatedLoan = await this.loanRepository.updateByKey(metadata.contract, payload.loanId, {
      status: MarketLoanStatus.Repaid,
      endedAt: metadata.emittedAt,
      endedTx: metadata.tx,
      ...amounts,
      eapr: NftfiLoanMath.calculateEffectiveApr(
        loan.principal,
        payload.amountPaidToLender,
        loan.duration,
        loan.originationFee
      )
    });
    await this.loanHelper.invalidateCache();
    if (await this.ethersFacade.isWithinBlockRange(metadata.blockNumber, NOTIFICATION_BLOCK_RANGE)) {
      await this.notificationService.notifyLoanRepaid(metadata.eventId, updatedLoan);
    }
  }

  async updateLoansWithRefiBorrower(): Promise<void> {
    const refiContractAddresses = this.getRefinanceContractAddresses();
    const missingRefiLoans: Pick<MarketLoan, 'contract' | 'loanId'>[] = [];
    let updatedCount = 0;
    for await (const loan of this.loanRepository.iterateBorrowersByProtocol(
      MarketLoanProtocol.Nftfi,
      refiContractAddresses
    )) {
      const events = await this.eventArchiveRepository.findByTxHash<LoanRefinancedEventPayload>(loan.startedTx);
      if (!events.length) {
        this.logger.warn(`No events found for loan refinance tx ${loan.startedTx}, skipping`);
        continue;
      }
      const refiLoan = await this.getRefinancedLoan({ borrower: loan.borrower, loanId: loan.loanId }, events);
      if (!refiLoan) {
        missingRefiLoans.push({ contract: loan.contract, loanId: loan.loanId });
        continue;
      }

      await this.loanRepository.updateByKey(loan.contract, loan.loanId, { borrower: refiLoan.borrower });
      updatedCount++;

      this.logger.log(
        `Updated loan borrower for contract=${loan.contract} loanId=${loan.loanId} to ${refiLoan.borrower}`
      );
    }

    if (missingRefiLoans.length) {
      const loansstr = missingRefiLoans.map(loan => `contract=${loan.contract} loanId=${loan.loanId}`).join('; ');
      this.logger.warn(
        `Could not find refinance event for ${missingRefiLoans.length} loans with borrower as refinance contract. Loans: ${loansstr}`
      );
    }

    if (updatedCount) {
      await this.loanHelper.invalidateCache();
    }
  }

  private async getRefinancedLoan(
    payload: LoanRefinancedPayload,
    events: ArchivedEvent<LoanRefinancedEventPayload>[]
  ): Promise<MarketLoan | null> {
    const refinanceContractAddresses = this.getRefinanceContractAddresses();
    if (!refinanceContractAddresses.includes(payload.borrower.toLowerCase())) {
      return null;
    }

    const refiEvent = events.find(event => Number(event.args.newLoanId) === Number(payload.loanId));
    if (!refiEvent) return null;

    const loan = await this.loanRepository.findByKey(refiEvent.args.oldLoanContract, refiEvent.args.oldLoanId);
    if (!loan || refinanceContractAddresses.includes(loan.borrower.toLowerCase())) {
      return null;
    }

    return loan;
  }

  private getRefinanceContractAddresses(): string[] {
    if (this.refiContractAddresses.length) {
      return this.refiContractAddresses;
    }

    this.refiContractAddresses = RefiContracts.map(type => {
      const contract = this.contractRepository.findByType(type);
      if (!contract) {
        throw new Error(`Contract not found for type ${type.name}, cannot determine refinance contract address`);
      }
      return contract.address.toLowerCase();
    });

    return this.refiContractAddresses;
  }

  private async tryResolveRefiBorrower(payload: LoanStartedPayload, metadata: LoanStartedMetadata): Promise<string> {
    const refiContractAddresses = this.getRefinanceContractAddresses();
    if (!refiContractAddresses.includes(payload.borrower.toLowerCase())) {
      return payload.borrower;
    }

    for (let attempt = 1; attempt <= REFI_LOOKUP_ATTEMPTS; attempt++) {
      for (const address of refiContractAddresses) {
        const events = await this.eventArchiveRepository.findByContractEvents<LoanRefinancedEventPayload>(
          address,
          [NftfiLoanV3RefinanceContract.Event.Refinanced],
          metadata.blockNumber,
          metadata.blockNumber
        );
        const loan = await this.getRefinancedLoan(payload, events);
        if (loan) return loan.borrower;
      }

      if (attempt < REFI_LOOKUP_ATTEMPTS) {
        await new Promise(r => setTimeout(r, REFI_LOOKUP_DELAY_MS));
      }
    }

    return payload.borrower;
  }
}
