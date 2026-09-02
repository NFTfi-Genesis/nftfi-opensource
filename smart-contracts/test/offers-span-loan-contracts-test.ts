import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployContracts, NFTfiContracts } from './utils/deploy-contracts';
import { accountFixture, AccountFixture, factorX, fixedLoan, loanData } from './utils/fixtures';
import { mintAndApproveERC20, mintAndApproveNFT } from './utils/tokens';
import { AssetOfferLoan, CollectionOfferLoan } from '../typechain';

import {
  assertBalanceChange,
  assertTokenOwner,
  currentTime,
  daysToSeconds,
  getLenderSignature,
  restoreSnapshot,
  selectEvent,
  takeSnapshot,
} from './utils/utils';

describe('Offers spanning loan contarcts', function () {
  const LOAN = loanData();
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
  let snapshot: number;
  let nft: any;
  let nft2: any;
  let nft3: any;
  let lenderBalance: bigint = 0n;
  const borrowerBalance: bigint = 0n;
  let loanId: any;
  const LOAN_FXT = fixedLoan();
  let lenderSig: string;
  let lenderSig2: string;
  let sigExpiry: bigint;

  let newAssetOfferLoan: AssetOfferLoan;
  let newCollectionOfferLoan: CollectionOfferLoan;

  const offerTypeString = 'ASSET_OFFER_LOAN';
  const offerType = ethers.encodeBytes32String(offerTypeString);

  const collectionOfferTypeString = 'COLLECTION_OFFER_LOAN';
  const collectionOfferType = ethers.encodeBytes32String(collectionOfferTypeString);

  before(async () => {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);

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

  describe('Begin a new loan with newly deployed contract and existing offer', () => {
    before(async () => {
      nft = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());

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

      const contractKeyUtils = await ethers.getContract('ContractKeyUtils');
      const nftfiSigningUtils = await ethers.getContract('NFTfiSigningUtils');
      const loanChecksAndCalculations = await ethers.getContract('LoanChecksAndCalculations');

      const AssetOfferLoan = await ethers.getContractFactory('AssetOfferLoan', {
        libraries: {
          ContractKeyUtils: await contractKeyUtils.getAddress(),
          NFTfiSigningUtils: await nftfiSigningUtils.getAddress(),
          LoanChecksAndCalculations: await loanChecksAndCalculations.getAddress(),
        },
      });

      newAssetOfferLoan = await AssetOfferLoan.connect(FXT.nftfiOwner).deploy(
        FXT.nftfiOwner.address,
        await SC.nftfiHub.getAddress(),
        [await SC.erc20.getAddress()],
      );

      lenderBalance = await mintAndApproveERC20(
        SC.erc20,
        FXT.lender,
        1000n * factorX,
        await SC.erc20TransferManager.getAddress(),
      );

      await SC.loanCoordinator
        .connect(FXT.nftfiOwner)
        .registerOfferType(offerTypeString, await newAssetOfferLoan.getAddress());
    });

    it('should accept an offer and creating new loan properly with newly deployed contract and existing offer', async () => {
      // BEGIN LOAN .............................................................
      const loanTx = await newAssetOfferLoan.connect(FXT.borrower).acceptOffer(
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
      );

      await loanTx.wait();
      const loanStartedEvent = await selectEvent(loanTx, newAssetOfferLoan, 'LoanStarted');
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
      const loanData = await newAssetOfferLoan.getLoanTerms(loanId);
      expect(loanData.loanPrincipalAmount).to.eq(LOAN_FXT.principal);
      expect(loanData.maximumRepaymentAmount).to.eq(LOAN_FXT.repayment);
      expect(loanData.nftCollateralId).to.eq(nft.id);
      expect(loanData.loanStartTime).to.eq(now);
      expect(loanData.loanDuration).to.eq(LOAN_FXT.duration);

      expect(loanData.loanAdminFeeInBasisPoints).to.eq(LOAN.adminFeeInBasisPoints);
      expect(loanData.nftCollateralContract).to.eq(await SC.nft.getAddress());
      expect(loanData.nftCollateralWrapper).to.eq(await SC.erc721Wrapper.getAddress());
      expect(loanData.loanERC20Denomination).to.eq(await SC.erc20.getAddress());

      expect(await SC.loanCoordinator.getWhetherNonceHasBeenUsedForUser(offerType, FXT.lender.address, 0)).to.eq(true);
    });

    describe('signature replay accross loan contracts of same type', () => {
      before(async () => {
        // accept on the old contract first
        await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
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
        );
      });
      it('should not accept an offer if singature has already been used by anouther loanContract of the same type', async () => {
        // BEGIN LOAN .............................................................
        await expect(
          newAssetOfferLoan.connect(FXT.borrower).acceptOffer(
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
        ).to.be.revertedWithCustomError(SC.loanCoordinator, 'InvalidNonce');
      });
    });

    describe('signature cancel accross loan contracts of same type', () => {
      before(async () => {
        lenderSig = await getLenderSignature(
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
        // cancel on the old contract first
        await SC.loanCoordinator.connect(FXT.lender).cancelLoanCommitment(offerType, 1);
      });
      it('should not accept an offer if singature has already been cancelled for another loanContract of the same type', async () => {
        // BEGIN LOAN .............................................................
        await expect(
          newAssetOfferLoan.connect(FXT.borrower).acceptOffer(
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
              nonce: 1,
              expiry: sigExpiry,
              signature: lenderSig,
            },
          ),
        ).to.be.revertedWithCustomError(SC.loanCoordinator, 'InvalidNonce');
      });
    });
  });

  describe('Begin a new collection offer loan with newly deployed contract and existing offer', () => {
    before(async () => {
      nft2 = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
      nft3 = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
      lenderSig2 = await getLenderSignature(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.isProRata,
        LOAN_FXT.repayment,
        0n, //nft id
        LOAN_FXT.duration,
        0n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        collectionOfferType,
        0n,
      );

      lenderBalance = await mintAndApproveERC20(
        SC.erc20,
        FXT.lender,
        1000n * factorX,
        await SC.erc20TransferManager.getAddress(),
      );

      await SC.nftfiCollectionOffer.connect(FXT.borrower).acceptCollectionOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          isProRata: LOAN_FXT.isProRata,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft2.id,
          loanDuration: LOAN_FXT.duration,
          originationFee: 0n,
        },
        {
          signer: FXT.lender.address,
          nonce: 0,
          expiry: sigExpiry,
          signature: lenderSig2,
        },
      );

      const contractKeyUtils = await ethers.getContract('ContractKeyUtils');
      const nftfiSigningUtils = await ethers.getContract('NFTfiSigningUtils');
      const loanChecksAndCalculations = await ethers.getContract('LoanChecksAndCalculations');

      const CollectionOfferLoan = await ethers.getContractFactory('CollectionOfferLoan', {
        libraries: {
          ContractKeyUtils: await contractKeyUtils.getAddress(),
          NFTfiSigningUtils: await nftfiSigningUtils.getAddress(),
          LoanChecksAndCalculations: await loanChecksAndCalculations.getAddress(),
        },
      });

      newCollectionOfferLoan = await CollectionOfferLoan.connect(FXT.nftfiOwner).deploy(
        FXT.nftfiOwner.address,
        await SC.nftfiHub.getAddress(),
        [await SC.erc20.getAddress()],
      );

      lenderBalance = await mintAndApproveERC20(
        SC.erc20,
        FXT.lender,
        1000n * factorX,
        await SC.erc20TransferManager.getAddress(),
      );

      await SC.loanCoordinator
        .connect(FXT.nftfiOwner)
        .registerOfferType(collectionOfferTypeString, await newCollectionOfferLoan.getAddress());
    });

    it('should accept a collection offer and creating new loan properly with newly deployed contract and existing offer', async () => {
      // BEGIN LOAN .............................................................
      const loanTx = await newCollectionOfferLoan.connect(FXT.borrower).acceptCollectionOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          isProRata: LOAN_FXT.isProRata,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft3.id,
          loanDuration: LOAN_FXT.duration,
          originationFee: 0n,
        },
        {
          signer: FXT.lender.address,
          nonce: 0,
          expiry: sigExpiry,
          signature: lenderSig2,
        },
      );

      await loanTx.wait();
      const loanStartedEvent = await selectEvent(loanTx, newCollectionOfferLoan, 'LoanStarted');
      loanId = loanStartedEvent?.args?.loanId;

      await assertTokenOwner(
        'After beginLoan, the nft should be in escrow with NTFfi',
        SC.nft,
        nft3.id,
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Borrower should have received loan principal',
        SC.erc20,
        FXT.borrower.address,
        borrowerBalance,
        LOAN_FXT.principal * 3n,
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        SC.erc20,
        FXT.lender.address,
        lenderBalance,
        -LOAN_FXT.principal,
      );

      const now = await currentTime();
      const loanData = await newCollectionOfferLoan.getLoanTerms(loanId);
      expect(loanData.loanPrincipalAmount).to.eq(LOAN_FXT.principal);
      expect(loanData.maximumRepaymentAmount).to.eq(LOAN_FXT.repayment);
      expect(loanData.nftCollateralId).to.eq(nft3.id);
      expect(loanData.loanStartTime).to.eq(now);
      expect(loanData.loanDuration).to.eq(LOAN_FXT.duration);

      expect(loanData.loanAdminFeeInBasisPoints).to.eq(LOAN.adminFeeInBasisPoints);
      expect(loanData.nftCollateralContract).to.eq(await SC.nft.getAddress());
      expect(loanData.nftCollateralWrapper).to.eq(await SC.erc721Wrapper.getAddress());
      expect(loanData.loanERC20Denomination).to.eq(await SC.erc20.getAddress());
    });
    describe('signature cancel accross loan contracts of same type - collection', () => {
      before(async () => {
        // cancel on the old contract first
        await SC.loanCoordinator.connect(FXT.lender).cancelLoanCommitment(collectionOfferType, 0);
      });
      it('should not accept an offer if singature has already been cancellet for another loanContract of the same type', async () => {
        // BEGIN LOAN .............................................................
        await expect(
          newCollectionOfferLoan.connect(FXT.borrower).acceptCollectionOffer(
            {
              loanERC20Denomination: await SC.erc20.getAddress(),
              loanPrincipalAmount: LOAN_FXT.principal,
              isProRata: LOAN_FXT.isProRata,
              maximumRepaymentAmount: LOAN_FXT.repayment,
              nftCollateralContract: await SC.nft.getAddress(),
              nftCollateralId: nft3.id,
              loanDuration: LOAN_FXT.duration,
              originationFee: 0n,
            },
            {
              signer: FXT.lender.address,
              nonce: 0,
              expiry: sigExpiry,
              signature: lenderSig2,
            },
          ),
        ).to.be.revertedWithCustomError(SC.loanCoordinator, 'InvalidNonce');
      });
    });
  });
});
