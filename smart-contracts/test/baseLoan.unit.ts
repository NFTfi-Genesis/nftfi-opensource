import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { TestBaseLoan } from '../typechain';
import { restoreSnapshot, takeSnapshot } from './utils/utils';

describe('BaseLoan', function () {
  let deployer: SignerWithAddress;
  let kakaroto: SignerWithAddress;
  let baseLoan: TestBaseLoan;
  let snapshot: number;

  before(async function () {
    [deployer, kakaroto] = await ethers.getSigners();
    const TestBaseLoan = await ethers.getContractFactory('TestBaseLoan');
    baseLoan = (await TestBaseLoan.deploy(deployer.address)) as TestBaseLoan;
    await baseLoan.waitForDeployment();
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  it('should set the owner properly', async () => {
    expect(await baseLoan.owner()).to.eq(deployer.address);
  });

  it('should revert trying to send ETH to the contract', async () => {
    await expect(deployer.sendTransaction({ to: await baseLoan.getAddress(), value: 1 })).to.reverted;
  });

  it('non owner should not be able to call pause', async () => {
    expect(await baseLoan.paused()).to.eq(false);
    await expect(baseLoan.connect(kakaroto).pause()).to.be.revertedWith('Ownable: caller is not the owner');
    expect(await baseLoan.paused()).to.eq(false);
  });

  it('owner should be able to call pause', async () => {
    expect(await baseLoan.paused()).to.eq(false);
    await baseLoan.connect(deployer).pause();
    expect(await baseLoan.paused()).to.eq(true);
  });

  it('non owner should not be able to call unpause', async () => {
    await baseLoan.connect(deployer).pause();
    expect(await baseLoan.paused()).to.eq(true);
    await expect(baseLoan.connect(kakaroto).unpause()).to.be.revertedWith('Ownable: caller is not the owner');
    expect(await baseLoan.paused()).to.eq(true);
  });

  it('owner should be able to call unpause', async () => {
    await baseLoan.connect(deployer).pause();
    expect(await baseLoan.paused()).to.eq(true);
    await baseLoan.connect(deployer).unpause();
    expect(await baseLoan.paused()).to.eq(false);
  });
});
