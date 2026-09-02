import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { ERC20, Refinancing, ERC721, ArcadeRefinancingAdapter, IVaultFactory, IAssetVault } from '../../typechain';
import { deployContracts, NFTfiContracts } from '../utils/deploy-contracts';
import { accountFixture, AccountFixture, fixedLoan } from '../utils/fixtures';
import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import {
  ADDRESS_ZERO,
  assertBalanceChange,
  assertTokenOwner,
  currentTime,
  daysToSeconds,
  getLenderSignature,
  restoreSnapshot,
  selectEvent,
  takeSnapshot,
  CONTRACTS_KEYS,
} from '../utils/utils';

describe('Arcade refinance loan on fork', function () {
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
  let snapshot: number;
  const LOAN_FXT = fixedLoan();
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

  const ARCADE_LOAN_CORE_ADDRESS = '0x89bc08BA00f135d608bc335f6B33D7a9ABCC98aF';

  let borrowerAddress: string;
  let tokenDenomination: string;
  let repaymentAmount: bigint;
  let nftContractAddress: string;
  let nftContract: ERC721;
  let nftId: bigint;

  let loanId: number;

  let impersonatedBorrower: SignerWithAddress;

  let usdcContract: ERC20;

  let borrowerNote: ERC721;

  let arcadeRefinancingAdapter: ArcadeRefinancingAdapter;

  before(async () => {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);

    borrowerNote = (await ethers.getContractAt('ERC721', '0xe5B12BEfaf3a91065DA7FDD461dEd2d8F8ECb7BE')) as ERC721;

    const arcadeRefinancingAdapterType = 'ARCADE';

    const ArcadeRefinancingAdapter = await ethers.getContractFactory('ArcadeRefinancingAdapter');

    arcadeRefinancingAdapter = (await ArcadeRefinancingAdapter.connect(
      FXT.nftfiOwner,
    ).deploy()) as ArcadeRefinancingAdapter;
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
      [arcadeRefinancingAdapterType],
      [await arcadeRefinancingAdapter.getAddress()],
      [arcadeRefinancingAdapterType],
      [ARCADE_LOAN_CORE_ADDRESS],
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

    await refinancing.connect(FXT.nftfiOwner).loadTokens();
    refinancingLender = FXT.lender2;

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

  describe('refinance a non vaulted Loan', () => {
    beforeEach(async () => {
      loanId = 5923;

      borrowerAddress = await arcadeRefinancingAdapter.getBorrowerAddress(ARCADE_LOAN_CORE_ADDRESS, loanId, '0x00');

      impersonatedBorrower = await ethers.getImpersonatedSigner(borrowerAddress);
      await setBalance(borrowerAddress, 100n ** 18n);

      [nftContractAddress, nftId] = await arcadeRefinancingAdapter.getCollateral(
        ARCADE_LOAN_CORE_ADDRESS,
        loanId,
        '0x00',
      );

      nftContract = (await ethers.getContractAt('ERC721', nftContractAddress)) as ERC721;
      await SC.permittedNFTs.setNFTPermit(nftContractAddress, 'ERC721');

      [tokenDenomination, repaymentAmount] = await arcadeRefinancingAdapter.getPayoffDetails(
        ARCADE_LOAN_CORE_ADDRESS,
        loanId,
        '0x00',
      );

      await SC.nftfiLoanOffer.connect(FXT.nftfiOwner).setERC20Permit(tokenDenomination, true);
      const usdcOwner = '0x37305B1cD40574E4C5Ce33f8e8306Be057fD7341';
      const impersonatedUsdcOwner = await ethers.getImpersonatedSigner(usdcOwner);

      usdcContract = (await ethers.getContractAt('ERC20', tokenDenomination)) as ERC20;

      // for starting the new loan
      await usdcContract.connect(impersonatedUsdcOwner).transfer(refinancingLender, repaymentAmount * 2n);
      await usdcContract
        .connect(refinancingLender)
        .approve(await SC.erc20TransferManager.getAddress(), repaymentAmount * 2n);

      // for the new loan payback
      await usdcContract.connect(impersonatedUsdcOwner).transfer(impersonatedBorrower, repaymentAmount * 3n);
      await usdcContract
        .connect(impersonatedBorrower)
        .approve(await SC.erc20TransferManager.getAddress(), repaymentAmount * 3n);
    });

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = repaymentAmount / 2n;
      const refinancedRepayment = (refinancedPrincipal / 10n) * 11n;

      // borrower needs to hand over obligation receipt to refinancing contract, so it can pay back on borrowers behalf
      await borrowerNote.connect(impersonatedBorrower).approve(await refinancing.getAddress(), loanId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nftId,
        LOAN_FXT.duration,
        1n,
        nftContractAddress,
        tokenDenomination,
        sigExpiry,
        offerType,
        0n,
      );

      await usdcContract.connect(refinancingLender).approve(await refinancing.getAddress(), repaymentAmount);

      await usdcContract
        .connect(impersonatedBorrower)
        .approve(await refinancing.getAddress(), repaymentAmount + flashloanFee);

      lenderBalance = await usdcContract.balanceOf(refinancingLender.address);
      borrowerBalance = await usdcContract.balanceOf(impersonatedBorrower.address);

      await refinancing.connect(impersonatedBorrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: ARCADE_LOAN_CORE_ADDRESS,
        },
        {
          loanERC20Denomination: tokenDenomination,
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: nftContractAddress,
          nftCollateralId: nftId,
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

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        impersonatedBorrower.address,
      );

      await assertTokenOwner(
        'After refinancing, the nft should be in escrow with NTFfi',
        nftContract,
        nftId.toString(),
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        usdcContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = repaymentAmount - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        usdcContract,
        impersonatedBorrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );

      borrowerBalance = await usdcContract.balanceOf(impersonatedBorrower.address);
      lenderBalance = await usdcContract.balanceOf(refinancingLender.address);
      nftfiBalance = await usdcContract.balanceOf(FXT.nftfiOwner.address);

      // REPAY LOAN .............................................................
      const repayTx = await SC.nftfiLoanOffer.connect(impersonatedBorrower).payBackLoan(refinancedLoanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertTokenOwner(
        'After payBackLoan, the original borrower should own the nft again!',
        nftContract,
        nftId.toString(),
        impersonatedBorrower.address,
      );

      await assertBalanceChange(
        'Borrower should have repaid the loan',
        usdcContract,
        impersonatedBorrower.address,
        borrowerBalance,
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        usdcContract,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        usdcContract,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });

    it('refianncing with double principal, surplus', async () => {
      const refinancedPrincipal = repaymentAmount * 2n;
      const refinancedRepayment = (refinancedPrincipal / 10n) * 11n;

      // borrower needs to hand over obligation receipt to refinancing contract, so it can pay back on borrowers behalf
      await borrowerNote.connect(impersonatedBorrower).approve(await refinancing.getAddress(), loanId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nftId,
        LOAN_FXT.duration,
        1n,
        nftContractAddress,
        tokenDenomination,
        sigExpiry,
        offerType,
        0n,
      );

      await usdcContract.connect(refinancingLender).approve(await refinancing.getAddress(), repaymentAmount);

      await usdcContract
        .connect(impersonatedBorrower)
        .approve(await refinancing.getAddress(), repaymentAmount + flashloanFee);

      lenderBalance = await usdcContract.balanceOf(refinancingLender.address);
      borrowerBalance = await usdcContract.balanceOf(impersonatedBorrower.address);

      await refinancing.connect(impersonatedBorrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: ARCADE_LOAN_CORE_ADDRESS,
        },
        {
          loanERC20Denomination: tokenDenomination,
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: nftContractAddress,
          nftCollateralId: nftId,
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

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        impersonatedBorrower.address,
      );

      await assertTokenOwner(
        'After refinancing, the nft should be in escrow with NTFfi',
        nftContract,
        nftId.toString(),
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        usdcContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = repaymentAmount - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        usdcContract,
        impersonatedBorrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );

      borrowerBalance = await usdcContract.balanceOf(impersonatedBorrower.address);
      lenderBalance = await usdcContract.balanceOf(refinancingLender.address);
      nftfiBalance = await usdcContract.balanceOf(FXT.nftfiOwner.address);

      // REPAY LOAN .............................................................
      const repayTx = await SC.nftfiLoanOffer.connect(impersonatedBorrower).payBackLoan(refinancedLoanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertTokenOwner(
        'After payBackLoan, the original borrower should own the nft again!',
        nftContract,
        nftId.toString(),
        impersonatedBorrower.address,
      );

      await assertBalanceChange(
        'Borrower should have repaid the loan',
        usdcContract,
        impersonatedBorrower.address,
        borrowerBalance,
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        usdcContract,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        usdcContract,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });
  });

  describe('refinance a Loan with a vault', () => {
    beforeEach(async () => {
      loanId = 5922;
      borrowerAddress = await arcadeRefinancingAdapter.getBorrowerAddress(ARCADE_LOAN_CORE_ADDRESS, loanId, '0x00');

      impersonatedBorrower = await ethers.getImpersonatedSigner(borrowerAddress);
      await setBalance(borrowerAddress, 100n ** 18n);

      [nftContractAddress, nftId] = await arcadeRefinancingAdapter.getCollateral(
        ARCADE_LOAN_CORE_ADDRESS,
        loanId,
        '0x00',
      );

      nftContract = (await ethers.getContractAt('ERC721', nftContractAddress)) as ERC721;
      await SC.permittedNFTs.setNFTPermit(nftContractAddress, 'ERC721');

      [tokenDenomination, repaymentAmount] = await arcadeRefinancingAdapter.getPayoffDetails(
        ARCADE_LOAN_CORE_ADDRESS,
        loanId,
        '0x00',
      );

      await SC.nftfiLoanOffer.connect(FXT.nftfiOwner).setERC20Permit(tokenDenomination, true);
      const usdcOwner = '0x37305B1cD40574E4C5Ce33f8e8306Be057fD7341';
      const impersonatedUsdcOwner = await ethers.getImpersonatedSigner(usdcOwner);

      usdcContract = (await ethers.getContractAt('ERC20', tokenDenomination)) as ERC20;

      // for starting the new loan
      await usdcContract.connect(impersonatedUsdcOwner).transfer(refinancingLender, repaymentAmount * 2n);
      await usdcContract
        .connect(refinancingLender)
        .approve(await SC.erc20TransferManager.getAddress(), repaymentAmount * 2n);

      // for the new loan payback
      await usdcContract.connect(impersonatedUsdcOwner).transfer(impersonatedBorrower, repaymentAmount * 3n);
      await usdcContract
        .connect(impersonatedBorrower)
        .approve(await SC.erc20TransferManager.getAddress(), repaymentAmount * 3n);
    });

    it('refianncing with double principal, surplus and unpackfrom vault', async () => {
      const refinancedPrincipal = repaymentAmount * 2n;
      const refinancedRepayment = (refinancedPrincipal / 10n) * 11n;

      // borrower needs to hand over obligation receipt to refinancing contract, so it can pay back on borrowers behalf
      await borrowerNote.connect(impersonatedBorrower).approve(await refinancing.getAddress(), loanId);

      const refinancingLenderSig = await getLenderSignature(
        refinancingLender,
        refinancedPrincipal,
        LOAN_FXT.isProRata,
        refinancedRepayment,
        nftId,
        LOAN_FXT.duration,
        1n,
        nftContractAddress,
        tokenDenomination,
        sigExpiry,
        offerType,
        0n,
      );

      await usdcContract.connect(refinancingLender).approve(await refinancing.getAddress(), repaymentAmount);

      await usdcContract
        .connect(impersonatedBorrower)
        .approve(await refinancing.getAddress(), repaymentAmount + flashloanFee);

      lenderBalance = await usdcContract.balanceOf(refinancingLender.address);
      borrowerBalance = await usdcContract.balanceOf(impersonatedBorrower.address);

      await refinancing.connect(impersonatedBorrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: ARCADE_LOAN_CORE_ADDRESS,
        },
        {
          loanERC20Denomination: tokenDenomination,
          loanPrincipalAmount: refinancedPrincipal,
          maximumRepaymentAmount: refinancedRepayment,
          nftCollateralContract: nftContractAddress,
          nftCollateralId: nftId,
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

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        impersonatedBorrower.address,
      );

      await assertTokenOwner(
        'After refinancing, the nft should be in escrow with NTFfi',
        nftContract,
        nftId.toString(),
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        usdcContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const deficit = repaymentAmount - refinancedPrincipal;
      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        usdcContract,
        impersonatedBorrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );

      borrowerBalance = await usdcContract.balanceOf(impersonatedBorrower.address);
      lenderBalance = await usdcContract.balanceOf(refinancingLender.address);
      nftfiBalance = await usdcContract.balanceOf(FXT.nftfiOwner.address);

      // REPAY LOAN .............................................................
      const repayTx = await SC.nftfiLoanOffer.connect(impersonatedBorrower).payBackLoan(refinancedLoanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertTokenOwner(
        'After payBackLoan, the original borrower should own the nft again!',
        nftContract,
        nftId.toString(),
        impersonatedBorrower.address,
      );

      await assertBalanceChange(
        'Borrower should have repaid the loan',
        usdcContract,
        impersonatedBorrower.address,
        borrowerBalance,
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        usdcContract,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        usdcContract,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
      const vaultFactory = (await ethers.getContractAt(
        'IVaultFactory',
        await nftContract.getAddress(),
      )) as IVaultFactory;
      const vaultAddress = await vaultFactory.instanceAt(nftId);
      const vault = (await ethers.getContractAt('IAssetVault', vaultAddress)) as IAssetVault;

      //no idea how to read this from the vault no on chain data, no event, so cheating by looking at etherscan
      const artBlocksAddress = '0x99a9b7c1116f9ceeb1652de04d5969cce509b069';
      const artBlocksId = 486000299n;

      await vault.connect(impersonatedBorrower).enableWithdraw();
      await vault
        .connect(impersonatedBorrower)
        .withdrawERC721(artBlocksAddress, artBlocksId, impersonatedBorrower.address);

      const artBlocks = await ethers.getContractAt('ERC721', artBlocksAddress);

      await assertTokenOwner(
        'After withdrawing from vault, the original borrower should own the containing nft!',
        artBlocks,
        artBlocksId.toString(),
        impersonatedBorrower.address,
      );
    });
  });
});
