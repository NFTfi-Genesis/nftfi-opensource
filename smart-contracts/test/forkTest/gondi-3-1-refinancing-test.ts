import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import hre, { ethers, network } from 'hardhat';
import {
  AssetOfferLoan,
  ERC20,
  Refinancing,
  ERC721,
  GondiRefinancingAdapter,
  NftfiHub,
  PermittedNFTsAndTypeRegistry,
  ERC20TransferManager,
} from '../../typechain';
import { accountFixture, AccountFixture, fixedLoan } from '../utils/fixtures';
import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import {
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
import { AbiCoder } from 'ethers';
import { NFTfiContracts, deployContracts } from '../utils/deploy-contracts';

describe('Gondi 3.1 refinance loan on fork', function () {
  let accounts: SignerWithAddress[]; // Test accounts
  let FXT: AccountFixture; // account fixtures
  let SC: NFTfiContracts; // Smart Contracts

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

  const GONDI_ADDRESS = '0xf41B389E0C1950dc0B16C9498eaE77131CC08A56';

  let tokenDenomination: string;
  let repaymentAmount: bigint;
  let nftContractAddress: string;
  let nftContract: ERC721;
  let nftId: bigint;

  let gondiLoanId: number;

  let gondiRefinancingAdapter: GondiRefinancingAdapter;

  let encodedRefinancingData: string;

  let erc20TransferManager: ERC20TransferManager;

  before(async () => {
    const forkUrl = hre.config.networks?.hardhat?.forking?.url;
    if (!forkUrl) {
      throw new Error('Missing Hardhat forking URL');
    }

    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          forking: {
            jsonRpcUrl: forkUrl,
            blockNumber: 23422330,
          },
        },
      ],
    });

    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);

    const gondiRefinancingAdapterType = 'GONDI';

    const GondiRefinancingAdapter = await ethers.getContractFactory('GondiRefinancingAdapter');

    erc20TransferManager = (await ethers.getContract('ERC20TransferManager')) as ERC20TransferManager;

    gondiRefinancingAdapter = (await GondiRefinancingAdapter.connect(
      FXT.nftfiOwner,
    ).deploy()) as GondiRefinancingAdapter;
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
      [gondiRefinancingAdapterType],
      [await gondiRefinancingAdapter.getAddress()],
      [gondiRefinancingAdapterType],
      [GONDI_ADDRESS],
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

  describe('refinance a gondi Loan', () => {
    let payoffTokenContract: ERC20;

    beforeEach(async () => {
      const gondiContract = await ethers.getContractAt('IGondi3_1', GONDI_ADDRESS);

      nftContractAddress = '0x282BDD42f4eb70e7A9D9F40c8fEA0825B7f68C5D';
      nftId = 2378n;

      const permittedNfts = (await ethers.getContract('PermittedNFTsAndTypeRegistry')) as PermittedNFTsAndTypeRegistry;
      const nftfiOwner = await permittedNfts.owner();
      const impersonatedNftfiOwner = await ethers.getImpersonatedSigner(nftfiOwner);
      await permittedNfts.connect(impersonatedNftfiOwner).setNFTPermit(nftContractAddress, 'ERC721');

      tokenDenomination = wethAddress;

      const wethWhale = '0x8eb8a3b98659cce290402893d0123abb75e3ab28';
      const impersonatedWethWhale = await ethers.getImpersonatedSigner(wethWhale);
      const wethContract = (await ethers.getContractAt('ERC20', wethAddress)) as ERC20;

      const transferAmount = 100n * 10n ** 18n; // 100 WETH
      await wethContract.connect(impersonatedWethWhale).transfer(FXT.borrower.address, transferAmount);
      await wethContract.connect(impersonatedWethWhale).transfer(refinancingLender.address, transferAmount);

      await setBalance(FXT.borrower.address, 100n ** 18n);
      await setBalance(refinancingLender.address, 100n ** 18n);

      const nftfiLoanOffer = (await ethers.getContract('AssetOfferLoan')) as AssetOfferLoan;
      await nftfiLoanOffer.connect(impersonatedNftfiOwner).setERC20Permit(tokenDenomination, true);

      nftContract = (await ethers.getContractAt('ERC721', nftContractAddress)) as ERC721;
      const nftOwner = await nftContract.ownerOf(nftId);
      const impersonatedNftOwner = await ethers.getImpersonatedSigner(nftOwner);
      await setBalance(impersonatedNftOwner.address, 10n ** 18n);
      await nftContract
        .connect(impersonatedNftOwner)
        .transferFrom(impersonatedNftOwner.address, FXT.borrower.address, nftId);
      await nftContract.connect(FXT.borrower).approve(GONDI_ADDRESS, nftId);

      // ===============================================================================
      // PART 1: IDENTIFYING AND RETRIEVING A GONDI LOAN
      // ===============================================================================
      // UI INTEGRATION NOTE: In real world scenarios, the dapp will need to:
      // 1. Allow users to select an existing Gondi loan
      // 2. Retrieve loan data from Gondi's on-chain events (NOT possible from contract functions)
      // 3. Construct the loan repayment data structure for refinancing
      //
      // Example: This test uses a reference to a real loan on Ethereum mainnet.
      // https://etherscan.io/tx/0x70f0f698221c668b7fe794ba17e910c1ac079dc2a804741604700eece43c638b
      // ===============================================================================

      const loanExecutionData2 = {
        borrower: FXT.borrower.address,
        borrowerOfferSignature: '0x',
        executionData: {
          callbackData: '0x',
          duration: '2592000',
          expirationTime: '1758675918',
          loanId: '0',
          nftCollateralAddress: nftContractAddress,
          offerExecution: [
            {
              offer: {
                offerId: '19',
                lender: '0x2940aec2db0706b0f8b24eec2241bd98a57cc244',
                fee: '68011992619926190',
                capacity: '4000000000000000000',
                nftCollateralAddress: nftContractAddress,
                nftCollateralTokenId: '0',
                principalAddress: tokenDenomination,
                principalAmount: '2000000000000000000',
                aprBps: '500',
                expirationTime: '1758741881',
                duration: '2592000',
                maxSeniorRepayment: '0',
                validators: [
                  {
                    validator: '0x0000000000000000000000000000000000000000',
                    arguments:
                      '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000',
                  },
                ],
              },
              amount: '2000000000000000000',
              lenderOfferSignature:
                '0x3f1e44409269c5d867cd40969d833a0f615fbaccfd5261fc52d85bd13c27ee1f4854bdf3f779f6afd394805c98338f1bbb3ebd9e0c225d5b537287ce77f88de31b',
            },
          ],
          principalReceiver: FXT.borrower.address,
          tokenId: nftId,
        },
      };

      const loanTx = await gondiContract.connect(FXT.borrower).emitLoan(loanExecutionData2);

      await loanTx.wait();

      // ===============================================================================
      // PART 2: RETRIEVING LOAN DETAILS FROM EVENT LOGS
      // ===============================================================================
      // UI INTEGRATION NOTE: For Gondi refinancing, it's important to extract the loan ID
      // and loan data from the LoanEmitted event. In production:
      // 1. The dapp should monitor or query for this event
      // 2. Extract the loanId parameter which uniquely identifies the loan
      // 3. Store the complete loan data structure for the refinancing process
      //
      // This step is necessary as Gondi does not provide a function to fetch loan details by ID
      // ===============================================================================
      const loanStartedEvent = await selectEvent(loanTx, gondiContract, 'LoanEmitted');
      if (!loanStartedEvent) {
        throw new Error('LoanEmitted event not found');
      }
      gondiLoanId = loanStartedEvent.args?.loanId;
      const loanData = loanStartedEvent.args?.loan;

      // ===============================================================================
      // PART 3: CREATING SIGNATURE FOR LOAN REPAYMENT
      // ===============================================================================
      // UI INTEGRATION NOTE: Gondi requires a signed repayment message from the borrower
      // to authorize loan repayment. The dapp should:
      // 1. Construct the domain data exactly as shown (with correct name, version, chainId)
      // 2. Create the proper message types matching Gondi's SignableRepaymentData struct
      // 3. Have the borrower sign this message using EIP-712 (eth_signTypedData_v4)
      //
      // This signature is needed for the loan repayment process during refinancing
      // ===============================================================================
      // Pull the exact domain fields the contract uses
      const name = await gondiContract.name();
      const version = ethers.toUtf8String(await gondiContract.VERSION());

      const { chainId } = await ethers.provider.getNetwork();

      // ---------------  DOMAIN & TYPES  ---------------
      const domain = {
        name: name,
        version: version,
        chainId: chainId,
        verifyingContract: GONDI_ADDRESS,
      };

      const types = {
        SignableRepaymentData: [
          { name: 'loanId', type: 'uint256' },
          { name: 'callbackData', type: 'bytes' },
          { name: 'shouldDelegate', type: 'bool' },
        ],
      };

      // ---------------  VALUE  ---------------
      const repaymentValue = {
        loanId: gondiLoanId,
        callbackData: '0x', // empty
        shouldDelegate: false,
      };

      // ---------------  SIGN  ---------------
      const borrowerSignature = await FXT.borrower.signTypedData(domain, types, repaymentValue);

      // ===============================================================================
      // PART 4: CREATING THE LOAN REPAYMENT DATA STRUCTURE
      // ===============================================================================
      // UI INTEGRATION NOTE: This structure combines:
      // 1. The repayment parameters (loanId, callbackData, delegation flag)
      // 2. The complete loan data (retrieved from the loan creation event)
      // 3. The borrower's signature authorizing the repayment
      //
      // This complete structure is essential for the refinancing process
      // ===============================================================================
      // Create the loan repayment data object
      const loanRepaymentData = {
        data: repaymentValue,
        loan: loanData,
        borrowerSignature: borrowerSignature,
      };

      const abiCoder = new AbiCoder();

      // ===============================================================================
      // PART 5: ENCODING THE LOAN REPAYMENT DATA
      // ===============================================================================
      // UI INTEGRATION NOTE: The loan repayment data needs to be ABI-encoded to be passed
      // to the refinancing contract. This encoding should follow the exact structure
      // of the LoanRepaymentData. This encoded data will be used as the extraData
      // parameter in refinancing functions.
      // ===============================================================================
      encodedRefinancingData = abiCoder.encode(
        [
          'tuple(tuple(uint256 loanId, bytes callbackData, bool shouldDelegate) data, tuple(address borrower, uint256 nftCollateralTokenId, address nftCollateralAddress, address principalAddress, uint256 principalAmount, uint256 startTime, uint256 duration, tuple(uint256 loanId, uint256 floor, uint256 principalAmount, address lender, uint256 accruedInterest, uint256 startTime, uint256 aprBps)[] tranche, uint256 protocolFee) loan, bytes borrowerSignature)',
        ],
        [loanRepaymentData],
      );

      // ===============================================================================
      // PART 6: CALCULATING PAYOFF AMOUNT
      // ===============================================================================
      // UI INTEGRATION NOTE: This is an important step for determining the exact repayment
      // amount required to pay off the Gondi loan. The dapp should:
      // 1. Call getPayoffDetails with the Gondi contract address, loan ID, and encoded data
      // 2. Use the returned token address and repayment amount for refinancing calculations
      //
      // This amount determines if refinancing will result in a deficit or surplus
      // ===============================================================================
      const [payoffToken, payoffAmount] = await gondiRefinancingAdapter.getPayoffDetails(
        GONDI_ADDRESS,
        gondiLoanId,
        encodedRefinancingData,
      );

      tokenDenomination = payoffToken;
      repaymentAmount = payoffAmount;

      payoffTokenContract = (await ethers.getContractAt('ERC20', tokenDenomination)) as ERC20;

      // ===============================================================================
      // PART 7: NFT APPROVAL FOR REFINANCING
      // ===============================================================================
      // UI INTEGRATION NOTE: This approval is important for the refinancing process.
      // The borrower needs to approve the refinancing contract to manage their NFT.
      // Without this approval, the refinancing will fail.
      // ===============================================================================
      await nftContract.connect(FXT.borrower).setApprovalForAll(await refinancing.getAddress(), true);
    });

    it('refianncing with half principal, deficit', async () => {
      const refinancedPrincipal = repaymentAmount / 2n;
      const refinancedRepayment = (refinancedPrincipal / 10n) * 11n;

      // ===============================================================================
      // PART 8: GETTING REFINANCING LENDER SIGNATURE
      // ===============================================================================
      // UI INTEGRATION NOTE: For refinancing, a new lender needs to sign an offer for the new
      // loan terms. The dapp should:
      // 1. Generate an offer with terms (principal, duration, interest, etc.)
      // 2. Get the signature from the new lender
      // 3. This signature is used to verify the lender's commitment to the new loan
      //
      // This step is similar to the regular NFTfi loan creation process
      // ===============================================================================
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

      // ===============================================================================
      // PART 9: TOKEN APPROVALS FOR REFINANCING
      // ===============================================================================
      // UI INTEGRATION NOTE: Three important token approvals are needed:
      // 1. New lender needs to approve refinancing contract to use their tokens (for new loan)
      // 2. Borrower needs to approve refinancing contract (for deficit + fees if applicable)
      // 3. Borrower needs to approve GONDI_ADDRESS (for loan repayment)
      //       In this step BORROWER doesnt actually need to own the tokens (unless they are in deficit),
      //       but they need to have approved the token for the GONDI contract,
      //       we will transfer it to the borrower from the flashloan
      // 4. Both parties need to approve ERC20TransferManager (for NFTfi loan operations)
      // ===============================================================================
      await payoffTokenContract
        .connect(refinancingLender)
        .approve(await refinancing.getAddress(), repaymentAmount * 2n);
      await payoffTokenContract
        .connect(FXT.borrower)
        .approve(await refinancing.getAddress(), repaymentAmount + flashloanFee);

      await payoffTokenContract.connect(FXT.borrower).approve(GONDI_ADDRESS, (repaymentAmount + flashloanFee) * 5n);
      await payoffTokenContract.connect(FXT.borrower).approve(erc20TransferManager, refinancedPrincipal * 2n);

      await payoffTokenContract.connect(refinancingLender).approve(erc20TransferManager, refinancedPrincipal * 2n);

      lenderBalance = await payoffTokenContract.balanceOf(refinancingLender.address);
      borrowerBalance = await payoffTokenContract.balanceOf(FXT.borrower.address);

      // ===============================================================================
      // PART 10: EXECUTING THE REFINANCING
      // ===============================================================================
      // UI INTEGRATION NOTE: This is the main refinancing call that:
      // 1. Pays off the old Gondi loan using the new loan's principal (and borrower funds if deficit)
      // 2. Creates a new loan with NFTfi with the same collateral
      // 3. Transfers any surplus to the borrower (if new loan principal > old loan payoff)
      // ===============================================================================
      const refinanceTx = await refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: gondiLoanId,
          refinanceableContract: GONDI_ADDRESS,
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
        encodedRefinancingData,
      );

      const receipt = await refinanceTx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }

      // Check if the transaction reverted silently (successful status but with a revert)
      const revertEvents = receipt.logs.filter((log: any) => {
        try {
          const parsed = refinancing.interface.parseLog(log);
          return parsed && (parsed.name === 'Error' || parsed.name === 'Revert');
        } catch (e) {
          return false;
        }
      });

      if (revertEvents.length > 0) {
        console.warn('WARNING: Found revert events in the logs:', revertEvents);
      }

      // Get the smart NFT ID
      const refinancedLoanId = await SC.loanCoordinator.totalNumLoans();
      const loanData = await SC.loanCoordinator.getLoanData(refinancedLoanId);
      const refinancedSmartNftId = loanData.smartNftId;

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        FXT.borrower.address,
      );

      // Verify the NFT is in escrow
      await assertTokenOwner(
        'After refinancing, the nft should be in escrow with NTFfi',
        nftContract,
        nftId.toString(),
        await SC.escrow.getAddress(),
      );

      // Verify balance changes
      await assertBalanceChange(
        'Lender should have spent the loan principal',
        payoffTokenContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      // Calculate the expected deficit
      const [, actualRepayment] = await gondiRefinancingAdapter.getPayoffDetails(
        GONDI_ADDRESS,
        gondiLoanId,
        encodedRefinancingData,
      );
      const deficit = actualRepayment - refinancedPrincipal;

      await assertBalanceChange(
        'Borrower should have spent the refinancing deficit',
        payoffTokenContract,
        FXT.borrower.address,
        borrowerBalance,
        -deficit - flashloanFee,
      );

      // Get updated balances for the repayment part
      borrowerBalance = await payoffTokenContract.balanceOf(FXT.borrower.address);
      lenderBalance = await payoffTokenContract.balanceOf(refinancingLender.address);
      nftfiBalance = await payoffTokenContract.balanceOf(FXT.nftfiOwner.address);

      // REPAY LOAN .............................................................
      const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(refinancedLoanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertTokenOwner(
        'After payBackLoan, the original borrower should own the nft again!',
        nftContract,
        nftId.toString(),
        FXT.borrower.address,
      );

      await assertBalanceChange(
        'Borrower should have repaid the loan',
        payoffTokenContract,
        FXT.borrower.address,
        borrowerBalance,
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        payoffTokenContract,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        payoffTokenContract,
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
      );

      // Token approvals
      await payoffTokenContract
        .connect(refinancingLender)
        .approve(await refinancing.getAddress(), repaymentAmount * 2n);
      await payoffTokenContract
        .connect(FXT.borrower)
        .approve(await refinancing.getAddress(), repaymentAmount + flashloanFee);

      await payoffTokenContract.connect(FXT.borrower).approve(GONDI_ADDRESS, (repaymentAmount + flashloanFee) * 5n);
      await payoffTokenContract.connect(FXT.borrower).approve(erc20TransferManager, refinancedPrincipal * 2n);

      await payoffTokenContract.connect(refinancingLender).approve(erc20TransferManager, refinancedPrincipal * 2n);

      lenderBalance = await payoffTokenContract.balanceOf(refinancingLender.address);
      borrowerBalance = await payoffTokenContract.balanceOf(FXT.borrower.address);

      // Test with borrower having 0 balance, only allownace
      await payoffTokenContract.connect(FXT.borrower).transfer(FXT.anyone, borrowerBalance);
      borrowerBalance = 0n;

      // Execute the refinance
      const refinanceTx = await refinancing.connect(FXT.borrower).refinanceLoan(
        {
          loanIdentifier: gondiLoanId,
          refinanceableContract: GONDI_ADDRESS,
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
        encodedRefinancingData,
      );

      const receipt = await refinanceTx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }

      // Check if the transaction reverted silently (successful status but with a revert)
      const revertEvents = receipt.logs.filter((log: any) => {
        try {
          const parsed = refinancing.interface.parseLog(log);
          return parsed && (parsed.name === 'Error' || parsed.name === 'Revert');
        } catch (e) {
          return false;
        }
      });

      if (revertEvents.length > 0) {
        console.warn('WARNING: Found revert events in the logs:', revertEvents);
      }

      // Get the smart NFT ID
      const refinancedLoanId = await SC.loanCoordinator.totalNumLoans();
      const loanData = await SC.loanCoordinator.getLoanData(refinancedLoanId);
      const refinancedSmartNftId = loanData.smartNftId;

      await assertTokenOwner(
        'Refinanced obligation receipt should be owned by the borrower',
        SC.obligationReceipt,
        refinancedSmartNftId.toString(),
        FXT.borrower.address,
      );

      await assertTokenOwner(
        'After refinancing, the nft should be in escrow with NTFfi',
        nftContract,
        nftId.toString(),
        await SC.escrow.getAddress(),
      );

      await assertBalanceChange(
        'Lender should have spent the loan principal',
        payoffTokenContract,
        refinancingLender.address,
        lenderBalance,
        -refinancedPrincipal,
      );

      const [, actualRepayment] = await gondiRefinancingAdapter.getPayoffDetails(
        GONDI_ADDRESS,
        gondiLoanId,
        encodedRefinancingData,
      );
      const surplus = refinancedPrincipal - actualRepayment;
      await assertBalanceChange(
        'Borrower should have received the refinancing surplus',
        payoffTokenContract,
        FXT.borrower.address,
        borrowerBalance,
        surplus - flashloanFee,
      );
      const anyoneBalance = await payoffTokenContract.balanceOf(FXT.anyone.address);
      // give it back to borrower for repayment
      await payoffTokenContract.connect(FXT.anyone).transfer(FXT.borrower.address, anyoneBalance);

      borrowerBalance = await payoffTokenContract.balanceOf(FXT.borrower.address);
      lenderBalance = await payoffTokenContract.balanceOf(refinancingLender.address);
      nftfiBalance = await payoffTokenContract.balanceOf(FXT.nftfiOwner.address);

      // REPAY LOAN .............................................................
      const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(refinancedLoanId);
      const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
      const adminFee = loanRepaidEvent?.args?.adminFee;

      await assertTokenOwner(
        'After payBackLoan, the original borrower should own the nft again!',
        nftContract,
        nftId.toString(),
        FXT.borrower.address,
      );

      await assertBalanceChange(
        'Borrower should have repaid the loan',
        payoffTokenContract,
        FXT.borrower.address,
        borrowerBalance,
        -refinancedRepayment,
      );
      await assertBalanceChange(
        'Lender should have received the payoff',
        payoffTokenContract,
        refinancingLender.address,
        lenderBalance,
        refinancedRepayment - adminFee,
      );
      await assertBalanceChange(
        'NFTfi should have received the adminFee',
        payoffTokenContract,
        FXT.nftfiOwner.address,
        nftfiBalance,
        adminFee,
      );
    });
  });
});
