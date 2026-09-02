import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { deployContracts, NFTfiContracts } from '../utils/deploy-contracts';
import { accountFixture, AccountFixture, factorX, fixedLoan } from '../utils/fixtures';
import { mintAndApproveERC20, mintAndApproveNFT, mintAndApprove1155 } from '../utils/tokens';
import {
  currentTime,
  daysToSeconds,
  getLenderSignature,
  restoreSnapshot,
  selectEvent,
  takeSnapshot,
  advanceTime,
} from '../utils/utils';
import { expect } from 'chai';
import { IDelegateRegistry } from '../../typechain';

describe('Delegate Cash', function () {
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
  let snapshot: number;
  let nft: any;
  const erc1155NftId = 0;
  let loanId: any;
  const LOAN_FXT = fixedLoan();
  let lenderSig: string;
  let sigExpiry: bigint;
  let delegateCashContract: IDelegateRegistry;

  const offerTypeKey = 'ASSET_OFFER_LOAN';
  const offerType = ethers.encodeBytes32String('ASSET_OFFER_LOAN');

  before(async () => {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);

    delegateCashContract = await ethers.getContractAt(
      'IDelegateRegistry',
      '0x00000000000000447e69651d841bd8d104bed493',
    );

    await SC.escrow.connect(FXT.nftfiOwner).addPlugin(await SC.delegateCashPlugin.getAddress());
    await SC.delegateCashPlugin.connect(FXT.nftfiOwner).unpause();
  });

  describe('Global Escrow', function () {
    before(async () => {
      nft = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());

      await mintAndApprove1155(SC.testERC1155, FXT.borrower, await SC.escrow.getAddress(), BigInt(erc1155NftId));

      await mintAndApproveERC20(SC.erc20, FXT.lender, 1000n * factorX, await SC.erc20TransferManager.getAddress());
      await mintAndApproveERC20(SC.erc20, FXT.borrower, 500n * factorX, await SC.erc20TransferManager.getAddress());

      await mintAndApproveERC20(SC.erc20, FXT.anyone, 1000n * factorX, await SC.erc20TransferManager.getAddress());

      const now = await currentTime();
      sigExpiry = now + daysToSeconds(10n);

      lenderSig = await getLenderSignature(
        FXT.lender,
        LOAN_FXT.principal,
        LOAN_FXT.isProRata,
        LOAN_FXT.repayment,
        nft.id,
        LOAN_FXT.duration,
        0n,
        await SC.nft.getAddress(),
        await SC.erc20.getAddress(),
        sigExpiry,
        offerType,
        0n,
      );

      const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0n,
        },
        {
          signer: FXT.lender.address,
          nonce: 0,
          expiry: sigExpiry,
          signature: lenderSig,
        },
      );

      await loanTx.wait();
      const loanStartedEvent = await selectEvent(loanTx, SC.nftfiLoanOffer, 'LoanStarted');
      loanId = loanStartedEvent?.args?.loanId;
    });

    beforeEach(async () => {
      snapshot = await takeSnapshot();
    });

    afterEach(async () => {
      await restoreSnapshot(snapshot);
      snapshot = await takeSnapshot();
    });

    describe('ERC721 delegation', function () {
      it("shouldn't allow delegate nft because offer key is wrong", async () => {
        const rights = ethers.keccak256(Buffer.from('ERC20_CLAIM'));

        await expect(
          SC.delegateCashPlugin.delegateERC721(
            loanId,
            'WRONG_KEY',
            ethers.ZeroAddress,
            await SC.nft.getAddress(),
            nft.id,
            rights,
          ),
        ).to.be.revertedWithCustomError(SC.delegateCashPlugin, 'WrongOfferLoan');
      });

      it("shouldn't allow delegate nft because obligation receipt exists", async () => {
        const rights = ethers.keccak256(Buffer.from('ERC20_CLAIM'));
        await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);

        await expect(
          SC.delegateCashPlugin.delegateERC721(
            loanId,
            offerTypeKey,
            ethers.ZeroAddress,
            await SC.nft.getAddress(),
            nft.id,
            rights,
          ),
        ).to.be.revertedWithCustomError(SC.delegateCashPlugin, 'ObligationReceiptExists');
      });

      it("shouldn't allow delegate nft because caller is not a borrower", async () => {
        const rights = ethers.keccak256(Buffer.from('ERC20_CLAIM'));

        await expect(
          SC.delegateCashPlugin.delegateERC721(
            loanId,
            offerTypeKey,
            ethers.ZeroAddress,
            await SC.nft.getAddress(),
            nft.id,
            rights,
          ),
        ).to.be.revertedWithCustomError(SC.delegateCashPlugin, 'CallerIsNotBorrower');
      });

      it('should delegate nft to another address and check the state', async () => {
        const delegatedWallet = ethers.Wallet.createRandom();
        const rights = ethers.keccak256(Buffer.from('ERC20_CLAIM'));

        await SC.delegateCashPlugin
          .connect(FXT.borrower)
          .delegateERC721(loanId, offerTypeKey, delegatedWallet.address, await SC.nft.getAddress(), nft.id, rights);

        const delegationSettings = await SC.delegateCashPlugin.getDelegationSettings(loanId);
        expect(delegationSettings.to).to.be.equal(delegatedWallet.address);
        expect(delegationSettings.rights).to.be.equal(rights);
        expect(delegationSettings.isERC721).to.be.equal(true);

        expect(
          await delegateCashContract.checkDelegateForERC721(
            delegatedWallet.address,
            await SC.escrow.getAddress(),
            await SC.nft.getAddress(),
            0,
            rights,
          ),
        ).to.equal(true);
      });

      it("shouldn't allow undelegate nft and be reverted", async () => {
        const delegatedWallet = ethers.Wallet.createRandom();
        const rights = ethers.keccak256(Buffer.from('ERC20_CLAIM'));

        await SC.delegateCashPlugin
          .connect(FXT.borrower)
          .delegateERC721(loanId, offerTypeKey, delegatedWallet.address, await SC.nft.getAddress(), nft.id, rights);

        await expect(
          SC.delegateCashPlugin.connect(FXT.borrower).undelegateERC721(loanId),
        ).to.be.revertedWithCustomError(SC.delegateCashPlugin, 'OnlyLoanContract');
      });

      it('should be reverted when calling undelegate directly', async () => {
        await expect(SC.delegateCashPlugin.connect(FXT.borrower).undelegateERC721(1)).to.be.revertedWithCustomError(
          SC.delegateCashPlugin,
          'OnlyLoanContract',
        );
      });

      it('should delegate nft, try to repay successfully and check the state', async () => {
        const delegatedWallet = ethers.Wallet.createRandom();
        const rights = ethers.keccak256(Buffer.from('ERC20_CLAIM'));

        await SC.delegateCashPlugin
          .connect(FXT.borrower)
          .delegateERC721(loanId, offerTypeKey, delegatedWallet.address, await SC.nft.getAddress(), nft.id, rights);

        await advanceTime(daysToSeconds(5n));
        await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoan(loanId);

        const delegationSettings = await SC.delegateCashPlugin.getDelegationSettings(loanId);
        expect(delegationSettings.to).to.be.equal(ethers.ZeroAddress);
        expect(delegationSettings.isERC721).to.be.equal(false);

        expect(
          await delegateCashContract.checkDelegateForERC721(
            delegatedWallet.address,
            await SC.escrow.getAddress(),
            await SC.nft.getAddress(),
            0,
            rights,
          ),
        ).to.equal(false);
      });

      it('should delegate nft, try liquidate and be revered because collateral is delegated', async () => {
        const delegatedWallet = ethers.Wallet.createRandom();
        const rights = ethers.keccak256(Buffer.from('ERC20_CLAIM'));

        await SC.delegateCashPlugin
          .connect(FXT.borrower)
          .delegateERC721(loanId, offerTypeKey, delegatedWallet.address, await SC.nft.getAddress(), nft.id, rights);
        await advanceTime(LOAN_FXT.duration + 1n);

        await SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(loanId);
      });

      it('should delegate nft, try liquidate and be revered because collateral is delegated', async () => {
        const delegatedWallet = ethers.Wallet.createRandom();
        const rights = ethers.keccak256(Buffer.from('ERC20_CLAIM'));

        await SC.delegateCashPlugin
          .connect(FXT.borrower)
          .delegateERC721(loanId, offerTypeKey, delegatedWallet.address, await SC.nft.getAddress(), nft.id, rights);

        const delegationSettings = await SC.delegateCashPlugin.getDelegationSettings(loanId);
        expect(delegationSettings.to).to.be.equal(delegatedWallet.address);
        expect(delegationSettings.isERC721).to.be.equal(true);

        await SC.nftfiLoanOffer.connect(FXT.borrower).mintObligationReceipt(loanId);
        const delegationSettingsAfterMintingOR = await SC.delegateCashPlugin.getDelegationSettings(loanId);
        expect(delegationSettingsAfterMintingOR.to).to.be.equal(ethers.ZeroAddress);
        expect(delegationSettingsAfterMintingOR.isERC721).to.be.equal(false);
      });

      it('should liquidate and try to delegate nft with the liquidated loanId and revert', async () => {
        const delegatedWallet = ethers.Wallet.createRandom();
        const rights = ethers.keccak256(Buffer.from('ERC20_CLAIM'));

        await SC.delegateCashPlugin
          .connect(FXT.borrower)
          .delegateERC721(loanId, offerTypeKey, delegatedWallet.address, await SC.nft.getAddress(), nft.id, rights);
        await advanceTime(LOAN_FXT.duration + 1n);

        await SC.nftfiLoanOffer.connect(FXT.lender).liquidateOverdueLoan(loanId);

        await expect(
          SC.delegateCashPlugin
            .connect(FXT.borrower)
            .delegateERC721(loanId, offerTypeKey, delegatedWallet.address, await SC.nft.getAddress(), nft.id, rights),
        ).to.be.revertedWithCustomError(SC.delegateCashPlugin, 'LoanAlreadyRepaidOrLiquidated');
      });

      it('should override previous delegation and undelegate', async () => {
        const delegatedWallet = ethers.Wallet.createRandom();
        const rights = ethers.keccak256(Buffer.from('ERC20_CLAIM'));

        await SC.delegateCashPlugin
          .connect(FXT.borrower)
          .delegateERC721(loanId, offerTypeKey, delegatedWallet.address, await SC.nft.getAddress(), nft.id, rights);

        const delegationSettings = await SC.delegateCashPlugin.getDelegationSettings(loanId);
        expect(delegationSettings.to).to.be.equal(delegatedWallet.address);
        expect(delegationSettings.rights).to.be.equal(rights);
        expect(delegationSettings.isERC721).to.be.equal(true);

        expect(
          await delegateCashContract.checkDelegateForERC721(
            delegatedWallet.address,
            await SC.escrow.getAddress(),
            await SC.nft.getAddress(),
            0,
            rights,
          ),
        ).to.equal(true);

        const newRights = ethers.keccak256(Buffer.from('ERC721_CLAIM'));
        await SC.delegateCashPlugin
          .connect(FXT.borrower)
          .delegateERC721(loanId, offerTypeKey, delegatedWallet.address, await SC.nft.getAddress(), nft.id, newRights);

        const delegationSettingsNew = await SC.delegateCashPlugin.getDelegationSettings(loanId);
        expect(delegationSettingsNew.to).to.be.equal(delegatedWallet.address);
        expect(delegationSettingsNew.rights).to.be.equal(newRights);
        expect(delegationSettingsNew.isERC721).to.be.equal(true);

        expect(
          await delegateCashContract.checkDelegateForERC721(
            delegatedWallet.address,
            await SC.escrow.getAddress(),
            await SC.nft.getAddress(),
            0,
            rights,
          ),
        ).to.equal(false);
      });
    });
  });
});
