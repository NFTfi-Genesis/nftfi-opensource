import { Injectable } from '@nestjs/common';
import { formatUnits } from 'ethers/lib/utils';
import { format } from 'date-fns';
import { ConfigService } from '@nestjs/config';
import { MarketLoan } from '@nftfi.api/repositories/postgres/market-loan';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { LoansMaturityByBorrowerContext, LoansMaturityContext } from '@nftfi.api/facades/email-notifications';
import { DiscordMessageLoanRepaidContextDto } from '@nftfi.api/facades/discord-notifications';
import { Config } from '../config';
import { ServiceConfig } from './loan-notification.types';
import {
  LoanLiquidatedContext,
  LoanStartedContext,
  LoanRenegotiatedContext,
  LoanRepaidBorrowerContext,
  LoanRepaidLenderContext
} from './loan-notification-context.types';

@Injectable()
export class LoanNotificationContextService {
  private readonly config: Pick<ServiceConfig, 'supportedCurrencies' | 'nftfiDappUrl'>;

  constructor(private readonly assetsFacade: AssetsFacade, configService: ConfigService) {
    const supportedCurrencies = configService.get<Config['supportedCurrencies']>('supportedCurrencies')!;
    const dapp = configService.get<Config['dapp']>('dapp')!;

    this.config = {
      supportedCurrencies,
      nftfiDappUrl: dapp.url
    };
  }

  async getLoanStarted(loan: MarketLoan): Promise<LoanStartedContext> {
    const currency = this.config.supportedCurrencies.getByContract(loan.currency);
    const assetUrl = this.getAssetUrl(loan.nftContract, loan.nftTokenId);

    return {
      borrower: loan.borrower,
      lender: loan.lender,
      loanId: loan.loanId,
      ...(await this.getAssetContext(loan.nftContract, loan.nftTokenId)),
      durationDays: Math.floor(loan.duration / 86400),
      principal: loan.principalEth,
      repayment: loan.repaymentMaxEth,
      assetUrlCallback: assetUrl + '?cal=open',
      assetUrl,
      currency: {
        ticker: currency.ticker
      },
      nftCollateralContract: loan.nftContract,
      nftCollateralId: loan.nftTokenId
    };
  }

  async getLoanRepaid(loan: MarketLoan): Promise<DiscordMessageLoanRepaidContextDto> {
    const currency = this.config.supportedCurrencies.getByContract(loan.currency);
    return {
      ...(await this.getAssetContext(loan.nftContract, loan.nftTokenId)),
      durationDays: Math.floor(loan.duration / 86400),
      principal: loan.principalEth,
      repayment: loan.repaymentEth,
      assetUrl: this.getAssetUrl(loan.nftContract, loan.nftTokenId),
      nftCollateralContract: loan.nftContract,
      nftCollateralId: loan.nftTokenId,
      currency: {
        ticker: currency.ticker
      }
    };
  }

  async getLoanRepaidBorrower(loan: MarketLoan): Promise<LoanRepaidBorrowerContext> {
    return {
      ...(await this.getAssetContext(loan.nftContract, loan.nftTokenId)),
      assetUrl: this.getAssetUrl(loan.nftContract, loan.nftTokenId),
      loanId: loan.loanId,
      borrower: loan.borrower
    };
  }

  async getLoanRepaidLender(loan: MarketLoan): Promise<LoanRepaidLenderContext> {
    const currency = this.config.supportedCurrencies.getByContract(loan.currency);
    return {
      ...(await this.getAssetContext(loan.nftContract, loan.nftTokenId)),
      borrower: loan.borrower,
      lender: loan.lender,
      loanId: loan.loanId,
      adminFee: formatUnits(loan.adminFee, currency.denomination),
      amountPaidToLender: formatUnits(loan.repayment, currency.denomination),
      currency: {
        ticker: currency.ticker
      },
      assetUrl: this.getAssetUrl(loan.nftContract, loan.nftTokenId)
    };
  }

