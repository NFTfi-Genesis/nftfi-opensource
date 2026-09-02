import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployContracts, NFTfiContracts } from './utils/deploy-contracts';
import { accountFixture, AccountFixture, factorX, fixedLoan, loanData } from './utils/fixtures';
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

describe('Fixed Offer', function () {
  const LOAN = loanData();
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
  let snapshot: number;
  let nft: any;
  let nft2: any;
  let nft3: any;
  let nft4: any;
  let lenderBalance: bigint;
  let borrowerBalance: bigint;
  let loanId: any;
  const LOAN_FXT = fixedLoan();
  let lenderSig: string;
  let lenderSig2: string;
  let sigExpiry: bigint;

  const offerType = ethers.encodeBytes32String('ASSET_OFFER_LOAN');

  before(async () => {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);

    nft = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    nft2 = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    nft3 = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    nft4 = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
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
      it('should not allow to acceptOffer when paused', async () => {
        await SC.nftfiLoanOffer.pause();
        await expect(
          SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
            {
              loanERC20Denomination: await SC.erc20.getAddress(),
              loanPrincipalAmount: LOAN_FXT.principal,
              isProRata: LOAN_FXT.isProRata,
              maximumRepaymentAmount: LOAN_FXT.repayment,
              nftCollateralContract: await SC.nft.getAddress(),
              nftCollateralId: nft.id,
              loanDuration: LOAN_FXT.duration,
              originationFee: 0n,
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
              isProRata: LOAN_FXT.isProRata,
              nftCollateralContract: await SC.nft.getAddress(),
              nftCollateralId: nft.id,
              loanDuration: LOAN_FXT.duration,
              originationFee: 0n,
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

      it('should not allow to begin a new loan with 0 principal', async () => {
        await expect(
          SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
            {
              loanERC20Denomination: await SC.erc20.getAddress(),
              loanPrincipalAmount: 0n,
              maximumRepaymentAmount: LOAN_FXT.repayment,
              isProRata: LOAN_FXT.isProRata,
              nftCollateralContract: await SC.nft.getAddress(),
              nftCollateralId: nft.id,
              loanDuration: LOAN_FXT.duration,
              originationFee: 0n,
            },
            {
              signer: FXT.lender.address,
              nonce: 0,
              expiry: sigExpiry,
              signature: lenderSig,
            },
          ),
        ).to.be.revertedWithCustomError(SC.nftfiLoanOffer, 'ZeroPrincipal');
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
              originationFee: 0n,
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
              originationFee: 0n,
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

      it('should not allow to begin a new loan when principal currency is not allowed', async () => {
        await expect(
          SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
            {
              loanERC20Denomination: ethers.ZeroAddress,
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
              originationFee: 0n,
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
            originationFee: 0n,
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
              originationFee: 0n,
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
              originationFee: 0n,
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
          lenderExpiry,
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
        expect(loanData.originationFee).to.eq(0n);
        expect(loanData.lender).to.eq(FXT.lender.address);

        expect(await SC.loanCoordinator.getWhetherNonceHasBeenUsedForUser(offerType, FXT.lender.address, 0)).to.eq(
          true,
        );
      });

      it('should revert because loan duration is greater than max loan duration', async () => {
        const fourYearsAndFourDays = 86400n * 366n * 4n;
        await expect(
          SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
            {
              loanERC20Denomination: await SC.erc20.getAddress(),
              loanPrincipalAmount: LOAN_FXT.principal,
              maximumRepaymentAmount: LOAN_FXT.repayment,
              nftCollateralContract: await SC.nft.getAddress(),
              nftCollateralId: nft.id,
              loanDuration: fourYearsAndFourDays,
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
        ).to.be.revertedWithCustomError(SC.nftfiLoanOffer, 'LoanDurationExceedsMaximum');
      });

      it('should accept an offer and creating new loan properly and mint obligation receipt and promissory note', async () => {
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

        const now = await currentTime();

        await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
        await SC.nftfiLoanOffer.connect(FXT.lender).mintPromissoryNote(loanId);

        await assertTokenOwner(
          'After beginLoan, the nft should be in escrow with NTFfi',
          SC.nft,
          nft.id,
          await SC.escrow.getAddress(),
        );

        const loanCoordinatorLoanData = await SC.loanCoordinator.getLoanData(loanId);

        await assertTokenOwner(
          'After beginLoan and mintObligationReceipt, the Borrower should own a Obligation Note NFT',
          SC.obligationReceipt,
          loanCoordinatorLoanData.smartNftId.toString(),
          FXT.borrower.address,
        );

        await assertTokenOwner(
          'After beginLoan and mintPromissoryNote, the lender should own a Promissory Note NFT',
          SC.promissoryNote,
          loanCoordinatorLoanData.smartNftId.toString(),
          FXT.lender.address,
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
        expect(loanData.lender).to.eq(ethers.ZeroAddress);

        expect(await SC.loanCoordinator.getWhetherNonceHasBeenUsedForUser(offerType, FXT.lender.address, 0)).to.eq(
          true,
        );
        const orData = await SC.obligationReceipt.loans(loanCoordinatorLoanData.smartNftId.toString());
        expect(orData.loanCoordinator).to.eq(await SC.loanCoordinator.getAddress());
        expect(orData.loanId).to.eq(loanId);

        const pnData = await SC.promissoryNote.loans(loanCoordinatorLoanData.smartNftId.toString());
        expect(pnData.loanCoordinator).to.eq(await SC.loanCoordinator.getAddress());
        expect(pnData.loanId).to.eq(loanId);
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

      it('should not allow to repay a loan that has already been repaid', async () => {
        await advanceTime(daysToSeconds(5n));
        await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId);

        await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId)).to.be.revertedWith(
          'Loan already repaid/liquidated',
        );
      });

      it('should not allow to repay a loan that has already been liquidated', async () => {
        await advanceTime(LOAN_FXT.duration + 1n);
        await SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(loanId);

        await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId)).to.be.revertedWith(
          'Loan already repaid/liquidated',
        );
      });

      it('should not allow to repay a loan that has bee expired', async () => {
        await advanceTime(LOAN_FXT.duration + 1n);

        await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId)).to.be.revertedWith('Loan is expired');
      });

      it('should not be able to repay a loan if transferring the principal payoff amount fails', async () => {
        const borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
        await SC.erc20.connect(FXT.borrower).transfer(FXT.borrower2.address, borrowerBalance);
        await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId)).to.be.revertedWith(
          'ERC20: transfer amount exceeds balance',
        );
      });

      it('should not be able to repay a loan if transferring the principal admin fee amount fails', async () => {
        const borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
        await SC.erc20
          .connect(FXT.borrower)
          .transfer(FXT.borrower2.address, (LOAN_FXT.repayment - 10n - borrowerBalance) * -1n);
        await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId)).to.be.revertedWith(
          'ERC20: transfer amount exceeds balance',
        );
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
          'NFTfi should have received the adminFee',
          SC.erc20,
          FXT.nftfiOwner.address,
          nftfiBalance,
          adminFee,
        );
      });

      it('should repay a loan properly even if escrow contract changed', async () => {
        const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
        const borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
        const lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

        await SC.nftfiHub.connect(FXT.nftfiOwner).setContract('ESCROW', ADDRESS_ZERO);

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

      it('anyone should be able to repay a loan properly', async () => {
        const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
        const anyoneBalance = await SC.erc20.balanceOf(FXT.anyone.address);
        const lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

        // REPAY LOAN .............................................................
        await advanceTime(daysToSeconds(5n));
        const repayTx = await SC.nftfiLoanOffer.connect(FXT.anyone).payBackLoanSafe(loanId);
        const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
        const adminFee = loanRepaidEvent?.args?.adminFee;

        await assertTokenOwner(
          'After payBackLoan, the original borrower should own the nft again!',
          SC.nft,
          nft.id,
          FXT.borrower.address,
        );

        await assertBalanceChange(
          'Anyone should have repaid the loan',
          SC.erc20,
          FXT.anyone.address,
          anyoneBalance,
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

      describe('safe REPAY a Loan', () => {
        it('should not allow to repay a loan with wrong id', async () => {
          await advanceTime(daysToSeconds(5n));

          await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoanSafe(0)).to.be.revertedWith('invalid loanId');
        });

        it('should not allow to repay a loan that has already been repaid', async () => {
          await advanceTime(daysToSeconds(5n));
          await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoanSafe(loanId);

          await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoanSafe(loanId)).to.be.revertedWith(
            'Loan already repaid/liquidated',
          );
        });

        it('should not allow to repay a loan that has already been liquidated', async () => {
          await advanceTime(LOAN_FXT.duration + 1n);
          await SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(loanId);

          await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoanSafe(loanId)).to.be.revertedWith(
            'Loan already repaid/liquidated',
          );
        });

        it('should not allow to repay a loan that has bee expired', async () => {
          await advanceTime(LOAN_FXT.duration + 1n);

          await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoanSafe(loanId)).to.be.revertedWith(
            'Loan is expired',
          );
        });

        it('should not be able to repay a loan if transferring the principal payoff amount fails', async () => {
          const borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
          await SC.erc20.connect(FXT.borrower).transfer(FXT.borrower2.address, borrowerBalance);
          await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoanSafe(loanId)).to.be.revertedWith(
            'ERC20: transfer amount exceeds balance',
          );
        });
        it('should not be able to repay a loan if transferring the principal admin fee amount fails', async () => {
          const borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
          await SC.erc20
            .connect(FXT.borrower)
            .transfer(FXT.borrower2.address, (LOAN_FXT.repayment - 10n - borrowerBalance) * -1n);
          await expect(SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoanSafe(loanId)).to.be.revertedWith(
            'ERC20: transfer amount exceeds balance',
          );
        });

        it('should repay a loan properly', async () => {
          const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
          const borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
          const lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

          // REPAY LOAN .............................................................
          await advanceTime(daysToSeconds(5n));
          const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoanSafe(loanId);
          const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
          const adminFee = loanRepaidEvent?.args?.adminFee;

          await assertTokenOwner(
            'After payBackLoanSafe, the original borrower should own the nft again!',
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

        it('should repay a loan properly even if USDC blacklists lender', async () => {
          const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
          const borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);
          const lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

          // lender gets blacklisted
          await SC.erc20.connect(FXT.nftfiOwner).blacklist(FXT.lender.address);

          // REPAY LOAN .............................................................
          await advanceTime(daysToSeconds(5n));
          const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoanSafe(loanId);
          const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
          const adminFee = loanRepaidEvent?.args?.adminFee;

          await assertBalanceChange(
            'Lender should not yet have received the payoff',
            SC.erc20,
            FXT.lender.address,
            lenderBalance,
            0n,
          );

          await assertTokenOwner(
            'After payBackLoanSafe, the original borrower should own the nft again!',
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
            'NFTfi should have received the adminFee',
            SC.erc20,
            FXT.nftfiOwner.address,
            nftfiBalance,
            adminFee,
          );

          // lender gets un-blacklisted
          await SC.erc20.connect(FXT.nftfiOwner).unBlacklist(FXT.lender.address);

          // lender gets repayment from escrow
          await SC.erc20TransferManager.connect(FXT.lender).getEscrowedPayBack(await SC.erc20.getAddress());

          await assertBalanceChange(
            'Lender should have received the payoff',
            SC.erc20,
            FXT.lender.address,
            lenderBalance,
            LOAN_FXT.repayment - adminFee,
          );
        });

        it('lender shouldnt be able to get payoff twice', async () => {
          const lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

          // lender gets blacklisted
          await SC.erc20.connect(FXT.nftfiOwner).blacklist(FXT.lender.address);

          // REPAY LOAN .............................................................
          await advanceTime(daysToSeconds(5n));
          const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoanSafe(loanId);
          const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
          const adminFee = loanRepaidEvent?.args?.adminFee;

          // lender gets un-blacklisted
          await SC.erc20.connect(FXT.nftfiOwner).unBlacklist(FXT.lender.address);

          // lender gets repayment from escrow
          await SC.erc20TransferManager.connect(FXT.lender).getEscrowedPayBack(await SC.erc20.getAddress());

          await assertBalanceChange(
            'Lender should have received the payoff',
            SC.erc20,
            FXT.lender.address,
            lenderBalance,
            LOAN_FXT.repayment - adminFee,
          );

          await expect(
            SC.erc20TransferManager.connect(FXT.lender).getEscrowedPayBack(await SC.erc20.getAddress()),
          ).to.be.revertedWithCustomError(SC.erc20TransferManager, 'NoTokensInEscrow');
        });

        it('lender shouldnt be able to get payoff with no loan payback', async () => {
          await expect(
            SC.erc20TransferManager.connect(FXT.lender).getEscrowedPayBack(await SC.erc20.getAddress()),
          ).to.be.revertedWithCustomError(SC.erc20TransferManager, 'NoTokensInEscrow');
        });

        it('anyone should be able to repay a loan properly', async () => {
          const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
          const anyoneBalance = await SC.erc20.balanceOf(FXT.anyone.address);
          const lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);

          // REPAY LOAN .............................................................
          await advanceTime(daysToSeconds(5n));
          const repayTx = await SC.nftfiLoanOffer.connect(FXT.anyone).payBackLoanSafe(loanId);
          const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
          const adminFee = loanRepaidEvent?.args?.adminFee;

          await assertTokenOwner(
            'After payBackLoanSafe, the original borrower should own the nft again!',
            SC.nft,
            nft.id,
            FXT.borrower.address,
          );

          await assertBalanceChange(
            'Anyone should have repaid the loan',
            SC.erc20,
            FXT.anyone.address,
            anyoneBalance,
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
    });

    describe('#getPayoffAmount', () => {
      it('should return maximumRepaymentAmount', async () => {
        const payoffAmount = await SC.nftfiLoanOffer.getPayoffAmount(loanId);
        expect(payoffAmount).to.eq(LOAN_FXT.repayment);
      });
    });

    describe('REPAY a 0 interest Loan', () => {
      before(async () => {
        lenderSig2 = await getLenderSignature(
          FXT.lender,
          LOAN_FXT.principal,
          LOAN_FXT.isProRata,
          LOAN_FXT.principal,
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
            maximumRepaymentAmount: LOAN_FXT.principal,
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
          -LOAN_FXT.principal,
        );
        await assertBalanceChange(
          'Lender should have received the payoff',
          SC.erc20,
          FXT.lender.address,
          lenderBalance,
          LOAN_FXT.principal - adminFee,
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
      let zeroInterestloanId: any;
      before(async () => {
        // BEGIN LOAN .............................................................
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

        const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
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

        await loanTx.wait();
        const loanStartedEvent = await selectEvent(loanTx, SC.nftfiLoanOffer, 'LoanStarted');
        zeroInterestloanId = loanStartedEvent?.args?.loanId;
      });
      it('should liquidate a loan properly', async () => {
        const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
        const borrowerBalanceBefore = await SC.erc20.balanceOf(FXT.borrower.address);
        const lenderBalanceBefore = await SC.erc20.balanceOf(FXT.lender.address);

        // LIQUIDATE LOAN .............................................................
        await advanceTime(LOAN_FXT.duration + 1n);

        await SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(zeroInterestloanId); // NOTE: only the lender can Liquidate an overdue loan

        await assertTokenOwner('After closure, Lender should now own the nft', SC.nft, nft3.id, FXT.lender.address);
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

      it('should liquidate a loan properly even if escrow contract is changed', async () => {
        const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
        const borrowerBalanceBefore = await SC.erc20.balanceOf(FXT.borrower.address);
        const lenderBalanceBefore = await SC.erc20.balanceOf(FXT.lender.address);

        await SC.nftfiHub.connect(FXT.nftfiOwner).setContract('ESCROW', ADDRESS_ZERO);

        // LIQUIDATE LOAN .............................................................
        await advanceTime(LOAN_FXT.duration + 1n);

        await SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(zeroInterestloanId); // NOTE: only the lender can Liquidate an overdue loan

        await assertTokenOwner('After closure, Lender should now own the nft', SC.nft, nft3.id, FXT.lender.address);
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

      it('should not allow to liquidate a when is not overdue yet', async () => {
        await advanceTime(daysToSeconds(5n));
        await expect(
          SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(zeroInterestloanId),
        ).to.be.revertedWithCustomError(SC.nftfiLoanOffer, 'LoanNotOverdueYet');
      });

      it('non lender should not be able to liquidate a loan', async () => {
        await advanceTime(LOAN_FXT.duration + 1n);
        await expect(
          SC.nftfiLoanOffer.connect(FXT.anyone).liquidateOverdueLoan(zeroInterestloanId),
        ).to.be.revertedWithCustomError(SC.nftfiLoanOffer, 'OnlyLenderCanLiquidate');
      });

      it('should liquidate a loan properly', async () => {
        const nftfiBalance = await SC.erc20.balanceOf(FXT.nftfiOwner.address);
        const borrowerBalanceBefore = await SC.erc20.balanceOf(FXT.borrower.address);
        const lenderBalanceBefore = await SC.erc20.balanceOf(FXT.lender.address);

        // LIQUIDATE LOAN .............................................................
        await advanceTime(LOAN_FXT.duration + 1n);

        await SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(zeroInterestloanId); // NOTE: only the lender can Liquidate an overdue loan

        await assertTokenOwner('After closure, Lender should now own the nft', SC.nft, nft3.id, FXT.lender.address);
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

    describe('#cancelLoanCommitment', () => {
      before(async () => {
        lenderSig2 = await getLenderSignature(
          FXT.lender,
          LOAN_FXT.principal,
          LOAN_FXT.isProRata,
          LOAN_FXT.repayment,
          nft4.id,
          LOAN_FXT.duration,
          3n,
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
            nftCollateralId: nft4.id,
            loanDuration: LOAN_FXT.duration,
            isProRata: LOAN_FXT.isProRata,
            originationFee: 0n,
          },
          {
            signer: FXT.lender.address,
            nonce: 3,
            expiry: sigExpiry,
            signature: lenderSig2,
          },
        );
        await expect(
          SC.loanCoordinator.connect(FXT.lender).cancelLoanCommitment(offerType, 3),
        ).to.be.revertedWithCustomError(SC.loanCoordinator, 'InvalidNonce');
      });

      it('should fail if the nonce has already been canceled', async () => {
        await SC.loanCoordinator.connect(FXT.borrower).cancelLoanCommitment(offerType, 3);
        await expect(
          SC.loanCoordinator.connect(FXT.borrower).cancelLoanCommitment(offerType, 3),
        ).to.be.revertedWithCustomError(SC.loanCoordinator, 'InvalidNonce');
      });
      it('should cancel the offer properly', async () => {
        await SC.loanCoordinator.connect(FXT.lender).cancelLoanCommitment(offerType, 3);

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
              nonce: 3,
              expiry: sigExpiry,
              signature: lenderSig2,
            },
          ),
        ).to.be.revertedWithCustomError(SC.loanCoordinator, 'InvalidNonce');

        expect(await SC.loanCoordinator.getWhetherNonceHasBeenUsedForUser(offerType, FXT.lender.address, 3)).to.eq(
          true,
        );
      });
    });
  });

  describe('REPAY a Loan which was started with origination fee', () => {
    const originationFee = 1000n;

    before(async () => {
      nft = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());

      lenderSig = await getLenderSignature(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.isProRata,
        LOAN_FXT.repayment,
        nft.id,
        LOAN_FXT.duration,
        10n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        originationFee,
      );

      lenderBalance = await SC.erc20.balanceOf(FXT.lender.address);
      borrowerBalance = await SC.erc20.balanceOf(FXT.borrower.address);

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
          nonce: 10n,
          expiry: sigExpiry,
          signature: lenderSig,
        },
      );

      await loanTx.wait();
      const loanStartedEvent = await selectEvent(loanTx, SC.nftfiLoanOffer, 'LoanStarted');
      loanId = loanStartedEvent?.args?.loanId;

      await assertBalanceChange(
        'Lender should have origination fee in his wallet',
        SC.erc20,
        FXT.lender.address,
        lenderBalance,
        -LOAN_FXT.principal + originationFee,
      );

      await assertBalanceChange(
        'Borrower should have origination fee less principal in his wallet',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        LOAN_FXT.principal - originationFee,
      );
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

      // REPAY LOAN .............................................................
      await advanceTime(daysToSeconds(5n));
      const repayTx = await SC.nftfiLoanOffer.connect(FXT.anyone).payBackLoanSafe(loanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertTokenOwner(
        'After payBackLoan, the original borrower should own the nft again!',
        SC.nft,
        nft.id,
        FXT.borrower.address,
      );

      await assertBalanceChange(
        'Anyone should have repaid the loan',
        SC.erc20,
        FXT.anyone.address,
        anyoneBalance,
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

  describe('#cancelLoanCommitment', () => {
    before(async () => {
      lenderSig2 = await getLenderSignature(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.isProRata,
        LOAN_FXT.repayment,
        nft4.id,
        LOAN_FXT.duration,
        3n,
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
          nftCollateralId: nft4.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0n,
        },
        {
          signer: FXT.lender.address,
          nonce: 3,
          expiry: sigExpiry,
          signature: lenderSig2,
        },
      );
      await expect(
        SC.loanCoordinator.connect(FXT.lender).cancelLoanCommitment(offerType, 3),
      ).to.be.revertedWithCustomError(SC.loanCoordinator, 'InvalidNonce');
    });

    it('should fail if the nonce has already been canceled', async () => {
      await SC.loanCoordinator.connect(FXT.borrower).cancelLoanCommitment(offerType, 3);
      await expect(
        SC.loanCoordinator.connect(FXT.borrower).cancelLoanCommitment(offerType, 3),
      ).to.be.revertedWithCustomError(SC.loanCoordinator, 'InvalidNonce');
    });

    it('should cancel the offer properly', async () => {
      await SC.loanCoordinator.connect(FXT.lender).cancelLoanCommitment(offerType, 3);

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
            nonce: 3,
            expiry: sigExpiry,
            signature: lenderSig2,
          },
        ),
      ).to.be.revertedWithCustomError(SC.loanCoordinator, 'InvalidNonce');

      expect(await SC.loanCoordinator.getWhetherNonceHasBeenUsedForUser(offerType, FXT.lender.address, 3)).to.eq(true);
    });
  });

  describe('#updateAdminFee', () => {
    it('non owner should not be able to call updateAdminFee', async () => {
      await expect(SC.nftfiLoanOffer.connect(FXT.lender).updateAdminFee(10)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });

    it('owner should not be able to call updateAdminFee with a value gt the max allowed', async () => {
      await expect(SC.nftfiLoanOffer.updateAdminFee(10001)).to.be.revertedWithCustomError(
        SC.nftfiLoanOffer,
        'BasisPointsTooHigh',
      );
    });

    it('owner should be able to call updateAdminFee properly', async () => {
      await SC.nftfiLoanOffer.updateAdminFee(20);
      expect(await SC.nftfiLoanOffer.adminFeeInBasisPoints()).to.eq(20);
    });
  });

  describe('#updateMaximumLoanDuration', () => {
    it('non owner should not be able to call updateMaximumLoanDuration', async () => {
      await expect(SC.nftfiLoanOffer.connect(FXT.lender).updateMaximumLoanDuration(10)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });

    it('owner should not be able to call updateMaximumLoanDuration with a value gt the max allowed', async () => {
      await expect(SC.nftfiLoanOffer.updateMaximumLoanDuration(4294967296)).to.be.revertedWithCustomError(
        SC.nftfiLoanOffer,
        'LoanDurationOverflow',
      );
    });

    it('owner should be able to call updateMaximumLoanDuration properly', async () => {
      await SC.nftfiLoanOffer.updateMaximumLoanDuration(20);
      expect(await SC.nftfiLoanOffer.maximumLoanDuration()).to.eq(20);
    });
  });
});
