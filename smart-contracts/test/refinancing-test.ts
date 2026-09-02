import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployContracts, NFTfiContracts } from './utils/deploy-contracts';
import { accountFixture, AccountFixture, factorX, fixedLoan } from './utils/fixtures';
import {
  mintAndApproveERC20,
  mintAndApproveNFT,
  mintERC20,
  mintAndOfferForSalePunk,
  mintAndApprove1155,
  mintAndApproveLegacyNFT,
  mintAndApproveKitty,
} from './utils/tokens';
import {
  ADDRESS_ZERO,
  advanceTime,
  assertBalanceChange,
  assertPunkOwner,
  assertTokenOwner,
  assertERC1155BalanceOf,
  currentTime,
  daysToSeconds,
  getLenderSignature,
  getLenderSignatureWithIdRange,
  restoreSnapshot,
  selectEvent,
  takeSnapshot,
  assertLegacyTokenOwner,
  assertKittyOwner,
} from './utils/utils';

describe('Refinance loan', function () {
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
  let snapshot: number;
  let nft: any;
  let nft2: any;
  let loanId: any;
  const LOAN_FXT = fixedLoan();
  let lenderSig: string;
  let sigExpiry: bigint;
  let refinancingLender: SignerWithAddress;

  let lenderBalance: bigint;
  let borrowerBalance: bigint;
  let nftfiBalance: bigint;

  const offerType = ethers.encodeBytes32String('ASSET_OFFER_LOAN');
  const collectionOfferType = ethers.encodeBytes32String('COLLECTION_OFFER_LOAN');

  const flashloanFee = 2n;

  before(async () => {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);

    refinancingLender = FXT.lender2;

    nft = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    nft2 = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    await mintAndApproveERC20(SC.erc20, FXT.lender, 1000n * factorX, await SC.erc20TransferManager.getAddress());
    await mintAndApproveERC20(SC.erc20, FXT.lender, 1000n * factorX, await SC.erc20TransferManager.getAddress());
    await mintAndApproveERC20(SC.erc20, refinancingLender, 1000n * factorX, await SC.erc20TransferManager.getAddress());
    await mintAndApproveERC20(SC.erc20, refinancingLender, 1000n * factorX, await SC.erc20TransferManager.getAddress());
    await mintAndApproveERC20(SC.erc20, FXT.borrower, 500n * factorX, await SC.erc20TransferManager.getAddress());
    await mintAndApproveERC20(SC.erc20, FXT.borrower, 500n * factorX, await SC.erc20TransferManager.getAddress());
    await mintERC20(SC.erc20, await SC.mockDyDxFlashloan.getAddress(), 2000n * factorX);

    const now = await currentTime();
    sigExpiry = now + daysToSeconds(10n);
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  describe('refinance a Loan', () => {
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
        0n,
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

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      await SC.nftfiLoanOffer.connect(FXT.lender).mintPromissoryNote(loanId);

      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );

      await SC.erc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);

      await SC.erc20
        .connect(FXT.borrower)
        .approve(await SC.refinancing.getAddress(), LOAN_FXT.principal + flashloanFee);

      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);

      await SC.refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
        },
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
        },
        {
          signer: refinancingLender.address,
          nonce: 1,
          expiry: sigExpiry,
          signature: refinancingLenderSig,
        },
        '0x00',
      );

      const refinancedLoanId = await SC.loanCoordinator.totalNumLoans();
      const refinancedSmartNftId = (await SC.loanCoordinator.getLoanData(refinancedLoanId)).smartNftId;

      const LOAN_STATUS_REPAYED = 2;
      const oldLoanData = await SC.loanCoordinator.getLoanData(loanId);
      expect(oldLoanData.status, 'old loan should have repayed status').to.eq(LOAN_STATUS_REPAYED);

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        FXT.borrower.address,
      );

      await assertTokenOwner(
        'After refinancing, the nft should be in escrow with NTFfi',
        SC.nft,
        nft.id,
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );

      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);

      // REPAY LOAN .............................................................
      const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(refinancedLoanId);
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
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        SC.erc20,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });

    it('refianncing with double principal, surplus', async () => {
      const refinancedPrincipal = LOAN_FXT.principal * 2n;
      const refinancedRepayment = LOAN_FXT.repayment * 2n;

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );

      await SC.erc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);

      await SC.erc20.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), LOAN_FXT.principal);

      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);

      await SC.refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
        },
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
        },
        {
          signer: refinancingLender.address,
          nonce: 1,
          expiry: sigExpiry,
          signature: refinancingLenderSig,
        },
        '0x00',
      );

      const refinancedLoanId = await SC.loanCoordinator.totalNumLoans();
      const refinancedSmartNftId = (await SC.loanCoordinator.getLoanData(refinancedLoanId)).smartNftId;

      const LOAN_STATUS_REPAYED = 2;
      const oldLoanData = await SC.loanCoordinator.getLoanData(loanId);
      expect(oldLoanData.status, 'old loan should have repayed status').to.eq(LOAN_STATUS_REPAYED);

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        FXT.borrower.address,
      );

      await assertTokenOwner(
        'After refinancing, the nft should be in escrow with NTFfi',
        SC.nft,
        nft.id,
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const surplus = refinancedPrincipal - LOAN_FXT.repayment;
      await assertBalanceChange(
        'Borrower should have received the refinancing surplus',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        surplus - flashloanFee,
      );

      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);

      // REPAY LOAN .............................................................
      const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(refinancedLoanId);
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
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        SC.erc20,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });

    it('refianncing with half principal, deficit, origination fee', async () => {
      const originationFee = 1000n;
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      await SC.nftfiLoanOffer.connect(FXT.lender).mintPromissoryNote(loanId);

      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        originationFee,
      );

      await SC.erc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);
      await SC.erc20
        .connect(FXT.borrower)
        .approve(await SC.refinancing.getAddress(), LOAN_FXT.principal + flashloanFee + originationFee);

      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);

      await SC.refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
        },
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: originationFee,
        },
        {
          signer: refinancingLender.address,
          nonce: 1,
          expiry: sigExpiry,
          signature: refinancingLenderSig,
        },
        '0x00',
      );

      const refinancedLoanId = await SC.loanCoordinator.totalNumLoans();
      const refinancedSmartNftId = (await SC.loanCoordinator.getLoanData(refinancedLoanId)).smartNftId;

      const LOAN_STATUS_REPAYED = 2;
      const oldLoanData = await SC.loanCoordinator.getLoanData(loanId);
      expect(oldLoanData.status, 'old loan should have repayed status').to.eq(LOAN_STATUS_REPAYED);

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        FXT.borrower.address,
      );

      await assertTokenOwner(
        'After refinancing, the nft should be in escrow with NTFfi',
        SC.nft,
        nft.id,
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal + originationFee,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee - originationFee,
      );

      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);

      // REPAY LOAN .............................................................
      const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(refinancedLoanId);
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
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        SC.erc20,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });

    it('refianncing with double principal, surplus, origination fee', async () => {
      const originationFee = 1000n;
      const refinancedPrincipal = LOAN_FXT.principal * 2n;
      const refinancedRepayment = LOAN_FXT.repayment * 2n;

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        originationFee,
      );

      await SC.erc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);

      await SC.erc20.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), LOAN_FXT.principal);

      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);

      await SC.refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
        },
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: originationFee,
        },
        {
          signer: refinancingLender.address,
          nonce: 1,
          expiry: sigExpiry,
          signature: refinancingLenderSig,
        },
        '0x00',
      );

      const refinancedLoanId = await SC.loanCoordinator.totalNumLoans();
      const refinancedSmartNftId = (await SC.loanCoordinator.getLoanData(refinancedLoanId)).smartNftId;

      const LOAN_STATUS_REPAYED = 2;
      const oldLoanData = await SC.loanCoordinator.getLoanData(loanId);
      expect(oldLoanData.status, 'old loan should have repayed status').to.eq(LOAN_STATUS_REPAYED);

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        FXT.borrower.address,
      );

      await assertTokenOwner(
        'After refinancing, the nft should be in escrow with NTFfi',
        SC.nft,
        nft.id,
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal and has origination fee left in his wallet',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal + originationFee,
      );

      const surplus = refinancedPrincipal - LOAN_FXT.repayment;
      await assertBalanceChange(
        'Borrower should have received the refinancing surplus minus origination fee',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        surplus - flashloanFee - originationFee,
      );

      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);

      // REPAY LOAN .............................................................
      const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(refinancedLoanId);
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
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        SC.erc20,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });

    it('shouldnt be able to refinance someone elses loan', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      await mintAndApproveERC20(SC.erc20, FXT.borrower2, 500n * factorX, await SC.refinancing.getAddress());

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );

      await SC.erc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);

      await expect(
        SC.refinancing.connect(FXT.borrower2).refinanceLoan(
          {
            loanIdentifier: loanId,
            refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
          },
          {
            loanERC20Denomination: await SC.erc20.getAddress(),
            loanPrincipalAmount: refinancedPrincipal,
            maximumRepaymentAmount: refinancedRepayment,
            nftCollateralContract: await SC.nft.getAddress(),
            nftCollateralId: nft.id,
            loanDuration: LOAN_FXT.duration,
            isProRata: LOAN_FXT.isProRata,
            originationFee: 0,
          },
          {
            signer: refinancingLender.address,
            nonce: 1,
            expiry: sigExpiry,
            signature: refinancingLenderSig,
          },
          '0x00',
        ),
      ).to.be.revertedWithCustomError(SC.refinancing, 'callerNotBorrowerOfOldLoan');
    });

    it('shouldnt be able to refinance if loan is paid back', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );

      await SC.erc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);

      await expect(
        SC.refinancing.connect(FXT.borrower).refinanceLoan(
          {
            loanIdentifier: loanId,
            refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
          },
          {
            loanERC20Denomination: await SC.erc20.getAddress(),
            loanPrincipalAmount: refinancedPrincipal,
            maximumRepaymentAmount: refinancedRepayment,
            nftCollateralContract: await SC.nft.getAddress(),
            nftCollateralId: nft.id,
            loanDuration: LOAN_FXT.duration,
            isProRata: LOAN_FXT.isProRata,
            originationFee: 0,
          },
          {
            signer: refinancingLender.address,
            nonce: 1,
            expiry: sigExpiry,
            signature: refinancingLenderSig,
          },
          '0x00',
        ),
      ).to.be.revertedWith('ERC721: invalid token ID');
    });

    it('shouldnt be able to refinance if loan is expired', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      //Make it expired
      await advanceTime(LOAN_FXT.duration + 1n);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );

      await SC.erc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);

      await expect(
        SC.refinancing.connect(FXT.borrower).refinanceLoan(
          {
            loanIdentifier: loanId,
            refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
          },
          {
            loanERC20Denomination: await SC.erc20.getAddress(),
            loanPrincipalAmount: refinancedPrincipal,
            maximumRepaymentAmount: refinancedRepayment,
            nftCollateralContract: await SC.nft.getAddress(),
            nftCollateralId: nft.id,
            loanDuration: LOAN_FXT.duration,
            isProRata: LOAN_FXT.isProRata,
            originationFee: 0,
          },
          {
            signer: refinancingLender.address,
            nonce: 1,
            expiry: sigExpiry,
            signature: refinancingLenderSig,
          },
          '0x00',
        ),
      ).to.be.revertedWith('Loan is expired');
    });

    it('shouldnt be able to refinance with different denomination', async () => {
      const otherErc20 = SC.erc202;
      await mintAndApproveERC20(otherErc20, refinancingLender, 1000n * factorX, await SC.nftfiLoanOffer.getAddress());
      await mintAndApproveERC20(otherErc20, FXT.borrower, 1000n * factorX, await SC.nftfiLoanOffer.getAddress());

      const refinancedPrincipal = LOAN_FXT.repayment + 1n;
      const refinancedRepayment = LOAN_FXT.repayment + 2n;

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        await otherErc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );

      await SC.erc20.connect(refinancingLender).transfer(await SC.refinancing.getAddress(), refinancedPrincipal);

      await otherErc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);
      await otherErc20.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), LOAN_FXT.principal);

      lenderBalance = await otherErc20.balanceOf(refinancingLender.address);
      borrowerBalance = await otherErc20.balanceOf(FXT.borrower.address);

      await expect(
        SC.refinancing.connect(FXT.borrower).refinanceLoan(
          {
            loanIdentifier: loanId,
            refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
          },
          {
            loanERC20Denomination: await otherErc20.getAddress(),
            loanPrincipalAmount: refinancedPrincipal,
            maximumRepaymentAmount: refinancedRepayment,
            nftCollateralContract: await SC.nft.getAddress(),
            nftCollateralId: nft.id,
            loanDuration: LOAN_FXT.duration,
            isProRata: LOAN_FXT.isProRata,
            originationFee: 0,
          },
          {
            signer: refinancingLender.address,
            nonce: 1,
            expiry: sigExpiry,
            signature: refinancingLenderSig,
          },
          '0x00',
        ),
      ).to.be.revertedWithCustomError(SC.refinancing, 'denominationMismatch');
    });
  });

  describe('refinance a Loan with personal escrow', () => {
    let personalEscrowAddress: string;

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
        0n,
      );
      // BEGIN LOAN .............................................................
      await SC.personalEscrowFactory.connect(FXT.nftfiOwner).unpause();
      const tx = await SC.personalEscrowFactory.connect(FXT.borrower).createPersonalEscrow();

      await tx.wait();
      const personalEscrowCreatedEvent = await selectEvent(tx, SC.personalEscrowFactory, 'PersonalEscrowCreated');
      personalEscrowAddress = personalEscrowCreatedEvent?.args?.instance;

      await SC.nft.connect(FXT.borrower).approve(personalEscrowAddress, nft.id);

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

    it('should refinance a loan which has collateral in personal escrow', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      // confer ownership of the nft to the personal escrow
      expect(await SC.nft.balanceOf(personalEscrowAddress)).to.eq(1n);

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);

      // should be moved to the global one
      expect(await SC.nft.balanceOf(await SC.escrow.getAddress())).to.eq(1n);
      await SC.nftfiLoanOffer.connect(FXT.lender).mintPromissoryNote(loanId);

      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );

      await SC.erc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);

      await SC.erc20
        .connect(FXT.borrower)
        .approve(await SC.refinancing.getAddress(), LOAN_FXT.principal + flashloanFee);

      await SC.refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
        },
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
        },
        {
          signer: refinancingLender.address,
          nonce: 1,
          expiry: sigExpiry,
          signature: refinancingLenderSig,
        },
        '0x00',
      );
    });
  });

  describe('refinance a collection offer Loan', () => {
    beforeEach(async () => {
      const now = await currentTime();
      sigExpiry = now + daysToSeconds(10n);

      lenderSig = await getLenderSignature(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.isProRata,
        LOAN_FXT.repayment,
        0n, //nft2.id should be 0 in signature for collection offers
        LOAN_FXT.duration,
        0n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        collectionOfferType,
        0n,
      );

      // BEGIN LOAN .............................................................
      const loanTx = await SC.nftfiCollectionOffer.connect(FXT.borrower).acceptCollectionOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft2.id,
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
      const loanStartedEvent = await selectEvent(loanTx, SC.nftfiCollectionOffer, 'LoanStarted');
      loanId = loanStartedEvent?.args?.loanId;
    });

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      await SC.nftfiCollectionOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft2.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );

      await SC.erc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);

      await SC.erc20
        .connect(FXT.borrower)
        .approve(await SC.refinancing.getAddress(), LOAN_FXT.principal + flashloanFee);

      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);

      await SC.refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiCollectionOffer.getAddress(),
        },
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft2.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
        },
        {
          signer: refinancingLender.address,
          nonce: 1,
          expiry: sigExpiry,
          signature: refinancingLenderSig,
        },
        '0x00',
      );

      const refinancedLoanId = await SC.loanCoordinator.totalNumLoans();
      const refinancedSmartNftId = (await SC.loanCoordinator.getLoanData(refinancedLoanId)).smartNftId;

      const LOAN_STATUS_REPAYED = 2;
      const oldLoanData = await SC.loanCoordinator.getLoanData(loanId);
      expect(oldLoanData.status, 'old loan should have repayed status').to.eq(LOAN_STATUS_REPAYED);

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        FXT.borrower.address,
      );

      await assertTokenOwner(
        'After refinancing, the nft should be in escrow with NTFfi',
        SC.nft,
        nft2.id,
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );

      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);

      // REPAY LOAN .............................................................
      const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(refinancedLoanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertTokenOwner(
        'After payBackLoan, the original borrower should own the nft again!',
        SC.nft,
        nft2.id,
        FXT.borrower.address,
      );

      await assertBalanceChange(
        'Borrower should have repaid the loan',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
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

  describe('refinance to collection offer Loan', () => {
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
        0n,
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

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        0n,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        collectionOfferType,
        0n,
      );

      await SC.erc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);

      await SC.erc20
        .connect(FXT.borrower)
        .approve(await SC.refinancing.getAddress(), LOAN_FXT.principal + flashloanFee);

      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);

      await SC.refinancing.connect(FXT.borrower).refinanceCollectionOfferLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
        },
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
        },
        {
          signer: refinancingLender.address,
          nonce: 1,
          expiry: sigExpiry,
          signature: refinancingLenderSig,
        },
        '0x00',
      );

      const refinancedLoanId = await SC.loanCoordinator.totalNumLoans();
      const refinancedSmartNftId = (await SC.loanCoordinator.getLoanData(refinancedLoanId)).smartNftId;

      const LOAN_STATUS_REPAYED = 2;
      const oldLoanData = await SC.loanCoordinator.getLoanData(loanId);
      expect(oldLoanData.status, 'old loan should have repayed status').to.eq(LOAN_STATUS_REPAYED);

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        FXT.borrower.address,
      );

      await assertTokenOwner(
        'After refinancing, the nft should be in escrow with NTFfi',
        SC.nft,
        nft.id,
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );

      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);

      // REPAY LOAN .............................................................
      const repayTx = await SC.nftfiCollectionOffer.connect(FXT.borrower).payBackLoan(refinancedLoanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiCollectionOffer, 'LoanRepaid');
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
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
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

  describe('refinance to collection offer with range Loan', () => {
    beforeEach(async () => {
      lenderSig = await getLenderSignature(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.isProRata,
        LOAN_FXT.repayment,
        nft.id,
        LOAN_FXT.duration,
        0n, //id
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
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

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      const minId = 0n;
      const maxId = 10n;

      const refinancingLenderSig = await getLenderSignatureWithIdRange(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        0n, //id
        minId,
        maxId,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        collectionOfferType,
        0n,
      );

      await SC.erc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);

      await SC.erc20
        .connect(FXT.borrower)
        .approve(await SC.refinancing.getAddress(), LOAN_FXT.principal + flashloanFee);

      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);

      await SC.refinancing.connect(FXT.borrower).refinanceCollectionRangeOfferLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
        },
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
        },
        {
          minId: minId,
          maxId: maxId,
        },
        {
          signer: refinancingLender.address,
          nonce: 1,
          expiry: sigExpiry,
          signature: refinancingLenderSig,
        },
        '0x00',
      );

      const refinancedLoanId = await SC.loanCoordinator.totalNumLoans();
      const refinancedSmartNftId = (await SC.loanCoordinator.getLoanData(refinancedLoanId)).smartNftId;

      const LOAN_STATUS_REPAYED = 2;
      const oldLoanData = await SC.loanCoordinator.getLoanData(loanId);
      expect(oldLoanData.status, 'old loan should have repayed status').to.eq(LOAN_STATUS_REPAYED);

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        FXT.borrower.address,
      );

      await assertTokenOwner(
        'After refinancing, the nft should be in escrow with NTFfi',
        SC.nft,
        nft.id,
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );

      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);

      // REPAY LOAN .............................................................
      const repayTx = await SC.nftfiCollectionOffer.connect(FXT.borrower).payBackLoan(refinancedLoanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiCollectionOffer, 'LoanRepaid');
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
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
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

  describe('refinance a Loan with a punk', () => {
    let punk: any;
    beforeEach(async () => {
      punk = await mintAndOfferForSalePunk(SC.dummyPunks, FXT.borrower, await SC.escrow.getAddress(), 1n);

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
      // BEGIN LOAN .............................................................
      const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.dummyPunks.getAddress(),
          nftCollateralId: punk.id,
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

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        punk.id,
        LOAN_FXT.duration,
        1n,
        await SC.dummyPunks.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );

      await SC.erc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);

      await SC.erc20
        .connect(FXT.borrower)
        .approve(await SC.refinancing.getAddress(), LOAN_FXT.principal + flashloanFee);

      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);

      await SC.refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
        },
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.dummyPunks.getAddress(),
          nftCollateralId: punk.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
        },
        {
          signer: refinancingLender.address,
          nonce: 1,
          expiry: sigExpiry,
          signature: refinancingLenderSig,
        },
        '0x00',
      );

      const refinancedLoanId = await SC.loanCoordinator.totalNumLoans();
      const refinancedSmartNftId = (await SC.loanCoordinator.getLoanData(refinancedLoanId)).smartNftId;

      const LOAN_STATUS_REPAYED = 2;
      const oldLoanData = await SC.loanCoordinator.getLoanData(loanId);
      expect(oldLoanData.status, 'old loan should have repayed status').to.eq(LOAN_STATUS_REPAYED);

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        FXT.borrower.address,
      );

      await assertPunkOwner(
        'After refinancing, the nft should be in escrow with NTFfi',
        SC.dummyPunks,
        punk.id,
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );
    });
  });

  describe('refinance a Loan with an 1155', () => {
    const erc1155id = 1n;
    beforeEach(async () => {
      await mintAndApprove1155(SC.testERC1155, FXT.borrower, await SC.escrow.getAddress(), erc1155id);

      lenderSig = await getLenderSignature(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.isProRata,
        LOAN_FXT.repayment,
        erc1155id,
        LOAN_FXT.duration,
        0n,
        await SC.testERC1155.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );
      // BEGIN LOAN .............................................................
      const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.testERC1155.getAddress(),
          nftCollateralId: erc1155id,
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

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        erc1155id,
        LOAN_FXT.duration,
        1n,
        await SC.testERC1155.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );

      await SC.erc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);

      await SC.erc20
        .connect(FXT.borrower)
        .approve(await SC.refinancing.getAddress(), LOAN_FXT.principal + flashloanFee);

      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);

      await SC.refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
        },
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.testERC1155.getAddress(),
          nftCollateralId: erc1155id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
        },
        {
          signer: refinancingLender.address,
          nonce: 1,
          expiry: sigExpiry,
          signature: refinancingLenderSig,
        },
        '0x00',
      );

      const refinancedLoanId = await SC.loanCoordinator.totalNumLoans();
      const refinancedSmartNftId = (await SC.loanCoordinator.getLoanData(refinancedLoanId)).smartNftId;

      const LOAN_STATUS_REPAYED = 2;
      const oldLoanData = await SC.loanCoordinator.getLoanData(loanId);
      expect(oldLoanData.status, 'old loan should have repayed status').to.eq(LOAN_STATUS_REPAYED);

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        FXT.borrower.address,
      );

      await assertERC1155BalanceOf(
        'After refinancing, the nft should be in escrow with NTFfi',
        SC.testERC1155,
        erc1155id.toString(),
        await SC.escrow.getAddress(),
        1n,
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );
    });
  });

  describe('refinance a Loan with a Legacy 721', () => {
    let legacyERC721: any;
    beforeEach(async () => {
      legacyERC721 = await mintAndApproveLegacyNFT(SC.legacyERC721, FXT.borrower, await SC.escrow.getAddress());

      lenderSig = await getLenderSignature(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.isProRata,
        LOAN_FXT.repayment,
        legacyERC721.id,
        LOAN_FXT.duration,
        0n,
        await SC.legacyERC721.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );
      // BEGIN LOAN .............................................................
      const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.legacyERC721.getAddress(),
          nftCollateralId: legacyERC721.id,
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

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        legacyERC721.id,
        LOAN_FXT.duration,
        1n,
        await SC.legacyERC721.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );

      await SC.erc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);

      await SC.erc20
        .connect(FXT.borrower)
        .approve(await SC.refinancing.getAddress(), LOAN_FXT.principal + flashloanFee);

      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);

      await SC.refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
        },
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.legacyERC721.getAddress(),
          nftCollateralId: legacyERC721.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
        },
        {
          signer: refinancingLender.address,
          nonce: 1,
          expiry: sigExpiry,
          signature: refinancingLenderSig,
        },
        '0x00',
      );

      const refinancedLoanId = await SC.loanCoordinator.totalNumLoans();
      const refinancedSmartNftId = (await SC.loanCoordinator.getLoanData(refinancedLoanId)).smartNftId;

      const LOAN_STATUS_REPAYED = 2;
      const oldLoanData = await SC.loanCoordinator.getLoanData(loanId);
      expect(oldLoanData.status, 'old loan should have repayed status').to.eq(LOAN_STATUS_REPAYED);

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        FXT.borrower.address,
      );

      await assertLegacyTokenOwner(
        'After refinancing, the nft should be in escrow with NTFfi',
        SC.legacyERC721,
        legacyERC721.id.toString(),
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );
    });
  });

  describe('refinance a Loan with a Kitty', () => {
    let kitty: any;
    beforeEach(async () => {
      kitty = await mintAndApproveKitty(SC.kitties, FXT.borrower, await SC.escrow.getAddress());

      lenderSig = await getLenderSignature(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.isProRata,
        LOAN_FXT.repayment,
        kitty.id,
        LOAN_FXT.duration,
        0n,
        await SC.kitties.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );
      // BEGIN LOAN .............................................................
      const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.kitties.getAddress(),
          nftCollateralId: kitty.id,
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

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;
      await SC.obligationReceipt.connect(FXT.borrower).approve(await SC.refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        kitty.id,
        LOAN_FXT.duration,
        1n,
        await SC.kitties.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );

      await SC.erc20.connect(refinancingLender).approve(await SC.refinancing.getAddress(), LOAN_FXT.repayment);

      await SC.erc20
        .connect(FXT.borrower)
        .approve(await SC.refinancing.getAddress(), LOAN_FXT.principal + flashloanFee);

      lenderBalance = await SC.erc20.balanceOf(refinancingLender.address);
      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);

      await SC.refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
        },
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.kitties.getAddress(),
          nftCollateralId: kitty.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
        },
        {
          signer: refinancingLender.address,
          nonce: 1,
          expiry: sigExpiry,
          signature: refinancingLenderSig,
        },
        '0x00',
      );

      const refinancedLoanId = await SC.loanCoordinator.totalNumLoans();
      const refinancedSmartNftId = (await SC.loanCoordinator.getLoanData(refinancedLoanId)).smartNftId;

      const LOAN_STATUS_REPAYED = 2;
      const oldLoanData = await SC.loanCoordinator.getLoanData(loanId);
      expect(oldLoanData.status, 'old loan should have repayed status').to.eq(LOAN_STATUS_REPAYED);

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        FXT.borrower.address,
      );

      await assertKittyOwner(
        'After refinancing, the nft should be in escrow with NTFfi',
        SC.kitties,
        kitty.id.toString(),
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        SC.erc20,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );
    });
  });
});
