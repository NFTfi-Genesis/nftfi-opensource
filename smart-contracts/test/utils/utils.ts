import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { BaseContract, TransactionResponse } from 'ethers';
import hre, { ethers } from 'hardhat';
import { ERC20, ERC1155, ERC721, IPunks, TestCryptoKitties, TestLegacyERC721, ISuperRareV1 } from '../../typechain';

export const ADDRESS_ZERO = ethers.ZeroAddress;

export const CONTRACTS_KEYS = {
  PERMITTED_NFTS: 'PERMITTED_NFTS',
  PERMITTED_ERC20S: 'PERMITTED_ERC20S',
  PERMITTED_PARTNERS: 'PERMITTED_PARTNERS',
  LOAN_COORDINATOR: 'LOAN_COORDINATOR',
  NFT_TYPE_REGISTRY: 'NFT_TYPE_REGISTRY',
  PERMITTED_SNFT_RECEIVER: 'PERMITTED_SNFT_RECEIVER',
  REFINANCING: 'REFINANCING',
  ESCROW: 'ESCROW',
  PERSONAL_ESCROW_FACTORY: 'PERSONAL_ESCROW_FACTORY',
  ERC20_TRANSFER_MANAGER: 'ERC20_TRANSFER_MANAGER',
  DELEGATE_PLUGIN: 'DELEGATE_PLUGIN',
};

export function daysToSeconds(days: bigint): bigint {
  return days * 24n * 60n * 60n;
}

export function send(method: string, params?: Array<any>) {
  return ethers.provider.send(method, params === undefined ? [] : params);
}

export function mineBlock() {
  return send('evm_mine', []);
}

export function toBytes32(msg: string): string {
  return ethers.encodeBytes32String(msg);
}

// 998 utils
export const ERC998_MAGIC_VALUE = '0xcd740db5';
export function bytesTokenId(tokenId: number) {
  let bytesString: string;
  if (tokenId.toString().length % 2 === 0) {
    bytesString = '0x' + tokenId.toString();
  } else {
    bytesString = '0x0' + tokenId.toString();
  }
  return ethers.zeroPadValue(bytesString, 32);
}
export const bytes32Address = (address: string) =>
  ethers.concat([ERC998_MAGIC_VALUE, ethers.zeroPadValue(address, 28).toLowerCase()]);

/**
 *  Gets the time of the last block.
 */
export async function currentTime(): Promise<bigint> {
  const latestBlock = await ethers.provider.getBlock('latest');
  const timestamp = latestBlock?.timestamp;
  if (timestamp) {
    return BigInt(timestamp);
  } else throw new Error('getting timestamp failed');
}

/**
 *  Increases the time in the EVM.
 *  @param seconds bigint of seconds to increase the time by
 */
export async function advanceTime(seconds: bigint) {
  const method = 'evm_increaseTime';
  const params = [Number(seconds)];

  await send(method, params);

  await mineBlock();
}

/**
 *  Increases the time in the EVM to as close to a specific timestamp as possible
 */
export async function advanceTimeTo(time: bigint) {
  const timestamp = await currentTime();
  if (time < timestamp) {
    throw new Error(
      `Time parameter (${time}) is less than now ${timestamp}. You can only fast forward to times in the future.`,
    );
  }

  const secondsBetween = time - timestamp;
  await advanceTime(secondsBetween);
}

export async function impersonateAddress(address: string) {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  });

  return ethers.getSigner(address);
}

/**
 *  Takes a snapshot and returns the ID of the snapshot for restoring later.
 */
export async function takeSnapshot(): Promise<number> {
  const result = await send('evm_snapshot');
  await mineBlock();
  return result;
}

/**
 *  Restores a snapshot that was previously taken with takeSnapshot
 *  @param id The ID that was returned when takeSnapshot was called.
 */
export async function restoreSnapshot(id: number) {
  await send('evm_revert', [id]);
  await mineBlock();
}

export async function assertTokenOwner(msg: string, nftContract: ERC721, nftId: string, ownerAddr: string) {
  const tokenOwner = await nftContract.ownerOf(nftId);
  expect(tokenOwner, msg).to.eq(ownerAddr);
}

export async function assertLegacyTokenOwner(
  msg: string,
  nftContract: TestLegacyERC721,
  nftId: string,
  ownerAddr: string,
) {
  const tokenOwner = await nftContract.ownerOf(nftId);
  expect(tokenOwner, msg).to.eq(ownerAddr);
}

export async function assertKittyOwner(msg: string, nftContract: TestCryptoKitties, nftId: string, ownerAddr: string) {
  const tokenOwner = await nftContract.ownerOf(nftId);
  expect(tokenOwner, msg).to.eq(ownerAddr);
}

