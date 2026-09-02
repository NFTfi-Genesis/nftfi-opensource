import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { NftfiHub, SmartNft, TestNftReceiver } from '../typechain';
import { bytesTokenId, restoreSnapshot, takeSnapshot } from './utils/utils';
import { AbiCoder } from 'ethers';

describe('SmartNft', function () {
  let admin: SignerWithAddress;
  let kakaroto: SignerWithAddress;
  let vegeta: SignerWithAddress;
  let karpincho: SignerWithAddress;
  let smartNft: SmartNft;
  let nftfiHub: NftfiHub;
  let nftReceiver: TestNftReceiver;
  let nonNftReceiver: TestNftReceiver;
  let snapshot: number;

  let DEFAULT_ADMIN_ROLE: string;
  let LOAN_COORDINATOR_ROLE: string;
  let BASE_URI_ROLE: string;
  const chainId = hre.network.config.chainId || 31337;
  const BASE_URI = 'https://metadata.nftfi.com/loans/v2/obligation/';

  const abiCoder = AbiCoder.defaultAbiCoder();

  before(async function () {
    [, admin, kakaroto, vegeta, karpincho] = await ethers.getSigners();

    const ContractKeyUtils = await ethers.getContractFactory('ContractKeyUtils');
    const contractKeyUtils = await ContractKeyUtils.connect(admin).deploy();
    await contractKeyUtils.waitForDeployment();

    const NftfiHub = await ethers.getContractFactory('NftfiHub', {
      libraries: {
        ContractKeyUtils: await contractKeyUtils.getAddress(),
      },
    });
    nftfiHub = (await NftfiHub.connect(admin).deploy(admin.address, [], [])) as NftfiHub;
    await nftfiHub.waitForDeployment();

    const TestNftReceiver = await ethers.getContractFactory('TestNftReceiver');
    nftReceiver = (await TestNftReceiver.deploy()) as TestNftReceiver;
    await nftReceiver.waitForDeployment();
    nonNftReceiver = (await TestNftReceiver.deploy()) as TestNftReceiver;
    await nonNftReceiver.waitForDeployment();

    const SmartNft = await ethers.getContractFactory('SmartNft');
    smartNft = (await SmartNft.deploy(
      admin.address,
      await nftfiHub.getAddress(),
      kakaroto.address,
      'Smart',
      'NFT',
      BASE_URI,
    )) as SmartNft;
    await smartNft.waitForDeployment();

    DEFAULT_ADMIN_ROLE = await smartNft.DEFAULT_ADMIN_ROLE();
    LOAN_COORDINATOR_ROLE = await smartNft.LOAN_COORDINATOR_ROLE();
    BASE_URI_ROLE = await smartNft.BASE_URI_ROLE();
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  it('should set the DEFAULT_ADMIN_ROLE properly', async () => {
    expect(await smartNft.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.true;
  });

  it('should set the BASE_URI_ROLE properly', async () => {
    expect(await smartNft.hasRole(BASE_URI_ROLE, admin.address)).to.true;
  });

  it('should set the LOAN_COORDINATOR_ROLE properly', async () => {
    expect(await smartNft.hasRole(LOAN_COORDINATOR_ROLE, kakaroto.address)).to.true;
  });

  it('should set the name and symbol properly', async () => {
    expect(await smartNft.name()).to.eq('Smart');
    expect(await smartNft.symbol()).to.eq('NFT');
  });

  it('should set the base uri properly', async () => {
    expect(await smartNft.baseURI()).to.eq(`${BASE_URI}${chainId}/`);
  });

  it('non DEFAULT_ADMIN_ROLE should not be able to set a new loan coordinator', async () => {
    await expect(smartNft.connect(vegeta).setLoanCoordinator(vegeta.address)).to.reverted;
  });

  it('DEFAULT_ADMIN_ROLE should be able to set a new loan coordinator', async () => {
    expect(await smartNft.hasRole(LOAN_COORDINATOR_ROLE, karpincho.address)).to.false;
    await smartNft.connect(admin).setLoanCoordinator(karpincho.address);
    expect(await smartNft.hasRole(LOAN_COORDINATOR_ROLE, karpincho.address)).to.true;
  });

  it('non BASE_URI_ROLE should not be able to set a base uri', async () => {
    await expect(smartNft.connect(vegeta).setBaseURI('TEST_BASE_URI/')).to.reverted;
  });

  it('BASE_URI_ROLE should be able to set a base uri', async () => {
    await smartNft.connect(admin).setBaseURI('TEST_BASE_URI/');
    expect(await smartNft.baseURI()).to.eq(`TEST_BASE_URI/${chainId}/`);
  });

  it('non LOAN_COORDINATOR_ROLE should not be able to mint', async () => {
    await expect(smartNft.connect(vegeta).mint(vegeta.address, 1, bytesTokenId(0n))).to.reverted;
  });

  it('LOAN_COORDINATOR_ROLE should not be able to mint with no loanId', async () => {
    await expect(smartNft.connect(kakaroto).mint(vegeta.address, 1, '0x')).to.be.revertedWith(
      'data must contain loanId',
    );
  });

  it('LOAN_COORDINATOR_ROLE should be able mint', async () => {
    expect(await smartNft.balanceOf(karpincho.address)).to.eq(0);
    await smartNft.connect(kakaroto).mint(karpincho.address, 1, bytesTokenId(0n));
    expect(await smartNft.balanceOf(karpincho.address)).to.eq(1);
    expect(await smartNft.ownerOf(1)).to.eq(karpincho.address);
  });

  it('when minting it should link loanCoordinator -> smartNftId -> loanId', async () => {
    const smartNftId = 1;
    const loanId = 123;
    await smartNft.connect(kakaroto).mint(karpincho.address, smartNftId, abiCoder.encode(['uint'], [loanId]));
    const loanData = await smartNft.loans(smartNftId);
    expect(loanData.loanCoordinator).to.eq(kakaroto.address);
    expect(loanData.loanId).to.eq(loanId);
  });

  it('non LOAN_COORDINATOR_ROLE should not be able to burn', async () => {
    await smartNft.connect(kakaroto).mint(karpincho.address, 1, bytesTokenId(0n));
    await expect(smartNft.connect(vegeta).burn(1)).to.reverted;
  });

  it('LOAN_COORDINATOR_ROLE should be able burn', async () => {
    await smartNft.connect(kakaroto).mint(karpincho.address, 1, bytesTokenId(0n));
    expect(await smartNft.balanceOf(karpincho.address)).to.eq(1);
    await smartNft.connect(kakaroto).burn(1);
    expect(await smartNft.balanceOf(karpincho.address)).to.eq(0);
  });

  it('should return the proper tokenURI', async () => {
    const smartNftId = 1;
    const loanId = 123;
    await smartNft.connect(kakaroto).mint(karpincho.address, smartNftId, abiCoder.encode(['uint'], [loanId]));
    const baseUri = await smartNft.baseURI();
    expect(await smartNft.tokenURI(smartNftId)).to.eq(`${baseUri}${smartNftId}`);
  });

  it('should support AccessControl interface', async () => {
    expect(await smartNft.supportsInterface('0x7965db0b')).to.true;
  });

  it('should support ERC721 interface', async () => {
    expect(await smartNft.supportsInterface('0x80ac58cd')).to.true;
  });

  it('should support ERC165 interface', async () => {
    expect(await smartNft.supportsInterface('0x01ffc9a7')).to.true;
  });

  describe('transfer', () => {
    const nftId = 1;
    before(async () => {
      await smartNft.connect(kakaroto).mint(karpincho.address, nftId, bytesTokenId(0n));
    });

    it('should be able to be transferred to an EOA', async () => {
      await smartNft.connect(karpincho).transferFrom(karpincho.address, vegeta.address, nftId);
      expect(await smartNft.ownerOf(nftId)).to.eq(vegeta.address);
    });

    it('should be able to be safe transferred to an EOA', async () => {
      await smartNft
        .connect(karpincho)
        ['safeTransferFrom(address,address,uint256)'](karpincho.address, vegeta.address, nftId);
      expect(await smartNft.ownerOf(nftId)).to.eq(vegeta.address);
    });
  });
});
