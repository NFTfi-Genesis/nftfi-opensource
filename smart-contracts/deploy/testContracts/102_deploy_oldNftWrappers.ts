import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  // reusing old deployment on goerli and mainnet
  await deploy('OldERC721Wrapper', {
    from: deployer,
    log: true,
  });

  await deploy('OldCryptoKittiesWrapper', {
    from: deployer,
    log: true,
  });

  await deploy('OldERC1155Wrapper', {
    from: deployer,
    log: true,
  });

  await deploy('OldERC721LegacyWrapper', {
    from: deployer,
    log: true,
  });

  await deploy('OldPunkWrapper', {
    from: deployer,
    log: true,
  });
};

export default func;

func.tags = ['OldWrappers'];