export async function assertPunkOwner(msg: string, nftContract: IPunks, nftId: string, ownerAddr: string) {
  const tokenOwner = await nftContract.punkIndexToAddress(nftId);
  expect(tokenOwner, msg).to.eq(ownerAddr);
}

export async function assertSuperRareOwner(msg: string, nftContract: ISuperRareV1, nftId: string, ownerAddr: string) {
  const tokenOwner = await nftContract.ownerOf(nftId);
  expect(tokenOwner, msg).to.eq(ownerAddr);
}

export async function assertERC1155BalanceOf(
  msg: string,
  nftContract: ERC1155,
  nftId: string,
  ownerAddr: string,
  value: bigint,
) {
  const balance = await nftContract.balanceOf(ownerAddr, nftId);
  expect(balance, msg).to.eq(value);
}

export async function assertBalanceChange(
  msg: string,
  erc20: ERC20,
  addr: string,
  balBefore: bigint,
  balChange: bigint,
) {
  const balAfter = await erc20.balanceOf(addr);

  expect(balAfter, msg).to.eq(balBefore + balChange);

  return balAfter;
}

export function assertCloseTo(a: bigint, b: bigint, delta: bigint = 1n) {
  const abs = (n: bigint) => (n < 0n ? -n : n);
  expect(abs(a - b) <= delta, `${a.toString()} is not close to ${b.toString()} +/- ${delta.toString()}`).is.true;
}

export async function selectEvent(tx: TransactionResponse, contract: BaseContract, eventName: string) {
  const receipt = await tx.wait();
  const eventsInTx = receipt?.logs.map(log =>
    contract.interface.parseLog({ topics: Array.from(log.topics), data: log.data }),
  );
  const event = eventsInTx?.filter(event => event?.name == eventName)[0];

  return event;
}

export function getLenderSignature(
  lender: SignerWithAddress,
  loanPrincipalAmount: bigint,
  isProRata: boolean,
  maximumRepaymentAmount: bigint,
  nftCollateralId: bigint,
  loanDuration: bigint,
  nonce: bigint,
  nftCollateralContract: string,
  loanERC20Denomination: string,
  expiry: bigint,
  offerType: string,
  originationFee: bigint,
) {
  const chainId = hre.network.config.chainId || 31337;
  return lender.signMessage(
    ethers.getBytes(
      ethers.solidityPackedKeccak256(
        [
          'address',
          'uint256',
          'uint256',
          'address',
          'uint256',
          'uint32',
          'bool',
          'uint256',
          'address',
          'uint256',
          'uint256',
          'bytes32',
          'uint256',
        ],
        [
          loanERC20Denomination,
          loanPrincipalAmount,
          maximumRepaymentAmount,
          nftCollateralContract,
          nftCollateralId,
          loanDuration,
          isProRata,
          originationFee,
          lender.address,
          nonce,
          expiry,
          offerType,
          chainId,
        ],
      ),
    ),
  );
}

export function getLenderSignatureWithIdRange(
  lender: SignerWithAddress,
  loanPrincipalAmount: bigint,
  isProRata: boolean,
  maximumRepaymentAmount: bigint,
  nftCollateralId: bigint,
  minId: bigint,
  maxId: bigint,
  loanDuration: bigint,
  nonce: bigint,
  nftCollateralContract: string,
  loanERC20Denomination: string,
  expiry: bigint,
  offerType: string,
  originationFee: bigint,
) {
  const chainId = hre.network.config.chainId || 31337;
  return lender.signMessage(
    ethers.getBytes(
      ethers.solidityPackedKeccak256(
        [
          'address',
          'uint256',
          'uint256',
          'address',
          'uint256',
          'uint32',
          'bool',
          'uint256',
          'uint256',
          'uint256',
          'address',
          'uint256',
          'uint256',
          'bytes32',
          'uint256',
        ],
        [
          loanERC20Denomination,
          loanPrincipalAmount,
          maximumRepaymentAmount,
          nftCollateralContract,
          nftCollateralId,
          loanDuration,
          isProRata,
          originationFee,
          minId,
          maxId,
          lender.address,
          nonce,
          expiry,
          offerType,
          chainId,
        ],
      ),
    ),
  );
}

export function getLenderSignatureLegacy(
  lender: SignerWithAddress,
  loanPrincipalAmount: bigint,
  maximumRepaymentAmount: bigint,
  nftCollateralId: bigint,
  loanDuration: bigint,
  loanAdminFeeInBasisPoints: bigint,
  nonce: bigint,
  nftCollateralContract: string,
  loanERC20Denomination: string,
  expiry: bigint,
  referrer: string,
  loanContract: string,
) {
  const chainId = hre.network.config.chainId || 31337;
  return lender.signMessage(
    ethers.getBytes(
      ethers.solidityPackedKeccak256(
        [
          'address',
          'uint256',
          'uint256',
          'address',
          'uint256',
          'address',
          'uint32',
          'uint16',
          'address',
          'uint256',
          'uint256',
          'address',
          'uint256',
        ],
        [
          loanERC20Denomination,
          loanPrincipalAmount,
          maximumRepaymentAmount,
          nftCollateralContract,
          nftCollateralId,
          referrer,
          loanDuration,
          loanAdminFeeInBasisPoints,
          lender.address,
          nonce,
          expiry,
          loanContract,
          chainId,
        ],
      ),
    ),
  );
}

