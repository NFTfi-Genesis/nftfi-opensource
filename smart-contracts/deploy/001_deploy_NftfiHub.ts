import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getOwnerAddress } from './utils/owner-address';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, network, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log('Deployer address: ', deployer);
  console.log('Owner address: ', getOwnerAddress(network.name.toLowerCase(), deployer));

  await deploy('ContractKeys', {
    from: deployer,
    log: true,
  });

  const contractKeyUtils = await deploy('ContractKeyUtils', {
    from: deployer,
    log: true,
  });

  await deploy('NftfiHub', {
    from: deployer,
    args: [deployer, [], []],
    libraries: {
      ContractKeyUtils: contractKeyUtils.address,
    },
    log: true,
  });
};

export default func;

func.tags = ['NftfiHub'];
