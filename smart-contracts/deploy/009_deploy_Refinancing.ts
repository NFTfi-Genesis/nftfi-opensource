import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getOwnerAddress } from './utils/owner-address';
import { NftfiHub } from '../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments, network, getNamedAccounts } = hre;

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const nftfiHub = (await ethers.getContract('NftfiHub')) as NftfiHub;
  const nftfiLoanOffer = await ethers.getContract('AssetOfferLoan');
  const nftfiCollectionOffer = await ethers.getContract('CollectionOfferLoan');

  const nftfiRefinancingAdapter = await deploy('NftfiRefinancingAdapter', {
    from: deployer,
    log: true,
  });

  const legacyNftfiRefinancingAdapterV2_1 = await deploy('LegacyNftfiRefinancingAdapterV2_1', {
    from: deployer,
    log: true,
  });

  const legacyNftfiRefinancingAdapterV2_3 = await deploy('LegacyNftfiRefinancingAdapterV2_3', {
    from: deployer,
    log: true,
  });

  const contractKeyUtils = await ethers.getContract('ContractKeyUtils');
  const contractKeys = await ethers.getContract('ContractKeys');

  const nftfiRefinancingAdapterType = 'NFTFI';
  const nftfiLegacyRefinancingAdapterTypeV2_1 = 'NFTFI_LEGACY_V2_1';
  const nftfiLegacyRefinancingAdapterTypeV2_3 = 'NFTFI_LEGACY_V2_3';

  let soloMargin;
  let swapContructorParams;

  if (network.name == 'mainnet') {
    // https://etherscan.io/address/0x1e0447b19bb6ecfdae1e4ae1694b0c3659614e4e#code
    soloMargin = '0x1e0447b19bb6ecfdae1e4ae1694b0c3659614e4e';

    swapContructorParams = {
      swapRouterAddress: '0xe592427a0aece92de3edee1f18e0157c05861564', // https://etherscan.io/address/0xe592427a0aece92de3edee1f18e0157c05861564
      quoterAddress: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', // https://etherscan.io/address/0xb27308f9f90d607463bb33ea1bebb41c27ce5ab6
      wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // https://etherscan.io/address/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
      supportedTokens: ['0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0'], // wstETH https://etherscan.io/address/0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0
      swapFeeRates: [100], // 0.01% https://etherscan.io/address/0x109830a1aaad605bbf02a9dfa7b0b92ec2fb7daa#readContract#F2
    };
  } else if (network.name == 'goerli') {
    const mockDyDxFlashloan = await deploy('MockDyDxFlashloan', {
      from: deployer,
      args: [
        [
          '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', //weth
          '0x07865c6e87b9f70255377e024ace6630c1eaa37f', //usdc
          '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844', //dai
        ],
        [0, 1, 2],
        getOwnerAddress(network.name.toLowerCase(), deployer),
      ],
      log: true,
    });

    soloMargin = mockDyDxFlashloan.address;

    swapContructorParams = {
      swapRouterAddress: '0xe592427a0aece92de3edee1f18e0157c05861564',
      quoterAddress: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
      wethAddress: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
      supportedTokens: ['0x6320cd32aa674d2898a68ec82e869385fc5f7e2f'],
      swapFeeRates: [500],
    };
  } else if (network.name == 'sepolia') {
    const mockDyDxFlashloan = await deploy('MockDyDxFlashloan', {
      from: deployer,
      args: [
        [
          '0x7b79995e5f793a07bc00c21412e50ecae098e7f9', //weth
          '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238', //usdc
          '0x53844f9577c2334e541aec7df7174ece5df1fcf0', //dai
        ],
        [0, 1, 2],
        getOwnerAddress(network.name.toLowerCase(), deployer),
      ],
      log: true,
    });

    soloMargin = mockDyDxFlashloan.address;

    swapContructorParams = {
      swapRouterAddress: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
      quoterAddress: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3',
      //uniswap officially uses  0xfff9976782d46cc05630d1f6ebab18b2324d6b14 so swapping probably wont work
      wethAddress: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
      supportedTokens: [],
      swapFeeRates: [],
    };
  } else {
    const mockDyDxFlashloan = await deploy('MockDyDxFlashloan', {
      from: deployer,
      args: [[], [], deployer],
      log: true,
    });

    soloMargin = mockDyDxFlashloan.address;

    // mock contracts here
    swapContructorParams = {
      swapRouterAddress: '0x0000000000000000000000000000000000000000',
      quoterAddress: '0x0000000000000000000000000000000000000000',
      wethAddress: '0x0000000000000000000000000000000000000000',
      supportedTokens: [],
      swapFeeRates: [],
    };
  }

  let extraRefinancingAdapterTypes: string[] = [];
  let extraRefinancables: string[] = [];

  if (network.name == 'mainnet') {
    extraRefinancingAdapterTypes = [
      nftfiLegacyRefinancingAdapterTypeV2_1,
      nftfiLegacyRefinancingAdapterTypeV2_1,
      nftfiLegacyRefinancingAdapterTypeV2_1,
      nftfiLegacyRefinancingAdapterTypeV2_3,
      nftfiLegacyRefinancingAdapterTypeV2_3,
    ];
    extraRefinancables = [
      '0xE52Cec0E90115AbeB3304BaA36bc2655731f7934', //NFTFI_V2_FIXED_COLLECTION_CONTRACT_ADDRESS
      '0x8252Df1d8b29057d1Afe3062bf5a64D503152BC8', //NFTFI_V2_1_CONTRACT_ADDRESS
      '0xf896527c49b44aAb3Cf22aE356Fa3AF8E331F280', //NFTFI_V2_CONTRACT_ADDRESS
      '0xd0a40eB7FD94eE97102BA8e9342243A2b2E22207', //NFTFI_V2_3_FIXED_LOAN_CONTRACT_ADDRESS
      '0xD0C6e59B50C32530C627107F50Acc71958C4341F', //NFTFI_V2_3_FIXED_COLLECTION_CONTRACT_ADDRESS
    ];
  } else if (network.name == 'sepolia') {
    extraRefinancingAdapterTypes = [nftfiLegacyRefinancingAdapterTypeV2_3, nftfiLegacyRefinancingAdapterTypeV2_3];
    extraRefinancables = [
      '0x170605b4753eB8837a08D3e58aF012B68eeD06b9', //NFTFI_V2_3_FIXED_LOAN_CONTRACT_ADDRESS
      '0x668aa2e694434C5Dc72D3AEb863762A66354EA2A', //NFTFI_V2_3_FIXED_COLLECTION_CONTRACT_ADDRESS
    ];
  }

  await deploy('Refinancing', {
    from: deployer,
    args: [
      await nftfiHub.getAddress(),
      await nftfiLoanOffer.getAddress(),
      await nftfiCollectionOffer.getAddress(),
      getOwnerAddress(network.name.toLowerCase(), deployer),
      [nftfiRefinancingAdapterType, nftfiLegacyRefinancingAdapterTypeV2_3, nftfiLegacyRefinancingAdapterTypeV2_1],
      [
        nftfiRefinancingAdapter.address,
        legacyNftfiRefinancingAdapterV2_3.address,
        legacyNftfiRefinancingAdapterV2_1.address,
      ],
      [nftfiRefinancingAdapterType, nftfiRefinancingAdapterType, ...extraRefinancingAdapterTypes],
      [await nftfiLoanOffer.getAddress(), await nftfiCollectionOffer.getAddress(), ...extraRefinancables],
      soloMargin,
      2,
      swapContructorParams,
    ],
    libraries: {
      ContractKeyUtils: await contractKeyUtils.getAddress(),
      ContractKeys: await contractKeys.getAddress(),
    },
    log: true,
  });
};

export default func;

func.tags = ['Refinancing'];