  async getLoanLiquidated(loan: MarketLoan): Promise<LoanLiquidatedContext> {
    const currency = this.config.supportedCurrencies.getByContract(loan.currency);
    return {
      lender: loan.lender,
      borrower: loan.borrower,
      loanId: loan.loanId,
      nftCollateralContract: loan.nftContract,
      nftCollateralId: loan.nftTokenId,
      ...(await this.getAssetContext(loan.nftContract, loan.nftTokenId)),
      assetUrl: this.getAssetUrl(loan.nftContract, loan.nftTokenId),
      principal: loan.principalEth,
      repayment: loan.repaymentMaxEth,
      currency: {
        ticker: currency.ticker
      },
      durationDays: Math.floor(loan.duration / 86400)
    };
  }

  async getLoanRenegotiated(loan: MarketLoan): Promise<LoanRenegotiatedContext> {
    const currency = this.config.supportedCurrencies.getByContract(loan.currency);
    return {
      ...(await this.getAssetContext(loan.nftContract, loan.nftTokenId)),
      borrower: loan.borrower,
      lender: loan.lender,
      loanId: loan.loanId,
      newMaximumRepaymentAmount: formatUnits(loan.repayment, currency.denomination),
      renegotiationFee: formatUnits(loan.adminFee, currency.denomination),
      loanDueTime: this.formatDate(loan.dueAt!),
      currency: {
        ticker: currency.ticker
      },
      assetUrl: this.getAssetUrl(loan.nftContract, loan.nftTokenId)
    };
  }

  async getLoansMaturityContext(account: string, loans: MarketLoan[]): Promise<LoansMaturityContext> {
    return {
      account,
      entries: await Promise.all(
        loans.map(async loan => {
          const currency = this.config.supportedCurrencies.getByContract(loan.currency);
          return {
            ...(await this.getAssetContext(loan.nftContract, loan.nftTokenId)),
            lender: loan.lender,
            borrower: loan.borrower,
            assetUrl: this.getAssetUrl(loan.nftContract, loan.nftTokenId),
            principal: loan.principalEth,
            repayment: loan.repaymentMaxEth,
            apr: loan.apr,
            durationDays: Math.floor(loan.duration / 86400),
            dueTime: this.formatDate(loan.dueAt!),
            currency: {
              ticker: currency.ticker
            }
          };
        })
      )
    };
  }

  async getLoansMaturityByBorrowerContext(loan: MarketLoan): Promise<LoansMaturityByBorrowerContext> {
    const currency = this.config.supportedCurrencies.getByContract(loan.currency);
    return {
      ...(await this.getAssetContext(loan.nftContract, loan.nftTokenId)),
      lender: loan.lender,
      borrower: loan.borrower,
      loanId: loan.loanId,
      assetUrl: this.getAssetUrl(loan.nftContract, loan.nftTokenId),
      principal: loan.principalEth,
      repayment: loan.repaymentMaxEth,
      apr: loan.apr,
      durationDays: Math.floor(loan.duration / 86400),
      dueTime: this.formatDate(loan.dueAt!),
      currency: {
        ticker: currency.ticker
      }
    };
  }

  private async getAssetContext(
    nftCollateralContract: string,
    nftCollateralId: string
  ): Promise<{ assetCategory: string; assetName: string; imagePreviewUrl: string }> {
    const asset = await this.assetsFacade.getAssetByKey(nftCollateralContract, nftCollateralId);
    if (!asset) {
      return {
        assetCategory: '',
        assetName: '',
        imagePreviewUrl: ''
      };
    }

    return {
      assetCategory: asset.collection.name,
      assetName: asset.name,
      imagePreviewUrl: asset.imageMediumUrl
    };
  }

  private getAssetUrl(nftCollateralContract: string, nftCollateralId: string): string {
    return new URL(`/assets/${nftCollateralContract}/${nftCollateralId}`, this.config.nftfiDappUrl).toString();
  }

  private formatDate(date: Date): string {
    return format(new Date(date), 'HH:mm dd MMM yyyy OOOO');
  }
}
