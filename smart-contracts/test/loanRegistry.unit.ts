import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { LoanCoordinator } from '../typechain';
import { ADDRESS_ZERO, restoreSnapshot, takeSnapshot, toBytes32 } from './utils/utils';

describe('LoanRegistry', function () {
  let deployer: SignerWithAddress;
  let kakaroto: SignerWithAddress;
  let vegeta: SignerWithAddress;
  let karpincho: SignerWithAddress;
  let initialType1: SignerWithAddress;
  let initialType2: SignerWithAddress;
  let loanRegistry: LoanCoordinator;
  let snapshot: number;

  before(async function () {
    [deployer, kakaroto, vegeta, karpincho, initialType1, initialType2] = await ethers.getSigners();

    const ContractKeyUtils = await ethers.getContractFactory('ContractKeyUtils');
    const contractKeyUtils = await ContractKeyUtils.connect(deployer).deploy();
    await contractKeyUtils.waitForDeployment();

    const LoanRegistry = await ethers.getContractFactory('LoanCoordinator', {
      libraries: {
        ContractKeyUtils: await contractKeyUtils.getAddress(),
      },
    });
    loanRegistry = (await LoanRegistry.connect(deployer).deploy(
      ADDRESS_ZERO,
      deployer.address,
      ['INITIAL_TYPE1', 'INITIAL_TYPE2'],
      [initialType1.address, initialType2.address],
    )) as LoanCoordinator;
    await loanRegistry.waitForDeployment();
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  it('should set the owner properly', async () => {
    expect(await loanRegistry.owner()).to.eq(deployer.address);
  });

  it('should initialize loan types upon deployment', async () => {
    expect(await loanRegistry.getDefaultLoanContractForOfferType(toBytes32('INITIAL_TYPE1'))).to.eq(
      initialType1.address,
    );
    expect(await loanRegistry.getDefaultLoanContractForOfferType(toBytes32('INITIAL_TYPE2'))).to.eq(
      initialType2.address,
    );
  });

  it('non owner should not be able to call registerOfferType', async () => {
    await expect(loanRegistry.connect(kakaroto).registerOfferType('TEST_TYPE', vegeta.address)).to.be.revertedWith(
      'Ownable: caller is not the owner',
    );
  });

  it('owner should not be able to call registerOfferType with empty loan type', async () => {
    await expect(loanRegistry.connect(deployer).registerOfferType('', vegeta.address)).to.be.revertedWithCustomError(
      loanRegistry,
      'OfferTypeIsEmpty',
    );
  });

  it('owner should be able to call registerOfferType', async () => {
    await loanRegistry.connect(deployer).registerOfferType('TEST_TYPE', vegeta.address);
    expect(await loanRegistry.getDefaultLoanContractForOfferType(toBytes32('TEST_TYPE'))).to.eq(vegeta.address);
  });

  it('non owner should not be able to call registerOfferTypes', async () => {
    await expect(
      loanRegistry
        .connect(kakaroto)
        .registerOfferTypes([toBytes32('TEST_TYPE'), toBytes32('TEST_TYPE2')], [vegeta.address, karpincho.address]),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('owner should not be able to call registerOfferTypes with arity mismatch', async () => {
    await expect(
      loanRegistry.connect(deployer).registerOfferTypes([toBytes32('TEST_TYPE2')], [vegeta.address, karpincho.address]),
    ).to.be.revertedWithCustomError(loanRegistry, 'FunctionInformationArityMismatch');
  });

  it('owner should not be able to call registerOfferTypes with empty loan type', async () => {
    await expect(
      loanRegistry.connect(deployer).registerOfferTypes(['', 'TEST_TYPE2'], [vegeta.address, karpincho.address]),
    ).to.be.revertedWithCustomError(loanRegistry, 'OfferTypeIsEmpty');
  });

  it('owner should be able to call registerOfferType', async () => {
    await loanRegistry
      .connect(deployer)
      .registerOfferTypes(['TEST_TYPE', 'TEST_TYPE2'], [vegeta.address, karpincho.address]);

    expect(await loanRegistry.getDefaultLoanContractForOfferType(toBytes32('TEST_TYPE'))).to.eq(vegeta.address);
    expect(await loanRegistry.getDefaultLoanContractForOfferType(toBytes32('TEST_TYPE2'))).to.eq(karpincho.address);
  });

  it('calling registerOfferType with a registered type should update the corresponding contract address', async () => {
    await loanRegistry.connect(deployer).registerOfferType('TEST_TYPE', vegeta.address);
    expect(await loanRegistry.getDefaultLoanContractForOfferType(toBytes32('TEST_TYPE'))).to.eq(vegeta.address);

    await loanRegistry.connect(deployer).registerOfferType('TEST_TYPE', kakaroto.address);
    expect(await loanRegistry.getDefaultLoanContractForOfferType(toBytes32('TEST_TYPE'))).to.eq(kakaroto.address);
  });

  it('getDefaultLoanContractForOfferType should return the right address', async () => {
    await loanRegistry.connect(deployer).registerOfferType('TEST_TYPE', vegeta.address);
    expect(await loanRegistry.getDefaultLoanContractForOfferType(toBytes32('TEST_TYPE'))).to.eq(vegeta.address);
  });

  it('getTypeOfLoanContract should return the right type', async () => {
    await loanRegistry.connect(deployer).registerOfferType('TEST_TYPE', vegeta.address);
    expect(await loanRegistry.getTypeOfLoanContract(vegeta.address)).to.eq(toBytes32('TEST_TYPE'));
  });
});
