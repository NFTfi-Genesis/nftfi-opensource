import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployContracts, NFTfiContracts } from './utils/deploy-contracts';
import { accountFixture, AccountFixture, factorX, fixedLoan } from './utils/fixtures';
import { mintAndApprove1155, mintAndApproveERC20 } from './utils/tokens';
import {
  ADDRESS_ZERO,
  advanceTime,
  assertBalanceChange,
  assertERC1155BalanceOf,
  currentTime,
  daysToSeconds,
  getLenderSignature,
  restoreSnapshot,
  selectEvent,
  takeSnapshot,
} from './utils/utils';

describe('ERC1155Wrapper', function () {
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

    nft = 1;
    await mintAndApprove1155(SC.testERC1155, FXT.borrower, await SC.escrow.getAddress(), nft);
    await mintAndApproveERC20(SC.erc20, FXT.lender, 1000n * factorX, await SC.erc20TransferManager.getAddress());
    await mintAndApproveERC20(SC.erc20, FXT.borrower, 500n * factorX, await SC.erc20TransferManager.getAddress());

    const now = await currentTime();
    sigExpiry = now + daysToSeconds(10n);

    lenderSig = await getLenderSignature(
      FXT.lender,
      LOAN_FXT.principal,
      LOAN_FXT.isProRata,
      LOAN_FXT.repayment,
      nft,
      LOAN_FXT.duration,
      0n,
      await SC.testERC1155.getAddress(),
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
    it('should transfer the nft properly when a new loan begin', async () => {
      await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.testERC1155.getAddress(),
          nftCollateralId: nft,
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

      await assertERC1155BalanceOf(
        'After beginLoan, the nft should be in escrow with NTFfi',
        SC.testERC1155,
        nft,
        await SC.escrow.getAddress(),
        1n,
      );

      await assertERC1155BalanceOf(
        'After beginLoan, the borrower should not have any asset',
        SC.testERC1155,
        nft,
        FXT.borrower.address,
        0n,
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
          nftCollateralContract: await SC.testERC1155.getAddress(),
          nftCollateralId: nft,
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

    it('should transfer the nft properly to the borrower', async () => {
      const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
      const borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      const lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

      // REPAY LOAN
      await advanceTime(daysToSeconds(5n));
      const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoanSafe(loanId);

      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertERC1155BalanceOf(
        'After payBackLoan, the escrow should not have the nft',
        SC.testERC1155,
        nft,
        await SC.escrow.getAddress(),
        0n,
      );

      await assertERC1155BalanceOf(
        'After payBackLoan, the original borrower should own the nft again!',
        SC.testERC1155,
        nft,
        FXT.borrower.address,
        1n,
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
          nftCollateralContract: await SC.testERC1155.getAddress(),
          nftCollateralId: nft,
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
    it('should transfer the nft properly to the lender', async () => {
      const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
      const borrowerBalanceBefore = await SC.erc20.balanceOf(FXT.borrower.address);
      const lenderBalanceBefore = await SC.erc20.balanceOf(FXT.lender.address);

      // LIQUIDATE LOAN
      await advanceTime(LOAN_FXT.duration + 1n);

      await SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(loanId);

      await assertERC1155BalanceOf(
        'After closure, the escrow should not have the nft',
        SC.testERC1155,
        nft,
        await SC.escrow.getAddress(),
        0n,
      );

      await assertERC1155BalanceOf(
        'After closure, the borrower should not own the nft',
        SC.testERC1155,
        nft,
        FXT.borrower.address,
        0n,
      );

      await assertERC1155BalanceOf(
        'After closure, the lender should own the nft',
        SC.testERC1155,
        nft,
        FXT.lender.address,
        1n,
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

  describe('ERC1155Receiver', () => {
    describe('onERC1155Received', () => {
      it('should correctly receive the NFT', async () => {
        await SC.testERC1155
          .connect(FXT.borrower)
          .safeTransferFrom(FXT.borrower.address, await SC.escrow.getAddress(), nft, 1, '0x');

        await assertERC1155BalanceOf(
          'the nft should be in escrow',
          SC.testERC1155,
          nft,
          await SC.escrow.getAddress(),
          1n,
        );
      });
    });

    describe('onERC1155BatchReceived', () => {
      it('should revert on batch transfer', async () => {
        await expect(
          SC.testERC1155
            .connect(FXT.borrower)
            .safeBatchTransferFrom(FXT.borrower.address, await SC.escrow.getAddress(), [nft], [1], '0x'),
        ).revertedWith('ERC1155 batch not supported');
      });
    });
  });
});
