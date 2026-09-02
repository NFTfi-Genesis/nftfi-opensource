import fs from 'fs-extra';
import hre from 'hardhat';
import { join } from 'path';

async function main(): Promise<void> {
  const network = hre.network.name;

  if (network !== 'virtual-mainnet') {
    console.error('This script is only for virtual-mainnet network');
    process.exit(1);
  }

  console.log(`Starting contract verification using Tenderly plugin on network: ${network}`);

  // Try to load dotenv if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv').config();
  } catch (e) {
    // dotenv not available, that's ok
  }

  const deploymentPath = join(__dirname, `../deployments/${network}`);

  // Load deployment files
  const refinancing = await fs.readJson(join(deploymentPath, 'Refinancing.json'));
  const nftfiRefinancingAdapter = await fs.readJson(join(deploymentPath, 'NftfiRefinancingAdapter.json'));
  const arcadeRefinancingAdapter = await fs.readJson(join(deploymentPath, 'ArcadeRefinancingAdapter.json'));
  const blendRefinancingAdapter = await fs.readJson(join(deploymentPath, 'BlendRefinancingAdapter.json'));
  const gondiRefinancingAdapter = await fs.readJson(join(deploymentPath, 'GondiRefinancingAdapter.json'));
  const legacyNftfiRefinancingAdapterV2_1 = await fs.readJson(
    join(deploymentPath, 'LegacyNftfiRefinancingAdapterV2_1.json'),
  );
  const legacyNftfiRefinancingAdapterV2_3 = await fs.readJson(
    join(deploymentPath, 'LegacyNftfiRefinancingAdapterV2_3.json'),
  );

  let successCount = 0;
  let failureCount = 0;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  // Helper function to wait
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper function to verify a single contract with retries
  async function verifyContractWithRetries(
    contractName: string,
    contractAddress: string,
    constructorArgs: any[],
    libraries?: any,
    contractPath?: string,
    attempt = 1,
  ): Promise<boolean> {
    try {
      console.log(`\nVerifying ${contractName}... (attempt ${attempt}/${MAX_RETRIES})`);
      console.log(`Contract address: ${contractAddress}`);

      if (libraries && Object.keys(libraries).length > 0) {
        console.log(`   📚 Using libraries:`, libraries);
      }

      // Capture console output to detect errors that don't throw
      const originalConsoleError = console.error;
      const originalConsoleLog = console.log;
      let hasErrors = false;
      const errorMessages: string[] = [];

      const errorCapture = (...args: any[]) => {
        const message = args.join(' ');
        if (
          message.includes('ERROR') ||
          message.includes('500 Internal Server Error') ||
          message.includes('Verification failed') ||
          message.includes('error')
        ) {
          hasErrors = true;
          errorMessages.push(message);
        }
        originalConsoleError(...args);
      };

      const logCapture = (...args: any[]) => {
        const message = args.join(' ');
        if (
          message.includes('ERROR') ||
          message.includes('500 Internal Server Error') ||
          message.includes('Verification failed') ||
          message.includes('error')
        ) {
          hasErrors = true;
          errorMessages.push(message);
        }
        originalConsoleLog(...args);
      };

      // Temporarily override console methods
      console.error = errorCapture;
      console.log = logCapture;

      try {
        // Use Tenderly plugin's verification
        const { tenderly } = hre;

        // Build verification parameters
        const verificationParams: any = {
          name: contractName,
          address: contractAddress,
        };

        // Add constructor arguments if provided
        if (constructorArgs && constructorArgs.length > 0) {
          verificationParams.constructorArguments = constructorArgs;
          console.log(`   🔧 Constructor args: [${constructorArgs.length} arguments]`);
        }

        // Add libraries if provided
        if (libraries && Object.keys(libraries).length > 0) {
          verificationParams.libraries = libraries;
        }

        // Add contract path if provided
        if (contractPath) {
          verificationParams.contract = contractPath;
        }

        await tenderly.verify(verificationParams);

        // Wait a bit for any async logging to complete
        await wait(1000);

        // Restore console methods
        console.error = originalConsoleError;
        console.log = originalConsoleLog;

        // Check if we captured any errors
        if (hasErrors) {
          throw new Error(`Verification failed with errors: ${errorMessages.join('; ')}`);
        }

        console.log(`✅ ${contractName} verified successfully`);
        return true;
      } catch (verificationError: any) {
        // Restore console methods
        console.error = originalConsoleError;
        console.log = originalConsoleLog;

        // Check if verification failed due to already being verified
        if (
          verificationError.message &&
          (verificationError.message.includes('already verified') ||
            verificationError.message.includes('Already verified'))
        ) {
          console.log(`✅ ${contractName} is already verified`);
          return true;
        }

        // Check if it's a retryable error (500, network issues, etc.)
        const isRetryableError =
          verificationError.message &&
          (verificationError.message.includes('500 Internal Server Error') ||
            verificationError.message.includes('Internal server error') ||
            verificationError.message.includes('network') ||
            verificationError.message.includes('timeout') ||
            hasErrors);

        if (isRetryableError && attempt < MAX_RETRIES) {
          console.log(
            `⚠️  ${contractName} verification failed (attempt ${attempt}), retrying in ${RETRY_DELAY / 1000}s...`,
          );
          console.log(`   Error: ${verificationError.message}`);
          await wait(RETRY_DELAY);
          return verifyContractWithRetries(
            contractName,
            contractAddress,
            constructorArgs,
            libraries,
            contractPath,
            attempt + 1,
          );
        }

        throw verificationError;
      }
    } catch (error: any) {
      if (attempt < MAX_RETRIES) {
        const isRetryableError =
          error.message &&
          (error.message.includes('500') ||
            error.message.includes('Internal server error') ||
            error.message.includes('network') ||
            error.message.includes('timeout'));

        if (isRetryableError) {
          console.log(
            `⚠️  ${contractName} verification failed (attempt ${attempt}), retrying in ${RETRY_DELAY / 1000}s...`,
          );
          console.log(`   Error: ${error.message}`);
          await wait(RETRY_DELAY);
          return verifyContractWithRetries(
            contractName,
            contractAddress,
            constructorArgs,
            libraries,
            contractPath,
            attempt + 1,
          );
        }
      }

      console.error(`❌ Failed to verify ${contractName} after ${attempt} attempts:`, error.message);
      return false;
    }
  }

  // Verify each contract individually
  console.log('Verifying Refinancing');
  const refinancingSuccess = await verifyContractWithRetries(
    'Refinancing',
    refinancing.address,
    refinancing.args,
    refinancing.libraries,
  );
  if (refinancingSuccess) successCount++;
  else failureCount++;

  console.log('Verifying NftfiRefinancingAdapter');
  const nftfiSuccess = await verifyContractWithRetries(
    'NftfiRefinancingAdapter',
    nftfiRefinancingAdapter.address,
    nftfiRefinancingAdapter.args,
    nftfiRefinancingAdapter.libraries,
  );
  if (nftfiSuccess) successCount++;
  else failureCount++;

  console.log('Verifying ArcadeRefinancingAdapter');
  const arcadeSuccess = await verifyContractWithRetries(
    'ArcadeRefinancingAdapter',
    arcadeRefinancingAdapter.address,
    arcadeRefinancingAdapter.args,
    arcadeRefinancingAdapter.libraries,
  );
  if (arcadeSuccess) successCount++;
  else failureCount++;

  console.log('Verifying BlendRefinancingAdapter');
  const blendSuccess = await verifyContractWithRetries(
    'BlendRefinancingAdapter',
    blendRefinancingAdapter.address,
    blendRefinancingAdapter.args,
    blendRefinancingAdapter.libraries,
  );
  if (blendSuccess) successCount++;
  else failureCount++;

  console.log('Verifying GondiRefinancingAdapter');
  const gondiSuccess = await verifyContractWithRetries(
    'GondiRefinancingAdapter',
    gondiRefinancingAdapter.address,
    gondiRefinancingAdapter.args,
    gondiRefinancingAdapter.libraries,
  );
  if (gondiSuccess) successCount++;
  else failureCount++;

  console.log('Verifying LegacyNftfiRefinancingAdapterV2_1');
  const legacyV2_1Success = await verifyContractWithRetries(
    'LegacyNftfiRefinancingAdapterV2_1',
    legacyNftfiRefinancingAdapterV2_1.address,
    legacyNftfiRefinancingAdapterV2_1.args,
    legacyNftfiRefinancingAdapterV2_1.libraries,
    'contracts/refinancing/refinancingAdapters/LegacyNftfiRefinancingAdapterV2_1.sol:LegacyNftfiRefinancingAdapterV2_1',
  );
  if (legacyV2_1Success) successCount++;
  else failureCount++;

  console.log('Verifying LegacyNftfiRefinancingAdapterV2_3');
  const legacyV2_3Success = await verifyContractWithRetries(
    'LegacyNftfiRefinancingAdapterV2_3',
    legacyNftfiRefinancingAdapterV2_3.address,
    legacyNftfiRefinancingAdapterV2_3.args,
    legacyNftfiRefinancingAdapterV2_3.libraries,
    'contracts/refinancing/refinancingAdapters/LegacyNftfiRefinancingAdapterV2_3.sol:LegacyNftfiRefinancingAdapterV2_3',
  );
  if (legacyV2_3Success) successCount++;
  else failureCount++;

  console.log(`\n📊 Verification Summary:`);
  console.log(`✅ Successfully verified: ${successCount} contracts`);
  console.log(`❌ Failed to verify: ${failureCount} contracts`);

  if (failureCount > 0) {
    console.log(`\n⚠️  Some verifications failed. Check errors above for details.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All contracts verified successfully!`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
