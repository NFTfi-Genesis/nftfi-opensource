import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployContracts, NFTfiContracts } from './utils/deploy-contracts';
import { accountFixture, AccountFixture } from './utils/fixtures';
import { ADDRESS_ZERO, restoreSnapshot, takeSnapshot, toBytes32 } from './utils/utils';

describe('Deplyoment ownership transfer', function () {
  // const LOAN = loanData();
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
  let snapshot: number;

  before(async () => {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  describe('Test ownerships', () => {
    it('Owner address should own nftTypeRegistry contract', async () => {
      expect(await SC.nftTypeRegistry.owner()).to.eq(FXT.nftfiOwner.address);
    });
    it('Owner address should own permittedERC20s contract', async () => {
      expect(await SC.permittedERC20s.owner()).to.eq(FXT.nftfiOwner.address);
    });
    it('Owner address should own permittedNFTs contract', async () => {
      expect(await SC.permittedNFTs.owner()).to.eq(FXT.nftfiOwner.address);
    });
    it('Owner address should own nftfiFixed contract', async () => {
      expect(await SC.nftfiLoanOffer.owner()).to.eq(FXT.nftfiOwner.address);
    });
    it('Owner address should own loanRegistry contract', async () => {
      expect(await SC.loanRegistry.owner()).to.eq(FXT.nftfiOwner.address);
    });
    it('Owner address should own nftfiHub contract', async () => {
      expect(await SC.nftfiHub.owner()).to.eq(FXT.nftfiOwner.address);
    });
    it('Owner address should have admin role of obligationReceipt', async () => {
      expect(await SC.obligationReceipt.hasRole(toBytes32(''), FXT.nftfiOwner.address)).to.be.true;
    });
    it('Owner address should have base URI role of obligationReceipt', async () => {
      expect(
        await SC.obligationReceipt.hasRole(
          ethers.solidityPackedKeccak256(['string'], ['BASE_URI_ROLE']),
          FXT.nftfiOwner.address,
        ),
      ).to.be.true;
    });
    it('Owner address should have admin role of promissoryNote', async () => {
      expect(await SC.promissoryNote.hasRole(toBytes32(''), FXT.nftfiOwner.address)).to.be.true;
    });
    it('Owner address should have base URI role of promissoryNote', async () => {
      expect(
        await SC.promissoryNote.hasRole(
          ethers.solidityPackedKeccak256(['string'], ['BASE_URI_ROLE']),
          FXT.nftfiOwner.address,
        ),
      ).to.be.true;
    });
  });

  describe('Test deployer has no ownership rights', () => {
    it('deployer should have no rights to drain airdrop from escrow', async () => {
      await expect(
        SC.escrow.connect(FXT.nftfiDeployer).drainERC20Airdrop(ADDRESS_ZERO, 1, FXT.anyone.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(
        SC.escrow.connect(FXT.nftfiDeployer).drainNFT('ERC721', ADDRESS_ZERO, 0, FXT.anyone.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('deployer should not be able to call pause loan', async () => {
      expect(await SC.nftfiLoanOffer.paused()).to.eq(false);
      await expect(SC.nftfiLoanOffer.connect(FXT.nftfiDeployer).pause()).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
      expect(await SC.nftfiLoanOffer.paused()).to.eq(false);
    });
    it('deployer should not be able to call unpause loan', async () => {
      await SC.nftfiLoanOffer.connect(FXT.nftfiOwner).pause();
      expect(await SC.nftfiLoanOffer.paused()).to.eq(true);
      await expect(SC.nftfiLoanOffer.connect(FXT.nftfiDeployer).unpause()).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
      expect(await SC.nftfiLoanOffer.paused()).to.eq(true);
    });
    it('deployer should not be able to call updateAdminFee on loan', async () => {
      await expect(SC.nftfiLoanOffer.connect(FXT.nftfiDeployer).updateAdminFee(10)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('deployer should not be able to call updateMaximumLoanDuration on loan', async () => {
      await expect(SC.nftfiLoanOffer.connect(FXT.nftfiDeployer).updateMaximumLoanDuration(10)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('deployer should not be able to call registerOfferType on loanRegistry', async () => {
      await expect(
        SC.loanRegistry.connect(FXT.nftfiDeployer).registerOfferType('TEST_TYPE', ADDRESS_ZERO),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('deployer should not be able to call registerOfferTypes  on loanRegistry', async () => {
      await expect(
        SC.loanRegistry
          .connect(FXT.nftfiDeployer)
          .registerOfferTypes([toBytes32('TEST_TYPE'), toBytes32('TEST_TYPE2')], [ADDRESS_ZERO, ADDRESS_ZERO]),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('deployer should not be able to call setContract on hub', async () => {
      await expect(
        SC.nftfiHub.connect(FXT.nftfiDeployer).setContract(toBytes32('TEST_TYPE'), ADDRESS_ZERO),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('deployer should not be able to call setContracts on hub', async () => {
      await expect(
        SC.nftfiHub.connect(FXT.nftfiDeployer).setContracts(['TEST_TYPE', 'TEST_TYPE2'], [ADDRESS_ZERO, ADDRESS_ZERO]),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('deployer should not be able to call setNftType on nftTypeRegistry', async () => {
      await expect(
        SC.nftTypeRegistry.connect(FXT.nftfiDeployer).setNftType(toBytes32('TEST_TYPE'), ADDRESS_ZERO),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('deployer should not be able to call setNftTypes on nftTypeRegistry', async () => {
      await expect(
        SC.nftTypeRegistry
          .connect(FXT.nftfiDeployer)
          .setNftTypes([toBytes32('TEST_TYPE'), toBytes32('TEST_TYPE2')], [ADDRESS_ZERO, ADDRESS_ZERO]),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('deployer should not be able to call setERC20Permit on permittedERC20s', async () => {
      await expect(SC.permittedERC20s.connect(FXT.nftfiDeployer).setERC20Permit(ADDRESS_ZERO, true)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('deployer should not be able to call setERC20Permits on permittedERC20s', async () => {
      await expect(
        SC.permittedERC20s.connect(FXT.nftfiDeployer).setERC20Permits([ADDRESS_ZERO, ADDRESS_ZERO], [true, true]),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('deployer should not be able to call setNFTPermits on permittedNFTs', async () => {
      await expect(
        SC.permittedNFTs
          .connect(FXT.nftfiDeployer)
          .setNFTPermits([ADDRESS_ZERO, ADDRESS_ZERO], ['NFT_TYPE', 'NFT_TYPE']),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});
