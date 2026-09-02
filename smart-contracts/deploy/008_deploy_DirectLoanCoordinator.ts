import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { LoanCoordinator, SmartNft } from '../typechain';
import { startLog, succeedLog, updateLog } from './utils/logs';
import { getOwnerAddress } from './utils/owner-address';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments, getNamedAccounts, network } = hre;

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const nftfiHub = await ethers.getContract('NftfiHub');

  const contractKeyUtils = await ethers.getContract('ContractKeyUtils');
  const nftfiLoanOffer = await ethers.getContract('AssetOfferLoan');
  const nftfiLoanCollectionOffer = await ethers.getContract('CollectionOfferLoan');

  await deploy('LoanCoordinator', {
    from: deployer,
    args: [
      await nftfiHub.getAddress(),
      deployer,
      ['ASSET_OFFER_LOAN', 'COLLECTION_OFFER_LOAN'],
      [await nftfiLoanOffer.getAddress(), await nftfiLoanCollectionOffer.getAddress()],
    ],
    log: true,
    libraries: {
      ContractKeyUtils: await contractKeyUtils.getAddress(),
    },
  });

  const loanCoordinator = (await ethers.getContract('LoanCoordinator')) as LoanCoordinator;

  await deploy('PromissoryNote', {
    from: deployer,
    contract: 'SmartNft',
    args: [
      getOwnerAddress(network.name.toLowerCase(), deployer),
      await nftfiHub.getAddress(),
      await loanCoordinator.getAddress(),
      'NFTfi Promissory Note',
      'PNNFI',
      'https://metadata.nftfi.com/loans/v2/promissory/',
    ],
    log: true,
  });

  await deploy('ObligationReceipt', {
    from: deployer,
    contract: 'SmartNft',
    args: [
      getOwnerAddress(network.name.toLowerCase(), deployer),
      await nftfiHub.getAddress(),
      await loanCoordinator.getAddress(),
      'NFTfi Obligation Receipt',
      'ORNFI',
      'https://metadata.nftfi.com/loans/v2/obligation/',
    ],
    log: true,
  });

  const promissoryNote = (await ethers.getContract('PromissoryNote')) as SmartNft;
  const obligationReceipt = (await ethers.getContract('ObligationReceipt')) as SmartNft;

  if (
    (await loanCoordinator.promissoryNoteToken()) == (await promissoryNote.getAddress()) &&
    (await loanCoordinator.obligationReceiptToken()) == (await obligationReceipt.getAddress())
  ) {
    console.log('LoanCoordinator already initialized correctly');
  } else {
    console.log('Initializing LoanCoordinator');
    startLog('Initializing LoanCoordinator');
    const initTx = await loanCoordinator.initialize(
      await promissoryNote.getAddress(),
      await obligationReceipt.getAddress(),
    );
    updateLog(`Initializing LoanCoordinator (tx: ${initTx.hash})`);
    const receipt = await initTx.wait();
    succeedLog(`Initializing LoanCoordinator (tx: ${initTx.hash})...used ${receipt?.gasUsed.toString()} gas`);
  }
};

export default func;

func.tags = ['LoanCoordinator'];
