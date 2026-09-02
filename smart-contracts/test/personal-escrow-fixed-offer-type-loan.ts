import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployContracts, NFTfiContracts } from './utils/deploy-contracts';
import { accountFixture, AccountFixture, factorX, fixedLoan, loanData } from './utils/fixtures';
import { mintAndApproveERC20, mintAndApproveNFT } from './utils/tokens';
import {
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

describe('Fixed Offer', function () {
  const LOAN = loanData();
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
  let snapshot: number;
  let nft: any;
  let nft2: any;
  let lenderBalance: bigint;
  let borrowerBalance: bigint;
  let loanId: any;
  const LOAN_FXT = fixedLoan();
  let lenderSig: string;
  let lenderSig2: string;
  let sigExpiry: bigint;
  let personalEscrowAddress: string;

  const offerType = ethers.encodeBytes32String('ASSET_OFFER_LOAN');

  before(async () => {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);
  });

  it('personal escrow factory should be paused', async () => {
    expect(await SC.personalEscrowFactory.paused()).to.eq(true);
  });

  describe('Fixed Offer', function () {
    before(async () => {
      await SC.personalEscrowFactory.connect(FXT.nftfiOwner).unpause();
      const tx = await SC.personalEscrowFactory.connect(FXT.borrower).createPersonalEscrow();

      await tx.wait();
      const personalEscrowCreatedEvent = await selectEvent(tx, SC.personalEscrowFactory, 'PersonalEscrowCreated');
      personalEscrowAddress = personalEscrowCreatedEvent?.args?.instance;

      nft = await mintAndApproveNFT(SC.nft, FXT.borrower, personalEscrowAddress);
      nft2 = await mintAndApproveNFT(SC.nft, FXT.borrower, personalEscrowAddress);
      lenderBalance = await mintAndApproveERC20(
        SC.erc20,
        FXT.lender,
        1000n * factorX,
        await SC.erc20TransferManager.getAddress(),
      );
      borrowerBalance = await mintAndApproveERC20(
        SC.erc20,
        FXT.borrower,
        500n * factorX,
        await SC.erc20TransferManager.getAddress(),
      );
      await mintAndApproveERC20(SC.erc20, FXT.anyone, 1000n * factorX, await SC.erc20TransferManager.getAddress());

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

    describe('Escrow', () => {
      it('Shouldnt allow to recreate existing personal escrow', async () => {
        await expect(
          SC.personalEscrowFactory.connect(FXT.borrower).createPersonalEscrow(),
        ).to.be.revertedWithCustomError(SC.personalEscrowFactory, 'PersonalEscrowAlreadyExistsForUser');
      });

      it('Should revert when calling lockCollateral', async () => {
        await expect(
          SC.escrow.lockCollateral(
            await SC.erc721Wrapper.getAddress(),
            await SC.nft.getAddress(),
            0,
            FXT.borrower.address,
          ),
        ).to.be.revertedWithCustomError(SC.escrow, 'OnlyLoanContract');
      });

      it('Should revert when calling unlockCollateral', async () => {
        await expect(
          SC.escrow.unlockCollateral(
            await SC.erc721Wrapper.getAddress(),
            await SC.nft.getAddress(),
            0,
            FXT.borrower.address,
          ),
        ).to.be.revertedWithCustomError(SC.escrow, 'CollateralNotLockedByLoan');
      });

      it('Should revert when calling handOverLoan', async () => {
        await expect(
          SC.escrow.handOverLoan(await SC.erc721Wrapper.getAddress(), await SC.nft.getAddress(), 0),
        ).to.be.revertedWithCustomError(SC.escrow, 'CollateralNotLockedByLoan');
      });

      it('Should revert when calling addPlugin', async () => {
        await expect(SC.escrow.connect(FXT.borrower).addPlugin(FXT.borrower.address)).to.be.revertedWith(
          'Ownable: caller is not the owner',
        );
      });

      it('Should revert when calling removePlugin', async () => {
        await expect(SC.escrow.connect(FXT.borrower).removePlugin(FXT.borrower.address)).to.be.revertedWith(
          'Ownable: caller is not the owner',
        );
      });

      it('should revert when draining nft which is locked', async () => {
        // BEGIN LOAN .............................................................
        await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
          {
            loanERC20Denomination: await SC.erc20.getAddress(),
            loanPrincipalAmount: LOAN_FXT.principal,
            maximumRepaymentAmount: LOAN_FXT.repayment,
            nftCollateralContract: await SC.nft.getAddress(),
            nftCollateralId: nft.id,
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

        const personalEscrowContract = await ethers.getContractAt('PersonalEscrow', personalEscrowAddress);
        await expect(
          personalEscrowContract
            .connect(FXT.borrower)
            .drainNFT('ERC721', await SC.nft.getAddress(), nft.id, FXT.borrower.address),
        ).to.be.revertedWithCustomError(SC.escrow, 'TokenIsCollateral');
      });

      it('should revert when withdrawing nft which is locked', async () => {
        // BEGIN LOAN .............................................................
        await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
          {
            loanERC20Denomination: await SC.erc20.getAddress(),
            loanPrincipalAmount: LOAN_FXT.principal,
            maximumRepaymentAmount: LOAN_FXT.repayment,
            nftCollateralContract: await SC.nft.getAddress(),
            nftCollateralId: nft.id,
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

        const personalEscrowContract = await ethers.getContractAt('PersonalEscrow', personalEscrowAddress);
        await expect(
          personalEscrowContract
            .connect(FXT.borrower)
            .withdrawNFT(await SC.nft.getAddress(), nft.id, FXT.borrower.address),
        ).to.be.revertedWithCustomError(SC.escrow, 'TokenIsCollateral');
      });

      it('Shouldnt allow to add plugin to a personal escrow', async () => {
        const personalEscrowContract = await ethers.getContractAt('PersonalEscrow', personalEscrowAddress);
        await expect(
          personalEscrowContract.connect(FXT.borrower).addPlugin(FXT.borrower.address),
        ).to.be.revertedWithCustomError(personalEscrowContract, 'AddingOrRemovingPluginsNotAllowed');
      });

      it('Shouldnt allow to remove plugin to a personal escrow', async () => {
        const personalEscrowContract = await ethers.getContractAt('PersonalEscrow', personalEscrowAddress);
        await expect(
          personalEscrowContract.connect(FXT.borrower).removePlugin(FXT.borrower.address),
        ).to.be.revertedWithCustomError(personalEscrowContract, 'AddingOrRemovingPluginsNotAllowed');
      });
    });

    describe('Begin a new loan', () => {
      describe('acceptOffer', () => {
        it('should accept an offer and creating new loan properly', async () => {
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

          await assertTokenOwner(
            'After beginLoan, the nft should be in escrow with NTFfi',
            SC.nft,
            nft.id,
            personalEscrowAddress,
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
            FXT.lender.address,
            lenderBalance,
            -LOAN_FXT.principal,
          );

          const now = await currentTime();
          const loanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);
          expect(loanData.loanPrincipalAmount).to.eq(LOAN_FXT.principal);
          expect(loanData.maximumRepaymentAmount).to.eq(LOAN_FXT.repayment);
          expect(loanData.nftCollateralId).to.eq(nft.id);
          expect(loanData.loanStartTime).to.eq(now);
          expect(loanData.loanDuration).to.eq(LOAN_FXT.duration);
          expect(loanData.loanInterestRateForDurationInBasisPoints).to.eq(0);
          expect(loanData.loanAdminFeeInBasisPoints).to.eq(LOAN.adminFeeInBasisPoints);
          expect(loanData.nftCollateralContract).to.eq(await SC.nft.getAddress());
          expect(loanData.nftCollateralWrapper).to.eq(await SC.erc721Wrapper.getAddress());
          expect(loanData.loanERC20Denomination).to.eq(await SC.erc20.getAddress());
          expect(loanData.isProRata).to.eq(LOAN_FXT.isProRata);
          expect(await SC.loanCoordinator.getWhetherNonceHasBeenUsedForUser(offerType, FXT.lender.address, 0)).to.eq(
            true,
          );
        });

        it('should accept an offer, mint obligation receipt and move to global escrow automatically', async () => {
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

          await assertTokenOwner(
            'After beginLoan, the nft should be in personal escrow with NTFfi',
            SC.nft,
            nft.id,
            personalEscrowAddress,
          );

          let loanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);
          expect(loanData.escrow).to.eq(personalEscrowAddress);

          console.log('loanData.nftCollateralId', loanData.nftCollateralId);

          await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);

          await assertTokenOwner(
            'After obligation receipt mint, the nft should be in global escrow with NTFfi',
            SC.nft,
            nft.id,
            await SC.escrow.getAddress(),
          );

          loanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);
          expect(loanData.escrow).to.eq(await SC.escrow.getAddress());
        });

        it('should revert when accepting an offer with collateral which is already locked', async () => {
          await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
            {
              loanERC20Denomination: await SC.erc20.getAddress(),
              loanPrincipalAmount: LOAN_FXT.principal,
              maximumRepaymentAmount: LOAN_FXT.repayment,
              nftCollateralContract: await SC.nft.getAddress(),
              nftCollateralId: nft.id,
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

          const lenderSig3 = await getLenderSignature(
            FXT.lender,
            LOAN_FXT.principal,
            LOAN_FXT.isProRata,
            LOAN_FXT.repayment,
            nft.id,
            LOAN_FXT.duration,
            1n,
            await SC.nft.getAddress(),
            await SC.erc20.getAddress(),
            sigExpiry,
            offerType,
            0n,
          );

          await expect(
            SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
              {
                loanERC20Denomination: await SC.erc20.getAddress(),
                loanPrincipalAmount: LOAN_FXT.principal,
                maximumRepaymentAmount: LOAN_FXT.repayment,
                nftCollateralContract: await SC.nft.getAddress(),
                nftCollateralId: nft.id,
                loanDuration: LOAN_FXT.duration,
                isProRata: LOAN_FXT.isProRata,
                originationFee: 0n,
              },
              {
                signer: FXT.lender.address,
                nonce: 1,
                expiry: sigExpiry,
                signature: lenderSig3,
              },
            ),
          ).to.be.revertedWith('ERC721: transfer from incorrect owner');
        });
      });
    });

    describe('REPAY a Loan', () => {
      before(async () => {
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

      it('should repay a loan properly', async () => {
        const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
        const borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
        const lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

        // REPAY LOAN .............................................................
        await advanceTime(daysToSeconds(5n));
        const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId);
        const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
        const adminFee = loanRepaidEvent?.args?.adminFee;

        await assertTokenOwner(
          'After payBackLoan, the escrow should own the nft still (just unlocked)',
          SC.nft,
          nft.id,
          personalEscrowAddress,
        );

        const personalEscrowContract = await ethers.getContractAt('PersonalEscrow', personalEscrowAddress);
        await personalEscrowContract
          .connect(FXT.borrower)
          .withdrawNFT(await SC.nft.getAddress(), nft.id, FXT.borrower.address);

        await assertTokenOwner(
          'After drain, the original borrower should own the nft again!',
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
          'NFTfi should have received the adminFee',
          SC.erc20,
          FXT.nftfiOwner.address,
          nftfiBalance,
          adminFee,
        );
      });
    });

    describe('LIQUIDATE an overdue Loan', () => {
      before(async () => {
        // BEGIN LOAN .............................................................
        lenderSig2 = await getLenderSignature(
          FXT.lender,
          LOAN_FXT.principal,
          LOAN_FXT.isProRata,
          LOAN_FXT.repayment,
          nft2.id,
          LOAN_FXT.duration,
          1n,
          await SC.nft.getAddress(),
          await SC.erc20.getAddress(),
          sigExpiry,
          offerType,
          0n,
        );

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
            nonce: 1,
            expiry: sigExpiry,
            signature: lenderSig2,
          },
        );

        expect(await SC.loanCoordinator.getWhetherNonceHasBeenUsedForUser(offerType, FXT.lender.address, 0)).to.eq(
          true,
        );
        await loanTx.wait();
        const loanStartedEvent = await selectEvent(loanTx, SC.nftfiLoanOffer, 'LoanStarted');
        loanId = loanStartedEvent?.args?.loanId;
      });

      it('should liquidate a loan properly', async () => {
        const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
        const borrowerBalanceBefore = await SC.erc20.balanceOf(FXT.borrower.address);
        const lenderBalanceBefore = await SC.erc20.balanceOf(FXT.lender.address);

        // LIQUIDATE LOAN .............................................................
        await advanceTime(LOAN_FXT.duration + 1n);

        await SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(loanId); // NOTE: only the lender can Liquidate an overdue loan

        await assertTokenOwner('After closure, Lender should now own the nft', SC.nft, nft2.id, FXT.lender.address);
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
});
