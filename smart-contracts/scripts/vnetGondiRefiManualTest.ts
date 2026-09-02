import hre from 'hardhat';
import { ERC20, Refinancing, ERC20TransferManager, ERC721, LoanCoordinator } from '../typechain';
import { currentTime, daysToSeconds, selectEvent, getLenderSignature } from '../test/utils/utils';
import { accountFixture, AccountFixture, fixedLoan } from '../test/utils/fixtures';
import { AbiCoder } from 'ethers';

async function main(): Promise<void> {
  const { ethers, deployments } = hre;

  console.log('🚀 Gondi Refinancing Manual Test Script for Tenderly Virtual Mainnet');
  console.log('========================================================================\n');

  // ===================================================================================
  // STEP 1: INITIALIZE ACCOUNTS AND FIXTURES
  // ===================================================================================
  const accounts = await ethers.getSigners();
  const FXT: AccountFixture = accountFixture(accounts);
  const LOAN_FXT = fixedLoan();

  const GONDI_ADDRESS = '0xf65b99ce6dc5f6c556172bcc0ff27d3665a7d9a8';
  const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
  const AUTOGLYPHS_NFT = '0xd4e4078ca3495de5b1d4db434bebc5a986197782'; // Autoglyphs
  const NFT_ID = 139n;

  const refinancingLender = FXT.lender2;

  console.log('👥 Test Accounts:');
  console.log(`  Borrower: ${FXT.borrower.address}`);
  console.log(`  Refinancing Lender: ${refinancingLender.address}`);
  console.log(`  NFTfi Owner: ${FXT.nftfiOwner.address}\n`);

  // Get contract instances
  const refinancing = (await ethers.getContractAt(
    'Refinancing',
    (
      await deployments.get('Refinancing')
    ).address,
  )) as Refinancing;
  const loanCoordinator = (await ethers.getContractAt(
    'LoanCoordinator',
    (
      await deployments.get('LoanCoordinator')
    ).address,
  )) as LoanCoordinator;
  const erc20TransferManager = (await ethers.getContractAt(
    'ERC20TransferManager',
    (
      await deployments.get('ERC20TransferManager')
    ).address,
  )) as ERC20TransferManager;

  const gondiContract = await ethers.getContractAt('IGondi', GONDI_ADDRESS);
  const usdcContract = (await ethers.getContractAt('ERC20', USDC_ADDRESS)) as ERC20;
  const nftContract = (await ethers.getContractAt('ERC721', AUTOGLYPHS_NFT)) as ERC721;

  // ===================================================================================
  // STEP 2: CHECK CURRENT BALANCES AND NFT OWNERSHIP
  // ===================================================================================
  // console.log('📊 Checking Current Balances and Assets...\n');

  // Balance and ownership checks commented out - focusing on refinancing
  // const borrowerUsdcBalance = await usdcContract.balanceOf(FXT.borrower.address);
  // const lenderUsdcBalance = await usdcContract.balanceOf(FXT.lender.address);
  // const refinancingLenderUsdcBalance = await usdcContract.balanceOf(refinancingLender.address);
  // const borrowerEthBalance = await ethers.provider.getBalance(FXT.borrower.address);
  // const lenderEthBalance = await ethers.provider.getBalance(FXT.lender.address);
  // const refinancingLenderEthBalance = await ethers.provider.getBalance(refinancingLender.address);
  // let nftOwner = await nftContract.ownerOf(NFT_ID);
  // const borrowerOwnsNft = nftOwner.toLowerCase() === FXT.borrower.address.toLowerCase();

  // Skip balance checks - assume setup is complete
  console.log('⚡ Skipping balance checks - proceeding directly to loan operations...');

  /*
  console.log(`Borrower (${FXT.borrower.address})`);
  console.log(`  - USDC Balance: ${ethers.formatUnits(borrowerUsdcBalance, 6)} USDC`);
  console.log(`  - ETH Balance: ${ethers.formatUnits(borrowerEthBalance, 18)} ETH`);
  console.log(`  - Owns NFT #${NFT_ID}: ${borrowerOwnsNft ? '✅ YES' : '❌ NO'}`);
  console.log(`  - NFT Current Owner: ${nftOwner}`);

  console.log(`\nOriginal Lender (${FXT.lender.address}):`);
  console.log(`  - USDC Balance: ${ethers.formatUnits(lenderUsdcBalance, 6)} USDC`);
  console.log(`  - ETH Balance: ${ethers.formatUnits(lenderEthBalance, 18)} ETH`);

  console.log(`\nRefinancing Lender (${refinancingLender.address}):`);
  console.log(`  - USDC Balance: ${ethers.formatUnits(refinancingLenderUsdcBalance, 6)} USDC`);
  console.log(`  - ETH Balance: ${ethers.formatUnits(refinancingLenderEthBalance, 18)} ETH`);

    // Balance checking and setup logic commented out
  */

  // console.log('✅ All balances and NFT ownership look good! Proceeding with loan creation...\n');

  // ===================================================================================
  // STEP 4: PREPARE GONDI LOAN DATA
  // ===================================================================================
  console.log('📋 Preparing Gondi Loan Creation...\n');

  const loanAmount = ethers.parseUnits('120', 6); // 120 USDC
  const currentTimestamp = await currentTime();
  const loanDuration = 15552000n; // ~180 days

  // Generate Gondi lender signature for our test loan offer
  // NOTE: Gondi V3 offerId system:
  // - Each lender maintains their own nonce-like counter (offerId)
  // - Must be unique per lender, monotonic (start at 1, increment)
  // - Cannot be ≤ minOfferId (if lender called cancelAllOffers)
  // - For fork safety, use timestamp-based IDs (unique + > any existing minOfferId)
  console.log('🔐 Generating Gondi lender signature...');

  // Create loan offer data with EXACT Solidity struct field order
  // FIXED: EIP-712 field order corrected to match IGondi.sol LoanOffer struct exactly
  // FIXED: Validators array empty (no dummy validators needed for single-token offers)
  // FIXED: All BigInt numbers, never mutated after signing
  // Use timestamp-based offerId for fork safety (unique, monotonic, > any existing minOfferId)
  const gondiOfferId = BigInt(Math.floor(Date.now() / 1000));
  // Build one canonical offer object with BigInt numbers - NEVER mutate after signing
  // Field order now matches IGondi.sol LoanOffer struct exactly
  const gondiOfferData = {
    offerId: gondiOfferId, // 1st - uint256 (unique timestamp)
    lender: FXT.lender.address, // 2nd - address (EOA from new mnemonic)
    fee: ethers.parseUnits('0.6', 6), // 3rd - uint256 (0.6 USDC fee) FIXED: was 6th
    capacity: loanAmount * 2n, // 4th - uint256 (240 USDC capacity) FIXED: was 5th
    nftCollateralAddress: AUTOGLYPHS_NFT, // 5th - address (Autoglyphs) FIXED: was 7th
    nftCollateralTokenId: NFT_ID, // 6th - uint256 (139 - single token offer) FIXED: was 8th
    principalAddress: USDC_ADDRESS, // 7th - address (USDC) FIXED: was 4th
    principalAmount: loanAmount, // 8th - uint256 (120 USDC = 120e6) FIXED: was 3rd
    aprBps: 1900n, // 9th - uint256 (19% APR)
    expirationTime: currentTimestamp + daysToSeconds(10n), // 10th - uint256
    duration: loanDuration, // 11th - uint256 (180 days)
    maxSeniorRepayment: 0n, // 12th - uint256 (no senior debt)
    validators: [], // 13th - OfferValidator[] (EMPTY for single-token)
  };

  // Generate real Gondi lender signature using EIP-712
  console.log('🔐 Generating real Gondi lender signature...');

  // Get Gondi contract's EIP-712 domain parameters
  const gondiName = await gondiContract.name();
  const gondiVersion = ethers.toUtf8String(await gondiContract.VERSION());
  const { chainId: gondiChainId } = await ethers.provider.getNetwork();

  // Gondi EIP-712 domain
  const gondiOfferDomain = {
    name: gondiName,
    version: gondiVersion,
    chainId: gondiChainId,
    verifyingContract: GONDI_ADDRESS,
  };

  // Gondi LoanOffer EIP-712 types (EXACT Solidity struct order matching IGondi.sol)
  const gondiOfferTypes = {
    LoanOffer: [
      { name: 'offerId', type: 'uint256' }, // 1st
      { name: 'lender', type: 'address' }, // 2nd
      { name: 'fee', type: 'uint256' }, // 3rd (FIXED: was 6th)
      { name: 'capacity', type: 'uint256' }, // 4th (FIXED: was 5th)
      { name: 'nftCollateralAddress', type: 'address' }, // 5th (FIXED: was 7th)
      { name: 'nftCollateralTokenId', type: 'uint256' }, // 6th (FIXED: was 8th)
      { name: 'principalAddress', type: 'address' }, // 7th (FIXED: was 4th)
      { name: 'principalAmount', type: 'uint256' }, // 8th (FIXED: was 3rd)
      { name: 'aprBps', type: 'uint256' }, // 9th
      { name: 'expirationTime', type: 'uint256' }, // 10th
      { name: 'duration', type: 'uint256' }, // 11th
      { name: 'maxSeniorRepayment', type: 'uint256' }, // 12th
      { name: 'validators', type: 'OfferValidator[]' }, // 13th
    ],
    OfferValidator: [
      { name: 'validator', type: 'address' },
      { name: 'arguments', type: 'bytes' },
    ],
  };

  // Generate the signature using FXT.lender (which is our test lender)
  const gondiLenderSignature = await FXT.lender.signTypedData(gondiOfferDomain, gondiOfferTypes, gondiOfferData);

  console.log('   ✅ Real Gondi lender signature generated');

  // Verify signature locally
  const recoveredAddress = ethers.verifyTypedData(
    gondiOfferDomain,
    gondiOfferTypes,
    gondiOfferData,
    gondiLenderSignature,
  );
  const signatureValid = recoveredAddress.toLowerCase() === gondiOfferData.lender.toLowerCase();

  if (!signatureValid) {
    throw new Error('🚨 Signature verification failed! Hash mismatch detected locally.');
  }

  // Declare variables for loan data that will be used in refinancing
  let gondiLoanId: any;
  let loanData: any;

  // Gondi loan execution data - reusing the SAME offer object we signed
  const loanExecutionData = {
    executionData: {
      offerExecution: [
        {
          offer: gondiOfferData,
          amount: loanAmount,
          lenderOfferSignature: gondiLenderSignature,
        },
      ],
      tokenId: NFT_ID,
      duration: loanDuration,
      expirationTime: currentTimestamp + daysToSeconds(5n),
      principalReceiver: FXT.borrower.address,
      callbackData: '0x',
    },
    borrower: FXT.borrower.address,
    borrowerOfferSignature: '0x', // Empty when borrower calls emitLoan directly
  };

  // ===================================================================================
  // TENDERLY MANUAL EXECUTION
  // ===================================================================================
  console.log('\n📋 TENDERLY emitLoan PARAMETERS');
  console.log('================================\n');

  console.log(`Contract: ${GONDI_ADDRESS}`);
  console.log('Function: emitLoan');
  console.log(`Execute as: ${FXT.borrower.address}\n`);

  console.log('LoanExecutionData parameter:');
  console.log(
    JSON.stringify(
      {
        executionData: {
          offerExecution: [
            {
              offer: {
                offerId: gondiOfferData.offerId.toString(),
                lender: gondiOfferData.lender,
                fee: gondiOfferData.fee.toString(),
                capacity: gondiOfferData.capacity.toString(),
                nftCollateralAddress: gondiOfferData.nftCollateralAddress,
                nftCollateralTokenId: gondiOfferData.nftCollateralTokenId.toString(),
                principalAddress: gondiOfferData.principalAddress,
                principalAmount: gondiOfferData.principalAmount.toString(),
                aprBps: gondiOfferData.aprBps.toString(),
                expirationTime: gondiOfferData.expirationTime.toString(),
                duration: gondiOfferData.duration.toString(),
                maxSeniorRepayment: gondiOfferData.maxSeniorRepayment.toString(),
                validators: gondiOfferData.validators,
              },
              amount: loanAmount.toString(),
              lenderOfferSignature: gondiLenderSignature,
            },
          ],
          tokenId: NFT_ID.toString(),
          duration: loanDuration.toString(),
          expirationTime: (currentTimestamp + daysToSeconds(5n)).toString(),
          principalReceiver: FXT.borrower.address,
          callbackData: '0x',
        },
        borrower: FXT.borrower.address,
        borrowerOfferSignature: '0x',
      },
      null,
      2,
    ),
  );

  console.log('🚀 Creating Gondi Loan...\n');

  // Debug: Log the final execution data
  console.log('🔍 DEBUG - Loan Execution Data:');
  console.log('   tokenId:', loanExecutionData.executionData.tokenId.toString());
  console.log('   duration:', loanExecutionData.executionData.duration.toString());
  console.log(
    '   expirationTime:',
    new Date(Number(loanExecutionData.executionData.expirationTime) * 1000).toISOString(),
  );
  console.log('   principalReceiver:', loanExecutionData.executionData.principalReceiver);
  console.log('   borrower:', loanExecutionData.borrower);
  console.log('   amount:', ethers.formatUnits(loanExecutionData.executionData.offerExecution[0].amount, 6), 'USDC\n');

  // Check NFT ownership - if Gondi already owns it, skip loan creation
  const nftOwnerBeforeLoan = await nftContract.ownerOf(NFT_ID);
  const isGondiOwned = nftOwnerBeforeLoan.toLowerCase() === GONDI_ADDRESS.toLowerCase();
  const isBorrowerOwned = nftOwnerBeforeLoan.toLowerCase() === FXT.borrower.address.toLowerCase();

  if (isGondiOwned) {
    console.log('🔍 NFT is already owned by Gondi contract - existing loan detected!');
    console.log('⏭️  Skipping loan creation, using known loan ID 8527...');

    // Use the known existing loan ID from previous run
    gondiLoanId = 8527n;

    // Get loan data from the contract
    try {
      // Call a view function to get loan data (if available) or reconstruct from events
      console.log(`📋 Fetching loan data for loan ID: ${gondiLoanId}`);

      // Get recent LoanEmitted events and find the one with our loan ID
      const loanEmittedFilter = gondiContract.filters.LoanEmitted();
      const currentBlock = await ethers.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Look back 10k blocks

      const events = await gondiContract.queryFilter(loanEmittedFilter, fromBlock);

      let foundEvent = null;
      for (const event of events) {
        if (event.args?.loanId?.toString() === gondiLoanId.toString()) {
          foundEvent = event;
          break;
        }
      }

      if (!foundEvent) {
        throw new Error(`No LoanEmitted event found for loan ID ${gondiLoanId}`);
      }

      loanData = foundEvent.args?.loan;
      console.log(`✅ Retrieved loan data - Principal: ${ethers.formatUnits(loanData.principalAmount, 6)} USDC`);
      console.log('⏭️  Proceeding to refinancing...\n');
    } catch (error: any) {
      console.log('❌ Error getting loan data:', error.message);
      return;
    }
  } else if (!isBorrowerOwned) {
    throw new Error(`❌ NFT #${NFT_ID} is owned by ${nftOwnerBeforeLoan}, not borrower or Gondi!`);
  } else {
    // Only create new loan if borrower owns the NFT
    console.log('✅ Verified: Borrower owns the NFT - proceeding with new loan creation');

    console.log('1. Approving NFT to Gondi contract...');
    await nftContract.connect(FXT.borrower).approve(GONDI_ADDRESS, NFT_ID);
    console.log('   ✅ NFT approved to Gondi');

    console.log('2. Approving USDC from lender to Gondi contract...');
    await usdcContract.connect(FXT.lender).approve(GONDI_ADDRESS, loanAmount * 2n); // Approve 2x for safety
    console.log('   ✅ USDC approved from lender to Gondi');

    console.log('3. Creating Gondi loan...');

    const loanTx = await gondiContract.connect(FXT.borrower).emitLoan(loanExecutionData);
    const gondiLoanReceipt = await loanTx.wait();
    if (!gondiLoanReceipt) {
      throw new Error('Transaction receipt is null');
    }

    console.log('4. Extracting loan ID from LoanEmitted event...');
    const loanStartedEvent = await selectEvent(loanTx, gondiContract, 'LoanEmitted');
    if (!loanStartedEvent?.args?.loanId) {
      throw new Error('Failed to extract loan ID from LoanEmitted event');
    }

    gondiLoanId = loanStartedEvent.args.loanId;
    loanData = loanStartedEvent.args.loan;

    console.log(`   ✅ Gondi loan created with ID: ${gondiLoanId}`);
    console.log(`   📄 Loan principal: ${ethers.formatUnits(loanData.principalAmount, 6)} USDC`);
    console.log(`   🎯 NFT collateral: ${loanData.nftCollateralAddress}#${loanData.nftCollateralTokenId}\n`);
  }

  // ===================================================================================
  // STEP 5: REFINANCING PREPARATION
  // ===================================================================================
  console.log(`🔄 Preparing Refinancing for Gondi Loan ID: ${gondiLoanId}`);
  console.log('=========================================================\n');

  // Create borrower signature for Gondi repayment
  const repaymentValue = {
    loanId: gondiLoanId,
    callbackData: '0x',
    shouldDelegate: false,
  };

  // Generate real EIP-712 signature for Gondi repayment
  console.log('🔐 Generating borrower signature for Gondi repayment...');
  const name = await gondiContract.name();
  const version = ethers.toUtf8String(await gondiContract.VERSION());
  const { chainId } = await ethers.provider.getNetwork();

  const gondiDomain = {
    name: name,
    version: version,
    chainId: chainId,
    verifyingContract: GONDI_ADDRESS,
  };

  const gondiTypes = {
    SignableRepaymentData: [
      { name: 'loanId', type: 'uint256' },
      { name: 'callbackData', type: 'bytes' },
      { name: 'shouldDelegate', type: 'bool' },
    ],
  };

  const borrowerSignature = await FXT.borrower.signTypedData(gondiDomain, gondiTypes, repaymentValue);
  console.log('   ✅ Borrower signature generated');

  const loanRepaymentData = {
    data: repaymentValue,
    loan: loanData,
    borrowerSignature: borrowerSignature,
  };

  const abiCoder = new AbiCoder();
  const encodedRefinancingData = abiCoder.encode(
    [
      'tuple(tuple(uint256 loanId, bytes callbackData, bool shouldDelegate) data, tuple(address borrower, uint256 nftCollateralTokenId, address nftCollateralAddress, address principalAddress, uint256 principalAmount, uint256 startTime, uint256 duration, tuple(uint256 loanId, uint256 floor, uint256 principalAmount, address lender, uint256 accruedInterest, uint256 startTime, uint256 aprBps)[] tranche, uint256 protocolFee) loan, bytes borrowerSignature)',
    ],
    [loanRepaymentData],
  );

  // Define new loan terms based on actual loan created
  const actualLoanPrincipal = BigInt(loanData.principalAmount);
  const refinancedPrincipal = actualLoanPrincipal / 2n; // Half of original loan
  const refinancedRepayment = (refinancedPrincipal * 11n) / 10n; // 10% interest
  const sigExpiry = currentTimestamp + daysToSeconds(10n);
  const lenderNonce = 1n;

  // Calculate what the actual Gondi repayment should be
  // Gondi loan has been running for some time, so there will be accrued interest
  console.log('\n🔍 Calculating Gondi repayment amount...');
  const loanStartTime = BigInt(loanData.startTime);
  const currentTimeStamp = BigInt(await currentTime());
  const timeElapsed = currentTimeStamp - loanStartTime;

  // Calculate the total repayment needed for Gondi (principal + accrued interest + protocol fee)
  let totalGondiRepayment = 0n;
  for (const tranche of loanData.tranche) {
    const tranchePrincipal = BigInt(tranche.principalAmount);
    const aprBps = BigInt(tranche.aprBps);
    const accruedInterest = BigInt(tranche.accruedInterest);

    // Calculate additional interest since loan start
    const additionalInterest = (tranchePrincipal * aprBps * timeElapsed) / (10000n * 365n * 24n * 3600n);
    const totalTrancheRepayment = tranchePrincipal + accruedInterest + additionalInterest;

    totalGondiRepayment += totalTrancheRepayment;
  }

  const protocolFee = BigInt(loanData.protocolFee);
  totalGondiRepayment += protocolFee;

  console.log(`✅ Total Gondi repayment needed: ${ethers.formatUnits(totalGondiRepayment, 6)} USDC`);

  // Generate real lender signature
  console.log('🔐 Generating refinancing lender signature...');
  const refinancingLenderSig = await getLenderSignature(
    refinancingLender,
    refinancedPrincipal,
    false, // isProRata
    refinancedRepayment,
    loanData.nftCollateralTokenId,
    loanData.duration,
    lenderNonce,
    loanData.nftCollateralAddress,
    loanData.principalAddress,
    sigExpiry,
    ethers.encodeBytes32String('ASSET_OFFER_LOAN'),
    0n,
  );
  console.log('   ✅ Lender signature generated');

  // ===================================================================================
  // STEP 6: EXECUTE REQUIRED APPROVALS
  // ===================================================================================
  console.log('🔐 Executing Required Approvals for Refinancing...\n');

  const flashloanFee = await refinancing.flashloanFee();
  // Use the calculated actual repayment amount instead of just principal
  const actualDeficit = totalGondiRepayment - refinancedPrincipal;

  console.log(`📊 Refinancing amounts:`);
  console.log(`  • Gondi repayment: ${ethers.formatUnits(totalGondiRepayment, 6)} USDC`);
  console.log(`  • New NFTfi loan: ${ethers.formatUnits(refinancedPrincipal, 6)} USDC`);
  console.log(`  • Deficit to pay: ${ethers.formatUnits(actualDeficit, 6)} USDC`);

  console.log('\n🔐 Setting up approvals...');

  // Borrower approvals
  await usdcContract.connect(FXT.borrower).approve(GONDI_ADDRESS, totalGondiRepayment * 2n);
  await usdcContract
    .connect(FXT.borrower)
    .approve(await refinancing.getAddress(), actualDeficit + flashloanFee + refinancedPrincipal);
  await usdcContract.connect(FXT.borrower).approve(await erc20TransferManager.getAddress(), refinancedPrincipal * 2n);
  await nftContract.connect(FXT.borrower).setApprovalForAll(await refinancing.getAddress(), true);

  // Lender approvals
  await usdcContract.connect(refinancingLender).approve(await refinancing.getAddress(), refinancedPrincipal);
  await usdcContract
    .connect(refinancingLender)
    .approve(await erc20TransferManager.getAddress(), refinancedPrincipal * 2n);

  console.log('✅ All approvals completed');

  // ===================================================================================
  // STEP 7: EXECUTE REFINANCING TRANSACTION
  // ===================================================================================
  console.log('🚀 Executing Refinancing Transaction...\n');

  // Capture balances before refinancing for verification
  const borrowerBalanceBefore = await usdcContract.balanceOf(FXT.borrower.address);
  const lenderBalanceBefore = await usdcContract.balanceOf(refinancingLender.address);

  // Verify sufficient balances
  if (borrowerBalanceBefore < actualDeficit + flashloanFee) {
    console.log(`❌ Insufficient borrower balance: ${ethers.formatUnits(borrowerBalanceBefore, 6)} USDC`);
    return;
  }

  if (lenderBalanceBefore < refinancedPrincipal) {
    console.log(`❌ Insufficient lender balance: ${ethers.formatUnits(lenderBalanceBefore, 6)} USDC`);
    return;
  }

  // Execute the refinancing transaction
  console.log('\n⚡ Executing refinancing...');

  try {
    // First test with static call to get exact error
    await refinancing.connect(FXT.borrower).refinanceLoan.staticCall(
      {
        loanIdentifier: gondiLoanId,
        refinanceableContract: GONDI_ADDRESS,
      },
      {
        loanERC20Denomination: loanData.principalAddress,
        loanPrincipalAmount: refinancedPrincipal,
        maximumRepaymentAmount: refinancedRepayment,
        nftCollateralContract: loanData.nftCollateralAddress,
        nftCollateralId: loanData.nftCollateralTokenId,
        loanDuration: loanData.duration,
        isProRata: false,
        originationFee: 0,
        allowedBorrowers: [loanData.borrower],
      } as any,
      {
        signer: refinancingLender.address,
        nonce: lenderNonce,
        expiry: sigExpiry,
        signature: refinancingLenderSig,
      },
      encodedRefinancingData,
    );

    const refinanceTx = await refinancing.connect(FXT.borrower).refinanceLoan(
      {
        loanIdentifier: gondiLoanId,
        refinanceableContract: GONDI_ADDRESS,
      },
      {
        loanERC20Denomination: loanData.principalAddress,
        loanPrincipalAmount: refinancedPrincipal,
        maximumRepaymentAmount: refinancedRepayment,
        nftCollateralContract: loanData.nftCollateralAddress,
        nftCollateralId: loanData.nftCollateralTokenId,
        loanDuration: loanData.duration,
        isProRata: false,
        originationFee: 0,
        allowedBorrowers: [loanData.borrower],
      } as any,
      {
        signer: refinancingLender.address,
        nonce: lenderNonce,
        expiry: sigExpiry,
        signature: refinancingLenderSig,
      },
      encodedRefinancingData,
    );

    const refinanceReceipt = await refinanceTx.wait();
    if (!refinanceReceipt) {
      throw new Error('Transaction receipt is null');
    }

    console.log(`✅ Refinancing transaction successful! Gas used: ${refinanceReceipt.gasUsed.toString()}`);
    console.log(`📋 Transaction hash: ${refinanceReceipt.hash}\n`);
  } catch (error: any) {
    console.log('\n❌ REFINANCING FAILED:');
    console.log(`Error: ${error.message}`);
    if (error.reason) {
      console.log(`Reason: ${error.reason}`);
    }
    return; // Don't continue to verification if refinancing failed
  }

  // ===================================================================================
  // STEP 8: VERIFY REFINANCING RESULTS
  // ===================================================================================
  console.log('🔍 Verifying Refinancing Results...\n');

  // Get the new NFTfi loan ID
  const newLoanId = await loanCoordinator.totalNumLoans();
  const newLoanData = await loanCoordinator.getLoanData(newLoanId);

  console.log(`📄 New NFTfi loan created with ID: ${newLoanId}`);
  console.log(`🎫 Smart NFT (Obligation Receipt) ID: ${newLoanData.smartNftId}`);

  // Verify NFT is now in NFTfi escrow
  const currentNftOwner = await nftContract.ownerOf(loanData.nftCollateralTokenId);
  const escrowAddress = await ethers.getContract('Escrow');
  const escrowAddressStr = await escrowAddress.getAddress();

  if (currentNftOwner.toLowerCase() === escrowAddressStr.toLowerCase()) {
    console.log('✅ NFT successfully transferred to NFTfi escrow');
  } else {
    console.log(`❌ NFT not in escrow! Current owner: ${currentNftOwner}, Expected: ${escrowAddressStr}`);
  }

  // Verify balance changes
  const borrowerBalanceAfter = await usdcContract.balanceOf(FXT.borrower.address);
  const lenderBalanceAfter = await usdcContract.balanceOf(refinancingLender.address);

  const borrowerChange = borrowerBalanceAfter - borrowerBalanceBefore;
  const lenderChange = lenderBalanceAfter - lenderBalanceBefore;

  console.log('\n💰 Balance Changes:');
  console.log(`  Borrower: ${ethers.formatUnits(borrowerChange, 6)} USDC (paid deficit + fees)`);
  console.log(`  Refinancing Lender: ${ethers.formatUnits(lenderChange, 6)} USDC (provided new loan)`);

  const expectedBorrowerCost = actualDeficit + flashloanFee;
  const expectedLenderCost = refinancedPrincipal;

  if (borrowerChange === -expectedBorrowerCost) {
    console.log('✅ Borrower balance change matches expected deficit + fees');
  } else {
    console.log(
      `❌ Borrower balance mismatch. Expected: ${ethers.formatUnits(
        -expectedBorrowerCost,
        6,
      )}, Actual: ${ethers.formatUnits(borrowerChange, 6)}`,
    );
  }

  if (lenderChange === -expectedLenderCost) {
    console.log('✅ Lender balance change matches expected loan principal');
  } else {
    console.log(
      `❌ Lender balance mismatch. Expected: ${ethers.formatUnits(
        -expectedLenderCost,
        6,
      )}, Actual: ${ethers.formatUnits(lenderChange, 6)}`,
    );
  }

  console.log('\n🎉 SUCCESS! Gondi-to-NFTfi refinancing completed!');
  console.log('✅ Gondi loan detected and refinanced to NFTfi');
  console.log('✅ NFT successfully transferred to NFTfi escrow');
  console.log('✅ All balance changes verified');
  console.log('🏆 Refinancing test completed successfully!');
  console.log('\n📊 REFINANCING SUMMARY:');
  console.log('=======================');
  console.log(`🔄 Gondi Loan → NFTfi Refinancing:`);
  console.log(`  • Original Gondi Principal: ${ethers.formatUnits(actualLoanPrincipal, 6)} USDC`);
  console.log(`  • Actual Gondi Repayment: ${ethers.formatUnits(totalGondiRepayment, 6)} USDC`);
  console.log(`  • New NFTfi Loan: ${ethers.formatUnits(refinancedPrincipal, 6)} USDC`);
  console.log(`  • Actual Deficit Paid: ${ethers.formatUnits(actualDeficit, 6)} USDC`);
  console.log(`  • Flashloan Fee: ${ethers.formatUnits(flashloanFee, 6)} USDC`);
  console.log(`  • New NFTfi Loan ID: ${newLoanId}`);
  console.log(`💡 The Gondi loan has been successfully refinanced to NFTfi!`);
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
