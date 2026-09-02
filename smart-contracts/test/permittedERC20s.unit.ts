import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { PermittedERC20s } from '../typechain';
import { ADDRESS_ZERO, restoreSnapshot, takeSnapshot } from './utils/utils';

describe('PermittedERC20s', function () {
  let deployer: SignerWithAddress;
  let kakaroto: SignerWithAddress;
  let vegeta: SignerWithAddress;
  let karpincho: SignerWithAddress;
  let chester: SignerWithAddress;
  let schalk: SignerWithAddress;
  let permittedERC20s: PermittedERC20s;
  let snapshot: number;

  before(async function () {
    [deployer, kakaroto, vegeta, karpincho, chester, schalk] = await ethers.getSigners();
    const PermittedERC20s = await ethers.getContractFactory('PermittedERC20s');
    permittedERC20s = (await PermittedERC20s.deploy(deployer.address, [
      chester.address,
      schalk.address,
    ])) as PermittedERC20s;
    await permittedERC20s.waitForDeployment();
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  it('should set the owner properly', async () => {
    expect(await permittedERC20s.owner()).to.eq(deployer.address);
  });

  it('should initialize permitted list upon deployment', async () => {
    expect(await permittedERC20s.getERC20Permit(chester.address)).to.true;
    expect(await permittedERC20s.getERC20Permit(schalk.address)).to.true;
  });

  it('non owner should not be able to call setERC20Permit', async () => {
    await expect(permittedERC20s.connect(kakaroto).setERC20Permit(vegeta.address, true)).to.be.revertedWith(
      'Ownable: caller is not the owner',
    );
  });

  it('owner should not be able to call setERC20Permit for zero address', async () => {
    await expect(permittedERC20s.connect(deployer).setERC20Permit(ADDRESS_ZERO, true)).to.be.revertedWith(
      'erc20 is zero address',
    );
  });

  it('owner should be able to call setERC20Permit', async () => {
    await permittedERC20s.connect(deployer).setERC20Permit(vegeta.address, true);
    expect(await permittedERC20s.getERC20Permit(vegeta.address)).to.true;
  });

  it('non owner should not be able to call setERC20Permits', async () => {
    await expect(
      permittedERC20s.connect(kakaroto).setERC20Permits([vegeta.address, karpincho.address], [true, true]),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('owner should not be able to call setERC20Permits with some zero address', async () => {
    await expect(
      permittedERC20s.connect(deployer).setERC20Permits([ADDRESS_ZERO, vegeta.address], [true, true]),
    ).to.be.revertedWith('erc20 is zero address');
  });

  it('owner should not be able to call setERC20Permits with arity mismatch', async () => {
    await expect(permittedERC20s.connect(deployer).setERC20Permits([vegeta.address], [true, true])).to.be.revertedWith(
      'setERC20Permits function information arity mismatch',
    );
  });

  it('owner should be able to call setERC20Permits', async () => {
    await permittedERC20s.connect(deployer).setERC20Permits([vegeta.address, karpincho.address], [true, true]);

    expect(await permittedERC20s.getERC20Permit(vegeta.address)).to.true;
    expect(await permittedERC20s.getERC20Permit(karpincho.address)).to.true;
  });
});
