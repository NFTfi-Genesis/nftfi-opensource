import {
  DiscordMessageLoanLiquidatedContextDto,
  DiscordMessageLoanStartedContextDto
} from '@nftfi.api/facades/discord-notifications';
import * as Mailer from '@nftfi.api/facades/email-notifications';

export type LoanStartedContext = Omit<Mailer.LoanStartedContext, 'principal' | 'repayment'> &
  DiscordMessageLoanStartedContextDto;

export type LoanLiquidatedContext = Mailer.LoanLiquidatedContext & DiscordMessageLoanLiquidatedContextDto;
export type LoanRenegotiatedContext = Mailer.LoanRenegotiatedContext;
export type LoanRepaidBorrowerContext = Mailer.LoanRepaidBorrowerContext;
export type LoanRepaidLenderContext = Mailer.LoanRepaidLenderContext;
