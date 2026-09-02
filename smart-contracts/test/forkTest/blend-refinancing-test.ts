import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { ERC20, Refinancing, ERC721, BlendRefinancingAdapter } from '../../typechain';
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
import { NftfiHub } from '../../typechain';
import { AbiCoder } from 'ethers';

describe('Blend refinance loan on fork', function () {
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

  const BLEND_ADDRESS = '0x29469395eaf6f95920e59f858042f0e28d98a20b';

  let borrowerAddress: string;
  let tokenDenomination: string;
  let repaymentAmount: bigint;
  let nftContractAddress: string;
  let nftContract: ERC721;
  let nftId: bigint;

  let loanId: number;

  let impersonatedBorrower: SignerWithAddress;

  let blendRefinancingAdapter: BlendRefinancingAdapter;

  let encodedLien: string;

  before(async () => {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);

    const blendRefinancingAdapterType = 'BLEND';

    const BlendRefinancingAdapter = await ethers.getContractFactory('BlendRefinancingAdapter');

    blendRefinancingAdapter = (await BlendRefinancingAdapter.connect(
      FXT.nftfiOwner,
    ).deploy()) as BlendRefinancingAdapter;
    const nftfiHub = (await ethers.getContract('NftfiHub')) as NftfiHub;
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
      [blendRefinancingAdapterType],
      [await blendRefinancingAdapter.getAddress()],
      [blendRefinancingAdapterType],
      [BLEND_ADDRESS],
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

    await nftfiHub.connect(FXT.nftfiOwner).setContract(CONTRACTS_KEYS.REFINANCING, await refinancing.getAddress());

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

  describe('refinance a blend Loan', () => {
    let wethContract: ERC20;

    beforeEach(async () => {
      //loan creation tx: https://etherscan.io/tx/0x0acbbddde51550eb99aa1c536e41195c4325c5e95458678dd56380130f0ba29c#eventlog
      loanId = 339742;

      // Hard code the block where the loan was created based on the transaction
      const loanCreationBlock = 21031720;

      // ===============================================================================
      // PART 1: GETTING LOAN DATA FROM BLEND
      // ===============================================================================
      // UI INTEGRATION NOTE: The dapp will need to retrieve the Blend loan details
      // to create the lien object required for refinancing. This can be done by:
      // 1. Querying events from Blend's contracts to find loan data
      // Blend does NOT have a direct query function to get all loan details by ID
      // ===============================================================================

      // Get lien data from event logs
      const blendContract = await ethers.getContractAt('IBlend', BLEND_ADDRESS);

      // Get LoanOfferTaken events within a limited block range around the known transaction
      // UI INTEGRATION NOTE: In production, you might want to use a subgraph or indexer
      // to efficiently retrieve loan data without scanning blocks
      const filter = blendContract.filters.LoanOfferTaken();
      // Using the exact block where the transaction occurred might not be possible in a real case
      const events = await blendContract.queryFilter(filter, loanCreationBlock, loanCreationBlock);

      // Find the event with our lienId
      // UI INTEGRATION NOTE: This filters for the specific loan ID we want to refinance
      const event = events.find(e => e.args && e.args.lienId === BigInt(loanId));

      if (!event) {
        throw new Error(`No LoanOfferTaken event found for lien ID ${loanId}`);
      }

      // Get the event data
      const eventData = event.args;

      // Get the block timestamp for the loan start time
      const blockNumber = event.blockNumber;
      const block = await ethers.provider.getBlock(blockNumber);

      // Create the lien object from the event data
      // UI INTEGRATION NOTE: This lien object contains all necessary details about the loan
      // and is required for refinancing calls. The dapp will need to construct this object.
      const lien = {
        lender: eventData.lender,
        borrower: eventData.borrower,
        collection: eventData.collection,
        tokenId: eventData.tokenId,
        amount: eventData.loanAmount,
        startTime: block?.timestamp, // block timestamp of the event
        rate: eventData.rate,
        auctionStartBlock: 0n, // always 0
        auctionDuration: eventData.auctionDuration,
      };

      const abiCoder = AbiCoder.defaultAbiCoder();

      // Encode using the struct type from the contract's ABI
      // UI INTEGRATION NOTE: The lien data must be ABI encoded to be passed to the contract
      // This encoding must be exact, including the order of the fields, blend cheks the validity against a hash
      // This encoded data is then used as the extraData parameter in refinancing functions
      encodedLien = abiCoder.encode(
        [
          'tuple(address lender, address borrower, address collection, uint256 tokenId, uint256 amount, uint256 startTime, uint256 rate, uint256 auctionStartBlock, uint256 auctionDuration)',
        ],
        [
          {
            lender: lien.lender,
            borrower: lien.borrower,
            collection: lien.collection,
            tokenId: lien.tokenId,
            amount: lien.amount,
            startTime: lien.startTime,
            rate: lien.rate,
            auctionStartBlock: lien.auctionStartBlock,
            auctionDuration: lien.auctionDuration,
          },
        ],
      );

      borrowerAddress = lien.borrower;

      impersonatedBorrower = await ethers.getImpersonatedSigner(borrowerAddress);
      await setBalance(borrowerAddress, 100n ** 18n);

      nftContractAddress = lien.collection;
      nftId = lien.tokenId;

      nftContract = (await ethers.getContractAt('ERC721', lien.collection)) as ERC721;
      await SC.permittedNFTs.setNFTPermit(lien.collection, 'ERC721');

      const [payoffToken, payoffAmount] = await blendRefinancingAdapter.getPayoffDetails(
        BLEND_ADDRESS,
        loanId,
        encodedLien,
      );

      // ===============================================================================
      // UI INTEGRATION NOTE: The above call to blendRefinancingAdapter.getPayoffDetails
      // is critical for calculating the approximate repayment amount needed. This amount
      // includes accumulated interest and must be calculated at runtime. Depending on the time of
      // the call compared to the actual refinancing call this will be lower then the actual amount
      // by some small dust amount
      //
      // You MUST pass:
      // 1. BLEND_ADDRESS - the address of the Blend protocol contract
      // 2. loanId - the ID of the loan to be refinanced
      // 3. encodedLien - the ABI-encoded lien data structure from the event
      //
      // This amount will be used to determine if the refinancing results in
      // a deficit (new loan < payoff) or surplus (new loan > payoff)
      // ===============================================================================

      tokenDenomination = payoffToken;
      repaymentAmount = payoffAmount;

      await SC.nftfiLoanOffer.connect(FXT.nftfiOwner).setERC20Permit(tokenDenomination, true);
      const wethOwner = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      const impersonatedWethOwner = await ethers.getImpersonatedSigner(wethOwner);

      wethContract = (await ethers.getContractAt('ERC20', wethAddress)) as ERC20;

      // for starting the new loan
      await wethContract.connect(impersonatedWethOwner).transfer(refinancingLender, repaymentAmount * 2n);
      await wethContract
        .connect(refinancingLender)
        .approve(await SC.erc20TransferManager.getAddress(), repaymentAmount * 2n);

      // for the new loan payback
      await wethContract.connect(impersonatedWethOwner).transfer(impersonatedBorrower, repaymentAmount * 3n);
      await wethContract
        .connect(impersonatedBorrower)
        .approve(await SC.erc20TransferManager.getAddress(), repaymentAmount * 3n);

      // ===============================================================================
      // PART 3: CRUCIAL NFT APPROVAL FOR REFINANCING
      // ===============================================================================
      // UI INTEGRATION NOTE: This approval is CRITICAL for the refinancing process.
      // The borrower MUST approve the refinancing contract to manage their NFT.
      // Without this approval, the refinancing will fail.
      //
      // In the UI, you should:
      // 1. Check if approval is already granted
      // 2. If not, request the user to approve the NFT for the refinancing contract
      // 3. Wait for approval transaction to be confirmed before proceeding
      // ===============================================================================
      await nftContract.connect(impersonatedBorrower).setApprovalForAll(await refinancing.getAddress(), true);
    });

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = repaymentAmount / 2n;
      const refinancedRepayment = (refinancedPrincipal / 10n) * 11n;

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
        0n,
        [impersonatedBorrower.address],
      );

      // ===============================================================================
      // PART 4: TOKEN APPROVALS FOR REFINANCING
      // ===============================================================================
      // UI INTEGRATION NOTE: Both the lender and borrower need to approve tokens:
      // 1. Lender approves the refinancing contract to use their tokens for the new loan
      // 2. Borrower approves tokens to cover any deficit plus fees
      //
      // DEFICIT CASE: When the new loan principal is LESS than the payoff amount of
      // the old loan, the borrower must cover the difference plus flashloan fees
      //
      // SURPLUS CASE: When the new loan principal is MORE than the payoff amount of
      // the old loan, the borrower receives the difference (minus flashloan fees)
      //
      // The UI should clearly explain these scenarios and show estimated amounts
      // ===============================================================================
      await wethContract.connect(refinancingLender).approve(await refinancing.getAddress(), repaymentAmount);

      await wethContract
        .connect(impersonatedBorrower)
        .approve(await refinancing.getAddress(), repaymentAmount + flashloanFee);

      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      borrowerBalance = await wethContract.balanceOf(impersonatedBorrower.address);

      // ===============================================================================
      // PART 5: EXECUTING THE REFINANCING
      // ===============================================================================
      // UI INTEGRATION NOTE: This is the main refinancing call that:
      // 1. Pays off the old loan using the new loan's principal and borrower's funds if needed
      // 2. Creates a new loan with NFTfi with the same collateral
      // 3. Transfers any surplus to the borrower
      //
      // It requires:
      // - Loan identifiers for the old loan
      // - New loan terms
      // - Lender's signature for the new loan
      // - Encoded lien data to identify the old loan's details
      // ===============================================================================
      await refinancing.connect(impersonatedBorrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: BLEND_ADDRESS,
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
          liquidityCap: 0n,
          allowedBorrowers: [impersonatedBorrower.address],
        },
        {
          signer: refinancingLender.address,
          nonce: 1,
          expiry: sigExpiry,
          signature: refinancingLenderSig,
        },
        encodedLien,
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
        wethContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const [, actualRepayment] = await blendRefinancingAdapter.getPayoffDetails(BLEND_ADDRESS, loanId, encodedLien);
      const deficit = actualRepayment - refinancedPrincipal;

      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        wethContract,
        impersonatedBorrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );

      borrowerBalance = await wethContract.balanceOf(impersonatedBorrower.address);
      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      nftfiBalance = await wethContract.balanceOf(FXT.nftfiOwner.address);

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
        wethContract,
        impersonatedBorrower.address,
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
      const refinancedPrincipal = repaymentAmount * 2n;
      const refinancedRepayment = (refinancedPrincipal / 10n) * 11n;

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
        0n,
        [impersonatedBorrower.address],
      );

      await wethContract.connect(refinancingLender).approve(await refinancing.getAddress(), repaymentAmount);

      await wethContract
        .connect(impersonatedBorrower)
        .approve(await refinancing.getAddress(), repaymentAmount + flashloanFee);

      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      borrowerBalance = await wethContract.balanceOf(impersonatedBorrower.address);

      await refinancing.connect(impersonatedBorrower).refinanceLoan(
        {
          loanIdentifier: loanId,
          refinanceableContract: BLEND_ADDRESS,
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
          liquidityCap: 0n,
          allowedBorrowers: [impersonatedBorrower.address],
        },
        {
          signer: refinancingLender.address,
          nonce: 1,
          expiry: sigExpiry,
          signature: refinancingLenderSig,
        },
        encodedLien,
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
        wethContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const [, actualRepayment] = await blendRefinancingAdapter.getPayoffDetails(BLEND_ADDRESS, loanId, encodedLien);
      const surplus = refinancedPrincipal - actualRepayment;
      await assertBalanceChange(
        'Borrower should have received the refinancing surplus',
        wethContract,
        impersonatedBorrower.address,
        borrowerBalance,
        surplus - flashloanFee,
      );

      borrowerBalance = await wethContract.balanceOf(impersonatedBorrower.address);
      lenderBalance = await wethContract.balanceOf(refinancingLender.address);
      nftfiBalance = await wethContract.balanceOf(FXT.nftfiOwner.address);

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
        wethContract,
        impersonatedBorrower.address,
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
