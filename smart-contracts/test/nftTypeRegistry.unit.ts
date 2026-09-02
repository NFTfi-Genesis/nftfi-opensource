import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { deployments, ethers } from 'hardhat';
import { PermittedNFTsAndTypeRegistry } from '../typechain';
import { ADDRESS_ZERO, restoreSnapshot, takeSnapshot, toBytes32 } from './utils/utils';

describe('NftTypeRegistry', function () {
  let deployer: SignerWithAddress;
  let kakaroto: SignerWithAddress;
  let vegeta: SignerWithAddress;
  let karpincho: SignerWithAddress;
  let initialType1: SignerWithAddress;
  let initialType2: SignerWithAddress;
  let nftTypeRegistry: PermittedNFTsAndTypeRegistry;
  let snapshot: number;

  before(async function () {
    [deployer, kakaroto, vegeta, karpincho, initialType1, initialType2] = await ethers.getSigners();
    const { deploy } = deployments;

    const contractKeyUtilss = await deploy('ContractKeyUtils', {
      from: deployer.address,
    });

    await deploy('PermittedNFTsAndTypeRegistry', {
      from: deployer.address,
      args: [
        deployer.address,
        ['INITIAL_TYPE1', 'INITIAL_TYPE2'],
        [initialType1.address, initialType2.address],
        [],
        [],
      ],
      libraries: {
        ContractKeyUtils: contractKeyUtilss.address,
      },
    });

    nftTypeRegistry = (await ethers.getContract('PermittedNFTsAndTypeRegistry')) as PermittedNFTsAndTypeRegistry;
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  it('should set the owner properly', async () => {
    expect(await nftTypeRegistry.owner()).to.eq(deployer.address);
  });

  it('should initialize nft types wrappers upon deployment', async () => {
    expect(await nftTypeRegistry.getNftTypeWrapper(toBytes32('INITIAL_TYPE1'))).to.eq(initialType1.address);
    expect(await nftTypeRegistry.getNftTypeWrapper(toBytes32('INITIAL_TYPE2'))).to.eq(initialType2.address);
  });

  it('non owner should not be able to call setNftType', async () => {
    await expect(
      nftTypeRegistry.connect(kakaroto).setNftType(toBytes32('TEST_TYPE'), vegeta.address),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('owner should not be able to call registerLoan with empty nft type', async () => {
    await expect(nftTypeRegistry.connect(deployer).setNftType('', vegeta.address)).to.be.revertedWith(
      'nftType is empty',
    );
  });

  it('owner should be able to call setNftType', async () => {
    await nftTypeRegistry.connect(deployer).setNftType('TEST_TYPE', vegeta.address);
    expect(await nftTypeRegistry.getNftTypeWrapper(toBytes32('TEST_TYPE'))).to.eq(vegeta.address);
  });

  it('non owner should not be able to call setNftTypes', async () => {
    await expect(
      nftTypeRegistry
        .connect(kakaroto)
        .setNftTypes([toBytes32('TEST_TYPE'), toBytes32('TEST_TYPE2')], [vegeta.address, karpincho.address]),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('owner should not be able to call setNftTypes with arity mismatch', async () => {
    await expect(
      nftTypeRegistry.connect(deployer).setNftTypes([toBytes32('TEST_TYPE')], [vegeta.address, karpincho.address]),
    ).to.be.revertedWith('setNftTypes function information arity mismatch');
  });

  it('owner should not be able to call setNftTypes with empty nft type', async () => {
    await expect(
      nftTypeRegistry.connect(deployer).setNftTypes(['', 'TEST_TYPE2'], [vegeta.address, karpincho.address]),
    ).to.be.revertedWith('nftType is empty');
  });

  it('owner should be able to call setNftTypes', async () => {
    await nftTypeRegistry
      .connect(deployer)
      .setNftTypes(['TEST_TYPE', 'TEST_TYPE2'], [vegeta.address, karpincho.address]);

    expect(await nftTypeRegistry.getNftTypeWrapper(toBytes32('TEST_TYPE'))).to.eq(vegeta.address);
    expect(await nftTypeRegistry.getNftTypeWrapper(toBytes32('TEST_TYPE2'))).to.eq(karpincho.address);
  });

  it('calling setNftType with a registered type should update the corresponding contract address', async () => {
    await nftTypeRegistry.connect(deployer).setNftType('TEST_TYPE', vegeta.address);
    expect(await nftTypeRegistry.getNftTypeWrapper(toBytes32('TEST_TYPE'))).to.eq(vegeta.address);

    await nftTypeRegistry.connect(deployer).setNftType('TEST_TYPE', kakaroto.address);
    expect(await nftTypeRegistry.getNftTypeWrapper(toBytes32('TEST_TYPE'))).to.eq(kakaroto.address);
  });

  it('getNftTypeWrapper should return the right address', async () => {
    await nftTypeRegistry.connect(deployer).setNftType('TEST_TYPE', vegeta.address);
    expect(await nftTypeRegistry.getNftTypeWrapper(toBytes32('TEST_TYPE'))).to.eq(vegeta.address);
  });
});
