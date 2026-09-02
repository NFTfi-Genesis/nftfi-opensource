import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { daysToSeconds } from './utils';

export type AccountFixture = {
  nftfiDeployer: SignerWithAddress;
  nftfiOwner: SignerWithAddress;
  borrower: SignerWithAddress;
  lender: SignerWithAddress;
  borrower2: SignerWithAddress;
  lender2: SignerWithAddress;
  arb: SignerWithAddress;
  voter1: SignerWithAddress;
  voter2: SignerWithAddress;
  voter3: SignerWithAddress;
  partner: SignerWithAddress;
  anyone: SignerWithAddress;
};

export function accountFixture(accounts: SignerWithAddress[]) {
  return {
    nftfiDeployer: accounts[0],
    nftfiOwner: accounts[1],
    borrower: accounts[2],
    lender: accounts[3],
    borrower2: accounts[4],
    lender2: accounts[5],
    arb: accounts[6],
    voter1: accounts[7],
    voter2: accounts[8],
    voter3: accounts[9],
    partner: accounts[11],
    anyone: accounts[12],
  };
}

export function loanData() {
  return {
    adminFeeInBasisPoints: 500n,
    borrowerAndLenderNonces: [1n, 1n],
  };
}

// Example fixed loan
export function fixedLoan() {
  return {
    principal: 100n * factorX,
    repayment: 150n * factorX,
    duration: daysToSeconds(7n),
    isProRata: false,
  };
}

// Example pro-rated loan
export function proRatedLoan() {
  return {
    principal: 100n * factorX,
    repayment: 105n * factorX, // 5% interest
    duration: BigInt(daysToSeconds(7n)),
    interestRateForDurationInBasisPoints: 500n, // 5%
    isProRata: true,
  };
}

export const factorX = 10000n;
export const max32bit = 4294967295n;
