import * as express from 'express';
import {
  Inject,
  Injectable,
  NotFoundException,
  PipeTransform,
  Scope,
  UnauthorizedException,
  UnprocessableEntityException
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import {
  MarketLoanProtocol,
  MarketLoanRepository,
  MarketLoanStatus
} from '@nftfi.api/repositories/postgres/market-loan';
import { getDecodedAuthTokenFromRequest } from '@nftfi.api/modules/auth-guard';
import { DraftRenegotiationV1Dto } from '../dtos';

@Injectable({ scope: Scope.REQUEST })
export class RenegotiationV1OfferValidationPipe implements PipeTransform<DraftRenegotiationV1Dto> {
  constructor(
    @Inject(REQUEST) private readonly request: express.Request,
    private readonly marketLoanRepository: MarketLoanRepository
  ) {}

  async transform(draft: DraftRenegotiationV1Dto): Promise<DraftRenegotiationV1Dto> {
    this.assertLenderIsCaller(draft.lender.address);

    const loan = await this.marketLoanRepository.findById(draft.loan.id);
    if (!loan) {
      throw new NotFoundException({
        errors: { 'loan.id': [`Loan ${draft.loan.id} not found`] }
      });
    }
    if (loan.protocol !== MarketLoanProtocol.Nftfi) {
      throw new UnprocessableEntityException({
        errors: { 'loan.id': [`Loan ${draft.loan.id} is not an NFTfi loan`] }
      });
    }
    if (loan.status !== MarketLoanStatus.Defaulted) {
      throw new UnprocessableEntityException({
        errors: { 'loan.id': [`Loan ${draft.loan.id} is not defaulted`] }
      });
    }
    this.assertLenderMatchesLoan(loan.lender, draft.lender.address);

    return draft;
  }

  private assertLenderIsCaller(lenderAddress: string): void {
    const account = getDecodedAuthTokenFromRequest(this.request)?.account;
    if (!account || account.toLowerCase() !== lenderAddress.toLowerCase()) {
      throw new UnauthorizedException({
        errors: { lender: ['Authenticated wallet must match the lender address'] }
      });
    }
  }

  private assertLenderMatchesLoan(loanLender: string, lenderAddress: string): void {
    if (loanLender.toLowerCase() !== lenderAddress.toLowerCase()) {
      throw new UnauthorizedException({
        errors: { lender: ['Lender address does not match the lender on the underlying loan'] }
      });
    }
  }
}
