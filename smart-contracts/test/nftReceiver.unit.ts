import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { TestERC1155, TestERC721, TestNftReceiver } from '../typechain';
import { restoreSnapshot, takeSnapshot } from './utils/utils';

describe('NftReceiver', function () {
  let kakaroto: SignerWithAddress;
  let nftReceiver: TestNftReceiver;
  let testERC1155: TestERC1155;
  let testERC721: TestERC721;
  let snapshot: number;

  const ERC1155_INTERFACE_ID = '0x4e2312e0';
  const ERC721_INTERFACE_ID = '0x150b7a02';
  const ERC165_INTERFACE_ID = '0x01ffc9a7';

  before(async function () {
    [, kakaroto] = await ethers.getSigners();

    const TestNftReceiver = await ethers.getContractFactory('TestNftReceiver');
    nftReceiver = (await TestNftReceiver.deploy()) as TestNftReceiver;
    await nftReceiver.waitForDeployment();

    const TestERC1155 = await ethers.getContractFactory('TestERC1155');
    testERC1155 = (await TestERC1155.deploy()) as TestERC1155;
    await testERC1155.waitForDeployment();

    const TestERC721 = await ethers.getContractFactory('TestERC721');
    testERC721 = (await TestERC721.deploy()) as TestERC721;
    await testERC721.waitForDeployment();

    await testERC1155.mint(kakaroto.address, 1, 1, '0x');
    await testERC721.mint(kakaroto.address, 1);
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  it('should support ERC1155 interface', async () => {
    expect(await nftReceiver.supportsInterface(ERC1155_INTERFACE_ID)).to.true;
  });
  it('should support ERC721 interface', async () => {
    expect(await nftReceiver.supportsInterface(ERC721_INTERFACE_ID)).to.true;
  });
  it('should support ERC165 interface', async () => {
    expect(await nftReceiver.supportsInterface(ERC165_INTERFACE_ID)).to.true;
  });
  it('should not support an interface other than ERC1155, ERC721 and ERC165 interfaces', async () => {
    expect(await nftReceiver.supportsInterface('0x12345678')).to.false;
  });

  describe('ERC1155Receiver', () => {
    describe('onERC1155Received', () => {
      it('should correctly receive the NFT', async () => {
        expect(await testERC1155.balanceOf(await nftReceiver.getAddress(), 1)).to.eq(0);

        await testERC1155
          .connect(kakaroto)
          .safeTransferFrom(kakaroto.address, await nftReceiver.getAddress(), 1, 1, '0x');

        expect(await testERC1155.balanceOf(await nftReceiver.getAddress(), 1)).to.eq(1);
      });
    });

    describe('onERC1155BatchReceived', () => {
      it('should revert on batch transfer', async () => {
        expect(await testERC1155.balanceOf(await nftReceiver.getAddress(), 1)).to.eq(0);
        await expect(
          testERC1155
            .connect(kakaroto)
            .safeBatchTransferFrom(kakaroto.address, await nftReceiver.getAddress(), [1], [1], '0x'),
        ).revertedWith('ERC1155 batch not supported');
        expect(await testERC1155.balanceOf(await nftReceiver.getAddress(), 1)).to.eq(0);
      });
    });
  });

  describe('ERC721Receiver', () => {
    it('should correctly receive the NFT', async () => {
      expect(await testERC721.ownerOf(1)).to.eq(kakaroto.address);

      await testERC721
        .connect(kakaroto)
        ['safeTransferFrom(address,address,uint256)'](kakaroto.address, await nftReceiver.getAddress(), 1);

      expect(await testERC721.ownerOf(1)).to.eq(await nftReceiver.getAddress());
    });
  });
});
