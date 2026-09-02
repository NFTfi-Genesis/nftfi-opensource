import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { ISuperRareV1 } from '../../typechain';
import { deployContracts, NFTfiContracts } from '../utils/deploy-contracts';
import { accountFixture, AccountFixture, factorX, fixedLoan } from '../utils/fixtures';
import { mintAndApproveERC20 } from '../utils/tokens';
import {
  ADDRESS_ZERO,
  advanceTime,
  assertBalanceChange,
  assertSuperRareOwner,
  currentTime,
  daysToSeconds,
  getLenderSignature,
  restoreSnapshot,
  selectEvent,
  takeSnapshot,
} from '../utils/utils';

describe('Super Rare V1 wrapper on fork', async function () {
  let superRareV1Contract: ISuperRareV1;
  let borrower: SignerWithAddress;
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
  let snapshot: number;
  let loanId: any;
  const LOAN_FXT = fixedLoan();
  let lenderSig: string;
  let sigExpiry: bigint;
  let personalEscrowAddress: string;

  const offerType = ethers.encodeBytes32String('ASSET_OFFER_LOAN');

  const superRareV1Address = '0x41a322b28d0ff354040e2cbc676f0320d8c8850d';
  const nftId = 96n;

  before(async () => {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);

    await SC.permittedNFTs.connect(FXT.nftfiOwner).setNFTPermit(superRareV1Address, 'SUPER_RARE_V1');
    superRareV1Contract = (await ethers.getContractAt('ISuperRareV1', superRareV1Address)) as ISuperRareV1;
    const nftOwnerAddress = await superRareV1Contract.ownerOf(nftId);
    borrower = await ethers.getImpersonatedSigner(nftOwnerAddress);

    await SC.personalEscrowFactory.connect(FXT.nftfiOwner).unpause();
    const tx = await SC.personalEscrowFactory.connect(borrower).createPersonalEscrow();

    await tx.wait();
    const personalEscrowCreatedEvent = await selectEvent(tx, SC.personalEscrowFactory, 'PersonalEscrowCreated');
    personalEscrowAddress = personalEscrowCreatedEvent?.args?.instance;

    await superRareV1Contract.connect(borrower).transfer(personalEscrowAddress, nftId);

    await mintAndApproveERC20(SC.erc20, FXT.lender, 1000n * factorX, await SC.erc20TransferManager.getAddress());
    await mintAndApproveERC20(SC.erc20, borrower, 500n * factorX, await SC.erc20TransferManager.getAddress());

    const now = await currentTime();
    sigExpiry = now + daysToSeconds(10n);

    lenderSig = await getLenderSignature(
      FXT.lender,
      LOAN_FXT.principal,
      LOAN_FXT.isProRata,
      LOAN_FXT.repayment,
      nftId,
      LOAN_FXT.duration,
      0n,
      superRareV1Address,
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
      await assertSuperRareOwner(
        'Before beginLoan, the punk should owned by borrower',
        superRareV1Contract,
        nftId.toString(),
        personalEscrowAddress,
      );

      await SC.nftfiLoanOffer.connect(borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: superRareV1Address,
          nftCollateralId: nftId,
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

      await assertSuperRareOwner(
        'After beginLoan, the punk should be in escrow with NTFfi',
        superRareV1Contract,
        nftId.toString(),
        personalEscrowAddress,
      );
    });
  });

  describe('Loan repayment', () => {
    beforeEach(async () => {
      const loanTx = await SC.nftfiLoanOffer.connect(borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: superRareV1Address,
          nftCollateralId: nftId,
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

    it('should transfer the punk properly to the borrower', async () => {
      await assertSuperRareOwner(
        'Before beginLoan, the punk should be in escrow with NTFfi',
        superRareV1Contract,
        nftId.toString(),
        personalEscrowAddress,
      );

      const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
      const borrowerBalance = await SC.erc20.balanceOf(borrower.address);
      const lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

      // REPAY LOAN
      await advanceTime(daysToSeconds(5n));
      const repayTx = await SC.nftfiLoanOffer.connect(borrower).payBackLoan(loanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertSuperRareOwner(
        'After payBackLoan, the escrow should own the nft still (just unlocked)',
        superRareV1Contract,
        nftId.toString(),
        personalEscrowAddress,
      );

      const personalEscrowContract = await ethers.getContractAt('PersonalEscrow', personalEscrowAddress);
      await personalEscrowContract.connect(borrower).withdrawNFT(superRareV1Address, nftId, borrower.address);

      await assertSuperRareOwner(
        'After drain, the original borrower should own the nft again!',
        superRareV1Contract,
        nftId.toString(),
        borrower.address,
      );

      await assertBalanceChange(
        'Borrower should have repaid the loan',
        SC.erc20,
        borrower.address,
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
      const loanTx = await SC.nftfiLoanOffer.connect(borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: superRareV1Address,
          nftCollateralId: nftId,
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
    it('should transfer the punk properly to the lender', async () => {
      await assertSuperRareOwner(
        'Before beginLoan, the punk should be in escrow with NTFfi',
        superRareV1Contract,
        nftId.toString(),
        personalEscrowAddress,
      );

      const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
      const borrowerBalanceBefore = await SC.erc20.balanceOf(borrower.address);
      const lenderBalanceBefore = await SC.erc20.balanceOf(FXT.lender.address);

      // LIQUIDATE LOAN
      await advanceTime(LOAN_FXT.duration + 1n);

      await SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(loanId);

      await assertSuperRareOwner(
        'After closure, the lender should own the punk',
        superRareV1Contract,
        nftId.toString(),
        FXT.lender.address,
      );

      await assertBalanceChange(
        'Borrower should have kept the loan',
        SC.erc20,
        borrower.address,
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
