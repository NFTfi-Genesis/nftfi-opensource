import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployContracts, NFTfiContracts } from './utils/deploy-contracts';
import { accountFixture, AccountFixture, factorX, fixedLoan } from './utils/fixtures';
import { mintAndApproveERC20, mintAndApproveNFT } from './utils/tokens';
import {
  ADDRESS_ZERO,
  advanceTime,
  assertBalanceChange,
  assertTokenOwner,
  currentTime,
  daysToSeconds,
  getLenderSignature,
  restoreSnapshot,
  selectEvent,
  takeSnapshot,
} from './utils/utils';

describe('Buyout', function () {
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
  let outBuyer: SignerWithAddress;
  let snapshot: number;
  let nft: any;
  let loanId: any;
  const LOAN_FXT = fixedLoan();
  let lenderSig: string;
  let sigExpiry: bigint;

  const offerType = ethers.encodeBytes32String('ASSET_OFFER_LOAN');

  before(async () => {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);
    outBuyer = FXT.borrower2;

    nft = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    await mintAndApproveERC20(SC.erc20, FXT.lender, 1000n * factorX, await SC.erc20TransferManager.getAddress());
    await mintAndApproveERC20(SC.erc20, outBuyer, 500n * factorX, await SC.erc20TransferManager.getAddress());

    const now = await currentTime();
    sigExpiry = now + daysToSeconds(10n);

    lenderSig = await getLenderSignature(
      FXT.lender,
      LOAN_FXT.principal,
      LOAN_FXT.isProRata,
      LOAN_FXT.repayment,
      nft.id,
      LOAN_FXT.duration,
      0n,
      await SC.nft.getAddress(),
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

  describe('REPAY a Loan', () => {
    beforeEach(async () => {
      // BEGIN LOAN .............................................................
      const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
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

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
    });

    it('should repay a loan properly', async () => {
      const loanCoordinatorLoanData = await SC.loanCoordinator.getLoanData(loanId);
      const obligationReceiptId = loanCoordinatorLoanData.smartNftId.toString();

      await SC.obligationReceipt.connect(FXT.borrower).approve(outBuyer.address, obligationReceiptId);
      await SC.obligationReceipt
        .connect(outBuyer)
        .transferFrom(FXT.borrower.address, outBuyer.address, obligationReceiptId);

      const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
      const outBuyerBalance = await SC.erc20.balanceOf(outBuyer.address);
      const lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

      // REPAY LOAN .............................................................
      await advanceTime(daysToSeconds(5n));
      const repayTx = await SC.nftfiLoanOffer.connect(outBuyer).payBackLoanSafe(loanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertTokenOwner('After payBackLoan, the outBuyer should own the nft', SC.nft, nft.id, outBuyer.address);

      await assertBalanceChange(
        'outBuyer should have repaid the loan',
        SC.erc20,
        outBuyer.address,
        outBuyerBalance,
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

    it('expired loan should work after liquidation', async () => {
      const loanCoordinatorLoanData = await SC.loanCoordinator.getLoanData(loanId);
      const obligationReceiptId = loanCoordinatorLoanData.smartNftId.toString();

      await SC.obligationReceipt.connect(FXT.borrower).approve(outBuyer.address, obligationReceiptId);
      await SC.obligationReceipt
        .connect(outBuyer)
        .transferFrom(FXT.borrower.address, outBuyer.address, obligationReceiptId);

      const maxDuration = await SC.nftfiLoanOffer.maximumLoanDuration();
      await advanceTime(maxDuration + 1n);

      await expect(SC.nftfiLoanOffer.connect(outBuyer).payBackLoan(loanId)).to.be.revertedWith('Loan is expired');

      await SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(loanId);

      await assertTokenOwner(
        'After liquidateOverdueLoan, the lender should own the nft',
        SC.nft,
        nft.id,
        FXT.lender.address,
      );
    });
  });
});
