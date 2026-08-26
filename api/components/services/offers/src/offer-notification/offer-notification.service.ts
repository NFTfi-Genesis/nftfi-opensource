import { format } from 'date-fns';
import { Injectable } from '@nestjs/common';
import { isCommsFrequencyMatchesNow } from '@nftfi.api/core/utils/cron';
import { EmailNotificationsFacade, EmailTemplate, SendEmailPayload } from '@nftfi.api/facades/email-notifications';
import { AccountsFacade } from '@nftfi.api/facades/accounts';
import { CommsFrequency } from '@nftfi.api/repositories/postgres/account';
import { Offer, OfferRepository } from '@nftfi.api/repositories/postgres/offer';
import { MarketLoanRepository, MarketLoanStatus } from '@nftfi.api/repositories/postgres/market-loan';
import { EmailSubject } from './offer-notification.types';
import { OfferNotificationContextService } from './offer-notification-context.service';

@Injectable()
export class OfferNotificationService {
  constructor(
    private readonly offerRepository: OfferRepository,
    private readonly accountsFacade: AccountsFacade,
    private readonly notificationFacade: EmailNotificationsFacade,
    private readonly contextService: OfferNotificationContextService,
    private readonly marketLoanRepository: MarketLoanRepository
  ) {}

  async notifyBorrowersAboutLiquidutyOffers(): Promise<void> {
    const walletAddresses = await this.offerRepository.findActiveBorrowers();
    for (const wallet of walletAddresses) {
      const accountDetail = await this.accountsFacade.getAccountWithEmail(wallet);
      if (!accountDetail) continue;

      const frequency = accountDetail.communications?.liquidity?.frequency || CommsFrequency.Daily;
      if (!isCommsFrequencyMatchesNow(frequency)) continue;

      const offers = await this.offerRepository.findByBorrower(wallet);
      if (!offers.length) continue;

      const formattedTime = format(new Date(), `dd-MM-yyyTHH:mm`);
      await this.notificationFacade
        .sendMessage({
          commsId: `${accountDetail.wallet}-available-liquidity-${formattedTime}`,
          to: accountDetail.email,
          subject: EmailSubject.OffersSummaryBorrower,
          template: EmailTemplate.OffersSummaryBorrower,
          context: await this.contextService.getBorrowerLiquidutySummary(accountDetail.wallet, offers)
        })
        .catch(() => void 0);
    }
  }

  async notifyBorrowerReceivedOffer(offer: Offer): Promise<void> {
    const borrowerAccount = await this.accountsFacade.getAccountWithEmail(offer.borrower);
    if (!borrowerAccount) return;

    const count = await this.offerRepository.count({
      nftContract: offer.nftContract,
      nftTokenIdFrom: offer.nftTokenIdFrom,
      borrower: offer.borrower
    });

    if (count > 1) return;

    const [loan] = await this.marketLoanRepository.find(
      {
        statuses: [MarketLoanStatus.Active],
        nftContracts: [offer.nftContract],
        nftIds: [offer.nftTokenIdFrom],
        lender: offer.lender,
        borrower: offer.borrower
      },
      { skip: 0, limit: 1, sort: { by: 'repaymentMax', direction: 'DESC' } }
    );

    const mailOptions: Omit<SendEmailPayload, 'to'> = !loan
      ? {
          commsId: `${EmailTemplate.OfferBorrower}-${offer.id}`,
          subject: EmailSubject.OfferBorrower,
          template: EmailTemplate.OfferBorrower,
          context: await this.contextService.getOffer(offer)
        }
      : {
          commsId: `${EmailTemplate.OfferRefiBorrower}-${offer.id}`,
          subject: EmailSubject.OfferRefiBorrower,
          template: EmailTemplate.OfferRefiBorrower,
          context: await this.contextService.getRefiOffer(offer, loan)
        };

    await this.notificationFacade
      .sendMessage({ ...mailOptions, to: borrowerAccount.email } as SendEmailPayload)
      .catch(() => void 0);
  }
}
