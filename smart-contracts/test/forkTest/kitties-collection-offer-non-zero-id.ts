import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployContracts, NFTfiContracts } from '../utils/deploy-contracts';
import { accountFixture, AccountFixture, factorX, fixedLoan } from '../utils/fixtures';
import { mintAndApproveERC20 } from '../utils/tokens';
import {
  currentTime,
  daysToSeconds,
  getLenderSignature,
  getLenderSignatureWithIdRange,
  restoreSnapshot,
  takeSnapshot,
} from '../utils/utils';
import { ICryptoKitties } from '../../typechain/contracts/interfaces';

describe('Collection Offer', function () {
  let accounts: SignerWithAddress[]; // Test accounts
  let SC: NFTfiContracts; // Smart Contracts
  let FXT: AccountFixture; // account fixtures
  let snapshot: number;
  const LOAN_FXT = fixedLoan();

  let kittiesContract: ICryptoKitties;
  const kittyId = 1;

  let lenderSig: string;
  let sigExpiry: bigint;

  const offerType = ethers.encodeBytes32String('COLLECTION_OFFER_LOAN');
  const cryptoKittiesAddress = '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d';

  before(async () => {
    accounts = await ethers.getSigners();
    FXT = accountFixture(accounts);
    SC = await deployContracts(FXT.nftfiOwner);

    await SC.permittedNFTs.connect(FXT.nftfiOwner).setNFTPermit(cryptoKittiesAddress, 'CryptoKitties');
    await SC.permittedNFTs
      .connect(FXT.nftfiOwner)
      .setNftType('CryptoKitties', await ethers.getContract('CryptoKittiesWrapper'));

    kittiesContract = (await ethers.getContractAt('ICryptoKitties', cryptoKittiesAddress)) as ICryptoKitties;
    const kittyOwner = await ethers.getImpersonatedSigner(await kittiesContract.ownerOf(1));

    await kittiesContract.connect(kittyOwner).transfer(FXT.borrower.address, kittyId);

    await mintAndApproveERC20(SC.erc20, FXT.lender, 1000n * factorX, await SC.erc20TransferManager.getAddress());
    await mintAndApproveERC20(SC.erc20, FXT.borrower, 500n * factorX, await SC.erc20TransferManager.getAddress());

    await mintAndApproveERC20(SC.erc20, FXT.anyone, 1000n * factorX, await SC.erc20TransferManager.getAddress());

    const now = await currentTime();
    sigExpiry = now + daysToSeconds(10n);
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  it('Zero nft id should work fine and Kitty is transfered', async () => {
    lenderSig = await getLenderSignature(
      FXT.lender,
      LOAN_FXT.principal,
      LOAN_FXT.isProRata,
      LOAN_FXT.repayment,
      0n, //nft.id should be 0 in signature for collection offers
      LOAN_FXT.duration,
      0n,
      cryptoKittiesAddress,
      await SC.erc20.getAddress(),
      sigExpiry,
      offerType,
      0n,
    );

    await kittiesContract.connect(FXT.borrower).approve(await SC.escrow.getAddress(), 1);
    await SC.erc20.connect(FXT.lender).approve(await SC.erc20TransferManager.getAddress(), LOAN_FXT.principal);

    await SC.nftfiCollectionOffer.connect(FXT.borrower).acceptCollectionOffer(
      {
        loanERC20Denomination: await SC.erc20.getAddress(),
        loanPrincipalAmount: LOAN_FXT.principal,
        maximumRepaymentAmount: LOAN_FXT.repayment,
        nftCollateralContract: cryptoKittiesAddress,
        nftCollateralId: kittyId,
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

    expect(await kittiesContract.ownerOf(kittyId)).equal(await SC.escrow.getAddress());
  });

  it('Zero nft id should work fine with id range', async () => {
    const minIdRange = 1n;
    const maxIdRange = 14n;

    lenderSig = await getLenderSignatureWithIdRange(
      FXT.lender,
      LOAN_FXT.principal,
      LOAN_FXT.isProRata,
      LOAN_FXT.repayment,
      0n, //nft.id should be 0 in signature for collection offers
      minIdRange,
      maxIdRange,
      LOAN_FXT.duration,
      0n,
      cryptoKittiesAddress,
      await SC.erc20.getAddress(),
      sigExpiry,
      offerType,
      0n,
    );

    await kittiesContract.connect(FXT.borrower).approve(await SC.escrow.getAddress(), 1);
    await SC.erc20.connect(FXT.lender).approve(await SC.erc20TransferManager.getAddress(), LOAN_FXT.principal);

    await SC.nftfiCollectionOffer.connect(FXT.borrower).acceptCollectionOfferWithIdRange(
      {
        loanERC20Denomination: await SC.erc20.getAddress(),
        loanPrincipalAmount: LOAN_FXT.principal,
        maximumRepaymentAmount: LOAN_FXT.repayment,
        nftCollateralContract: cryptoKittiesAddress,
        nftCollateralId: kittyId,
        loanDuration: LOAN_FXT.duration,
        isProRata: LOAN_FXT.isProRata,
        originationFee: 0n,
      },
      {
        minId: minIdRange,
        maxId: maxIdRange,
      },
      {
        signer: FXT.lender.address,
        nonce: 0,
        expiry: sigExpiry,
        signature: lenderSig,
      },
    );

    expect(await kittiesContract.ownerOf(kittyId)).equal(await SC.escrow.getAddress());
  });
});
