import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERC721PresetMinterPauserAutoId, TestERC1155, TestRealsies } from '../typechain';
import { deployContracts, NFTfiContracts } from './utils/deploy-contracts';
import { accountFixture, AccountFixture, factorX, fixedLoan } from './utils/fixtures';
import { mintAndApprove1155, mintAndApproveERC20, mintAndApproveNFT } from './utils/tokens';
import {
  ADDRESS_ZERO,
  advanceTime,
  assertBalanceChange,
  assertERC1155BalanceOf,
  assertTokenOwner,
  currentTime,
  daysToSeconds,
  getLenderSignature,
  restoreSnapshot,
  selectEvent,
  takeSnapshot,
} from './utils/utils';

describe('Airdrop drain test', function () {
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
  let snapshot: number;
  let nft: any;
  let erc1155id: bigint;
  const LOAN_FXT = fixedLoan();
  let lenderSig: string;
  let erc1155lenderSig: string;
  let sigExpiry: bigint;
  let erc20Airdrop: TestRealsies;
  let erc721Airdrop: ERC721PresetMinterPauserAutoId;
  let erc1155Airdrop: TestERC1155;
  let erc721AirdropNft: any;
  let erc721AccidentalNftinLoan: any;

  const offerType = ethers.encodeBytes32String('ASSET_OFFER_LOAN');

  let loanId: any;
  let loanId2: any;

  before(async () => {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);

    const ERC20Airdrop = await ethers.getContractFactory('TestRealsies');
    erc20Airdrop = (await ERC20Airdrop.connect(FXT.nftfiOwner).deploy()) as TestRealsies;

    const ERC721Airdrop = await ethers.getContractFactory('TestGaspMasks');
    erc721Airdrop = (await ERC721Airdrop.connect(FXT.nftfiOwner).deploy()) as ERC721PresetMinterPauserAutoId;

    const ERC1155Airdrop = await ethers.getContractFactory('TestERC1155');
    erc1155Airdrop = (await ERC1155Airdrop.connect(FXT.nftfiOwner).deploy()) as TestERC1155;

    nft = await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    erc1155id = 1n;
    await mintAndApprove1155(SC.testERC1155, FXT.borrower, await SC.escrow.getAddress(), erc1155id);
    await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    await mintAndApproveNFT(SC.nft, FXT.borrower, await SC.escrow.getAddress());
    await mintAndApproveERC20(SC.erc20, FXT.lender, 1000n * factorX, await SC.erc20TransferManager.getAddress());
    await mintAndApproveERC20(SC.erc20, FXT.borrower, 500n * factorX, await SC.erc20TransferManager.getAddress());

    await mintAndApproveERC20(erc20Airdrop, FXT.anyone, 1000n * factorX, await SC.escrow.getAddress());
    erc721AirdropNft = await mintAndApproveNFT(erc721Airdrop, FXT.anyone, await SC.escrow.getAddress());
    erc721AccidentalNftinLoan = await mintAndApproveNFT(
      erc721Airdrop,
      FXT.anyone,
      await SC.nftfiLoanOffer.getAddress(),
    );
    await mintAndApprove1155(erc1155Airdrop, FXT.anyone, await SC.escrow.getAddress(), 0n);

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

    erc1155lenderSig = await getLenderSignature(
      FXT.lender,
      LOAN_FXT.principal,
      LOAN_FXT.isProRata,
      LOAN_FXT.repayment,
      erc1155id,
      LOAN_FXT.duration,
      1n,
      await SC.testERC1155.getAddress(),
      await SC.erc20.getAddress(),
      sigExpiry,
      offerType,
      0n,
    );
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  describe('Drain tokens', () => {
    beforeEach(async () => {
      // BEGIN LOAN .............................................................
      const loanTx = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.nft.getAddress(),
          nftCollateralId: nft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
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

      const loanTx2 = await SC.nftfiLoanOffer.connect(FXT.borrower).acceptOffer(
        {
          loanERC20Denomination: await SC.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SC.testERC1155.getAddress(),
          nftCollateralId: erc1155id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
        },
        {
          signer: FXT.lender.address,
          nonce: 1,
          expiry: sigExpiry,
          signature: erc1155lenderSig,
        },
      );

      await loanTx2.wait();
      const loanStartedEvent2 = await selectEvent(loanTx2, SC.nftfiLoanOffer, 'LoanStarted');
      loanId2 = loanStartedEvent2?.args?.loanId;

      await erc20Airdrop.connect(FXT.anyone).transfer(await SC.escrow.getAddress(), 1000);
      await erc721Airdrop
        .connect(FXT.anyone)
        .transferFrom(FXT.anyone.address, await SC.escrow.getAddress(), erc721AirdropNft.id);
      await erc721Airdrop
        .connect(FXT.anyone)
        .transferFrom(FXT.anyone.address, await SC.nftfiLoanOffer.getAddress(), erc721AccidentalNftinLoan.id);
      await erc1155Airdrop
        .connect(FXT.anyone)
        .safeTransferFrom(FXT.anyone.address, await SC.escrow.getAddress(), 0, 1, '0x');
    });

    it('should revert when trying to drain nft', async () => {
      await expect(
        SC.escrow
          .connect(FXT.nftfiOwner)
          .drainERC20Airdrop(await SC.testERC1155.getAddress(), erc1155id, FXT.nftfiOwner.address),
      ).to.be.revertedWithCustomError(SC.escrow, 'TokenIsCollateral');
    });

    it('should drain erc20 successfully', async () => {
      const nftfiErc20AirdropBalance = await erc20Airdrop.balanceOf(FXT.nftfiOwner.address);
      const nftfiErc20AirdropBalanceOnContract = await erc20Airdrop.balanceOf(await SC.escrow.getAddress());
      await SC.escrow
        .connect(FXT.nftfiOwner)
        .drainERC20Airdrop(await erc20Airdrop.getAddress(), nftfiErc20AirdropBalanceOnContract, FXT.nftfiOwner.address);
      await assertBalanceChange(
        'NFTfi should have received the erc20 airdrop',
        erc20Airdrop,
        FXT.nftfiOwner.address,
        nftfiErc20AirdropBalance,
        1000n,
      );
    });

    it('should drain erc721 successfully', async () => {
      await SC.escrow
        .connect(FXT.nftfiOwner)
        .drainNFT('ERC721', await erc721Airdrop.getAddress(), erc721AirdropNft.id, FXT.nftfiOwner.address);
      await assertTokenOwner(
        'NFTfi should have received the erc721 airdrop',
        erc721Airdrop,
        erc721AirdropNft.id,
        FXT.nftfiOwner.address,
      );
    });

    it('should drain accidental nft from loan successfully', async () => {
      await SC.nftfiLoanOffer
        .connect(FXT.nftfiOwner)
        .drainNFT('ERC721', await erc721Airdrop.getAddress(), erc721AccidentalNftinLoan.id, FXT.nftfiOwner.address);
      await assertTokenOwner(
        'NFTfi should have received the erc721 airdrop',
        erc721Airdrop,
        erc721AccidentalNftinLoan.id,
        FXT.nftfiOwner.address,
      );
    });

    it('should drain erc1155 successfully', async () => {
      await SC.escrow
        .connect(FXT.nftfiOwner)
        .drainNFT('ERC1155', await erc1155Airdrop.getAddress(), 0, FXT.nftfiOwner.address);
      await assertERC1155BalanceOf(
        'NFTfi should have received the erc1155 airdrop',
        erc1155Airdrop,
        '0',
        FXT.nftfiOwner.address,
        1n,
      );
    });

    it('should drain erc721 successfully', async () => {
      await SC.escrow
        .connect(FXT.nftfiOwner)
        .drainNFT('ERC721', await erc721Airdrop.getAddress(), erc721AirdropNft.id, FXT.nftfiOwner.address);
      await assertTokenOwner(
        'NFTfi should have received the erc721 airdrop',
        erc721Airdrop,
        erc721AirdropNft.id,
        FXT.nftfiOwner.address,
      );
    });

    it('should drain erc1155 successfully', async () => {
      await SC.escrow
        .connect(FXT.nftfiOwner)
        .drainNFT('ERC1155', await erc1155Airdrop.getAddress(), 0, FXT.nftfiOwner.address);
      await assertERC1155BalanceOf(
        'NFTfi should have received the erc1155 airdrop',
        erc1155Airdrop,
        '0',
        FXT.nftfiOwner.address,
        1n,
      );
    });

    it('should throw when trying to drain the erc721 collateral token', async () => {
      await expect(
        SC.escrow.connect(FXT.nftfiOwner).drainNFT('ERC721', await SC.nft.getAddress(), nft.id, FXT.nftfiOwner.address),
      ).to.be.revertedWithCustomError(SC.nftfiLoanOffer, 'TokenIsCollateral');
    });

    it('should throw when trying to drain the erc1155 collateral token', async () => {
      await expect(
        SC.escrow
          .connect(FXT.nftfiOwner)
          .drainNFT('ERC1155', await SC.testERC1155.getAddress(), erc1155id, FXT.nftfiOwner.address),
      ).to.be.revertedWithCustomError(SC.nftfiLoanOffer, 'TokenIsCollateral');
    });

    it('should throw when anyone besides the owner is trying to drain', async () => {
      await expect(
        SC.escrow.connect(FXT.anyone).drainERC20Airdrop(await erc20Airdrop.getAddress(), 1, FXT.nftfiOwner.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(
        SC.escrow
          .connect(FXT.anyone)
          .drainNFT('ERC721', await erc721Airdrop.getAddress(), erc721AirdropNft.id, FXT.nftfiOwner.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(
        SC.escrow.connect(FXT.anyone).drainNFT('ERC1155', await erc1155Airdrop.getAddress(), 0, FXT.nftfiOwner.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    describe('drain erc20 (the one used in the loan) with some TokensInEscrow (usdc blacklist feature)', async () => {
      let escrowedAmount: bigint;
      let escrowedAmount2: bigint;
      let airdropAmount: bigint;
      beforeEach(async () => {
        await mintAndApproveERC20(SC.erc20, FXT.lender, 10000n * factorX, await SC.erc20TransferManager.getAddress());
        await mintAndApproveERC20(SC.erc20, FXT.borrower, 500n * factorX, await SC.erc20TransferManager.getAddress());
        airdropAmount = await mintAndApproveERC20(
          SC.erc20,
          FXT.anyone,
          1000n * factorX,
          await SC.erc20TransferManager.getAddress(),
        );
        await SC.erc20.connect(FXT.anyone).transfer(await SC.erc20TransferManager.getAddress(), airdropAmount);

        // lender gets blacklisted
        await SC.erc20.connect(FXT.nftfiOwner).blacklist(FXT.lender.address);

        // REPAY LOAN .............................................................
        await advanceTime(daysToSeconds(5n));
        const repayTx = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoanSafe(loanId);
        const loanRepaidEvent = await selectEvent(repayTx, SC.nftfiLoanOffer, 'LoanRepaid');
        const adminFee = loanRepaidEvent?.args?.adminFee;

        escrowedAmount = LOAN_FXT.repayment - adminFee;

        const repayTx2 = await SC.nftfiLoanOffer.connect(FXT.borrower).payBackLoanSafe(loanId2);
        const loanRepaidEvent2 = await selectEvent(repayTx2, SC.nftfiLoanOffer, 'LoanRepaid');
        const adminFee2 = loanRepaidEvent2?.args?.adminFee;

        escrowedAmount2 = LOAN_FXT.repayment - adminFee2;
      });

      it('should drain airdrop amount erc20 successfully', async () => {
        await SC.erc20TransferManager
          .connect(FXT.nftfiOwner)
          .drainERC20Airdrop(await SC.erc20.getAddress(), airdropAmount, FXT.nftfiOwner.address);
        expect(await SC.erc20.balanceOf(await SC.erc20TransferManager.getAddress())).to.be.greaterThanOrEqual(
          escrowedAmount + escrowedAmount2,
          'reamining erc20 should cover escrowed amounts',
        );
      });

      it('shouldnt allow to drain any from escrowed amounts', async () => {
        const erc20BalanceInContract = await SC.erc20.balanceOf(await SC.erc20TransferManager.getAddress());
        const tooMuchToDrain = erc20BalanceInContract - escrowedAmount - escrowedAmount2 + 1n;
        await expect(
          SC.erc20TransferManager
            .connect(FXT.nftfiOwner)
            .drainERC20Airdrop(await SC.erc20.getAddress(), tooMuchToDrain, FXT.nftfiOwner.address),
        ).to.be.revertedWithCustomError(SC.erc20TransferManager, 'TokensInEscrow');
      });
    });
  });
});
