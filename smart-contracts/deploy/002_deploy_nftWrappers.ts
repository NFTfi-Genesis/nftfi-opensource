import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, network, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  // reusing old deployment on goerli and mainnet
  if (network.name.toLowerCase() !== 'mainnet' && network.name.toLowerCase() !== 'goerli') {
    await deploy('ERC721Wrapper', {
      from: deployer,
      log: true,
    });

    await deploy('CryptoKittiesWrapper', {
      from: deployer,
      log: true,
    });

    await deploy('ERC1155Wrapper', {
      from: deployer,
      log: true,
    });

    await deploy('ERC721LegacyWrapper', {
      from: deployer,
      log: true,
    });

    await deploy('PunkWrapper', {
      from: deployer,
      log: true,
    });
  } else {
    console.log('Reusing ERC721Wrapper, CryptoKittiesWrapper, ERC1155Wrapper, ERC721LegacyWrapper, PunkWrapper');
  }

  await deploy('SuperRareV1Wrapper', {
    from: deployer,
    log: true,
  });
};

export default func;

func.tags = ['Wrappers'];
