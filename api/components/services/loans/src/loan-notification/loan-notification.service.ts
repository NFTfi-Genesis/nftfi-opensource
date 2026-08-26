import _ from 'lodash';
import { add, format, sub, differenceInDays } from 'date-fns';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isCommsFrequencyMatchesNow } from '@nftfi.api/core/utils/cron';
import { EmailAttachmentType, EmailNotificationsFacade, EmailTemplate } from '@nftfi.api/facades/email-notifications';
import { DiscordMessageType, DiscordNotificationsFacade } from '@nftfi.api/facades/discord-notifications';
import { AccountsFacade } from '@nftfi.api/facades/accounts';
import { MarketLoan, MarketLoanProtocol, MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { CommsFrequency } from '@nftfi.api/repositories/postgres/account';
import { Config } from '../config';
import { EmailSubject, MaturingMarketLoan, ServiceConfig } from './loan-notification.types';
import { LoanNotificationContextService } from './loan-notification-context.service';

@Injectable()
export class LoanNotificationService {
  private readonly config: Pick<ServiceConfig, 'nfts'>;

  constructor(
    private readonly loanRepository: MarketLoanRepository,
    private readonly accountsFacade: AccountsFacade,
    private readonly contextService: LoanNotificationContextService,
    private readonly mailerFacade: EmailNotificationsFacade,
    private readonly discordFacade: DiscordNotificationsFacade,
    configService: ConfigService
  ) {
    const nfts = configService.get<Config['nfts']>('nfts')!;

    this.config = {
      nfts: { ignored: nfts.ignored }
    };
  }

  async notifyLoansMaturityByLender(): Promise<void> {
    const loanGroups = await this.getMaturingLoansByLender();

    for (const [lender, loanGroup] of loanGroups) {
      const lenderAccount = await this.accountsFacade.getAccountWithEmail(lender);
      if (!lenderAccount?.email) continue;

      const frequency = lenderAccount.communications?.maturity?.frequency || CommsFrequency.Daily;
      if (!isCommsFrequencyMatchesNow(frequency)) continue;

      const commsId = `${EmailTemplate.LoansMaturityByLender}:${lender}-${format(new Date(), 'yyyy-MM-dd')}`;

      await this.mailerFacade
        .sendMessage({
          commsId,
          to: lenderAccount.email,
          subject: EmailSubject.LoansMaturityByLender,
          template: EmailTemplate.LoansMaturityByLender,
          context: await this.contextService.getLoansMaturityContext(lender, loanGroup)
        })
        .catch(() => void 0);
    }
  }

  async notifyLoansMaturityByBorrower(): Promise<void> {
    const dueDate = add(new Date(), { days: 1 });
    const loans = await this.loanRepository.findMaturing(MarketLoanProtocol.Nftfi, dueDate);

    for (const loan of loans) {
      const borrowerAccount = await this.accountsFacade.getAccountWithEmail(loan.borrower);
      if (!borrowerAccount?.email) continue;

      const commsId = `${EmailTemplate.LoansMaturityByBorrower}:${loan.borrower}-${loan.id}`;

      await this.mailerFacade
        .sendMessage({
          commsId,
          to: borrowerAccount.email,
          subject: EmailSubject.LoansMaturityByBorrower,
          template: EmailTemplate.LoansMaturityByBorrower,
          context: await this.contextService.getLoansMaturityByBorrowerContext(loan)
        })
        .catch(() => void 0);
    }
  }

  // async notifyLoansMaturityOnPlatform(): Promise<void> {
  //   const wallets = await this.loanRepository.findDistinctWalletsByKey('lender');
  //   const allAccounts = await Promise.all(wallets.map(wallet => this.accountsFacade.getAccountWithEmail(wallet)));
  //   const suitableAccounts = allAccounts.filter(account => {
  //     if (!account) return false;
  //     const frequency = account.communications?.refi?.frequency || CommsFrequency.Daily;
  //     return isCommsFrequencyMatchesNow(frequency);
  //   });
  //   const now = new Date();
  //   const loanEndDate = add(now, { days: 7 });
  //   const offerStartDate = sub(now, { years: 1 });

  //   for (const { account, email } of suitableAccounts) {
  //     const loans = await this.loanRepository.findMaturingByLender(account, loanEndDate, offerStartDate);
  //     if (!loans.length) continue;

  //     const commsId = `${EmailTemplate.LoansMaturityOnPlatform}:${account}-${format(new Date(), 'yyyy-MM-dd')}`;

  //     await this.mailerFacade
  //       .sendMessage({
  //         commsId,
  //         to: email,
  //         subject: EmailSubject.LoansMaturityOnPlatform,
  //         template: EmailTemplate.LoansMaturityOnPlatform,
  //         context: await this.contextService.getLoansMaturityContext(account, loans)
  //       })
  //       .catch(() => void 0);
  //   }
  // }

  async notifyLoanStarted(eventId: string, loan: MarketLoan): Promise<void> {
    const context = await this.contextService.getLoanStarted(loan);
    const borrowerAccount = await this.accountsFacade.getAccountWithEmail(loan.borrower);

    if (borrowerAccount?.email) {
      const loanDueTime = loan.dueAt!;
      const fDueAt = format(loanDueTime, 'h:mm a, d MMMM u (zzz)');
      const icsEvent = {
        start: sub(loanDueTime, { hours: 1 }),
        end: loanDueTime,
        title: `NFTfi loan repayment on ${context.assetName} is due`,
        description: `${context.assetName} is currently held in escrow in a NFTfi contract and will be released back to you if a repayment amount of ${context.repayment} ${context.currency.ticker} is made before ${fDueAt}`
      };

      await this.mailerFacade
        .sendMessage({
          commsId: eventId,
          to: borrowerAccount.email,
          subject: EmailSubject.LoanStartedBorrower,
          template: EmailTemplate.LoanStartedBorrower,
          context,
          attachments: [{ type: EmailAttachmentType.ICS, ...icsEvent }]
        })
        .catch(() => void 0);
    }

    const lenderAccount = await this.accountsFacade.getAccountWithEmail(loan.lender);
    if (lenderAccount?.email) {
      await this.mailerFacade
        .sendMessage({
          commsId: eventId,
          to: lenderAccount.email,
          subject: EmailSubject.LoanStartedLender,
          template: EmailTemplate.LoanStartedLender,
          context
        })
        .catch(() => void 0);
    }

    if (!this.isIgnoredNft(loan.nftContract, loan.nftTokenId)) {
      await this.discordFacade
        .sendMessage({
          commsId: eventId,
          type: DiscordMessageType.LoanStarted,
          context
        })
        .catch(() => void 0);
    }
  }

  async notifyLoanRepaid(eventId: string, loan: MarketLoan): Promise<void> {
    const borrowerAccount = await this.accountsFacade.getAccountWithEmail(loan.borrower);
    if (borrowerAccount?.email) {
      await this.mailerFacade
        .sendMessage({
          commsId: eventId,
          to: borrowerAccount.email,
          subject: EmailSubject.LoanRepaidBorrower,
          template: EmailTemplate.LoanRepaidBorrower,
          context: await this.contextService.getLoanRepaidBorrower(loan)
        })
        .catch(() => void 0);
    }

    const lenderAccount = await this.accountsFacade.getAccountWithEmail(loan.lender);
    if (lenderAccount?.email) {
      await this.mailerFacade
        .sendMessage({
          commsId: eventId,
          to: lenderAccount.email,
          subject: EmailSubject.LoanRepaidLender,
          template: EmailTemplate.LoanRepaidLender,
          context: await this.contextService.getLoanRepaidLender(loan)
        })
        .catch(() => void 0);
    }

    if (!this.isIgnoredNft(loan.nftContract, loan.nftTokenId)) {
      await this.discordFacade
        .sendMessage({
          commsId: eventId,
          type: DiscordMessageType.LoanRepaid,
          context: await this.contextService.getLoanRepaid(loan)
        })
        .catch(() => void 0);
    }
  }

  async notifyLoanLiquidated(eventId: string, loan: MarketLoan): Promise<void> {
    const context = await this.contextService.getLoanLiquidated(loan);
    const borrowerAccount = await this.accountsFacade.getAccountWithEmail(loan.borrower);
    if (borrowerAccount?.email) {
      await this.mailerFacade
        .sendMessage({
          commsId: eventId,
          to: borrowerAccount.email,
          subject: EmailSubject.LoanLiquidatedBorrower,
          template: EmailTemplate.LoanLiquidatedBorrower,
          context
        })
        .catch(() => void 0);
    }
    const lenderAccount = await this.accountsFacade.getAccountWithEmail(loan.lender);
    if (lenderAccount?.email) {
      await this.mailerFacade
        .sendMessage({
          commsId: eventId,
          to: lenderAccount.email,
          subject: EmailSubject.LoanLiquidatedLender,
          template: EmailTemplate.LoanLiquidatedLender,
          context
        })
        .catch(() => void 0);
    }

    if (!this.isIgnoredNft(loan.nftContract, loan.nftTokenId)) {
      await this.discordFacade
        .sendMessage({
          commsId: eventId,
          type: DiscordMessageType.LoanLiquidated,
          context
        })
        .catch(() => void 0);
    }
  }

  async notifyLoanRenegotiated(eventId: string, loan: MarketLoan): Promise<void> {
    const context = await this.contextService.getLoanRenegotiated(loan);
    const borrowerAccount = await this.accountsFacade.getAccountWithEmail(loan.borrower);
    if (borrowerAccount?.email) {
      await this.mailerFacade
        .sendMessage({
          commsId: `${eventId}-borrower`,
          to: borrowerAccount.email,
          subject: EmailSubject.LoanRenegotiatedBorrower,
          template: EmailTemplate.LoanRenegotiatedBorrower,
          context
        })
        .catch(() => void 0);
    }
    const lenderAccount = await this.accountsFacade.getAccountWithEmail(loan.lender);
    if (lenderAccount?.email) {
      await this.mailerFacade
        .sendMessage({
          commsId: `${eventId}-lender`,
          to: lenderAccount.email,
          subject: EmailSubject.LoanRenegotiatedLender,
          template: EmailTemplate.LoanRenegotiatedLender,
          context
        })
        .catch(() => void 0);
    }
  }

  private isIgnoredNft(address: string, tokenId: string): boolean {
    return !!this.config.nfts.ignored.find(
      nft => nft.address === address.toLowerCase() && nft.tokenId === tokenId.toString()
    );
  }

  private async getMaturingLoansByLender(): Promise<Map<string, MaturingMarketLoan[]>> {
    const dueDate = add(new Date(), { days: 7 });
    const loans = await this.loanRepository.findMaturing(MarketLoanProtocol.Nftfi, dueDate);
    const maturing: MaturingMarketLoan[] = loans.map(loan => {
      const maturingInDays = differenceInDays(loan.dueAt!, new Date());
      return Object.assign(loan, { maturingIn: maturingInDays });
    });

    const sortedmaturing = _.sortBy(maturing, l => l.maturingIn);
    const loanGroups = new Map<string, MaturingMarketLoan[]>();
    for (const loan of sortedmaturing) {
      if (!loanGroups.has(loan.lender)) {
        loanGroups.set(loan.lender, [loan]);
      } else {
        const group = loanGroups.get(loan.lender)!;
        loanGroups.set(loan.lender, group.concat(loan));
      }
    }

    return loanGroups;
  }
}
