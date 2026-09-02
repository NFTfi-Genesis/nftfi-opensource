import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { CONTRACTS_KEYS, toBytes32 } from '../test/utils/utils';
import { startLog, succeedLog, updateLog } from './utils/logs';
import { NftfiHub } from '../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, network } = hre;

  // Get all deployed contracts
  const nftfiHub = (await ethers.getContract('NftfiHub')) as NftfiHub;
  const loanCoordinator = await ethers.getContract('LoanCoordinator');
  const permittedNFTs = await ethers.getContract('PermittedNFTsAndTypeRegistry');
  const permittedERC20s = await ethers.getContract('AssetOfferLoan');

  let refinancing;
  let delegateCashPlugin;
  // we don't deploy Refi to Base due to the lack of a DEX on base (Refi relies on a DEX for flash loans)
  if (network.name.toLowerCase() !== 'base-mainnet' && network.name.toLowerCase() !== 'base-sepolia') {
    refinancing = await ethers.getContract('Refinancing');
    delegateCashPlugin = await ethers.getContract('DelegateCashPlugin');
  }

  const escrow = await ethers.getContract('Escrow');
  const personalEscrowFactory = await ethers.getContract('PersonalEscrowFactory');
  const erc20TransferManager = await ethers.getContract('ERC20TransferManager');

  startLog('Setting contracts in NftfiHub');
  if (
    (!delegateCashPlugin ||
      (await nftfiHub.getContract(toBytes32(CONTRACTS_KEYS.DELEGATE_PLUGIN))) ==
        (await delegateCashPlugin.getAddress())) &&
    (await nftfiHub.getContract(toBytes32(CONTRACTS_KEYS.PERMITTED_NFTS))) == (await permittedNFTs.getAddress()) &&
    (await nftfiHub.getContract(toBytes32(CONTRACTS_KEYS.PERMITTED_ERC20S))) == (await permittedERC20s.getAddress()) &&
    (await nftfiHub.getContract(toBytes32(CONTRACTS_KEYS.LOAN_COORDINATOR))) == (await loanCoordinator.getAddress()) &&
    (!refinancing ||
      (await nftfiHub.getContract(toBytes32(CONTRACTS_KEYS.REFINANCING))) == (await refinancing.getAddress())) &&
    (await nftfiHub.getContract(toBytes32(CONTRACTS_KEYS.ESCROW))) == (await escrow.getAddress()) &&
    (await nftfiHub.getContract(toBytes32(CONTRACTS_KEYS.PERSONAL_ESCROW_FACTORY))) ==
      (await personalEscrowFactory.getAddress()) &&
    (await nftfiHub.getContract(toBytes32(CONTRACTS_KEYS.ERC20_TRANSFER_MANAGER))) ==
      (await erc20TransferManager.getAddress())
  ) {
    succeedLog('Contracts already set up in NftfiHub correctly');
  } else {
    const tx = await nftfiHub.setContracts(
      [
        CONTRACTS_KEYS.DELEGATE_PLUGIN,
        CONTRACTS_KEYS.PERMITTED_NFTS,
        CONTRACTS_KEYS.PERMITTED_ERC20S,
        CONTRACTS_KEYS.LOAN_COORDINATOR,
        CONTRACTS_KEYS.REFINANCING,
        CONTRACTS_KEYS.ESCROW,
        CONTRACTS_KEYS.PERSONAL_ESCROW_FACTORY,
        CONTRACTS_KEYS.ERC20_TRANSFER_MANAGER,
      ],
      [
        delegateCashPlugin ? await delegateCashPlugin.getAddress() : ethers.ZeroAddress,
        await permittedNFTs.getAddress(),
        await permittedERC20s.getAddress(),
        await loanCoordinator.getAddress(),
        refinancing ? await refinancing.getAddress() : ethers.ZeroAddress,
        await escrow.getAddress(),
        await personalEscrowFactory.getAddress(),
        await erc20TransferManager.getAddress(),
      ],
    );
    updateLog(`Setting contracts in NftfiHub (tx: ${tx.hash})`);

    const receipt = await tx.wait();
    succeedLog(`Setting contracts in NftfiHub (tx: ${tx.hash})...used ${receipt?.gasUsed.toString()} gas`);
  }
};

export default func;

func.tags = ['SetupContracts'];
