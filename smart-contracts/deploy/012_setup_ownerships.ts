import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Ownable } from '../typechain';
import { startLog, succeedLog, updateLog } from './utils/logs';
import { getOwnerAddress } from './utils/owner-address';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, network, getNamedAccounts } = hre;

  const { deployer } = await getNamedAccounts();

  // Get all deployed contracts
  const nftfiHub = (await ethers.getContract('NftfiHub')) as Ownable;
  const permittedNFTs = (await ethers.getContract('PermittedNFTsAndTypeRegistry')) as Ownable;
  const AssetOfferLoan = (await ethers.getContract('AssetOfferLoan')) as Ownable;
  const CollectionOfferLoan = (await ethers.getContract('CollectionOfferLoan')) as Ownable;
  const loanCoordinator = (await ethers.getContract('LoanCoordinator')) as Ownable;
  let refinancing;
  if (network.name.toLowerCase() !== 'base-mainnet' && network.name.toLowerCase() !== 'base-sepolia')
    refinancing = (await ethers.getContract('Refinancing')) as Ownable;
  const escrow = (await ethers.getContract('Escrow')) as Ownable;
  const erc20TransferManager = (await ethers.getContract('ERC20TransferManager')) as Ownable;

  const ownables: { [key: string]: Ownable } = {
    nftfiHub: nftfiHub,
    permittedNFTs: permittedNFTs,
    AssetOfferLoan: AssetOfferLoan,
    CollectionOfferLoan: CollectionOfferLoan,
    loanCoordinator: loanCoordinator,
    refinancing: refinancing,
    escrow: escrow,
    erc20TransferManager: erc20TransferManager,
  };

  if (!refinancing) delete ownables.refinancing;

  const ownerAddress = getOwnerAddress(network.name.toLowerCase(), deployer);

  for (const ownableKey in ownables) {
    startLog(`Setting ${ownableKey} ownership up to ${ownerAddress}`);
    if ((await ownables[ownableKey].owner()) == ownerAddress) {
      succeedLog(`${ownableKey} ownership already set up to ${ownerAddress}`);
    } else {
      const tx = await ownables[ownableKey].requestTransferOwnership(ownerAddress);
      updateLog(`${ownableKey} ownership transfer request to ${ownerAddress} (tx: ${tx.hash})`);
      const receipt = await tx.wait();
      succeedLog(
        `${ownableKey} (contract address: ${await ownables[
          ownableKey
        ].getAddress()}) ownership transfer request to ${ownerAddress} (tx: ${
          tx.hash
        })...used ${receipt?.gasUsed.toString()} gas - HAS TO BE MANUALLY ACCEPTED ON GNOSIS SAFE!`,
      );
    }
  }
};

export default func;

func.tags = ['SetupOwnerships'];
