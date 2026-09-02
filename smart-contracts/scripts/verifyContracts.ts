import fs from 'fs-extra';
import hre from 'hardhat';
import { join } from 'path';
import { etherscanVerification } from './utils/verify';

// NOTE: This script may fail at some the verifications, if so, comment the verification steps that run successfully and run this script again.

async function main(): Promise<void> {
  const network = hre.network.name;

  const deploymentPath = join(__dirname, `../deployments/${network}`);

  const contractKeys = await fs.readJson(join(deploymentPath, 'ContractKeys.json'));
  const contractKeyUtils = await fs.readJson(join(deploymentPath, 'ContractKeyUtils.json'));
  const nftfiHub = await fs.readJson(join(deploymentPath, 'NftfiHub.json'));
  const eRC721Wrapper = await fs.readJson(join(deploymentPath, 'ERC721Wrapper.json'));
  const cryptoKittiesWrapper = await fs.readJson(join(deploymentPath, 'CryptoKittiesWrapper.json'));
  const eRC1155Wrapper = await fs.readJson(join(deploymentPath, 'ERC1155Wrapper.json'));
  const nFTfiSigningUtils = await fs.readJson(join(deploymentPath, 'NFTfiSigningUtils.json'));
  const loanChecksAndCalculations = await fs.readJson(join(deploymentPath, 'LoanChecksAndCalculations.json'));
  const AssetOfferLoan = await fs.readJson(join(deploymentPath, 'AssetOfferLoan.json'));
  const CollectionOfferLoan = await fs.readJson(join(deploymentPath, 'CollectionOfferLoan.json'));
  const nftfiSigningUtilsContract = await fs.readJson(join(deploymentPath, 'NFTfiSigningUtilsContract.json'));
  const permittedNFTs = await fs.readJson(join(deploymentPath, 'PermittedNFTsAndTypeRegistry.json'));
  const loanCoordinator = await fs.readJson(join(deploymentPath, 'LoanCoordinator.json'));
  const promissoryNote = await fs.readJson(join(deploymentPath, 'PromissoryNote.json'));
  const erc721LegacyWrapper = await fs.readJson(join(deploymentPath, 'ERC721LegacyWrapper.json'));
  const punkWrapper = await fs.readJson(join(deploymentPath, 'PunkWrapper.json'));
  const nftfiRefinancingAdapter = await fs.readJson(join(deploymentPath, 'NftfiRefinancingAdapter.json'));
  const legacyNftfiRefinancingAdapterV2_1 = await fs.readJson(
    join(deploymentPath, 'LegacyNftfiRefinancingAdapterV2_1.json'),
  );
  const legacyNftfiRefinancingAdapterV2_3 = await fs.readJson(
    join(deploymentPath, 'LegacyNftfiRefinancingAdapterV2_3.json'),
  );
  const refinancing = await fs.readJson(join(deploymentPath, 'Refinancing.json'));
  const escrow = await fs.readJson(join(deploymentPath, 'Escrow.json'));
  const personalEscrow = await fs.readJson(join(deploymentPath, 'PersonalEscrow.json'));
  const personalEscrowFactory = await fs.readJson(join(deploymentPath, 'PersonalEscrowFactory.json'));
  const delegateCashPlugin = await fs.readJson(join(deploymentPath, 'DelegateCashPlugin.json'));
  const erc20TransferManager = await fs.readJson(join(deploymentPath, 'ERC20TransferManager.json'));
  const nftfiCollectionOfferSigningUtilsContract = await fs.readJson(
    join(deploymentPath, 'NFTfiCollectionOfferSigningUtilsContract.json'),
  );

  const arcadeRefinancingAdapter = await fs.readJson(join(deploymentPath, 'ArcadeRefinancingAdapter.json'));
  const blendRefinancingAdapter = await fs.readJson(join(deploymentPath, 'BlendRefinancingAdapter.json'));
  const gondiRefinancingAdapter = await fs.readJson(join(deploymentPath, 'GondiRefinancingAdapter.json'));

  console.log('Verifying ContractKeys');
  await etherscanVerification({
    address: contractKeys.address,
    constructorArguments: contractKeys.args,
  });

  console.log('Verifying ContractKeyUtilss');
  await etherscanVerification({
    address: contractKeyUtils.address,
    constructorArguments: contractKeyUtils.args,
  });

  console.log('Verifying NftfiHub');
  await etherscanVerification({
    address: nftfiHub.address,
    constructorArguments: nftfiHub.args,
  });

  console.log('Verifying ERC721Wrapper');
  await etherscanVerification({
    address: eRC721Wrapper.address,
    constructorArguments: eRC721Wrapper.args,
  });

  console.log('Verifying CryptoKittiesWrapper');
  await etherscanVerification({
    address: cryptoKittiesWrapper.address,
    constructorArguments: cryptoKittiesWrapper.args,
  });

  console.log('Verifying ERC1155Wrapper');
  await etherscanVerification({
    address: eRC1155Wrapper.address,
    constructorArguments: eRC1155Wrapper.args,
  });

  console.log('Verifying NFTfiSigningUtils');
  await etherscanVerification({
    address: nFTfiSigningUtils.address,
    constructorArguments: nFTfiSigningUtils.args,
  });

  console.log('Verifying LoanChecksAndCalculations');
  await etherscanVerification({
    address: loanChecksAndCalculations.address,
    constructorArguments: loanChecksAndCalculations.args,
  });

  console.log('Verifying AssetOfferLoan');
  await etherscanVerification({
    address: AssetOfferLoan.address,
    constructorArguments: AssetOfferLoan.args,
  });

  console.log('Verifying CollectionOfferLoan');
  await etherscanVerification({
    address: CollectionOfferLoan.address,
    constructorArguments: CollectionOfferLoan.args,
  });

  console.log('Verifying NFTfiSigningUtilsContract');
  await etherscanVerification({
    address: nftfiSigningUtilsContract.address,
    constructorArguments: nftfiSigningUtilsContract.args,
  });

  console.log('Verifying PermittedNFTs');
  await etherscanVerification({
    address: permittedNFTs.address,
    constructorArguments: permittedNFTs.args,
  });

  console.log('Verifying LoanCoordinator');
  await etherscanVerification({
    address: loanCoordinator.address,
    constructorArguments: loanCoordinator.args,
  });

  console.log('Verifying PromissoryNote');
  await etherscanVerification({
    address: promissoryNote.address,
    constructorArguments: promissoryNote.args,
  });

  console.log('Verifying ERC721LegacyWrapper');
  await etherscanVerification({
    address: erc721LegacyWrapper.address,
    constructorArguments: erc721LegacyWrapper.args,
  });

  console.log('Verifying PunkWrapper');
  await etherscanVerification({
    address: punkWrapper.address,
    constructorArguments: punkWrapper.args,
  });

  console.log('Verifying NftfiRefinancingAdapter');
  await etherscanVerification({
    address: nftfiRefinancingAdapter.address,
    constructorArguments: nftfiRefinancingAdapter.args,
  });

  console.log('Verifying Refinancing');
  await etherscanVerification({
    address: refinancing.address,
    constructorArguments: refinancing.args,
  });

  console.log('Verifying Escrow');
  await etherscanVerification({
    address: escrow.address,
    constructorArguments: escrow.args,
  });

  console.log('Verifying DelegateCashPlugin');
  await etherscanVerification({
    address: delegateCashPlugin.address,
    constructorArguments: delegateCashPlugin.args,
  });

  console.log('Verifying PersonalEscrow');
  await etherscanVerification({
    address: personalEscrow.address,
    constructorArguments: personalEscrow.args,
  });

  console.log('Verifying PersonalEscrowFactory');
  await etherscanVerification({
    address: personalEscrowFactory.address,
    constructorArguments: personalEscrowFactory.args,
  });

  console.log('Verifying ERC20TransferManager');
  await etherscanVerification({
    address: erc20TransferManager.address,
    constructorArguments: erc20TransferManager.args,
  });

  console.log('Verifying LegacyNftfiRefinancingAdapterV2_1');
  await etherscanVerification({
    address: legacyNftfiRefinancingAdapterV2_1.address,
    constructorArguments: legacyNftfiRefinancingAdapterV2_1.args,
    contract:
      'contracts/refinancing/refinancingAdapters/LegacyNftfiRefinancingAdapterV2_1.sol:LegacyNftfiRefinancingAdapterV2_1',
  });

  console.log('Verifying LegacyNftfiRefinancingAdapterV2_3');
  await etherscanVerification({
    address: legacyNftfiRefinancingAdapterV2_3.address,
    constructorArguments: legacyNftfiRefinancingAdapterV2_3.args,
    contract:
      'contracts/refinancing/refinancingAdapters/LegacyNftfiRefinancingAdapterV2_3.sol:LegacyNftfiRefinancingAdapterV2_3',
  });

  console.log('Verifying ArcadeRefinancingAdapter');
  await etherscanVerification({
    address: arcadeRefinancingAdapter.address,
    constructorArguments: arcadeRefinancingAdapter.args,
  });

  console.log('Verifying BlendRefinancingAdapter');
  await etherscanVerification({
    address: blendRefinancingAdapter.address,
    constructorArguments: blendRefinancingAdapter.args,
  });

  console.log('Verifying GondiRefinancingAdapter');
  await etherscanVerification({
    address: gondiRefinancingAdapter.address,
    constructorArguments: gondiRefinancingAdapter.args,
  });

  console.log('Verifying NFTfiCollectionOfferSigningUtilsContract');
  await etherscanVerification({
    address: nftfiCollectionOfferSigningUtilsContract.address,
    constructorArguments: nftfiCollectionOfferSigningUtilsContract.args,
    contract: 'contracts/utils/NFTfiCollectionOfferSigningUtilsContract.sol:NFTfiCollectionOfferSigningUtilsContract',
  });

  // No need to verify ObligationReceipt because it is the same contract as PromissoryNote
  // No need to verify PermittedBundleERC20s because it is the same contract as PermittedERC20s
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
