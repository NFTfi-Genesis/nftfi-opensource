import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployContracts, NFTfiContracts } from './utils/deploy-contracts';
import { accountFixture, AccountFixture, factorX, loanData, proRatedLoan } from './utils/fixtures';
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

describe('ProRated', function () {
  const LOAN = loanData();
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
  let snapshot: number;
  let nft: any;
  let nft2: any;
  let nft3: any;
  let lenderBalance: bigint;
  let borrowerBalance: bigint;
  let loanId: any;
  const LOAN_FXT = proRatedLoan();
  let interestDueAfterEntireDuration: bigint;
  let proRatedRepayment: bigint;
  let lenderSig: string;
  let lenderSig2: string;
  let sigExpiry: bigint;

  const offerType = ethers.encodeBytes32String('ASSET_OFFER_LOAN');

  before(async function () {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);

    nft = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    nft2 = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    nft3 = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
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

    interestDueAfterEntireDuration = (LOAN_FXT.principal * LOAN_FXT.interestRateForDurationInBasisPoints) / 10000n;

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

  describe('#fallback', async () => {
    it('should revert trying to send ETH to the contract', async () => {
      await expect(FXT.borrower.sendTransaction({ to: await SC.nftfiLoanOffer.getAddress(), value: 1 })).to.reverted;
    });
  });

  describe('#pause - #unpause', async () => {
    it('non owner should not be able to call pause', async () => {
      expect(await SC.nftfiLoanOffer.paused()).to.eq(false);
      await expect(SC.nftfiLoanOffer.connect(FXT.borrower).pause()).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
      expect(await SC.nftfiLoanOffer.paused()).to.eq(false);
    });

    it('owner should be able to call pause', async () => {
      expect(await SC.nftfiLoanOffer.paused()).to.eq(false);
      await SC.nftfiLoanOffer.pause();
      expect(await SC.nftfiLoanOffer.paused()).to.eq(true);
    });

    it('non owner should not be able to call unpause', async () => {
      await SC.nftfiLoanOffer.pause();
      expect(await SC.nftfiLoanOffer.paused()).to.eq(true);
      await expect(SC.nftfiLoanOffer.connect(FXT.borrower).unpause()).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
      expect(await SC.nftfiLoanOffer.paused()).to.eq(true);
    });

    it('owner should be able to call unpause', async () => {
      await SC.nftfiLoanOffer.pause();
      expect(await SC.nftfiLoanOffer.paused()).to.eq(true);
      await SC.nftfiLoanOffer.unpause();
      expect(await SC.nftfiLoanOffer.paused()).to.eq(false);
    });
  });

  describe('Begin a new loan', () => {
    describe('acceptOffer', () => {
      it('should not allow to begin a new loan when paused', async () => {
        await SC.nftfiLoanOffer.pause();
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
              originationFee: 0,
            },
            {
              signer: FXT.lender.address,
              nonce: 0,
              expiry: sigExpiry,
              signature: lenderSig,
            },
          ),
        ).to.be.revertedWith('Pausable: paused');
      });
      it('should not allow to begin a new loan with negative interest rate', async () => {
        await expect(
          SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
            {
              loanERC20Denomination: await SC.erc20.getAddress(),
              loanPrincipalAmount: 1000000,
              maximumRepaymentAmount: 900000,
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
          ),
        ).to.be.revertedWithCustomError(SC.nftfiLoanOffer, 'NegativeInterestRate');
      });
      it('should not allow to begin a new loan with duration greater than the maximum loan duration', async () => {
        const maxLoanDuration = await SC.nftfiLoanOffer.maximumLoanDuration();
        await expect(
          SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
            {
              loanERC20Denomination: await SC.erc20.getAddress(),
              loanPrincipalAmount: LOAN_FXT.principal,
              maximumRepaymentAmount: LOAN_FXT.repayment,
              nftCollateralContract: await SC.nft.getAddress(),
              nftCollateralId: nft.id,
              loanDuration: maxLoanDuration + 1n,
              isProRata: LOAN_FXT.isProRata,
              originationFee: 0,
            },
            {
              signer: FXT.lender.address,
              nonce: 0,
              expiry: sigExpiry,
              signature: lenderSig,
            },
          ),
        ).to.be.revertedWithCustomError(SC.nftfiLoanOffer, 'LoanDurationExceedsMaximum');
      });

      it('should not allow to begin a new loan with duration zero', async () => {
        await expect(
          SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
            {
              loanERC20Denomination: await SC.erc20.getAddress(),
              loanPrincipalAmount: LOAN_FXT.principal,
              maximumRepaymentAmount: LOAN_FXT.repayment,
              nftCollateralContract: await SC.nft.getAddress(),
              nftCollateralId: nft.id,
              loanDuration: 0,
              isProRata: LOAN_FXT.isProRata,
              originationFee: 0,
            },
            {
              signer: FXT.lender.address,
              nonce: 0,
              expiry: sigExpiry,
              signature: lenderSig,
            },
          ),
        ).to.be.revertedWithCustomError(SC.nftfiLoanOffer, 'LoanDurationCannotBeZero');
      });

      it('should not allow to begin a new loan principal currency is not allowed', async () => {
        await expect(
          SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
            {
              loanERC20Denomination: ADDRESS_ZERO,
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
          ),
        ).to.be.revertedWithCustomError(SC.nftfiLoanOffer, 'CurrencyDenominationNotPermitted');
      });

      it('should not allow to begin a new loan when nft is not allowed', async () => {
        await expect(
          SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
            {
              loanERC20Denomination: await SC.erc20.getAddress(),
              loanPrincipalAmount: LOAN_FXT.principal,
              maximumRepaymentAmount: LOAN_FXT.repayment,
              nftCollateralContract: ADDRESS_ZERO,
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
          ),
        ).to.be.revertedWithCustomError(SC.nftfiLoanOffer, 'NFTCollateralContractNotPermitted');
      });

      it('should not be able to begin a new loan if lender nonce has already been used', async () => {
        await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
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

        await expect(
          SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
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
          ),
        ).to.be.revertedWithCustomError(SC.loanCoordinator, 'InvalidNonce');
      });
      it('should not be able to begin a new loan if lender nonce has canceled', async () => {
        await SC.loanCoordinator.connect(FXT.lender).cancelLoanCommitment(offerType, 0);

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
              originationFee: 0,
            },
            {
              signer: FXT.lender.address,
              nonce: 0,
              expiry: sigExpiry,
              signature: lenderSig,
            },
          ),
        ).to.be.revertedWithCustomError(SC.loanCoordinator, 'InvalidNonce');
      });

      it('should not be able to begin a new loan if lender signature is expired', async () => {
        const now = await currentTime();
        const lenderExpiry = now - 1n;
        const lenderSig2 = await getLenderSignature(
          FXT.lender,
          LOAN_FXT.principal,
          LOAN_FXT.isProRata,
          LOAN_FXT.repayment,
          nft2.id,
          LOAN_FXT.duration,
          0n,
          await SC.nft.getAddress(),
          await SC.erc20.getAddress(),
          BigInt(lenderExpiry),
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
              originationFee: 0,
            },
            {
              signer: FXT.lender.address,
              nonce: 0,
              expiry: lenderExpiry,
              signature: lenderSig2,
            },
          ),
        ).to.be.revertedWith('Lender Signature has expired');
      });

      it('should not be able to begin a new loan if InvalidLenderSignature', async () => {
        // create an invalid signature by using nft2.id
        const lenderSigInvalid = await getLenderSignature(
          FXT.lender,
          LOAN_FXT.principal,
          LOAN_FXT.isProRata,
          LOAN_FXT.repayment,
          nft2.id, // -> this is different form the offer
          LOAN_FXT.duration,
          0n,
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
              nonce: 0,
              expiry: sigExpiry,
              signature: lenderSigInvalid,
            },
          ),
        ).to.be.revertedWithCustomError(SC.nftfiLoanOffer, 'InvalidLenderSignature');
      });

      it('should not be able to begin a if transferring the collateral nft fails', async () => {
        await SC.nft.connect(FXT.borrower).approve(ethers.ZeroAddress, nft.id);
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
              nonce: 0,
              expiry: sigExpiry,
              signature: lenderSig,
            },
          ),
        ).to.be.revertedWith('ERC721: caller is not token owner or approved');
      });

      it('should not be able to begin a if transferring the principal fails', async () => {
        const lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);
        await SC.erc20.connect(FXT.lender).transfer(FXT.lender2.address, lenderBalance);
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
              nonce: 0,
              expiry: sigExpiry,
              signature: lenderSig,
            },
          ),
        ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
      });

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
        expect(loanData.loanAdminFeeInBasisPoints).to.eq(LOAN.adminFeeInBasisPoints);
        expect(loanData.nftCollateralContract).to.eq(await SC.nft.getAddress());
        expect(loanData.nftCollateralWrapper).to.eq(await SC.erc721Wrapper.getAddress());
        expect(loanData.loanERC20Denomination).to.eq(await SC.erc20.getAddress());
        expect(loanData.isProRata).to.eq(LOAN_FXT.isProRata);

        expect(await SC.loanCoordinator.getWhetherNonceHasBeenUsedForUser(offerType, FXT.lender.address, 0)).to.eq(
          true,
        );
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

    it('should not allow to repay a loan with wrong id', async () => {
      await advanceTime(daysToSeconds(5n));

      await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(0)).to.be.revertedWith('invalid loanId');
    });

    it('should not allow to repay a loan that has been liquidated', async () => {
      await advanceTime(LOAN_FXT.duration + 1n);
      await SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(loanId);

      await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId)).to.be.revertedWith(
        'Loan already repaid/liquidated',
      );
    });

    it('should not allow to repay a loan that has been repaid', async () => {
      await advanceTime(daysToSeconds(5n));
      await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId);

      await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId)).to.be.revertedWith(
        'Loan already repaid/liquidated',
      );
    });

    it('should not allow to repay a loan that has bee expired', async () => {
      await advanceTime(LOAN_FXT.duration + 1n);

      await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId)).to.be.revertedWith('Loan is expired');
    });

    it('should not be able to begin a if transferring the principal payoff amount fails', async () => {
      await advanceTime(daysToSeconds(5n));
      const borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      await SC.erc20.connect(FXT.borrower).transfer(FXT.borrower2.address, borrowerBalance);
      await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId)).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance',
      );
    });
    it('should not be able to begin a if transferring the principal admin fee amount fails', async () => {
      await advanceTime(daysToSeconds(5n));
      const borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      const loanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);
      const now = BigInt(await currentTime());
      proRatedRepayment =
        (interestDueAfterEntireDuration * (now - loanData.loanStartTime)) / LOAN_FXT.duration + LOAN_FXT.principal;

      // need to keep an amount lower than the proRatedRepayment so it is not enough to pay back
      const amountToTransferOut = -1n * (proRatedRepayment - borrowerBalance - 10n);

      await SC.erc20.connect(FXT.borrower).transfer(FXT.borrower2.address, amountToTransferOut);

      await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId)).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance',
      );
    });

    it('should repay a loan properly', async () => {
      const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
      const borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
      const lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

      const loanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);

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

      const now = await currentTime();
      proRatedRepayment =
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
        'NFTfi should have received the adminFee',
        SC.erc20,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });

    it('anyone should be able to repay a loan properly', async () => {
      const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
      const anyoneBalance = await SC.erc20.balanceOf(FXT.anyone.address);
      const lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

      const loanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);

      // REPAY LOAN .............................................................
      await advanceTime(daysToSeconds(5n));

      const repayTx = await SC.nftfiLoanOffer.connect(FXT.anyone).payBackLoan(loanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertTokenOwner(
        'After payBackLoan, the original borrower should own the nft again!',
        SC.nft,
        nft.id,
        FXT.borrower.address,
      );

      const now = BigInt(await currentTime());
      proRatedRepayment =
        (interestDueAfterEntireDuration * (now - loanData.loanStartTime)) / LOAN_FXT.duration + LOAN_FXT.principal;

      await assertBalanceChange(
        'Anyone should have repaid the loan',
        SC.erc20,
        FXT.anyone.address,
        anyoneBalance,
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
      nft2 = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
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
          nonce: 1,
          expiry: sigExpiry,
          signature: lenderSig2,
        },
      );

      await loanTx.wait();
      const loanStartedEvent = await selectEvent(loanTx, SC.nftfiLoanOffer, 'LoanStarted');
      loanId = loanStartedEvent?.args?.loanId;
    });
    it('should not allow to liquidate a when is not overdue yet', async () => {
      await advanceTime(daysToSeconds(5n));
      await expect(SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(loanId)).to.be.revertedWithCustomError(
        SC.nftfiLoanOffer,
        'LoanNotOverdueYet',
      );
    });

    it('non lender should not be able to liquidate a loan', async () => {
      await advanceTime(LOAN_FXT.duration + 1n);
      await expect(SC.nftfiLoanOffer.connect(FXT.anyone).liquidateOverdueLoan(loanId)).to.be.revertedWithCustomError(
        SC.nftfiLoanOffer,
        'OnlyLenderCanLiquidate',
      );
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
    it('should not allow to liquidate a loan that has already been liquidated', async () => {
      await advanceTime(LOAN_FXT.duration + 1n);
      await SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(loanId);
      await expect(SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(loanId)).to.be.revertedWithCustomError(
        SC.nftfiLoanOffer,
        'LoanAlreadyRepaidOrLiquidated',
      );
    });
    it('should not allow to liquidate a loan that has already been repaid', async () => {
      await advanceTime(daysToSeconds(5n));
      await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId);
      await expect(SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(loanId)).to.be.revertedWithCustomError(
        SC.nftfiLoanOffer,
        'LoanAlreadyRepaidOrLiquidated',
      );
    });
  });

  describe('#getPayoffAmount', () => {
    it('should return proRated value', async () => {
      await advanceTime(daysToSeconds(5n));
      const payoffAmount = await SC.nftfiLoanOffer.getPayoffAmount(loanId);

      const now = await currentTime();
      const loanData = await SC.nftfiLoanOffer.getLoanTerms(loanId);

      const interestDue = (interestDueAfterEntireDuration * (now - loanData.loanStartTime)) / LOAN_FXT.duration;

      expect(payoffAmount).to.eq(interestDue + LOAN_FXT.principal);
    });

    it('should return maximumRepaymentAmount', async () => {
      await advanceTime(daysToSeconds(8n));
      const payoffAmount = await SC.nftfiLoanOffer.getPayoffAmount(loanId);
      expect(payoffAmount).to.eq(LOAN_FXT.repayment);
    });
  });

  describe('#cancelLoanCommitment', () => {
    before(async () => {
      lenderSig2 = await getLenderSignature(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.isProRata,
        LOAN_FXT.repayment,
        nft3.id,
        LOAN_FXT.duration,
        2n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );
    });
    it('should fail if the lender nonce has already been used', async () => {
      await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft3.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0n,
        },
        {
          signer: FXT.lender.address,
          nonce: 2,
          expiry: sigExpiry,
          signature: lenderSig2,
        },
      );
      await expect(
        SC.loanCoordinator.connect(FXT.lender).cancelLoanCommitment(offerType, 2),
      ).to.be.revertedWithCustomError(SC.loanCoordinator, 'InvalidNonce');
    });
    it('should fail if the nonce has already been canceled', async () => {
      await SC.loanCoordinator.connect(FXT.borrower).cancelLoanCommitment(offerType, 2);
      await expect(
        SC.loanCoordinator.connect(FXT.borrower).cancelLoanCommitment(offerType, 2),
      ).to.be.revertedWithCustomError(SC.loanCoordinator, 'InvalidNonce');
    });
    it('should cancel the offer properly', async () => {
      await SC.loanCoordinator.connect(FXT.lender).cancelLoanCommitment(offerType, 2);

      await expect(
        SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
          {
            loanERC20Denomination: await SC.erc20.getAddress(),
            loanPrincipalAmount: LOAN_FXT.principal,
            maximumRepaymentAmount: LOAN_FXT.repayment,
            nftCollateralContract: await SC.nft.getAddress(),
            nftCollateralId: nft3.id,
            loanDuration: LOAN_FXT.duration,
            isProRata: LOAN_FXT.isProRata,
            originationFee: 0n,
          },
          {
            signer: FXT.lender.address,
            nonce: 2,
            expiry: sigExpiry,
            signature: lenderSig2,
          },
        ),
      ).to.be.revertedWithCustomError(SC.loanCoordinator, 'InvalidNonce');

      expect(await SC.loanCoordinator.getWhetherNonceHasBeenUsedForUser(offerType, FXT.lender.address, 2)).to.eq(true);
    });
  });
});
