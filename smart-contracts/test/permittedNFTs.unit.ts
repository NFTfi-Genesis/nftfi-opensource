import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { NftfiHub, PermittedNFTsAndTypeRegistry } from '../typechain';
import { ADDRESS_ZERO, restoreSnapshot, takeSnapshot, toBytes32 } from './utils/utils';

describe('PermittedNFTs', function () {
  let deployer: SignerWithAddress;
  let kakaroto: SignerWithAddress;
  let vegeta: SignerWithAddress;
  let karpincho: SignerWithAddress;
  let erc721Contract: SignerWithAddress;
  let cryptoKittiesContract: SignerWithAddress;
  let erc721Wrapper: SignerWithAddress;
  let cryptoKittiesWrapper: SignerWithAddress;
  let erc1155Wrapper: SignerWithAddress;
  let permittedNFTs: PermittedNFTsAndTypeRegistry;
  let snapshot: number;

  const nftTypeERC721 = 'ERC721';
  const nftTypeCryptoKitties = 'CryptoKitties';
  const nftTypeERC1155 = 'ERC1155';
  const nftTypeNonRegistered = 'NONRGISTERED';

  before(async function () {
    [
      deployer,
      kakaroto,
      vegeta,
      karpincho,
      erc721Contract,
      cryptoKittiesContract,
      erc721Wrapper,
      cryptoKittiesWrapper,
      erc1155Wrapper,
    ] = await ethers.getSigners();

    const ContractKeyUtils = await ethers.getContractFactory('ContractKeyUtils');
    const contractKeyUtils = await ContractKeyUtils.connect(deployer).deploy();
    await contractKeyUtils.waitForDeployment();

    const NftfiHub = await ethers.getContractFactory('NftfiHub', {
      libraries: {
        ContractKeyUtils: await contractKeyUtils.getAddress(),
      },
    });
    const nftfiHub = (await NftfiHub.connect(deployer).deploy(deployer.address, [], [])) as NftfiHub;
    await nftfiHub.waitForDeployment();

    const PermittedNFTs = await ethers.getContractFactory('PermittedNFTsAndTypeRegistry', {
      libraries: {
        ContractKeyUtils: await contractKeyUtils.getAddress(),
      },
    });
    permittedNFTs = (await PermittedNFTs.connect(deployer).deploy(
      deployer.address,
      [nftTypeERC721, nftTypeCryptoKitties, nftTypeERC1155],
      [erc721Wrapper.address, cryptoKittiesWrapper.address, erc1155Wrapper.address],
      [erc721Contract.address, cryptoKittiesContract.address],
      [nftTypeERC721, nftTypeCryptoKitties],
    )) as PermittedNFTsAndTypeRegistry;
    await permittedNFTs.waitForDeployment();
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  it('should set the owner properly', async () => {
    expect(await permittedNFTs.owner()).to.eq(deployer.address);
  });

  it('should initialize permitted list upon deployment', async () => {
    expect(await permittedNFTs.getNFTPermit(erc721Contract.address)).to.eq(toBytes32(nftTypeERC721));
    expect(await permittedNFTs.getNFTPermit(cryptoKittiesContract.address)).to.eq(toBytes32(nftTypeCryptoKitties));
  });

  it('non owner should not be able to call setNFTPermit', async () => {
    await expect(permittedNFTs.connect(karpincho).setNFTPermit(vegeta.address, nftTypeERC1155)).to.revertedWith(
      'Ownable: caller is not the owner',
    );
  });

  it('owner should not be able to call setNFTPermit for zero address', async () => {
    await expect(permittedNFTs.connect(deployer).setNFTPermit(ADDRESS_ZERO, nftTypeERC1155)).to.be.revertedWith(
      'nftContract is zero address',
    );
  });

  it('owner should not be able to call setNFTPermit for non registered NFT type', async () => {
    await expect(permittedNFTs.connect(deployer).setNFTPermit(vegeta.address, nftTypeNonRegistered)).to.be.revertedWith(
      'NFT type not registered',
    );
  });

  it('owner should be able to call setNFTPermit', async () => {
    await permittedNFTs.connect(deployer).setNFTPermit(vegeta.address, nftTypeERC1155);
    expect(await permittedNFTs.getNFTPermit(vegeta.address)).to.eq(toBytes32(nftTypeERC1155));
  });

  it('non owner should not be able to call setNFTPermits', async () => {
    await expect(
      permittedNFTs
        .connect(karpincho)
        .setNFTPermits([vegeta.address, kakaroto.address], [nftTypeERC1155, nftTypeERC1155]),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('owner should not be able to call setNFTPermits with some zero address', async () => {
    await expect(
      permittedNFTs.connect(deployer).setNFTPermits([ADDRESS_ZERO, kakaroto.address], [nftTypeERC1155, nftTypeERC1155]),
    ).to.be.revertedWith('nftContract is zero address');
  });

  it('owner should not be able to call setNFTPermits with some zero address', async () => {
    await expect(
      permittedNFTs
        .connect(deployer)
        .setNFTPermits([kakaroto.address, vegeta.address], [nftTypeERC1155, nftTypeNonRegistered]),
    ).to.be.revertedWith('NFT type not registered');
  });

  it('owner should not be able to call setNFTPermits with arity mismatch', async () => {
    await expect(
      permittedNFTs.connect(deployer).setNFTPermits([vegeta.address], [nftTypeERC1155, nftTypeERC1155]),
    ).to.be.revertedWith('setNFTPermits function information arity mismatch');
  });

  it('owner should be able to call setNFTPermits', async () => {
    await permittedNFTs
      .connect(deployer)
      .setNFTPermits([vegeta.address, karpincho.address], [nftTypeERC1155, nftTypeERC1155]);

    expect(await permittedNFTs.getNFTPermit(vegeta.address)).to.eq(toBytes32(nftTypeERC1155));
    expect(await permittedNFTs.getNFTPermit(karpincho.address)).to.eq(toBytes32(nftTypeERC1155));
  });

  it('getNFTWrapper should return the right wrapper', async () => {
    expect(await permittedNFTs.getNFTWrapper(cryptoKittiesContract.address)).to.eq(cryptoKittiesWrapper.address);
  });
});