// NOTE: this is not strictly how it should to be done, It'll depend on how the isValidSignature in the signer contract is implemented.
// In the case of the tests the signer contract checks that the signature was made by it admin address pk
//
// The only requirement is to send the signer contract address as the signer in the Signature argument when calling acceptOffer
export function getLenderSignatureEIP1271(
  lender: SignerWithAddress,
  signerContract: string,
  loanPrincipalAmount: bigint,
  isProRated: boolean,
  maximumRepaymentAmount: bigint,
  nftCollateralId: bigint,
  loanDuration: bigint,
  nonce: bigint,
  nftCollateralContract: string,
  loanERC20Denomination: string,
  expiry: bigint,
  offerType: string,
  originationFee: bigint,
) {
  const chainId = hre.network.config.chainId || 31337;
  return lender.signMessage(
    ethers.getBytes(
      ethers.solidityPackedKeccak256(
        [
          'address',
          'uint256',
          'uint256',
          'address',
          'uint256',
          'uint32',
          'bool',
          'uint256',
          'address',
          'uint256',
          'uint256',
          'bytes32',
          'uint256',
        ],
        [
          loanERC20Denomination,
          loanPrincipalAmount,
          maximumRepaymentAmount,
          nftCollateralContract,
          nftCollateralId,
          loanDuration,
          isProRated,
          originationFee,
          signerContract,
          nonce,
          expiry,
          offerType,
          chainId,
        ],
      ),
    ),
  );
}

export type Signature = {
  signer: string;
  nonce: bigint;
  expiry: bigint;
};

export function getLenderRenegotiationSignature(
  lender: SignerWithAddress,
  _loanId: bigint,
  _newLoanDuration: bigint,
  _isProRata: boolean,
  _newMaximumRepaymentAmount: bigint,
  _renegotiationFee: bigint,
  _lenderNonce: bigint,
  expiry: bigint,
  loanContract: string,
) {
  const chainId = hre.network.config.chainId || 31337;
  return lender.signMessage(
    ethers.getBytes(
      ethers.solidityPackedKeccak256(
        ['uint256', 'uint32', 'bool', 'uint256', 'uint256', 'address', 'uint256', 'uint256', 'address', 'uint256'],
        [
          _loanId,
          _newLoanDuration,
          _isProRata,
          _newMaximumRepaymentAmount,
          _renegotiationFee,
          lender.address,
          _lenderNonce,
          expiry,
          loanContract,
          chainId,
        ],
      ),
    ),
  );
}

export function getTradeSignature(
  accepter: SignerWithAddress,
  _tradeERC20: string,
  _tradeNft: string,
  _nftId: bigint,
  _erc20Amount: bigint,
  _accepterNonce: bigint,
  _expiry: bigint,
) {
  const chainId = hre.network.config.chainId || 31337;
  return accepter.signMessage(
    ethers.getBytes(
      ethers.solidityPackedKeccak256(
        ['address', 'address', 'uint256', 'uint256', 'address', 'uint256', 'uint256', 'uint256'],
        [_tradeERC20, _tradeNft, _nftId, _erc20Amount, accepter.address, _accepterNonce, _expiry, chainId],
      ),
    ),
  );
}

export async function getProposalState(proposals: any, proposalId: any) {
  const state = await proposals.state(proposalId);
  let stateString;
  switch (state.toString()) {
    case '0':
      stateString = 'Pending';
      break;
    case '1':
      stateString = 'Active';
      break;
    case '2':
      stateString = 'Canceled';
      break;
    case '3':
      stateString = 'Defeated';
      break;
    case '4':
      stateString = 'Succeeded';
      break;
    case '5':
      stateString = 'Queued';
      break;
    case '6':
      stateString = 'Expired';
      break;
    case '7':
      stateString = 'Executed';
      break;
    default:
      stateString = 'Unknown';
      break;
  }
  return stateString;
}

export const buildPermitParams = async (
  chainId: bigint,
  token: string,
  revision: string,
  tokenName: string,
  owner: SignerWithAddress,
  spender: string,
  nonce: bigint,
  deadline: string,
  value: string,
) => {
  return ethers.Signature.from(
    await owner.signTypedData(
      {
        name: tokenName,
        version: revision,
        chainId: chainId,
        verifyingContract: token,
      },
      {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      {
        owner: owner.address,
        spender,
        value,
        nonce,
        deadline,
      },
    ),
  );
};
