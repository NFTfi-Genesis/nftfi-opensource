import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { TestOwnable } from '../typechain';
import { ADDRESS_ZERO, restoreSnapshot, takeSnapshot } from './utils/utils';

describe('Ownable', function () {
  let deployer: SignerWithAddress;
  let kakaroto: SignerWithAddress;
  let ownable: TestOwnable;
  let snapshot: number;

  before(async function () {
    [deployer, kakaroto] = await ethers.getSigners();

    const TestOwnable = await ethers.getContractFactory('TestOwnable');
    ownable = (await TestOwnable.deploy(kakaroto.address)) as TestOwnable;
    await ownable.waitForDeployment();
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  it('should set the owner properly upon creation', async () => {
    expect(await ownable.owner()).to.eq(kakaroto.address);
  });

  it('non owner should not be able to transfer ownership', async () => {
    await expect(ownable.connect(deployer).requestTransferOwnership(deployer.address)).to.be.revertedWith(
      'Ownable: caller is not the owner',
    );
  });
  it('owner should not be able to transfer ownership to address zero', async () => {
    await expect(ownable.connect(kakaroto).requestTransferOwnership(ADDRESS_ZERO)).to.be.revertedWith(
      'Ownable: new owner is the zero address',
    );
  });
  it('owner should be able to transfer ownership', async () => {
    await ownable.connect(kakaroto).requestTransferOwnership(deployer.address);
    await ownable.connect(deployer).acceptTransferOwnership();
    expect(await ownable.owner()).to.eq(deployer.address);
  });
});
