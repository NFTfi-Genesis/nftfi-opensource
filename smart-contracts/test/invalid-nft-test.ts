import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployContracts, NFTfiContracts } from './utils/deploy-contracts';
import { deployNonPermittedNFT } from './utils/deploy-non-permitted-nft';
import { accountFixture, AccountFixture, factorX, fixedLoan } from './utils/fixtures';
import { mintAndApproveERC20, mintAndApproveNFT } from './utils/tokens';
import { ADDRESS_ZERO, currentTime, daysToSeconds, getLenderSignature } from './utils/utils';

describe('Invalid NFT', function () {
  const LOAN_FXT = fixedLoan();
  let accounts: SignerWithAddress[]; // Test accounts
  let SmartContracts: NFTfiContracts; // Smart Contracts
  let SmartContractsInvalidNFT: NFTfiContracts; // Smart Contracts
  let Fixture: AccountFixture; // account fixtures
  let nft: any;
  let invalidNft: any;
  let lenderSig: string;
  let sigExpiry: bigint;

  const offerType = ethers.encodeBytes32String('ASSET_OFFER_LOAN');

  before(async function () {
    accounts = await ethers.getSigners();
    Fixture = accountFixture(accounts);
    SmartContracts = await deployContracts(Fixture.nftfiOwner);
    SmartContractsInvalidNFT = await deployContracts(Fixture.nftfiOwner);
    SmartContractsInvalidNFT = await deployNonPermittedNFT(Fixture.nftfiOwner, SmartContracts);

    nft = await mintAndApproveNFT(SmartContracts.nft, Fixture.borrower, await SmartContracts.escrow.getAddress());
    invalidNft = await mintAndApproveNFT(
      SmartContractsInvalidNFT.nft,
      Fixture.borrower,
      await SmartContractsInvalidNFT.escrow.getAddress(),
    );

    await mintAndApproveERC20(
      SmartContracts.erc20,
      Fixture.lender,
      1000n * factorX,
      await SmartContracts.erc20TransferManager.getAddress(),
    );
    await mintAndApproveERC20(
      SmartContracts.erc20,
      Fixture.borrower,
      500n * factorX,
      await SmartContracts.erc20TransferManager.getAddress(),
    );

    const now = await currentTime();
    sigExpiry = now + daysToSeconds(10n);

    lenderSig = await getLenderSignature(
      Fixture.lender,
      LOAN_FXT.principal,
      LOAN_FXT.isProRata,
      LOAN_FXT.repayment,
      nft.id,
      LOAN_FXT.duration,
      0n,
      await SmartContracts.nft.getAddress(),
      await SmartContracts.erc20.getAddress(),
      sigExpiry,
      offerType,
      0n,
    );
  });

  it('a loan with invalid nft should cause revert', async function () {
    // BEGIN LOAN .............................................................
    await expect(
      SmartContractsInvalidNFT.nftfiLoanOffer.connect(Fixture.borrower).acceptOffer(
        {
          loanERC20Denomination: await SmartContracts.erc20.getAddress(),
          loanPrincipalAmount: LOAN_FXT.principal,
          maximumRepaymentAmount: LOAN_FXT.repayment,
          nftCollateralContract: await SmartContractsInvalidNFT.nft.getAddress(),
          nftCollateralId: invalidNft.id,
          loanDuration: LOAN_FXT.duration,
          isProRata: LOAN_FXT.isProRata,
          originationFee: 0,
        },
        {
          signer: Fixture.lender.address,
          nonce: 0,
          expiry: sigExpiry,
          signature: lenderSig,
        },
      ),
    ).to.be.revertedWithCustomError(SmartContractsInvalidNFT.nftfiLoanOffer, 'NFTCollateralContractNotPermitted');
  });

  it('not registered nft type should not be possible to be permitted', async function () {
    const badNftTypeERC721 = '999';

    await expect(
      SmartContractsInvalidNFT.permittedNFTs
        .connect(Fixture.nftfiOwner)
        .setNFTPermit(await SmartContractsInvalidNFT.nft.getAddress(), badNftTypeERC721),
    ).to.be.revertedWith('NFT type not registered');
  });

  it('a loan started with an permitted nft and then un-approving the nft should be okay', async function () {
    const unpermitted = '';

    const loanTx = await SmartContracts.nftfiLoanOffer.connect(Fixture.borrower).acceptOffer(
      {
        loanERC20Denomination: await SmartContracts.erc20.getAddress(),
        loanPrincipalAmount: LOAN_FXT.principal,
        maximumRepaymentAmount: LOAN_FXT.repayment,
        nftCollateralContract: await SmartContracts.nft.getAddress(),
        nftCollateralId: nft.id,
        loanDuration: LOAN_FXT.duration,
        isProRata: LOAN_FXT.isProRata,
        originationFee: 0,
      },
      {
        signer: Fixture.lender.address,
        nonce: 0,
        expiry: sigExpiry,
        signature: lenderSig,
      },
    );

    await loanTx.wait();

    const unPermitTx = await SmartContracts.permittedNFTs
      .connect(Fixture.nftfiOwner)
      .setNFTPermit(await SmartContracts.nft.getAddress(), unpermitted);

    await unPermitTx.wait();
  });
});
