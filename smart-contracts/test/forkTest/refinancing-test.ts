import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERC20, Refinancing, LegacyLoan } from '../../typechain';
import { deployContracts, NFTfiContracts } from '../utils/deploy-contracts';
import { accountFixture, AccountFixture, factorX, fixedLoan, loanData } from '../utils/fixtures';
import { mintAndApproveNFT } from '../utils/tokens';
import {
  ADDRESS_ZERO,
  assertBalanceChange,
  assertTokenOwner,
  currentTime,
  daysToSeconds,
  getLenderSignature,
  getLenderSignatureLegacy,
  restoreSnapshot,
  selectEvent,
  takeSnapshot,
  CONTRACTS_KEYS,
  toBytes32,
} from '../utils/utils';

describe('Refinance loan on fork', function () {
  const LOAN = loanData();
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
  let snapshot: number;
  let nft: any;
  let loanId: any;
  const LOAN_FXT = fixedLoan();
  let lenderSig: string;
  let sigExpiry: bigint;
  let refinancingLender: SignerWithAddress;

  let refinancing: Refinancing;

  let lenderBalance: bigint;
  let borrowerBalance: bigint;
  let nftfiBalance: bigint;

  const offerType = ethers.encodeBytes32String('ASSET_OFFER_LOAN');

  const flashloanFee = 2n;

  const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const wstEthAddress = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0';
  const dxdyAddress = '0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e';

  const NFTFI_V2_FIXED_COLLECTION_CONTRACT_ADDRESS = '0xE52Cec0E90115AbeB3304BaA36bc2655731f7934';
  const NFTFI_V2_1_CONTRACT_ADDRESS = '0x8252Df1d8b29057d1Afe3062bf5a64D503152BC8';
  const NFTFI_V2_CONTRACT_ADDRESS = '0xf896527c49b44aAb3Cf22aE356Fa3AF8E331F280';
  const NFTFI_V2_3_CONTRACT_ADDRESS = '0xd0a40eB7FD94eE97102BA8e9342243A2b2E22207';
  const NFTFI_V2_3_COLLECTION_CONTRACT_ADDRESS = '0xD0C6e59B50C32530C627107F50Acc71958C4341F';

  before(async () => {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);

    const nftfiRefinancingAdapterType = 'NFTFI';
    const nftfiLegacyV2_1RefinancingAdapterType = 'NFTFI_LEGACY_V2_1';
    const nftfiLegacyV2_3RefinancingAdapterType = 'NFTFI_LEGACY_V2_3';

    const nftfiRefinancingAdapterLegacyV2_1 = await ethers.getContract('LegacyNftfiRefinancingAdapterV2_1');
    const nftfiRefinancingAdapterLegacyV2_3 = await ethers.getContract('LegacyNftfiRefinancingAdapterV2_3');
    const nftfiRefinancingAdapter = await ethers.getContract('NftfiRefinancingAdapter');
    const nftfiHub = await ethers.getContract('NftfiHub');
    const nftfiLoanOffer = await ethers.getContract('AssetOfferLoan');
    const nftfiCollectionOffer = await ethers.getContract('CollectionOfferLoan');

    const contractKeyUtils = await ethers.getContract('ContractKeyUtils');

    const Refinancing = await ethers.getContractFactory('Refinancing', {
      libraries: {
        ContractKeyUtils: await contractKeyUtils.getAddress(),
      },
    });

    refinancing = (await Refinancing.connect(FXT.nftfiOwner).deploy(
      await nftfiHub.getAddress(),
      await nftfiLoanOffer.getAddress(),
      await nftfiCollectionOffer.getAddress(),
      FXT.nftfiOwner,
      [nftfiRefinancingAdapterType, nftfiLegacyV2_1RefinancingAdapterType, nftfiLegacyV2_3RefinancingAdapterType],
      [
        await nftfiRefinancingAdapter.getAddress(),
        await nftfiRefinancingAdapterLegacyV2_1.getAddress(),
        await nftfiRefinancingAdapterLegacyV2_3.getAddress(),
      ],
      [
        nftfiRefinancingAdapterType,
        nftfiRefinancingAdapterType,
        nftfiLegacyV2_1RefinancingAdapterType,
        nftfiLegacyV2_1RefinancingAdapterType,
        nftfiLegacyV2_1RefinancingAdapterType,
        nftfiLegacyV2_3RefinancingAdapterType,
        nftfiLegacyV2_3RefinancingAdapterType,
      ],
      [
        await nftfiLoanOffer.getAddress(),
        await nftfiCollectionOffer.getAddress(),
        NFTFI_V2_FIXED_COLLECTION_CONTRACT_ADDRESS,
        NFTFI_V2_1_CONTRACT_ADDRESS,
        NFTFI_V2_CONTRACT_ADDRESS,
        NFTFI_V2_3_CONTRACT_ADDRESS,
        NFTFI_V2_3_COLLECTION_CONTRACT_ADDRESS,
      ],
      dxdyAddress,
      flashloanFee,
      {
        swapRouterAddress: '0xe592427a0aece92de3edee1f18e0157c05861564', // https://etherscan.io/address/0xe592427a0aece92de3edee1f18e0157c05861564
        quoterAddress: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', // https://etherscan.io/address/0xb27308f9f90d607463bb33ea1bebb41c27ce5ab6
        wethAddress: wethAddress, // https://etherscan.io/address/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
        supportedTokens: [wstEthAddress], // wstETH https://etherscan.io/address/0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0
        swapFeeRates: [100], // 0.01% https://etherscan.io/address/0x109830a1aaad605bbf02a9dfa7b0b92ec2fb7daa#readContract#F2
      },
    )) as Refinancing;

    refinancingLender = FXT.lender2;

    // // for starting the old loan
    // await wethContract.connect(impersonatedWethOwner).transfer(FXT.lender, 1000n * factorX);
    // await wethContract.connect(FXT.lender).approve(await SC.nftfiLoanOffer.getAddress(), 1000n * factorX);

    // // for starting the new loan
    // await wethContract.connect(impersonatedWethOwner).transfer(refinancingLender, 1000n * factorX);
    // await wethContract.connect(refinancingLender).approve(await SC.nftfiLoanOffer.getAddress(), 1000n * factorX);

    // // for the new loan payback
    // await wethContract.connect(impersonatedWethOwner).transfer(FXT.borrower, 1000n * factorX);
    // await wethContract.connect(FXT.borrower).approve(await SC.nftfiLoanOffer.getAddress(), 1000n * factorX);

    await refinancing.connect(FXT.nftfiOwner).loadTokens();

    await SC.nftfiLoanOffer.connect(FXT.nftfiOwner).setERC20Permit(wethAddress, true);

    nft = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());

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
    let wethContract: ERC20;

    beforeEach(async () => {
      const wethOwner = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      const impersonatedWethOwner = await ethers.getImpersonatedSigner(wethOwner);

      wethContract = (await ethers.getContractAt('ERC20', wethAddress)) as ERC20;

      // for starting the old loan
      await wethContract.connect(impersonatedWethOwner).transfer(FXT.lender, 1000n * factorX);
      await wethContract.connect(FXT.lender).approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      // for starting the new loan
      await wethContract.connect(impersonatedWethOwner).transfer(refinancingLender, 1000n * factorX);
      await wethContract
        .connect(refinancingLender)
        .approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      // for the new loan payback
      await wethContract.connect(impersonatedWethOwner).transfer(FXT.borrower, 1000n * factorX);
      await wethContract.connect(FXT.borrower).approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      await refinancing.connect(FXT.nftfiOwner).loadTokens();

      await SC.nftfiLoanOffer.connect(FXT.nftfiOwner).setERC20Permit(wethAddress, true);

      lenderSig = await getLenderSignature(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.isProRata,
        LOAN_FXT.repayment,
        nft.id,
        LOAN_FXT.duration,
        0n,
        await SC.nft.getAddress(),
        wethAddress,
        sigExpiry,
        offerType,
        0n,
      );
      // BEGIN LOAN .............................................................
      const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: wethAddress,
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

      // borrower needs an obligation receipt - not minted automatically
      await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
      const smartNftId = (await SC.loanCoordinator.getLoanData(loanId)).smartNftId;

      // borrower needs to hand over obligation receipt to refinancing contract, so it can pay back on borrowers behalf
      await SC.obligationReceipt.connect(FXT.borrower).approve(await refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        wethAddress,
        sigExpiry,
        offerType,
        0n,
      );

      await wethContract.connect(refinancingLender).approve(await refinancing.getAddress(), LOAN_FXT.repayment);

      await wethContract
        .connect(FXT.borrower)
        .approve(await refinancing.getAddress(), LOAN_FXT.principal + flashloanFee);

      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      borrowerBalance = await wethContract.balanceOf(FXT.borrower.address);

      await refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
        },
        {
          loanERC20Denomination: wethAddress,
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
        wethContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        wethContract,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );

      borrowerBalance = await wethContract.balanceOf(FXT.borrower.address);
      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      nftfiBalance = await wethContract.balanceOf(FXT.nftfiOwner.address);

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
        wethContract,
        FXT.borrower.address,
        borrowerBalance,
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        wethContract,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        wethContract,
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
      await SC.obligationReceipt.connect(FXT.borrower).approve(await refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        wethAddress,
        sigExpiry,
        offerType,
        0n,
      );

      // no need to approve weth to refinancing contract from borrower this time, we are in surplus

      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      borrowerBalance = await wethContract.balanceOf(FXT.borrower.address);

      await refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
        },
        {
          loanERC20Denomination: wethAddress,
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
        wethContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const surplus = refinancedPrincipal - LOAN_FXT.repayment;
      await assertBalanceChange(
        'Borrower should have received the refinancing deficit',
        wethContract,
        FXT.borrower.address,
        borrowerBalance,
        surplus - flashloanFee,
      );

      borrowerBalance = await wethContract.balanceOf(FXT.borrower.address);
      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      nftfiBalance = await wethContract.balanceOf(FXT.nftfiOwner.address);

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
        wethContract,
        FXT.borrower.address,
        borrowerBalance,
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        wethContract,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        wethContract,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });
  });

  describe('Refinance loan on fork with wstETH (no flashloan, needs a swap', () => {
    let wstEthContract: ERC20;

    beforeEach(async () => {
      const wstEthOwner = '0x176F3DAb24a159341c0509bB36B833E7fdd0a132';
      const impersonatedWstEthOwner = await ethers.getImpersonatedSigner(wstEthOwner);

      wstEthContract = (await ethers.getContractAt('ERC20', wstEthAddress)) as ERC20;

      await wstEthContract.connect(impersonatedWstEthOwner).transfer(FXT.lender, 1000n * factorX);
      await wstEthContract.connect(FXT.lender).approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      await wstEthContract.connect(impersonatedWstEthOwner).transfer(refinancingLender, 1000n * factorX);
      await wstEthContract
        .connect(refinancingLender)
        .approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      await wstEthContract.connect(impersonatedWstEthOwner).transfer(FXT.borrower, 1000n * factorX);
      await wstEthContract.connect(FXT.borrower).approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      await refinancing.connect(FXT.nftfiOwner).loadTokens();

      await SC.nftfiLoanOffer.connect(FXT.nftfiOwner).setERC20Permit(wstEthAddress, true);

      lenderSig = await getLenderSignature(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.isProRata,
        LOAN_FXT.repayment,
        nft.id,
        LOAN_FXT.duration,
        0n,
        await SC.nft.getAddress(),
        wstEthAddress,
        sigExpiry,
        offerType,
        0n,
      );
      // BEGIN LOAN .............................................................
      const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: wstEthAddress,
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
      await SC.obligationReceipt.connect(FXT.borrower).approve(await refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        wstEthAddress,
        sigExpiry,
        offerType,
        0n,
      );

      await wstEthContract
        .connect(FXT.borrower)
        .approve(await refinancing.getAddress(), LOAN_FXT.principal + flashloanFee + 500n);

      lenderBalance = await wstEthContract.balanceOf(refinancingLender.address);
      borrowerBalance = await wstEthContract.balanceOf(FXT.borrower.address);

      await refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
        },
        {
          loanERC20Denomination: wstEthAddress,
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
        wstEthContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;

      const wethAmount = await refinancing.getWethAmountNeeded.staticCall(wstEthAddress, LOAN_FXT.repayment);
      const flashloanPayoffAmount = await refinancing.getTokenAmountNeeded.staticCall(
        wstEthAddress,
        wethAmount + flashloanFee,
      );

      const fees = flashloanPayoffAmount - LOAN_FXT.repayment;

      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        wstEthContract,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - fees,
      );

      borrowerBalance = await wstEthContract.balanceOf(FXT.borrower.address);
      lenderBalance = await wstEthContract.balanceOf(refinancingLender.address);
      nftfiBalance = await wstEthContract.balanceOf(FXT.nftfiOwner.address);

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
        wstEthContract,
        FXT.borrower.address,
        borrowerBalance,
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        wstEthContract,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        wstEthContract,
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
      await SC.obligationReceipt.connect(FXT.borrower).approve(await refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        wstEthAddress,
        sigExpiry,
        offerType,
        0n,
      );

      await wstEthContract.connect(FXT.borrower).approve(await refinancing.getAddress(), LOAN_FXT.principal);

      lenderBalance = await wstEthContract.balanceOf(refinancingLender.address);
      borrowerBalance = await wstEthContract.balanceOf(FXT.borrower.address);

      await refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: await SC.nftfiLoanOffer.getAddress(),
        },
        {
          loanERC20Denomination: wstEthAddress,
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
        wstEthContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const surplus = refinancedPrincipal - LOAN_FXT.repayment;

      const wethAmount = await refinancing.getWethAmountNeeded.staticCall(wstEthAddress, LOAN_FXT.repayment);
      const flashloanPayoffAmount = await refinancing.getTokenAmountNeeded.staticCall(
        wstEthAddress,
        wethAmount + flashloanFee,
      );

      const fees = flashloanPayoffAmount - LOAN_FXT.repayment;

      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        wstEthContract,
        FXT.borrower.address,
        borrowerBalance,
        surplus - fees,
      );

      borrowerBalance = await wstEthContract.balanceOf(FXT.borrower.address);
      lenderBalance = await wstEthContract.balanceOf(refinancingLender.address);
      nftfiBalance = await wstEthContract.balanceOf(FXT.nftfiOwner.address);

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
        wstEthContract,
        FXT.borrower.address,
        borrowerBalance,
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        wstEthContract,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        wstEthContract,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });
  });

  describe('refinance a v2.0 Loan', () => {
    let wethContract: ERC20;
    let nftfiLoanOfferV2: LegacyLoan;

    beforeEach(async () => {
      nftfiLoanOfferV2 = await ethers.getContractAt('LegacyLoan', NFTFI_V2_CONTRACT_ADDRESS);

      const wethOwner = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      const impersonatedWethOwner = await ethers.getImpersonatedSigner(wethOwner);

      wethContract = (await ethers.getContractAt('ERC20', wethAddress)) as ERC20;

      // for starting the old loan
      await SC.nft.connect(FXT.borrower).approve(NFTFI_V2_CONTRACT_ADDRESS, nft.id);
      await wethContract.connect(impersonatedWethOwner).transfer(FXT.lender, 1000n * factorX);
      await wethContract.connect(FXT.lender).approve(NFTFI_V2_CONTRACT_ADDRESS, 1000n * factorX);

      // for starting the new loan
      await wethContract.connect(impersonatedWethOwner).transfer(refinancingLender, 1000n * factorX);
      await wethContract
        .connect(refinancingLender)
        .approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      // for the new loan payback
      await wethContract.connect(impersonatedWethOwner).transfer(FXT.borrower, 1000n * factorX);
      await wethContract.connect(FXT.borrower).approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      await refinancing.connect(FXT.nftfiOwner).loadTokens();

      await SC.nftfiLoanOffer.connect(FXT.nftfiOwner).setERC20Permit(wethAddress, true);

      lenderSig = await getLenderSignatureLegacy(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.repayment,
        nft.id,
        LOAN_FXT.duration,
        LOAN.adminFeeInBasisPoints,
        0n,
        await SC.nft.getAddress(),
        wethAddress,
        sigExpiry,
        ADDRESS_ZERO,
        NFTFI_V2_CONTRACT_ADDRESS,
      );
      // BEGIN LOAN .............................................................

      const ownerAddress = await nftfiLoanOfferV2.owner();
      const impersonatedContractOwner = await ethers.getImpersonatedSigner(ownerAddress);

      //we are broke...
      await impersonatedWethOwner.sendTransaction({
        to: impersonatedContractOwner.address,
        value: ethers.parseEther('1.0'),
      });

      await nftfiLoanOfferV2.connect(impersonatedContractOwner).unpause();

      // dig up OR - TODO put this in a function
      const hubV2Address = await nftfiLoanOfferV2.hub();
      const hubV2 = await ethers.getContractAt('NftfiHub', hubV2Address);

      const permittedNFTsAndTypeRegistryV2Address = await hubV2.getContract(toBytes32(CONTRACTS_KEYS.PERMITTED_NFTS));
      const permittedNFTsAndTypeRegistryV2 = await ethers.getContractAt(
        'PermittedNFTsAndTypeRegistry',
        permittedNFTsAndTypeRegistryV2Address,
      );

      await permittedNFTsAndTypeRegistryV2
        .connect(impersonatedContractOwner)
        .setNFTPermit(await SC.nft.getAddress(), 'ERC721');

      const loanTx = await nftfiLoanOfferV2.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: wethAddress,
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          referrer: ADDRESS_ZERO,
          loanDuration: LOAN_FXT.duration,
          loanAdminFeeInBasisPoints: LOAN.adminFeeInBasisPoints,
        },
        {
          signer: FXT.lender.address,
          nonce: 0,
          expiry: sigExpiry,
          signature: lenderSig,
        },
        {
          revenueSharePartner: ADDRESS_ZERO,
          referralFeeInBasisPoints: 0,
        },
      );

      // await nftfiLoanOfferV2.connect(impersonatedContractOwner).pause();

      await loanTx.wait();

      const receipt = await loanTx.wait();
      const loanStartedEvent = receipt?.logs?.find(
        log => nftfiLoanOfferV2.interface.parseLog(log as any)?.name === 'LoanStarted',
      );
      loanId = loanStartedEvent
        ? nftfiLoanOfferV2.interface.parseLog(loanStartedEvent as any)?.args?.loanId
        : undefined;

      if (!loanId) {
        throw new Error('Failed to get loanId from LoanStarted event');
      }
    });

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      // borrower needs an obligation receipt - not minted automatically
      await nftfiLoanOfferV2.connect(FXT.borrower).mintObligationReceipt(loanId);

      // borrower needs to hand over obligation receipt to refinancing contract, so it can pay back on borrowers behalf

      // dig up OR - TODO put this in a function
      const hubV2Address = await nftfiLoanOfferV2.hub();
      const hubV2 = await ethers.getContractAt('NftfiHub', hubV2Address);
      const coordinatorKey = await nftfiLoanOfferV2.LOAN_COORDINATOR();
      const coordinatorV2Address = await hubV2.getContract(coordinatorKey);
      const coordinatorV2 = await ethers.getContractAt('LoanCoordinator', coordinatorV2Address);

      const smartNftId = (await coordinatorV2.getLoanData(loanId)).smartNftId;

      const obligationReceiptV2Address = await coordinatorV2.obligationReceiptToken();
      const obligationReceiptV2 = await ethers.getContractAt('ERC721', obligationReceiptV2Address);

      await obligationReceiptV2.connect(FXT.borrower).approve(await refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        wethAddress,
        sigExpiry,
        offerType,
        0n,
      );

      // for refinancing deficit
      await wethContract
        .connect(FXT.borrower)
        .approve(await refinancing.getAddress(), LOAN_FXT.principal + flashloanFee);

      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      borrowerBalance = await wethContract.balanceOf(FXT.borrower.address);

      await refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: NFTFI_V2_CONTRACT_ADDRESS,
        },
        {
          loanERC20Denomination: wethAddress,
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0n,
          liquidityCap: 0,
          allowedBorrowers: [FXT.borrower.address],
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
      const oldLoanData = await coordinatorV2.getLoanData(loanId);
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
        wethContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        wethContract,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );

      borrowerBalance = await wethContract.balanceOf(FXT.borrower.address);
      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      nftfiBalance = await wethContract.balanceOf(FXT.nftfiOwner.address);

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
        wethContract,
        FXT.borrower.address,
        borrowerBalance,
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        wethContract,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        wethContract,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });
  });

  describe('refinance a v2.1 Loan', () => {
    let wethContract: ERC20;
    let nftfiLoanOfferV2_1: LegacyLoan;

    beforeEach(async () => {
      nftfiLoanOfferV2_1 = await ethers.getContractAt('LegacyLoan', NFTFI_V2_1_CONTRACT_ADDRESS);

      const wethOwner = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      const impersonatedWethOwner = await ethers.getImpersonatedSigner(wethOwner);

      wethContract = (await ethers.getContractAt('ERC20', wethAddress)) as ERC20;

      // for starting the old loan
      await SC.nft.connect(FXT.borrower).approve(NFTFI_V2_1_CONTRACT_ADDRESS, nft.id);
      await wethContract.connect(impersonatedWethOwner).transfer(FXT.lender, 1000n * factorX);
      await wethContract.connect(FXT.lender).approve(NFTFI_V2_1_CONTRACT_ADDRESS, 1000n * factorX);

      // for starting the new loan
      await wethContract.connect(impersonatedWethOwner).transfer(refinancingLender, 1000n * factorX);
      await wethContract
        .connect(refinancingLender)
        .approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      // for the new loan payback
      await wethContract.connect(impersonatedWethOwner).transfer(FXT.borrower, 1000n * factorX);
      await wethContract.connect(FXT.borrower).approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      await refinancing.connect(FXT.nftfiOwner).loadTokens();

      await SC.nftfiLoanOffer.connect(FXT.nftfiOwner).setERC20Permit(wethAddress, true);

      lenderSig = await getLenderSignatureLegacy(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.repayment,
        nft.id,
        LOAN_FXT.duration,
        LOAN.adminFeeInBasisPoints,
        0n,
        await SC.nft.getAddress(),
        wethAddress,
        sigExpiry,
        ADDRESS_ZERO,
        NFTFI_V2_1_CONTRACT_ADDRESS,
      );
      // BEGIN LOAN .............................................................

      const ownerAddress = await nftfiLoanOfferV2_1.owner();
      const impersonatedContractOwner = await ethers.getImpersonatedSigner(ownerAddress);

      //we are broke...
      await impersonatedWethOwner.sendTransaction({
        to: impersonatedContractOwner.address,
        value: ethers.parseEther('1.0'),
      });

      await nftfiLoanOfferV2_1.connect(impersonatedContractOwner).unpause();

      // dig up OR - TODO put this in a function
      const hubV2Address = await nftfiLoanOfferV2_1.hub();
      const hubV2 = await ethers.getContractAt('NftfiHub', hubV2Address);

      const permittedNFTsAndTypeRegistryV2Address = await hubV2.getContract(toBytes32(CONTRACTS_KEYS.PERMITTED_NFTS));
      const permittedNFTsAndTypeRegistryV2 = await ethers.getContractAt(
        'PermittedNFTsAndTypeRegistry',
        permittedNFTsAndTypeRegistryV2Address,
      );

      await permittedNFTsAndTypeRegistryV2
        .connect(impersonatedContractOwner)
        .setNFTPermit(await SC.nft.getAddress(), 'ERC721');

      const loanTx = await nftfiLoanOfferV2_1.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: wethAddress,
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          referrer: ADDRESS_ZERO,
          loanDuration: LOAN_FXT.duration,
          loanAdminFeeInBasisPoints: LOAN.adminFeeInBasisPoints,
        },
        {
          signer: FXT.lender.address,
          nonce: 0,
          expiry: sigExpiry,
          signature: lenderSig,
        },
        {
          revenueSharePartner: ADDRESS_ZERO,
          referralFeeInBasisPoints: 0,
        },
      );

      await loanTx.wait();
      const loanStartedEvent = await selectEvent(loanTx, nftfiLoanOfferV2_1, 'LoanStarted');
      loanId = loanStartedEvent?.args?.loanId;
    });

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      // borrower needs an obligation receipt - not minted automatically
      await nftfiLoanOfferV2_1.connect(FXT.borrower).mintObligationReceipt(loanId);

      // borrower needs to hand over obligation receipt to refinancing contract, so it can pay back on borrowers behalf

      // dig up OR - TODO put this in a function
      const hubV2Address = await nftfiLoanOfferV2_1.hub();
      const hubV2 = await ethers.getContractAt('NftfiHub', hubV2Address);
      const coordinatorKey = await nftfiLoanOfferV2_1.LOAN_COORDINATOR();
      const coordinatorV2Address = await hubV2.getContract(coordinatorKey);
      const coordinatorV2 = await ethers.getContractAt('LoanCoordinator', coordinatorV2Address);

      const smartNftId = (await coordinatorV2.getLoanData(loanId)).smartNftId;

      const obligationReceiptV2Address = await coordinatorV2.obligationReceiptToken();
      const obligationReceiptV2 = await ethers.getContractAt('ERC721', obligationReceiptV2Address);

      await obligationReceiptV2.connect(FXT.borrower).approve(await refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        wethAddress,
        sigExpiry,
        offerType,
        0n,
        0n,
        [FXT.borrower.address],
      );

      // for refinancing deficit
      await wethContract
        .connect(FXT.borrower)
        .approve(await refinancing.getAddress(), LOAN_FXT.principal + flashloanFee);

      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      borrowerBalance = await wethContract.balanceOf(FXT.borrower.address);

      await refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: NFTFI_V2_1_CONTRACT_ADDRESS,
        },
        {
          loanERC20Denomination: wethAddress,
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0n,
          liquidityCap: 0,
          allowedBorrowers: [FXT.borrower.address],
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
      const oldLoanData = await coordinatorV2.getLoanData(loanId);
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
        wethContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        wethContract,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );

      borrowerBalance = await wethContract.balanceOf(FXT.borrower.address);
      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      nftfiBalance = await wethContract.balanceOf(FXT.nftfiOwner.address);

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
        wethContract,
        FXT.borrower.address,
        borrowerBalance,
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        wethContract,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        wethContract,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });
  });

  describe('refinance a v2.1 collection offer Loan', () => {
    let wethContract: ERC20;
    let nftfiCollectionOfferV2_1: LegacyLoan;

    beforeEach(async () => {
      nftfiCollectionOfferV2_1 = await ethers.getContractAt('LegacyLoan', NFTFI_V2_FIXED_COLLECTION_CONTRACT_ADDRESS);

      const wethOwner = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      const impersonatedWethOwner = await ethers.getImpersonatedSigner(wethOwner);

      wethContract = (await ethers.getContractAt('ERC20', wethAddress)) as ERC20;

      // for starting the old loan
      await SC.nft.connect(FXT.borrower).approve(NFTFI_V2_FIXED_COLLECTION_CONTRACT_ADDRESS, nft.id);
      await wethContract.connect(impersonatedWethOwner).transfer(FXT.lender, 1000n * factorX);
      await wethContract.connect(FXT.lender).approve(NFTFI_V2_FIXED_COLLECTION_CONTRACT_ADDRESS, 1000n * factorX);

      // for starting the new loan
      await wethContract.connect(impersonatedWethOwner).transfer(refinancingLender, 1000n * factorX);
      await wethContract
        .connect(refinancingLender)
        .approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      // for the new loan payback
      await wethContract.connect(impersonatedWethOwner).transfer(FXT.borrower, 1000n * factorX);
      await wethContract.connect(FXT.borrower).approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      await refinancing.connect(FXT.nftfiOwner).loadTokens();

      await SC.nftfiLoanOffer.connect(FXT.nftfiOwner).setERC20Permit(wethAddress, true);

      lenderSig = await getLenderSignatureLegacy(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.repayment,
        0n, //because collection offer
        LOAN_FXT.duration,
        LOAN.adminFeeInBasisPoints,
        0n,
        await SC.nft.getAddress(),
        wethAddress,
        sigExpiry,
        ADDRESS_ZERO,
        NFTFI_V2_FIXED_COLLECTION_CONTRACT_ADDRESS,
      );
      // BEGIN LOAN .............................................................

      const ownerAddress = await nftfiCollectionOfferV2_1.owner();
      const impersonatedContractOwner = await ethers.getImpersonatedSigner(ownerAddress);

      //we are broke...
      await impersonatedWethOwner.sendTransaction({
        to: impersonatedContractOwner.address,
        value: ethers.parseEther('1.0'),
      });

      // dig up OR - TODO put this in a function
      const hubV2Address = await nftfiCollectionOfferV2_1.hub();
      const hubV2 = await ethers.getContractAt('NftfiHub', hubV2Address);

      await nftfiCollectionOfferV2_1.connect(impersonatedContractOwner).unpause();

      const permittedNFTsAndTypeRegistryV2Address = await hubV2.getContract(toBytes32(CONTRACTS_KEYS.PERMITTED_NFTS));
      const permittedNFTsAndTypeRegistryV2 = await ethers.getContractAt(
        'PermittedNFTsAndTypeRegistry',
        permittedNFTsAndTypeRegistryV2Address,
      );

      await permittedNFTsAndTypeRegistryV2
        .connect(impersonatedContractOwner)
        .setNFTPermit(await SC.nft.getAddress(), 'ERC721');

      const loanTx = await nftfiCollectionOfferV2_1.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: wethAddress,
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          referrer: ADDRESS_ZERO,
          loanDuration: LOAN_FXT.duration,
          loanAdminFeeInBasisPoints: LOAN.adminFeeInBasisPoints,
        },
        {
          signer: FXT.lender.address,
          nonce: 0,
          expiry: sigExpiry,
          signature: lenderSig,
        },
        {
          revenueSharePartner: ADDRESS_ZERO,
          referralFeeInBasisPoints: 0,
        },
      );

      await loanTx.wait();
      const loanStartedEvent = await selectEvent(loanTx, nftfiCollectionOfferV2_1, 'LoanStarted');
      loanId = loanStartedEvent?.args?.loanId;
    });

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      // borrower needs an obligation receipt - not minted automatically
      await nftfiCollectionOfferV2_1.connect(FXT.borrower).mintObligationReceipt(loanId);

      // borrower needs to hand over obligation receipt to refinancing contract, so it can pay back on borrowers behalf

      // dig up OR - TODO put this in a function
      const hubV2Address = await nftfiCollectionOfferV2_1.hub();
      const hubV2 = await ethers.getContractAt('NftfiHub', hubV2Address);
      const coordinatorKey = await nftfiCollectionOfferV2_1.LOAN_COORDINATOR();
      const coordinatorV2Address = await hubV2.getContract(coordinatorKey);
      const coordinatorV2 = await ethers.getContractAt('LoanCoordinator', coordinatorV2Address);

      const smartNftId = (await coordinatorV2.getLoanData(loanId)).smartNftId;

      const obligationReceiptV2Address = await coordinatorV2.obligationReceiptToken();
      const obligationReceiptV2 = await ethers.getContractAt('ERC721', obligationReceiptV2Address);

      await obligationReceiptV2.connect(FXT.borrower).approve(await refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        wethAddress,
        sigExpiry,
        offerType,
        0n,
        0n,
        [FXT.borrower.address],
      );

      // for refinancing deficit
      await wethContract
        .connect(FXT.borrower)
        .approve(await refinancing.getAddress(), LOAN_FXT.principal + flashloanFee);

      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      borrowerBalance = await wethContract.balanceOf(FXT.borrower.address);

      await refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: NFTFI_V2_FIXED_COLLECTION_CONTRACT_ADDRESS,
        },
        {
          loanERC20Denomination: wethAddress,
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0n,
          liquidityCap: 0,
          allowedBorrowers: [FXT.borrower.address],
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
      const oldLoanData = await coordinatorV2.getLoanData(loanId);
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
        wethContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        wethContract,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );

      borrowerBalance = await wethContract.balanceOf(FXT.borrower.address);
      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      nftfiBalance = await wethContract.balanceOf(FXT.nftfiOwner.address);

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
        wethContract,
        FXT.borrower.address,
        borrowerBalance,
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        wethContract,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        wethContract,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });
  });

  describe('refinance a v2.3 Loan', () => {
    let wethContract: ERC20;
    let nftfiLoanOfferV2_3: LegacyLoan;

    beforeEach(async () => {
      nftfiLoanOfferV2_3 = await ethers.getContractAt('LegacyLoan', NFTFI_V2_3_CONTRACT_ADDRESS);

      const wethOwner = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      const impersonatedWethOwner = await ethers.getImpersonatedSigner(wethOwner);

      wethContract = (await ethers.getContractAt('ERC20', wethAddress)) as ERC20;

      // for starting the old loan
      await SC.nft.connect(FXT.borrower).approve(NFTFI_V2_3_CONTRACT_ADDRESS, nft.id);
      await wethContract.connect(impersonatedWethOwner).transfer(FXT.lender, 1000n * factorX);
      await wethContract.connect(FXT.lender).approve(NFTFI_V2_3_CONTRACT_ADDRESS, 1000n * factorX);

      // for starting the new loan
      await wethContract.connect(impersonatedWethOwner).transfer(refinancingLender, 1000n * factorX);
      await wethContract
        .connect(refinancingLender)
        .approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      // for the new loan payback
      await wethContract.connect(impersonatedWethOwner).transfer(FXT.borrower, 1000n * factorX);
      await wethContract.connect(FXT.borrower).approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      await refinancing.connect(FXT.nftfiOwner).loadTokens();

      await SC.nftfiLoanOffer.connect(FXT.nftfiOwner).setERC20Permit(wethAddress, true);

      lenderSig = await getLenderSignatureLegacy(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.repayment,
        nft.id,
        LOAN_FXT.duration,
        LOAN.adminFeeInBasisPoints,
        0n,
        await SC.nft.getAddress(),
        wethAddress,
        sigExpiry,
        ADDRESS_ZERO,
        NFTFI_V2_3_CONTRACT_ADDRESS,
      );
      // BEGIN LOAN .............................................................

      const ownerAddress = await nftfiLoanOfferV2_3.owner();
      const impersonatedContractOwner = await ethers.getImpersonatedSigner(ownerAddress);

      //we are broke...
      await impersonatedWethOwner.sendTransaction({
        to: impersonatedContractOwner.address,
        value: ethers.parseEther('1.0'),
      });

      // dig up OR - TODO put this in a function
      const hubV2Address = await nftfiLoanOfferV2_3.hub();
      const hubV2 = await ethers.getContractAt('NftfiHub', hubV2Address);

      const permittedNFTsAndTypeRegistryV2Address = await hubV2.getContract(toBytes32(CONTRACTS_KEYS.PERMITTED_NFTS));
      const permittedNFTsAndTypeRegistryV2 = await ethers.getContractAt(
        'PermittedNFTsAndTypeRegistry',
        permittedNFTsAndTypeRegistryV2Address,
      );

      await permittedNFTsAndTypeRegistryV2
        .connect(impersonatedContractOwner)
        .setNFTPermit(await SC.nft.getAddress(), 'ERC721');

      const loanTx = await nftfiLoanOfferV2_3.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: wethAddress,
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          referrer: ADDRESS_ZERO,
          loanDuration: LOAN_FXT.duration,
          loanAdminFeeInBasisPoints: LOAN.adminFeeInBasisPoints,
        },
        {
          signer: FXT.lender.address,
          nonce: 0,
          expiry: sigExpiry,
          signature: lenderSig,
        },
        {
          revenueSharePartner: ADDRESS_ZERO,
          referralFeeInBasisPoints: 0,
        },
      );

      await loanTx.wait();
      const loanStartedEvent = await selectEvent(loanTx, nftfiLoanOfferV2_3, 'LoanStarted');
      loanId = loanStartedEvent?.args?.loanId;
    });

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      // borrower needs an obligation receipt - not minted automatically
      await nftfiLoanOfferV2_3.connect(FXT.borrower).mintObligationReceipt(loanId);

      // borrower needs to hand over obligation receipt to refinancing contract, so it can pay back on borrowers behalf

      // dig up OR - TODO put this in a function
      const hubV2Address = await nftfiLoanOfferV2_3.hub();
      const hubV2 = await ethers.getContractAt('NftfiHub', hubV2Address);
      const coordinatorKey = await nftfiLoanOfferV2_3.LOAN_COORDINATOR();
      const coordinatorV2Address = await hubV2.getContract(coordinatorKey);
      const coordinatorV2 = await ethers.getContractAt('LoanCoordinator', coordinatorV2Address);

      const smartNftId = (await coordinatorV2.getLoanData(loanId)).smartNftId;

      const obligationReceiptV2Address = await coordinatorV2.obligationReceiptToken();
      const obligationReceiptV2 = await ethers.getContractAt('ERC721', obligationReceiptV2Address);

      await obligationReceiptV2.connect(FXT.borrower).approve(await refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        wethAddress,
        sigExpiry,
        offerType,
        0n,
      );

      // for refinancing deficit
      await wethContract
        .connect(FXT.borrower)
        .approve(await refinancing.getAddress(), LOAN_FXT.principal + flashloanFee);

      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      borrowerBalance = await wethContract.balanceOf(FXT.borrower.address);

      await refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: NFTFI_V2_3_CONTRACT_ADDRESS,
        },
        {
          loanERC20Denomination: wethAddress,
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0n,
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
      const oldLoanData = await coordinatorV2.getLoanData(loanId);
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
        wethContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        wethContract,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );

      borrowerBalance = await wethContract.balanceOf(FXT.borrower.address);
      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      nftfiBalance = await wethContract.balanceOf(FXT.nftfiOwner.address);

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
        wethContract,
        FXT.borrower.address,
        borrowerBalance,
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        wethContract,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        wethContract,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });
  });

  describe('refinance a v2.3 collection offer Loan', () => {
    let wethContract: ERC20;
    let nftfiCollectionOfferV2_3: LegacyLoan;

    beforeEach(async () => {
      nftfiCollectionOfferV2_3 = await ethers.getContractAt('LegacyLoan', NFTFI_V2_3_COLLECTION_CONTRACT_ADDRESS);

      const wethOwner = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      const impersonatedWethOwner = await ethers.getImpersonatedSigner(wethOwner);

      wethContract = (await ethers.getContractAt('ERC20', wethAddress)) as ERC20;

      // for starting the old loan
      await SC.nft.connect(FXT.borrower).approve(NFTFI_V2_3_COLLECTION_CONTRACT_ADDRESS, nft.id);
      await wethContract.connect(impersonatedWethOwner).transfer(FXT.lender, 1000n * factorX);
      await wethContract.connect(FXT.lender).approve(NFTFI_V2_3_COLLECTION_CONTRACT_ADDRESS, 1000n * factorX);

      // for starting the new loan
      await wethContract.connect(impersonatedWethOwner).transfer(refinancingLender, 1000n * factorX);
      await wethContract
        .connect(refinancingLender)
        .approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      // for the new loan payback
      await wethContract.connect(impersonatedWethOwner).transfer(FXT.borrower, 1000n * factorX);
      await wethContract.connect(FXT.borrower).approve(await SC.erc20TransferManager.getAddress(), 1000n * factorX);

      await refinancing.connect(FXT.nftfiOwner).loadTokens();

      await SC.nftfiLoanOffer.connect(FXT.nftfiOwner).setERC20Permit(wethAddress, true);

      lenderSig = await getLenderSignatureLegacy(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.repayment,
        0n, //because collection offer
        LOAN_FXT.duration,
        LOAN.adminFeeInBasisPoints,
        0n,
        await SC.nft.getAddress(),
        wethAddress,
        sigExpiry,
        ADDRESS_ZERO,
        NFTFI_V2_3_COLLECTION_CONTRACT_ADDRESS,
      );
      // BEGIN LOAN .............................................................

      const ownerAddress = await nftfiCollectionOfferV2_3.owner();
      const impersonatedContractOwner = await ethers.getImpersonatedSigner(ownerAddress);

      //we are broke...
      await impersonatedWethOwner.sendTransaction({
        to: impersonatedContractOwner.address,
        value: ethers.parseEther('1.0'),
      });

      // dig up OR - TODO put this in a function
      const hubV2Address = await nftfiCollectionOfferV2_3.hub();
      const hubV2 = await ethers.getContractAt('NftfiHub', hubV2Address);

      const permittedNFTsAndTypeRegistryV2Address = await hubV2.getContract(toBytes32(CONTRACTS_KEYS.PERMITTED_NFTS));
      const permittedNFTsAndTypeRegistryV2 = await ethers.getContractAt(
        'PermittedNFTsAndTypeRegistry',
        permittedNFTsAndTypeRegistryV2Address,
      );

      await permittedNFTsAndTypeRegistryV2
        .connect(impersonatedContractOwner)
        .setNFTPermit(await SC.nft.getAddress(), 'ERC721');

      const loanTx = await nftfiCollectionOfferV2_3.connect(FXT.borrower).acceptCollectionOffer(
        {
          loanERC20Denomination: wethAddress,
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          referrer: ADDRESS_ZERO,
          loanDuration: LOAN_FXT.duration,
          loanAdminFeeInBasisPoints: LOAN.adminFeeInBasisPoints,
        },
        {
          signer: FXT.lender.address,
          nonce: 0,
          expiry: sigExpiry,
          signature: lenderSig,
        },
        {
          revenueSharePartner: ADDRESS_ZERO,
          referralFeeInBasisPoints: 0,
        },
      );

      await loanTx.wait();
      const loanStartedEvent = await selectEvent(loanTx, nftfiCollectionOfferV2_3, 'LoanStarted');
      loanId = loanStartedEvent?.args?.loanId;
    });

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = LOAN_FXT.principal / 2n;
      const refinancedRepayment = LOAN_FXT.repayment / 2n;

      // borrower needs an obligation receipt - not minted automatically
      await nftfiCollectionOfferV2_3.connect(FXT.borrower).mintObligationReceipt(loanId);

      // borrower needs to hand over obligation receipt to refinancing contract, so it can pay back on borrowers behalf

      // dig up OR - TODO put this in a function
      const hubV2Address = await nftfiCollectionOfferV2_3.hub();
      const hubV2 = await ethers.getContractAt('NftfiHub', hubV2Address);
      const coordinatorKey = await nftfiCollectionOfferV2_3.LOAN_COORDINATOR();
      const coordinatorV2Address = await hubV2.getContract(coordinatorKey);
      const coordinatorV2 = await ethers.getContractAt('LoanCoordinator', coordinatorV2Address);

      const smartNftId = (await coordinatorV2.getLoanData(loanId)).smartNftId;

      const obligationReceiptV2Address = await coordinatorV2.obligationReceiptToken();
      const obligationReceiptV2 = await ethers.getContractAt('ERC721', obligationReceiptV2Address);

      await obligationReceiptV2.connect(FXT.borrower).approve(await refinancing.getAddress(), smartNftId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nft.id,
        LOAN_FXT.duration,
        1n,
        await SC.nft.getAddress(),
        wethAddress,
        sigExpiry,
        offerType,
        0n,
      );

      // for refinancing deficit
      await wethContract
        .connect(FXT.borrower)
        .approve(await refinancing.getAddress(), LOAN_FXT.principal + flashloanFee);

      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      borrowerBalance = await wethContract.balanceOf(FXT.borrower.address);

      await refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: NFTFI_V2_3_COLLECTION_CONTRACT_ADDRESS,
        },
        {
          loanERC20Denomination: wethAddress,
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0n,
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
      const oldLoanData = await coordinatorV2.getLoanData(loanId);
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
        wethContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = LOAN_FXT.repayment - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        wethContract,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );

      borrowerBalance = await wethContract.balanceOf(FXT.borrower.address);
      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      nftfiBalance = await wethContract.balanceOf(FXT.nftfiOwner.address);

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
        wethContract,
        FXT.borrower.address,
        borrowerBalance,
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        wethContract,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        wethContract,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });
  });
});
