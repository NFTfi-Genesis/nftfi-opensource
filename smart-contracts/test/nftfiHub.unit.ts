import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { NftfiHub } from '../typechain';
import { restoreSnapshot, takeSnapshot, toBytes32 } from './utils/utils';

describe('NftfiHub', function () {
  let deployer: SignerWithAddress;
  let kakaroto: SignerWithAddress;
  let vegeta: SignerWithAddress;
  let karpincho: SignerWithAddress;
  let initialContract1: SignerWithAddress;
  let initialContract2: SignerWithAddress;
  let nftfiHub: NftfiHub;
  let snapshot: number;

  before(async function () {
    [deployer, kakaroto, vegeta, karpincho, initialContract1, initialContract2] = await ethers.getSigners();

    const ContractKeyUtils = await ethers.getContractFactory('ContractKeyUtils');
    const contractKeyUtils = await ContractKeyUtils.connect(deployer).deploy();
    await contractKeyUtils.waitForDeployment();

    const NftfiHub = await ethers.getContractFactory('NftfiHub', {
      libraries: {
        ContractKeyUtils: await contractKeyUtils.getAddress(),
      },
    });
    nftfiHub = (await NftfiHub.connect(deployer).deploy(
      deployer.address,
      ['INITIAL_TYPE1', 'INITIAL_TYPE2'],
      [initialContract1.address, initialContract2.address],
    )) as NftfiHub;
    await nftfiHub.waitForDeployment();
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  it('should set the owner properly', async () => {
    expect(await nftfiHub.owner()).to.eq(deployer.address);
  });

  it('should initialize contracts list upon deployment', async () => {
    expect(await nftfiHub.getContract(toBytes32('INITIAL_TYPE1'))).to.eq(initialContract1.address);
    expect(await nftfiHub.getContract(toBytes32('INITIAL_TYPE2'))).to.eq(initialContract2.address);
  });

  it('non owner should not be able to call setContract', async () => {
    await expect(nftfiHub.connect(kakaroto).setContract(toBytes32('TEST_TYPE'), vegeta.address)).to.be.revertedWith(
      'Ownable: caller is not the owner',
    );
  });

  it('owner should be able to call setContract', async () => {
    await nftfiHub.connect(deployer).setContract('TEST_TYPE', vegeta.address);
    expect(await nftfiHub.getContract(toBytes32('TEST_TYPE'))).to.eq(vegeta.address);
  });

  it('non owner should not be able to call setContracts', async () => {
    await expect(
      nftfiHub.connect(kakaroto).setContracts(['TEST_TYPE', 'TEST_TYPE2'], [vegeta.address, karpincho.address]),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('owner should not be able to call setContract with arity mismatch', async () => {
    await expect(
      nftfiHub.connect(deployer).setContracts(['TEST_TYPE'], [vegeta.address, karpincho.address]),
    ).to.be.revertedWith('setContracts function information arity mismatch');
  });

  it('owner should be able to call setContracts', async () => {
    await nftfiHub.connect(deployer).setContracts(['TEST_TYPE', 'TEST_TYPE2'], [vegeta.address, karpincho.address]);

    expect(await nftfiHub.getContract(toBytes32('TEST_TYPE'))).to.eq(vegeta.address);
    expect(await nftfiHub.getContract(toBytes32('TEST_TYPE2'))).to.eq(karpincho.address);
  });

  it('calling setContract with a registered type should update the corresponding contract address', async () => {
    await nftfiHub.connect(deployer).setContract('TEST_TYPE', vegeta.address);
    expect(await nftfiHub.getContract(toBytes32('TEST_TYPE'))).to.eq(vegeta.address);

    await nftfiHub.connect(deployer).setContract('TEST_TYPE', kakaroto.address);
    expect(await nftfiHub.getContract(toBytes32('TEST_TYPE'))).to.eq(kakaroto.address);
  });

  it('getContract should return the right address', async () => {
    await nftfiHub.connect(deployer).setContract('TEST_TYPE', vegeta.address);
    expect(await nftfiHub.getContract(toBytes32('TEST_TYPE'))).to.eq(vegeta.address);
  });
});
