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
  getLenderRenegotiationSignature,
  getLenderSignature,
  restoreSnapshot,
  selectEvent,
  takeSnapshot,
} from './utils/utils';

describe('Renegotiate loan (from fixed)', function () {
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
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

    nft = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    await mintAndApproveERC20(SC.erc20, FXT.lender, 1000n * factorX, await SC.erc20TransferManager.getAddress());
    await mintAndApproveERC20(SC.erc20, FXT.borrower, 500n * factorX, await SC.erc20TransferManager.getAddress());

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
    });

    it('shouldnt be able to renegotiate different loan type', async () => {
      const nftfiLoanOfferLoanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);
      const oldDuration = nftfiLoanOfferLoanData.loanDuration;
      const oldMaxRepay = nftfiLoanOfferLoanData.maximumRepaymentAmount;

      const newDuration = oldDuration + daysToSeconds(1n);
      const renegotiationFee = LOAN_FXT.repayment / 10n; //10% of repayment

      //Make it expired
      await advanceTime(oldDuration + 1n);

      const lenderRenegotiationSignature = await getLenderRenegotiationSignature(
        FXT.lender,
        loanId,
        newDuration,
        true,
        oldMaxRepay,
        renegotiationFee,
        1n,
        sigExpiry,
        await SC.nftfiLoanOffer.getAddress(),
      );

      await SC.erc20.connect(FXT.borrower).approve(FXT.lender.address, renegotiationFee);

      await expect(
        SC.nftfiCollectionOffer
          .connect(FXT.borrower)
          .renegotiateLoan(
            loanId,
            newDuration,
            oldMaxRepay,
            renegotiationFee,
            1,
            sigExpiry,
            true,
            lenderRenegotiationSignature,
          ),
      ).to.be.revertedWith('invalid loanId');
    });

    it('shouldnt be able to renegotiate with 0 duration', async () => {
      const nftfiLoanOfferLoanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);
      const oldMaxRepay = nftfiLoanOfferLoanData.maximumRepaymentAmount;

      const newDuration = 0n;
      const renegotiationFee = LOAN_FXT.repayment / 10n; //10% of repayment

      const lenderRenegotiationSignature = await getLenderRenegotiationSignature(
        FXT.lender,
        loanId,
        newDuration,
        true,
        oldMaxRepay,
        renegotiationFee,
        1n,
        sigExpiry,
        await SC.nftfiLoanOffer.getAddress(),
      );

      await SC.erc20.connect(FXT.borrower).approve(FXT.lender.address, renegotiationFee);

      await expect(
        SC.nftfiLoanOffer
          .connect(FXT.borrower)
          .renegotiateLoan(
            loanId,
            newDuration,
            oldMaxRepay,
            renegotiationFee,
            1,
            sigExpiry,
            true,
            lenderRenegotiationSignature,
          ),
      ).to.be.revertedWith('New duration already expired');
    });

    it('should repay a loan properly after extension', async () => {
      const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
      let borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      let lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

      const nftfiLoanOfferLoanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);
      const oldDuration = nftfiLoanOfferLoanData.loanDuration;
      const oldMaxRepay = nftfiLoanOfferLoanData.maximumRepaymentAmount;

      const newDuration = oldDuration + daysToSeconds(1n);
      const renegotiationFee = LOAN_FXT.repayment / 10n; //10% of repayment

      //Make it expired
      await advanceTime(oldDuration + 1n);

      const lenderRenegotiationSignature = await getLenderRenegotiationSignature(
        FXT.lender,
        loanId,
        newDuration,
        LOAN_FXT.isProRata,
        oldMaxRepay,
        renegotiationFee,
        1n,
        sigExpiry,
        await SC.nftfiLoanOffer.getAddress(),
      );

      await SC.erc20.connect(FXT.borrower).approve(FXT.lender.address, renegotiationFee);

      const tx = await SC.nftfiLoanOffer
        .connect(FXT.borrower)
        .renegotiateLoan(
          loanId,
          newDuration,
          oldMaxRepay,
          renegotiationFee,
          1,
          sigExpiry,
          LOAN_FXT.isProRata,
          lenderRenegotiationSignature,
        );

      const loanRenegotiatedEvent = await selectEvent(tx, SC.nftfiLoanOffer, 'LoanRenegotiated');
      const renegotiationAdminFee = loanRenegotiatedEvent?.args?.renegotiationAdminFee;

      await assertBalanceChange(
        'Borrower should have paid renegotiation fee',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        -renegotiationFee,
      );

      await assertBalanceChange(
        'Lender should have received the renegotiation fee',
        SC.erc20,
        FXT.lender.address,
        lenderBalance,
        renegotiationFee - renegotiationAdminFee,
      );

      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

      // REPAY LOAN .............................................................
      const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertTokenOwner(
        'After payBackLoan, the original borrower should own the nft again!',
        SC.nft,
        nft.id,
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
        'NFTfi should have received the adminFee + renegotiationAdminFee',
        SC.erc20,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee + renegotiationAdminFee,
      );
    });

    it('should renegotiate to pro-rated and repay a loan properly after', async () => {
      const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
      let borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      let lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

      const nftfiLoanOfferLoanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);
      const newDuration = nftfiLoanOfferLoanData.loanDuration;
      const isProRata = true;
      const newMaxRepay = nftfiLoanOfferLoanData.maximumRepaymentAmount;

      const renegotiationFee = LOAN_FXT.repayment / 10n; //10% of repayment

      const lenderRenegotiationSignature = await getLenderRenegotiationSignature(
        FXT.lender,
        loanId,
        newDuration,
        isProRata,
        newMaxRepay,
        renegotiationFee,
        1n,
        sigExpiry,

        await SC.nftfiLoanOffer.getAddress(),
      );

      await SC.erc20.connect(FXT.borrower).approve(FXT.lender.address, renegotiationFee);

      const tx = await SC.nftfiLoanOffer
        .connect(FXT.borrower)
        .renegotiateLoan(
          loanId,
          newDuration,
          newMaxRepay,
          renegotiationFee,
          1,
          sigExpiry,
          isProRata,
          lenderRenegotiationSignature,
        );

      const loanRenegotiatedEvent = await selectEvent(tx, SC.nftfiLoanOffer, 'LoanRenegotiated');
      const renegotiationAdminFee = loanRenegotiatedEvent?.args?.renegotiationAdminFee;

      await assertBalanceChange(
        'Borrower should have paid renegotiation fee',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        -renegotiationFee,
      );

      await assertBalanceChange(
        'Lender should have received the renegotiation fee',
        SC.erc20,
        FXT.lender.address,
        lenderBalance,
        renegotiationFee - renegotiationAdminFee,
      );

      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

      // REPAY LOAN .............................................................
      await advanceTime(daysToSeconds(5n));

      const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertTokenOwner(
        'After payBackLoan, the original borrower should own the nft again!',
        SC.nft,
        nft.id,
        FXT.borrower.address,
      );

      const interestDueAfterEntireDuration = newMaxRepay - LOAN_FXT.principal;
      const now = await currentTime();

      const loanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);

      const proRatedRepayment =
        (interestDueAfterEntireDuration * (now - loanData.loanStartTime)) / LOAN_FXT.duration + LOAN_FXT.principal;

      await assertBalanceChange(
        'Borrower should have repaid the loan',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        proRatedRepayment * -1n,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        SC.erc20,
        FXT.lender.address,
        lenderBalance,
        proRatedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee + renegotiationAdminFee',
        SC.erc20,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee + renegotiationAdminFee,
      );
    });

    it('should remint smart nft-s', async () => {
      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);

      const oldloanData = await SC.loanCoordinator.getLoanData(loanId);
      const oldSmartNftId = oldloanData.smartNftId;

      const nftfiLoanOfferLoanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);
      const oldDuration = nftfiLoanOfferLoanData.loanDuration;
      const isProRata = nftfiLoanOfferLoanData.isProRata;
      const oldMaxRepay = nftfiLoanOfferLoanData.maximumRepaymentAmount;

      const newDuration = oldDuration + daysToSeconds(1n);
      const renegotiationFee = LOAN_FXT.repayment / 10n; //10% of repayment

      //Make it expired
      await advanceTime(oldDuration + 1n);

      const lenderRenegotiationSignature = await getLenderRenegotiationSignature(
        FXT.lender,
        loanId,
        newDuration,
        isProRata,
        oldMaxRepay,
        renegotiationFee,
        1n,
        sigExpiry,
        await SC.nftfiLoanOffer.getAddress(),
      );

      await SC.erc20.connect(FXT.borrower).approve(FXT.lender.address, renegotiationFee);

      await SC.nftfiLoanOffer
        .connect(FXT.borrower)
        .renegotiateLoan(
          loanId,
          newDuration,
          oldMaxRepay,
          renegotiationFee,
          1,
          sigExpiry,
          isProRata,
          lenderRenegotiationSignature,
        );

      const newloanData = await SC.loanCoordinator.getLoanData(loanId);
      const newSmartNftId = newloanData.smartNftId;

      await expect(
        SC.promissoryNote.connect(FXT.lender).transferFrom(FXT.lender.address, FXT.anyone.address, oldSmartNftId),
      ).to.be.revertedWith('ERC721: invalid token ID');

      await expect(
        SC.obligationReceipt
          .connect(FXT.borrower)
          .transferFrom(FXT.borrower.address, FXT.anyone.address, oldSmartNftId),
      ).to.be.revertedWith('ERC721: invalid token ID');

      expect(await SC.obligationReceipt.exists(oldSmartNftId)).to.be.false;
      expect(await SC.promissoryNote.exists(oldSmartNftId)).to.be.false;
      expect(await SC.obligationReceipt.exists(newSmartNftId)).to.be.false;

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      await SC.nftfiLoanOffer.connect(FXT.lender).mintPromissoryNote(loanId);

      await assertTokenOwner(
        'After renegotiation new promissoryNote should be owned by lender',
        SC.promissoryNote,
        newSmartNftId.toString(),
        FXT.lender.address,
      );

      await assertTokenOwner(
        'After renegotiation new obligationReceipt should be owned by borrower',
        SC.obligationReceipt,
        newSmartNftId.toString(),
        FXT.borrower.address,
      );
    });

    it('should accept an offer and creating new loan properly and mint promissory note and obligation receipt, resetNfts and check the state', async () => {
      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      await SC.nftfiLoanOffer.connect(FXT.lender).mintPromissoryNote(loanId);

      const oldloanData = await SC.loanCoordinator.getLoanData(loanId);

      await assertTokenOwner(
        'After beginLoan and mintObligationReceipt, the Borrower should own a Obligation Note NFT',
        SC.obligationReceipt,
        oldloanData.smartNftId.toString(),
        FXT.borrower.address,
      );

      await assertTokenOwner(
        'After beginLoan and mintPromissoryNote, the lender should own a Promissory Note NFT',
        SC.promissoryNote,
        oldloanData.smartNftId.toString(),
        FXT.lender.address,
      );

      const loanDataAfterMintingObligationAndPromissoryNotes = await SC.nftfiLoanOffer.getLoanTerms(loanId);

      expect(loanDataAfterMintingObligationAndPromissoryNotes.lender).to.eq(ethers.ZeroAddress);
      expect(loanDataAfterMintingObligationAndPromissoryNotes.borrower).to.eq(ethers.ZeroAddress);

      const nftfiLoanOfferLoanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);
      const oldDuration = nftfiLoanOfferLoanData.loanDuration;
      const isProRata = nftfiLoanOfferLoanData.isProRata;
      const oldMaxRepay = nftfiLoanOfferLoanData.maximumRepaymentAmount;

      const newDuration = oldDuration + daysToSeconds(1n);
      const renegotiationFee = LOAN_FXT.repayment / 10n; //10% of repayment

      //Make it expired
      await advanceTime(oldDuration + 1n);

      const lenderRenegotiationSignature = await getLenderRenegotiationSignature(
        FXT.lender,
        loanId,
        newDuration,
        isProRata,
        oldMaxRepay,
        renegotiationFee,
        1n,
        sigExpiry,
        await SC.nftfiLoanOffer.getAddress(),
      );

      await SC.erc20.connect(FXT.borrower).approve(FXT.lender.address, renegotiationFee);

      await SC.nftfiLoanOffer
        .connect(FXT.borrower)
        .renegotiateLoan(
          loanId,
          newDuration,
          oldMaxRepay,
          renegotiationFee,
          1,
          sigExpiry,
          isProRata,
          lenderRenegotiationSignature,
        );

      expect(await SC.obligationReceipt.exists(oldloanData.smartNftId.toString())).to.be.false;
      expect(await SC.promissoryNote.exists(oldloanData.smartNftId.toString())).to.be.false;

      const newLoanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);

      expect(newLoanData.lender).equals(FXT.lender.address);
      expect(newLoanData.borrower).equals(FXT.borrower.address);
    });
  });

  describe('Renegotiate a loan with origination fee', () => {
    const originationFee = 1000n;

    beforeEach(async () => {
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
        originationFee,
      );

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
          originationFee: originationFee,
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

    it('should be reverted because repayment amount is less because of the origination fee', async () => {
      const nftfiLoanOfferLoanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);
      const oldDuration = nftfiLoanOfferLoanData.loanDuration;
      const oldMaxRepay = LOAN_FXT.principal - originationFee;

      const newDuration = oldDuration + daysToSeconds(1n);
      const renegotiationFee = LOAN_FXT.repayment / 10n; //10% of repayment

      //Make it expired
      await advanceTime(oldDuration + 1n);

      const lenderRenegotiationSignature = await getLenderRenegotiationSignature(
        FXT.lender,
        loanId,
        newDuration,
        LOAN_FXT.isProRata,
        oldMaxRepay,
        renegotiationFee,
        1n,
        sigExpiry,
        await SC.nftfiLoanOffer.getAddress(),
      );

      await SC.erc20.connect(FXT.borrower).approve(FXT.lender.address, renegotiationFee);

      await expect(
        SC.nftfiLoanOffer
          .connect(FXT.borrower)
          .renegotiateLoan(
            loanId,
            newDuration,
            oldMaxRepay,
            renegotiationFee,
            1,
            sigExpiry,
            LOAN_FXT.isProRata,
            lenderRenegotiationSignature,
          ),
      ).to.be.revertedWith('Negative interest rate loans are not allowed.');
    });

    it('should repay an origination fee loan properly', async () => {
      const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
      let borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      let lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

      const nftfiLoanOfferLoanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);
      const oldDuration = nftfiLoanOfferLoanData.loanDuration;
      const oldMaxRepay = nftfiLoanOfferLoanData.maximumRepaymentAmount;

      const newDuration = oldDuration + daysToSeconds(1n);
      const renegotiationFee = LOAN_FXT.repayment / 10n; //10% of repayment

      //Make it expired
      await advanceTime(oldDuration + 1n);

      const lenderRenegotiationSignature = await getLenderRenegotiationSignature(
        FXT.lender,
        loanId,
        newDuration,
        LOAN_FXT.isProRata,
        oldMaxRepay,
        renegotiationFee,
        1n,
        sigExpiry,
        await SC.nftfiLoanOffer.getAddress(),
      );

      await SC.erc20.connect(FXT.borrower).approve(FXT.lender.address, renegotiationFee);

      const tx = await SC.nftfiLoanOffer
        .connect(FXT.borrower)
        .renegotiateLoan(
          loanId,
          newDuration,
          oldMaxRepay,
          renegotiationFee,
          1,
          sigExpiry,
          LOAN_FXT.isProRata,
          lenderRenegotiationSignature,
        );

      const loanRenegotiatedEvent = await selectEvent(tx, SC.nftfiLoanOffer, 'LoanRenegotiated');
      const renegotiationAdminFee = loanRenegotiatedEvent?.args?.renegotiationAdminFee;

      await assertBalanceChange(
        'Borrower should have paid renegotiation fee',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        -renegotiationFee,
      );

      await assertBalanceChange(
        'Lender should have received the renegotiation fee',
        SC.erc20,
        FXT.lender.address,
        lenderBalance,
        renegotiationFee - renegotiationAdminFee,
      );

      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

      // REPAY LOAN .............................................................
      const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertTokenOwner(
        'After payBackLoan, the original borrower should own the nft again!',
        SC.nft,
        nft.id,
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
        'NFTfi should have received the adminFee + renegotiationAdminFee',
        SC.erc20,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee + renegotiationAdminFee,
      );
    });
  });

  describe('Renegotiate a loan with personal escrow', () => {
    let nft2: any;
    let personalEscrowAddress: string;

    beforeEach(async () => {
      await SC.personalEscrowFactory.connect(FXT.nftfiOwner).unpause();
      const tx = await SC.personalEscrowFactory.connect(FXT.borrower).createPersonalEscrow();

      await tx.wait();
      const personalEscrowCreatedEvent = await selectEvent(tx, SC.personalEscrowFactory, 'PersonalEscrowCreated');
      personalEscrowAddress = personalEscrowCreatedEvent?.args?.instance;

      nft2 = await mintAndApproveNFT(SC.nft, FXT.borrower, personalEscrowAddress);

      lenderSig = await getLenderSignature(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.isProRata,
        LOAN_FXT.repayment,
        nft2.id,
        LOAN_FXT.duration,
        0n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0,
      );

      // BEGIN LOAN .............................................................
      const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft2.id,
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

    it('should renegotiate to pro-rated and repay a loan properly after', async () => {
      const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
      let borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      let lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

      const nftfiLoanOfferLoanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);
      const newDuration = nftfiLoanOfferLoanData.loanDuration;
      const isProRata = true;
      const newMaxRepay = nftfiLoanOfferLoanData.maximumRepaymentAmount;

      const renegotiationFee = LOAN_FXT.repayment / 10n; //10% of repayment

      const lenderRenegotiationSignature = await getLenderRenegotiationSignature(
        FXT.lender,
        loanId,
        newDuration,
        isProRata,
        newMaxRepay,
        renegotiationFee,
        1n,
        sigExpiry,
        await SC.nftfiLoanOffer.getAddress(),
      );

      await SC.erc20.connect(FXT.borrower).approve(FXT.lender.address, renegotiationFee);

      const tx = await SC.nftfiLoanOffer
        .connect(FXT.borrower)
        .renegotiateLoan(
          loanId,
          newDuration,
          newMaxRepay,
          renegotiationFee,
          1,
          sigExpiry,
          isProRata,
          lenderRenegotiationSignature,
        );

      const loanRenegotiatedEvent = await selectEvent(tx, SC.nftfiLoanOffer, 'LoanRenegotiated');
      const renegotiationAdminFee = loanRenegotiatedEvent?.args?.renegotiationAdminFee;

      await assertBalanceChange(
        'Borrower should have paid renegotiation fee',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        -renegotiationFee,
      );

      await assertBalanceChange(
        'Lender should have received the renegotiation fee',
        SC.erc20,
        FXT.lender.address,
        lenderBalance,
        renegotiationFee - renegotiationAdminFee,
      );

      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

      // REPAY LOAN .............................................................
      await advanceTime(daysToSeconds(5n));

      const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertTokenOwner(
        'After payBackLoan, the original borrower should own the nft again!',
        SC.nft,
        nft2.id,
        personalEscrowAddress,
      );

      const interestDueAfterEntireDuration = newMaxRepay - LOAN_FXT.principal;
      const now = await currentTime();

      const loanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);

      const proRatedRepayment =
        (interestDueAfterEntireDuration * (now - loanData.loanStartTime)) / LOAN_FXT.duration + LOAN_FXT.principal;

      await assertBalanceChange(
        'Borrower should have repaid the loan',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        proRatedRepayment * -1n,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        SC.erc20,
        FXT.lender.address,
        lenderBalance,
        proRatedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee + renegotiationAdminFee',
        SC.erc20,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee + renegotiationAdminFee,
      );
    });
  });
});
