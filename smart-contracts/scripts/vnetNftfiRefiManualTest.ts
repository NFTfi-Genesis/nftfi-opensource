import hre from 'hardhat';
import { AssetOfferLoan, ERC20, LoanCoordinator, Refinancing } from '../typechain';
import { currentTime, daysToSeconds, getLenderSignature } from '../test/utils/utils';

async function main(): Promise<void> {
  const { ethers, deployments, getNamedAccounts } = hre;

  // ===================================================================================
  // STEP 1: CONFIGURE THE TEST
  // ===================================================================================
  const loanId = 5989; // <--- The ID of the loan on your VNet to refinance
  // ===================================================================================

  console.log(`Generating signature and params for refinancing NFTfi Loan #${loanId}...`);

  const loanCoordinator = (await ethers.getContractAt(
    'LoanCoordinator',
    (
      await deployments.get('LoanCoordinator')
    ).address,
  )) as LoanCoordinator;
  const refinancing = (await ethers.getContractAt(
    'Refinancing',
    (
      await deployments.get('Refinancing')
    ).address,
  )) as Refinancing;
  const nftfiAssetOfferLoan = (await ethers.getContractAt(
    'AssetOfferLoan',
    (
      await deployments.get('AssetOfferLoan')
    ).address,
  )) as AssetOfferLoan;
  const erc20TransferManager = await ethers.getContract('ERC20TransferManager');

  // Get accounts
  const { deployer } = await getNamedAccounts();
  const refinancingLender = await ethers.getSigner(deployer);

  // Get original loan data
  const originalLoanData = await loanCoordinator.getLoanData(loanId);
  const originalLoanTerms = await nftfiAssetOfferLoan.getLoanTerms(loanId);
  const borrowerAddress = originalLoanTerms.borrower;

  if (borrowerAddress === ethers.ZeroAddress) {
    throw new Error(`Loan #${loanId} not found or already repaid.`);
  }
  console.log(`- Found loan for borrower: ${borrowerAddress}`);
  console.log(`- New lender will be: ${refinancingLender.address}`);

  // STEP 2: Define the new loan terms
  console.log('- Defining new loan terms for a deficit scenario...');
  const refinancedPrincipal = originalLoanTerms.maximumRepaymentAmount / 2n;
  const refinancedRepayment = (refinancedPrincipal * 11n) / 10n; // 10% interest
  const sigExpiry = (await currentTime()) + daysToSeconds(10n);
  const lenderNonce = 1n; // The new lender's nonce for this signature

  // STEP 3: Generate the lender's signature for the new loan
  console.log('- Generating new lender signature...');
  const refinancingLenderSig = await getLenderSignature(
    refinancingLender,
    refinancedPrincipal,
    false, // isProRata
    refinancedRepayment,
    originalLoanTerms.nftCollateralId,
    originalLoanTerms.loanDuration,
    lenderNonce,
    originalLoanTerms.nftCollateralContract,
    originalLoanTerms.loanERC20Denomination,
    sigExpiry,
    ethers.encodeBytes32String('ASSET_OFFER_LOAN'),
    0n,
  );

  // STEP 4: Construct the JSON parameters for Tenderly
  const tenderlyParams = {
    loanToRefinance: {
      loanIdentifier: loanId.toString(),
      refinanceableContract: await nftfiAssetOfferLoan.getAddress(),
    },
    newLoanParams: {
      loanERC20Denomination: originalLoanTerms.loanERC20Denomination,
      loanPrincipalAmount: refinancedPrincipal.toString(),
      maximumRepaymentAmount: refinancedRepayment.toString(),
      nftCollateralContract: originalLoanTerms.nftCollateralContract,
      nftCollateralId: originalLoanTerms.nftCollateralId.toString(),
      loanDuration: originalLoanTerms.loanDuration.toString(),
      isProRata: false,
      originationFee: '0',
      liquidityCap: '0',
      allowedBorrowers: [borrowerAddress],
    },
    lenderSignature: {
      signer: refinancingLender.address,
      nonce: lenderNonce.toString(),
      expiry: sigExpiry.toString(),
      signature: refinancingLenderSig,
    },
    extraData: '0x',
  };

  // STEP 5: Pre-flight checks and manual approval instructions
  const loanToken = (await ethers.getContractAt('ERC20', originalLoanTerms.loanERC20Denomination)) as ERC20;
  const lenderBalance = await loanToken.balanceOf(refinancingLender.address);
  const flashloanFee = await refinancing.flashloanFee();
  const deficit = originalLoanTerms.maximumRepaymentAmount - refinancedPrincipal;
  const borrowerTotalNeeded = deficit + flashloanFee;
  const obligationReceiptAddress = await loanCoordinator.obligationReceiptToken();
  const smartNftId = originalLoanData.smartNftId;

  console.log(`\n\n✅ Signature and parameters generated successfully!`);
  console.log(`\n------------------------- PRE-FLIGHT CHECKS & MANUAL APPROVALS -------------------------`);
  console.log(`\n[Lender: ${refinancingLender.address}]`);
  console.log(`- New Loan Principal: ${ethers.formatEther(refinancedPrincipal)}`);
  console.log(
    `- Current Balance:    ${ethers.formatEther(lenderBalance)} ${
      lenderBalance >= refinancedPrincipal ? '✅' : '❌ INSUFFICIENT'
    }`,
  );
  console.log(`\n  ACTION NEEDED: Call 'approve' on Token (${await loanToken.getAddress()}) from LENDER account:`);
  console.log(`  1. For ERC20TransferManager (NFTfi operations):`);
  console.log(`     - spender: ${await erc20TransferManager.getAddress()}`);
  console.log(`     - amount:  ${refinancedPrincipal.toString()}`);
  console.log(`  2. For Refinancing contract (new loan principal):`);
  console.log(`     - spender: ${await refinancing.getAddress()}`);
  console.log(`     - amount:  ${refinancedPrincipal.toString()}`);

  console.log(`\n[Borrower: ${borrowerAddress}]`);
  console.log(`1. Approve Token for Deficit and Fees:`);
  console.log(
    `  - Deficit to Cover:   ${ethers.formatEther(borrowerTotalNeeded)} (Deficit: ${ethers.formatEther(
      deficit,
    )}, Fee: ${ethers.formatEther(flashloanFee)})`,
  );
  console.log(`  - ACTION NEEDED: Call 'approve' on Token (${await loanToken.getAddress()}) from BORROWER account:`);
  console.log(`    a. For ERC20TransferManager (NFTfi operations):`);
  console.log(`       - spender: ${await erc20TransferManager.getAddress()}`);
  console.log(`       - amount:  ${refinancedPrincipal.toString()}`);
  console.log(`    b. For Refinancing contract (deficit + fees):`);
  console.log(`       - spender: ${await refinancing.getAddress()}`);
  console.log(`       - amount:  ${borrowerTotalNeeded.toString()}`);
  console.log(`\n2. Mint and Approve Obligation Receipt:`);
  console.log(
    `  - ACTION NEEDED: Call 'mintObligationReceipt' on Loan Contract (${await nftfiAssetOfferLoan.getAddress()}) from BORROWER account:`,
  );
  console.log(`    - loanId: ${loanId}`);
  console.log(
    `  - ACTION NEEDED: Call 'approve' on Obligation Receipt (${obligationReceiptAddress}) from BORROWER account:`,
  );
  console.log(`    - to: ${await refinancing.getAddress()}`);
  console.log(`    - tokenId: ${smartNftId.toString()}`);

  console.log(`\n------------------------- LENDER SIGNATURE -------------------------`);
  console.log(refinancingLenderSig);
  console.log(`\n------------------------- TENDERLY TX PARAMETERS (JSON) -------------------------`);
  console.log(JSON.stringify(tenderlyParams, null, 2));
  console.log(`\n---------------------------------------------------------------------------------`);
  console.log(
    `\nNext steps on Tenderly UI:
1. Go to your deployed Refinancing contract.
2. Choose the 'refinanceLoan' function to execute.
3. Set the 'From' address to the borrower: ${borrowerAddress}
4. Paste the JSON object above into the structured parameter fields.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
