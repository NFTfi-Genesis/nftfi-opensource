import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployContracts, NFTfiContracts } from './utils/deploy-contracts';
import { AccountFixture, accountFixture, factorX } from './utils/fixtures';
import { mintERC20 } from './utils/tokens';

describe('Realsies', function () {
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures

  before(async function () {
    accounts = await ethers.getSigners();

    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);
  });

  it('ERC20 token should be able to mint tokens and set allowances', async function () {
    // mint tokens for account
    const accountBalance = await mintERC20(SC.erc20, FXT.arb.address, 1000n * factorX);
    const supply = await SC.erc20.totalSupply();
    expect(supply, 'Total supply is wrong').to.eq(accountBalance);

    // account gives NFTFI an ERC20 allowance
    await SC.erc20.connect(FXT.arb).approve(await SC.nftfiLoanOffer.getAddress(), 2000n * factorX);
    const allowance = await SC.erc20.allowance(FXT.arb.address, await SC.nftfiLoanOffer.getAddress());
    expect(allowance, 'Allowance != Approved amount').to.eq(2000n * factorX);
  });
});
