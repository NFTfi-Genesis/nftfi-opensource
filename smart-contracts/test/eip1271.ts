import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { TestSignerContract } from '../typechain';
import { deployContracts, NFTfiContracts } from './utils/deploy-contracts';
import { accountFixture, AccountFixture, factorX, fixedLoan, loanData } from './utils/fixtures';
import { mintAndApproveERC20, mintAndApproveNFT, mintERC20, mintNFT } from './utils/tokens';
import {
  ADDRESS_ZERO,
  advanceTime,
  assertBalanceChange,
  assertTokenOwner,
  currentTime,
  daysToSeconds,
  // getBorrowerSignatureEIP1271,
  getLenderSignatureEIP1271,
  restoreSnapshot,
  selectEvent,
  takeSnapshot,
} from './utils/utils';

describe('Loan interactions with EIP-1271 support', function () {
  const LOAN = loanData();
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
  let snapshot: number;
  let nftInBorrower: any;
  let nftInContract: any;
  // let lenderBalance: bigint;
  let lenderContractBalance: bigint;
  let borrowerBalance: bigint;
  let loanId: any;
  const LOAN_FXT = fixedLoan();
  // let borrowerContractSig: string;
  let lenderContractSig: string;
  let sigExpiry: bigint;

  const offerType = ethers.encodeBytes32String('ASSET_OFFER_LOAN');

  // let maxInterestRateForDurationInBasisPoints: number;

  let testSignerContractBorrower: TestSignerContract; // Smart Contracts
  let testSignerContractLender: TestSignerContract; // Smart Contracts

  before(async () => {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);

    const TestSignerContract = await ethers.getContractFactory('TestSignerContract');
    testSignerContractBorrower = (await TestSignerContract.deploy(FXT.borrower.address)) as TestSignerContract;
    await testSignerContractBorrower.waitForDeployment();

    testSignerContractLender = (await TestSignerContract.deploy(FXT.lender.address)) as TestSignerContract;
    await testSignerContractLender.waitForDeployment();

    nftInContract = await mintNFT(SC.nft, await testSignerContractBorrower.getAddress());
    await testSignerContractBorrower
      .connect(FXT.borrower)
      .approveNFT(await SC.nft.getAddress(), await SC.escrow.getAddress(), nftInContract.id);

    nftInBorrower = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());

    // lenderBalance =await mintAndApproveERC20(SC.erc20, FXT.lender, 1000n * factorX, await SC.erc20TransferManager.getAddress());
    lenderContractBalance = await mintERC20(SC.erc20, await testSignerContractLender.getAddress(), 1000n * factorX);
    await testSignerContractLender
      .connect(FXT.lender)
      .approveERC20(await SC.erc20.getAddress(), await SC.erc20TransferManager.getAddress(), lenderContractBalance);

    borrowerBalance = await mintAndApproveERC20(
      SC.erc20,
      FXT.borrower,
      500n * factorX,
      await SC.erc20TransferManager.getAddress(),
    );

    const now = await currentTime();
    sigExpiry = now + daysToSeconds(10n);

    lenderContractSig = await getLenderSignatureEIP1271(
      FXT.lender,
      await testSignerContractLender.getAddress(),
      LOAN_FXT.principal,
      LOAN_FXT.isProRata,
      LOAN_FXT.repayment,
      nftInBorrower.id,
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

  describe('Signer contract as the Lender', () => {
    it('should accept an offer and creating new loan properly', async () => {
      // BEGIN LOAN .............................................................
      const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nftInBorrower.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
        },
        {
          signer: await testSignerContractLender.getAddress(),
          nonce: 0,
          expiry: sigExpiry,
          signature: lenderContractSig,
        },
      );

      await loanTx.wait();
      const loanStartedEvent = await selectEvent(loanTx, SC.nftfiLoanOffer, 'LoanStarted');
      loanId = loanStartedEvent?.args?.loanId;

      await assertTokenOwner(
        'After beginLoan, the nft should be in escrow with NTFfi',
        SC.nft,
        nftInBorrower.id,
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Borrower should have received loan principal',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        LOAN_FXT.principal,
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        SC.erc20,
        await testSignerContractLender.getAddress(),
        lenderContractBalance,
        -LOAN_FXT.principal,
      );

      const now = await currentTime();
      const loanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);
      expect(loanData.loanPrincipalAmount).to.eq(LOAN_FXT.principal);
      expect(loanData.maximumRepaymentAmount).to.eq(LOAN_FXT.repayment);
      expect(loanData.nftCollateralId).to.eq(nftInBorrower.id);
      expect(loanData.loanStartTime).to.eq(now);
      expect(loanData.loanDuration).to.eq(LOAN_FXT.duration);
      expect(loanData.loanAdminFeeInBasisPoints).to.eq(LOAN.adminFeeInBasisPoints);
      expect(loanData.nftCollateralContract).to.eq(await SC.nft.getAddress());
      expect(loanData.nftCollateralWrapper).to.eq(await SC.erc721Wrapper.getAddress());
      expect(loanData.loanERC20Denomination).to.eq(await SC.erc20.getAddress());

      expect(
        await SC.loanCoordinator.getWhetherNonceHasBeenUsedForUser(
          offerType,
          await testSignerContractLender.getAddress(),
          0,
        ),
      ).to.eq(true);
    });

    it('should be able to repay a loan', async () => {
      // BEGIN LOAN .............................................................
      const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nftInBorrower.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
        },
        {
          signer: await testSignerContractLender.getAddress(),
          nonce: 0,
          expiry: sigExpiry,
          signature: lenderContractSig,
        },
      );

      await loanTx.wait();
      const loanStartedEvent = await selectEvent(loanTx, SC.nftfiLoanOffer, 'LoanStarted');
      loanId = loanStartedEvent?.args?.loanId;

      const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
      const borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      const lenderBalance = await SC.erc20.balanceOf(await testSignerContractLender.getAddress());

      // REPAY LOAN .............................................................
      await advanceTime(daysToSeconds(5n));
      const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoanSafe(loanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertTokenOwner(
        'After payBackLoan, the original borrower should own the nft again!',
        SC.nft,
        nftInBorrower.id,
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
        await testSignerContractLender.getAddress(),
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

    it('should be able to liquidate a loan', async () => {
      // BEGIN LOAN .............................................................
      const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nftInBorrower.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
        },
        {
          signer: await testSignerContractLender.getAddress(),
          nonce: 0,
          expiry: sigExpiry,
          signature: lenderContractSig,
        },
      );

      await loanTx.wait();
      const loanStartedEvent = await selectEvent(loanTx, SC.nftfiLoanOffer, 'LoanStarted');
      loanId = loanStartedEvent?.args?.loanId;

      const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
      const borrowerBalanceBefore = await SC.erc20.balanceOf(FXT.borrower.address);
      const lenderBalanceBefore = await SC.erc20.balanceOf(await testSignerContractLender.getAddress());

      // LIQUIDATE LOAN .............................................................
      await advanceTime(LOAN_FXT.duration + 1n);

      await testSignerContractLender
        .connect(FXT.lender)
        .liquidateOverdueLoan(await SC.nftfiLoanOffer.getAddress(), loanId); // NOTE: only the owner of Promissory Note can liquidate the loan

      await assertTokenOwner(
        'After closure, Lender should now own the nft',
        SC.nft,
        nftInBorrower.id,
        await testSignerContractLender.getAddress(),
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
        await testSignerContractLender.getAddress(),
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
