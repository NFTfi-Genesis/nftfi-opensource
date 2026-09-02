import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { deployContracts, NFTfiContracts } from './utils/deploy-contracts';
import { accountFixture, AccountFixture, factorX, fixedLoan } from './utils/fixtures';
import { mintAndApproveERC20, mintAndOfferForSalePunk } from './utils/tokens';
import {
  ADDRESS_ZERO,
  advanceTime,
  assertBalanceChange,
  assertPunkOwner,
  currentTime,
  daysToSeconds,
  getLenderSignature,
  restoreSnapshot,
  selectEvent,
  takeSnapshot,
} from './utils/utils';

describe('Punk wrapper', function () {
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
  let snapshot: number;
  let loanId: any;
  const LOAN_FXT = fixedLoan();
  let punk: any;
  let lenderSig: string;
  let sigExpiry: bigint;

  const offerType = ethers.encodeBytes32String('ASSET_OFFER_LOAN');

  before(async () => {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);
    mintAndOfferForSalePunk;
    punk = await mintAndOfferForSalePunk(SC.dummyPunks, FXT.borrower, await SC.escrow.getAddress(), 1n);
    await mintAndApproveERC20(SC.erc20, FXT.lender, 1000n * factorX, await SC.erc20TransferManager.getAddress());
    await mintAndApproveERC20(SC.erc20, FXT.borrower, 500n * factorX, await SC.erc20TransferManager.getAddress());

    const now = await currentTime();
    sigExpiry = now + daysToSeconds(10n);

    lenderSig = await getLenderSignature(
      FXT.lender,
      LOAN_FXT.principal,
      LOAN_FXT.isProRata,
      LOAN_FXT.repayment,
      punk.id,
      LOAN_FXT.duration,
      0n,
      await SC.dummyPunks.getAddress(),
      await SC.erc20.getAddress(),
      sigExpiry,
      offerType,
      0n,
    );
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  describe('New loan', () => {
    it('should transfer the punk properly when a new loan begin', async () => {
      await assertPunkOwner(
        'Before beginLoan, the punk should owned by borrower',
        SC.dummyPunks,
        punk.id,
        FXT.borrower.address,
      );

      await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.dummyPunks.getAddress(),
          nftCollateralId: punk.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0n,
        },
        {
          signer: FXT.lender.address,
          nonce: 0,
          expiry: sigExpiry,
          signature: lenderSig,
        },
      );

      await assertPunkOwner(
        'After beginLoan, the punk should be in escrow with NTFfi',
        SC.dummyPunks,
        punk.id,
        await SC.escrow.getAddress(),
      );
    });
  });

  describe('Loan repayment', () => {
    beforeEach(async () => {
      const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.dummyPunks.getAddress(),
          nftCollateralId: punk.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0n,
        },
        {
          signer: FXT.lender.address,
          nonce: 0,
          expiry: sigExpiry,
          signature: lenderSig,
        },
      );

      await loanTx.wait();
      const loanStartedEvent = await selectEvent(loanTx, SC.nftfiLoanOffer, 'LoanStarted');
      loanId = loanStartedEvent?.args?.loanId;
    });

    it('should transfer the punk properly to the borrower', async () => {
      await assertPunkOwner(
        'Before beginLoan, the punk should be in escrow with NTFfi',
        SC.dummyPunks,
        punk.id,
        await SC.escrow.getAddress(),
      );

      const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
      const borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      const lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

      // REPAY LOAN
      await advanceTime(daysToSeconds(5n));
      const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertPunkOwner(
        'After payBackLoan, the original borrower should own the punk again!',
        SC.dummyPunks,
        punk.id,
        FXT.borrower.address,
      );

      await assertBalanceChange(
        'Borrower should have repaid the loan',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        -LOAN_FXT.repayment,
      );

      await assertBalanceChange(
        'Lender should have received the payoff',
        SC.erc20,
        FXT.lender.address,
        lenderBalance,
        LOAN_FXT.repayment - adminFee,
      );

      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        SC.erc20,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });
  });

  describe('Overdue Loan liquidation', () => {
    beforeEach(async () => {
      const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.dummyPunks.getAddress(),
          nftCollateralId: punk.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0n,
        },
        {
          signer: FXT.lender.address,
          nonce: 0,
          expiry: sigExpiry,
          signature: lenderSig,
        },
      );

      await loanTx.wait();
      const loanStartedEvent = await selectEvent(loanTx, SC.nftfiLoanOffer, 'LoanStarted');
      loanId = loanStartedEvent?.args?.loanId;
    });
    it('should transfer the punk properly to the lender', async () => {
      await assertPunkOwner(
        'Before beginLoan, the punk should be in escrow with NTFfi',
        SC.dummyPunks,
        punk.id,
        await SC.escrow.getAddress(),
      );

      const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
      const borrowerBalanceBefore = await SC.erc20.balanceOf(FXT.borrower.address);
      const lenderBalanceBefore = await SC.erc20.balanceOf(FXT.lender.address);

      // LIQUIDATE LOAN
      await advanceTime(LOAN_FXT.duration + 1n);

      await SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(loanId);

      await assertPunkOwner(
        'After closure, the lender should own the punk',
        SC.dummyPunks,
        punk.id,
        FXT.lender.address,
      );

      await assertBalanceChange(
        'Borrower should have kept the loan',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalanceBefore,
        0n, // expect no change in balance
      );
      await assertBalanceChange(
        'Lender should have received nothing',
        SC.erc20,
        FXT.lender.address,
        lenderBalanceBefore,
        0n, // expect no change in balance
      );
      await assertBalanceChange(
        'NFTfi should have received no adminFee',
        SC.erc20,
        FXT.nftfiOwner.address,
        nftfiBalance,
        0n, // expect no change in balance
      );
    });
  });
});
