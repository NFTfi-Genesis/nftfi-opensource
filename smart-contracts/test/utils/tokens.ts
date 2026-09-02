import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { assert } from 'chai';
import {
  DummyPunks,
  ERC20PresetMinterPauser,
  ERC721PresetMinterPauserAutoId,
  TestCryptoKitties,
  TestERC1155,
  TestLegacyERC721,
} from '../../typechain';
import { selectEvent } from './utils';

export async function mintNFT(nftContract: ERC721PresetMinterPauserAutoId, addr: string) {
  const tx = await nftContract.mint(addr);
  const transferEvent = await selectEvent(tx, nftContract, 'Transfer');
  const nftCollateralId = transferEvent?.args?.tokenId;

  const tokenOwner = await nftContract.ownerOf(nftCollateralId);
  assert.equal(tokenOwner, addr, 'The newly minted nft has the wrong owner');

  return {
    id: nftCollateralId,
    owner: tokenOwner,
  };
}

export async function mintLegacyNFT(nftContract: TestLegacyERC721, addr: string) {
  await nftContract.mint(addr);
  const eventFilter = nftContract.filters.Transfer;
  const events = await nftContract.queryFilter(eventFilter, -1);
  const transferEvent = events[0];
  const nftCollateralId = transferEvent?.args?._tokenId;

  const tokenOwner = await nftContract.ownerOf(nftCollateralId);
  assert.equal(tokenOwner, addr, 'The newly minted nft has the wrong owner');

  return {
    id: nftCollateralId,
    owner: tokenOwner,
  };
}

export async function mintERC20(erc20: ERC20PresetMinterPauser, addr: string, amt: bigint) {
  await erc20.mint(addr, amt);
  const addrBalance = await erc20.balanceOf(addr);
  return addrBalance;
}

export async function mintKitty(nftContract: TestCryptoKitties, addr: string) {
  await nftContract.mint(addr);
  const eventFilter = nftContract.filters.Transfer;
  const events = await nftContract.queryFilter(eventFilter, -1);
  const transferEvent = events[0];
  const nftCollateralId = transferEvent?.args?.tokenId;

  const tokenOwner = await nftContract.ownerOf(nftCollateralId);
  assert.equal(tokenOwner, addr, 'The newly minted nft has the wrong owner');

  return {
    id: nftCollateralId,
    owner: tokenOwner,
  };
}

export async function mintPunk(nftContract: DummyPunks, addr: string, punkIndex: bigint) {
  await nftContract.mintPunk(addr, punkIndex);

  const tokenOwner = await nftContract.punkIndexToAddress(punkIndex);
  assert.equal(tokenOwner, addr, 'The newly minted nft has the wrong owner');

  return {
    id: punkIndex,
    owner: tokenOwner,
  };
}

export async function mintAndApproveNFT(
  nftContract: ERC721PresetMinterPauserAutoId,
  mintFor: SignerWithAddress,
  approveFor: string,
) {
  const nft = await mintNFT(nftContract, mintFor.address);
  await nftContract.connect(mintFor).approve(approveFor, nft.id);
  return nft;
}

export async function mintAndApproveLegacyNFT(
  nftContract: TestLegacyERC721,
  mintFor: SignerWithAddress,
  approveFor: string,
) {
  const nft = await mintLegacyNFT(nftContract, mintFor.address);
  await nftContract.connect(mintFor).approve(approveFor, nft.id);
  return nft;
}

export async function mintAndApproveKitty(
  nftContract: TestCryptoKitties,
  mintFor: SignerWithAddress,
  approveFor: string,
) {
  const kitty = await mintKitty(nftContract, mintFor.address);
  await nftContract.connect(mintFor).approve(approveFor, kitty.id);
  return kitty;
}

export async function mintAndOfferForSalePunk(
  nftContract: DummyPunks,
  mintFor: SignerWithAddress,
  approveFor: string,
  punkIndex: bigint,
) {
  const punk = await mintPunk(nftContract, mintFor.address, punkIndex);
  await nftContract.connect(mintFor).offerPunkForSaleToAddress(punkIndex, 0, approveFor);
  return punk;
}

export async function mintAndApproveERC20(
  erc20: ERC20PresetMinterPauser,
  mintFor: SignerWithAddress,
  amt: bigint,
  approveFor: string,
) {
  const bal = await mintERC20(erc20, mintFor.address, amt);
  await erc20.connect(mintFor).approve(approveFor, bal * 2n);
  return bal;
}

export async function mintAndApprove1155(
  nftContract: TestERC1155,
  mintFor: SignerWithAddress,
  approveFor: string,
  id: bigint,
) {
  await nftContract.mint(mintFor.address, id, 1, '0x');
  await nftContract.connect(mintFor).setApprovalForAll(approveFor, true);
}
