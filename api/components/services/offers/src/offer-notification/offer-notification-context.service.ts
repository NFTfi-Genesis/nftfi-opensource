import { addDays, format, secondsToHours } from 'date-fns';
import { formatUnits } from 'ethers/lib/utils';
import _ from 'lodash';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrencyConfig, SupportedCurrencies } from '@nftfi.api/core';
import { MarketLoan } from '@nftfi.api/repositories/postgres/market-loan';
import { Offer } from '@nftfi.api/repositories/postgres/offer';
import {
  AssetOffer,
  AssetOfferGroup,
  OfferLiquidityContext,
  OfferBorrowerContext,
  OfferRefiBorrowerContext
} from '@nftfi.api/facades/email-notifications';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { Config } from '../config';
import { ServiceConfig } from './offer-notification.types';

@Injectable()
export class OfferNotificationContextService {
  private readonly config: ServiceConfig;

  constructor(
    private readonly supportedCurrencies: SupportedCurrencies,
    private readonly assetQueueFacade: AssetsFacade,
    configService: ConfigService
  ) {
    const dapp = configService.get<Config['dapp']>('dapp')!;
    this.config = {
      nftfiUrl: dapp.url!
    };
  }

  async getBorrowerLiquidutySummary(account: string, offers: Offer[]): Promise<OfferLiquidityContext> {
    const mappedOffers = offers.map<AssetOffer>(offer => {
      const currency = this.supportedCurrencies.getByContract(offer.currency);
      const durationDays = offer.duration / 60 / 60 / 24;
      const dueDate = addDays(offer.createdAt, durationDays);

      return {
        offerId: String(offer.id),
        nftKey: this.buildNftKey(offer),
        nftCollateralContract: offer.nftContract,
        nftCollateralId: offer.nftTokenIdFrom,
        lender: offer.lender.slice(0, 7),
        principal: this.formatCurrency(offer.principal, currency),
        repayment: this.formatCurrency(offer.repaymentMax, currency),
        currency: {
          ticker: currency.ticker
        },
        durationDays,
        dueDate: format(dueDate, `HH:mm EEEE do MMM (zzz)`),
        apr: offer.apr
      };
    });
    const assetOfferGroupMap = _(mappedOffers)
      .groupBy(o => o.nftKey)
      .value();

    const assetOfferGroups: AssetOfferGroup[] = [];
    for (const key in assetOfferGroupMap) {
      const groupOffer = assetOfferGroupMap[key][0];
      const groupOffers = assetOfferGroupMap[key].sort((a: AssetOffer, b: AssetOffer) => Number(b.apr) - Number(a.apr));
      const bestOffers = groupOffers.slice(0, 3);

      assetOfferGroups.push({
        ...(await this.getAssetContext(groupOffer.nftCollateralContract, groupOffer.nftCollateralId)),
        assetUrl: this.getAssetUrl(groupOffer.nftCollateralContract, groupOffer.nftCollateralId),
        offers: bestOffers,
        totalOffers: groupOffers.length
      });
    }

    return {
      borrower: account,
      assetOfferGroups,
      assetUrl: this.getBorrowOffersUrl()
    };
  }

  async getOffer(offer: Offer): Promise<OfferBorrowerContext> {
    const currency = this.supportedCurrencies.getByContract(offer.currency);
    return {
      ...(await this.getAssetContext(offer.nftContract, offer.nftTokenIdFrom)),
      dueTime: this.formatDate(offer.expiresAt),
      borrower: offer.borrower,
      lender: offer.lender,
      durationDays: secondsToHours(offer.duration) / 24,
      assetUrl: this.getAssetUrl(offer.nftContract, offer.nftTokenIdFrom),
      apr: offer.apr,
      principal: this.formatCurrency(offer.principal, currency),
      repayment: this.formatCurrency(offer.repaymentMax, currency),
      currency: {
        ticker: currency.ticker
      }
    };
  }

  async getRefiOffer(offer: Offer, loan: MarketLoan): Promise<OfferRefiBorrowerContext> {
    const dueDate = new Date(loan.startedAt.getTime() + offer.duration * 1000);
    const currency = this.supportedCurrencies.getByContract(offer.currency);
    const offerRepaymentWei = Number(offer.repaymentMax);
    const loanRepaymentMaxWei = Number(loan.repaymentMax);

    return {
      ...(await this.getAssetContext(offer.nftContract, offer.nftTokenIdFrom)),
      borrower: loan.borrower,
      lender: loan.lender,
      assetUrl: this.getAssetUrl(offer.nftContract, offer.nftTokenIdFrom),
      dueTime: format(dueDate, 'dd MMM yyyy'),
      diffApr: offer.apr - loan.apr,
      oldApr: loan.apr,
      newApr: offer.apr,
      oldRepayment: this.formatCurrency(loan.repaymentMax, currency),
      newRepayment: this.formatCurrency(offer.repaymentMax, currency),
      diffRepayment: this.formatCurrency(offerRepaymentWei - loanRepaymentMaxWei, currency),
      oldDurationDays: loan.duration / 86400,
      newDurationDays: offer.duration / 86400,
      fee: this.formatCurrency(offer.originationFee, currency),
      loanId: Number(loan.loanId),
      currency
    };
  }

  private buildNftKey(offer: Pick<Offer, 'nftContract' | 'nftTokenIdFrom'>): string {
    return `${offer.nftContract}-${offer.nftTokenIdFrom}`;
  }

  private getAssetUrl(nftContract: string, nftTokenId: string): string {
    return new URL(`/assets/${nftContract}/${nftTokenId}`, this.config.nftfiUrl).toString();
  }

  private getBorrowOffersUrl(): string {
    return new URL('/borrow/offers', this.config.nftfiUrl).toString();
  }

  private formatCurrency(amount: string | number, config: CurrencyConfig): number {
    return Number(formatUnits(amount.toLocaleString('fullwide', { useGrouping: false }), config.denomination));
  }

  private async getAssetContext(
    nftContract: string,
    nftTokenId: string
  ): Promise<{ assetCategory: string; assetName: string; imagePreviewUrl: string }> {
    const asset = await this.assetQueueFacade.getAssetByKey(nftContract, nftTokenId);
    if (!asset) {
      return {
        assetCategory: '',
        assetName: '',
        imagePreviewUrl: ''
      };
    }

    return {
      assetCategory: asset.collection.name,
      assetName: asset.collection.name,
      imagePreviewUrl: asset.imageMediumUrl
    };
  }

  private formatDate(date: Date): string {
    return format(date, 'HH:mm dd MMM yyyy OOOO');
  }
}
