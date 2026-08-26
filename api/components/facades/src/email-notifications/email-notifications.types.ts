import { EmailAttachmentICSDto } from './email-attachment.dto';

export enum EmailTemplate {
  Main = 'main',
  LoanLiquidatedBorrower = 'loan-liquidated-borrower',
  LoanLiquidatedLender = 'loan-liquidated-lender',
  LoanRenegotiatedLender = 'loan-renegotiated-lender',
  LoanRenegotiatedBorrower = 'loan-renegotiated-borrower',
  LoanRepaidBorrower = 'loan-repaid-borrower',
  LoanRepaidLender = 'loan-repaid-lender',
  LoanStartedBorrower = 'loan-started-borrower',
  LoanStartedLender = 'loan-started-lender',
  LoansMaturityOnPlatform = 'loans-maturity-on-platform',
  LoansMaturityByLender = 'loans-maturity-by-lender',
  LoansMaturityByBorrower = 'loans-maturity-by-borrower',
  OffersSummaryBorrower = 'offers-summary-borrower',
  OfferBorrower = 'offer-borrower',
  OfferRefiBorrower = 'offer-refi-borrower',
  RenegotiationBorrower = 'renegotiation-borrower',
  RenegotiationLender = 'renegotiation-lender'
}

export type SendEmailPayload = {
  commsId: string;
  to: string;
  subject: string;
  attachments?: EmailAttachmentICSDto[];
  options?: { resend?: boolean };
} & (
  | {
      template: EmailTemplate.OffersSummaryBorrower;
      context: OfferLiquidityContext;
    }
  | {
      template: EmailTemplate.OfferBorrower;
      context: OfferBorrowerContext;
    }
  | {
      template: EmailTemplate.OfferRefiBorrower;
      context: OfferRefiBorrowerContext;
    }
  | {
      template: EmailTemplate.RenegotiationBorrower | EmailTemplate.RenegotiationLender;
      context: RenegotiationContext;
    }
  | {
      template: EmailTemplate.LoanStartedBorrower | EmailTemplate.LoanStartedLender;
      context: LoanStartedContext;
    }
  | {
      template: EmailTemplate.LoanRepaidBorrower;
      context: LoanRepaidBorrowerContext;
    }
  | {
      template: EmailTemplate.LoanRepaidLender;
      context: LoanRepaidLenderContext;
    }
  | {
      template: EmailTemplate.LoanLiquidatedBorrower | EmailTemplate.LoanLiquidatedLender;
      context: LoanLiquidatedContext;
    }
  | {
      template: EmailTemplate.LoanRenegotiatedBorrower | EmailTemplate.LoanRenegotiatedLender;
      context: LoanRenegotiatedContext;
    }
  | {
      template:
        | EmailTemplate.LoansMaturityOnPlatform
        | EmailTemplate.LoansMaturityByLender
        | EmailTemplate.LoansMaturityByBorrower;
      context: LoansMaturityContext;
    }
  | {
      template: EmailTemplate.LoansMaturityByBorrower;
      context: LoansMaturityByBorrowerContext;
    }
);

export interface AssetOffer {
  nftKey: string;
  nftCollateralContract: string;
  nftCollateralId: string;
  offerId: string;
  lender: string;
  principal: number;
  repayment: number;
  apr: number;
  durationDays: number;
  currency: {
    ticker: string;
  };
}

export interface AssetOfferGroup extends AssetMetadata {
  imagePreviewUrl: string;
  offers: AssetOffer[];
  totalOffers: number;
}

export interface OfferLiquidityContext {
  borrower: string;
  assetOfferGroups: AssetOfferGroup[];
  assetUrl: string;
}

export interface OfferBorrowerContext extends AssetMetadata {
  borrower: string;
  lender: string;
  principal: number;
  repayment: number;
  apr: number;
  imagePreviewUrl: string;
  durationDays: number;
  dueTime: string;
  currency: {
    ticker: string;
  };
}

export interface OfferRefiBorrowerContext extends AssetMetadata {
  lender: string;
  borrower: string;
  loanId: number;
  fee: number;
  oldDurationDays: number;
  newDurationDays: number;
  dueTime: string;
  oldRepayment: number;
  newRepayment: number;
  diffRepayment: number;
  oldApr: number;
  newApr: number;
  diffApr: number;
  currency: {
    ticker: string;
  };
}

export interface LoanStartedContext extends AssetMetadata {
  borrower: string;
  lender: string;
  loanId: string;
  principal: number;
  repayment: number;
  assetUrlCallback: string;
  durationDays: number;
  currency: {
    ticker: string;
  };
}

export interface LoanRepaidBorrowerContext extends AssetMetadata {
  loanId: string;
  borrower: string;
}

export interface LoanRepaidLenderContext extends AssetMetadata {
  borrower: string;
  lender: string;
  loanId: string;
  amountPaidToLender: string;
  currency: {
    ticker: string;
  };
  adminFee: string;
}

export interface LoanLiquidatedContext extends AssetMetadata {
  lender: string;
  borrower: string;
  loanId: string;
}

export interface LoanRenegotiatedContext extends AssetMetadata {
  lender: string;
  borrower: string;
  loanId: string;
  newMaximumRepaymentAmount: string;
  loanDueTime: string;
  renegotiationFee: string;
  currency: {
    ticker: string;
  };
}

interface MaturingLoan extends AssetMetadata {
  lender: string;
  borrower: string;
  principal: number;
  repayment: number;
  apr: number;
  dueTime: string;
  durationDays: number;
  currency: {
    ticker: string;
  };
}

export type LoansMaturityByBorrowerContext = MaturingLoan & {
  loanId: string;
};

export interface LoansMaturityContext {
  account: string;
  entries: MaturingLoan[];
}

export interface AssetMetadata {
  assetName: string;
  assetCategory: string;
  assetUrl: string;
}

export interface RenegotiationContext extends AssetMetadata {
  lender: string;
  borrower: string;
  loanId: number;
  fee: string;
  oldDurationDays: number;
  newDurationDays: number;
  dueTime: string;
  oldRepayment: number;
  newRepayment: number;
  diffRepayment: number;
  oldApr: number;
  newApr: number;
  diffApr: number;
  currency: {
    ticker: string;
  };
}
