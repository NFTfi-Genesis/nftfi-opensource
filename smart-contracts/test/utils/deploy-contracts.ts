import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { deployments, ethers, network } from 'hardhat';
import {
  CollectionOfferLoan,
  LoanCoordinator,
  AssetOfferLoan,
  DummyPunks,
  INftWrapper,
  MockDyDxFlashloan,
  NftfiHub,
  Ownable,
  PermittedNFTsAndTypeRegistry,
  Refinancing,
  SmartNft,
  TestCryptoKitties,
  TestERC1155,
  TestGaspMasks,
  TestLegacyERC721,
  TestRealsies,
  Escrow,
  PersonalEscrowFactory,
  ERC20TransferManager,
  PermittedERC20s,
  DelegateCashPlugin,
} from '../../typechain';
import { CONTRACTS_KEYS } from './utils';

export type NFTfiContracts = {
  nft: TestGaspMasks;
  erc20: TestRealsies;
  erc202: TestRealsies;
  kitties: TestCryptoKitties;
  nftfiLoanOffer: AssetOfferLoan;
  nftfiCollectionOffer: CollectionOfferLoan;
  legacyERC721: TestLegacyERC721;
  loanCoordinator: LoanCoordinator;
  promissoryNote: SmartNft;
  obligationReceipt: SmartNft;
  erc721Wrapper: INftWrapper;
  nftTypeRegistry: PermittedNFTsAndTypeRegistry;
  permittedERC20s: PermittedERC20s;
  permittedNFTs: PermittedNFTsAndTypeRegistry;
  loanRegistry: LoanCoordinator;
  nftfiHub: NftfiHub;
  testERC1155: TestERC1155;
  dummyPunks: DummyPunks;
  refinancing: Refinancing;
  escrow: Escrow;
  personalEscrowFactory: PersonalEscrowFactory;
  erc20TransferManager: ERC20TransferManager;
  mockDyDxFlashloan: MockDyDxFlashloan;
  delegateCashPlugin: DelegateCashPlugin;
};

export async function deployContracts(nftfiSCOwner: SignerWithAddress): Promise<NFTfiContracts> {
  // // This NEEDS to go first, because it only gets executed once and the it calls evm_revert.
  // // So anything done before this will be reverted

  process.env[`${network.name.toUpperCase()}_OWNER_ADDRESS`] = nftfiSCOwner.address;

  await deployments.fixture([
    'NftfiHub',
    'Wrappers',
    'LoanTypes',
    'PermittedNFTs',
    'LoanCoordinator',
    'Refinancing',
    'SetupContracts',
    'SetupOwnerships',
    'RedeployWrappers',
    'Escrow',
    'PersonalEscrow',
    'ERC20TransferManager',
    'DelegateCashPlugin',
    'RedeployRefinancing',
  ]);

  /*   getOwnerAddress()
   */
  const nftfiHub = (await ethers.getContract('NftfiHub', nftfiSCOwner)) as NftfiHub;

  // setup test NFT contract
  const GaspMasks = await ethers.getContractFactory('TestGaspMasks');
  const nftSC = (await GaspMasks.connect(nftfiSCOwner).deploy()) as TestGaspMasks;
  await nftSC.waitForDeployment();

  // setup test erc20 contract
  const Realsies = await ethers.getContractFactory('TestRealsies');
  const erc20SC = (await Realsies.connect(nftfiSCOwner).deploy()) as TestRealsies;
  await erc20SC.waitForDeployment();

  // setup second test erc20 contract
  const erc20SC2 = (await Realsies.connect(nftfiSCOwner).deploy()) as TestRealsies;
  await erc20SC2.waitForDeployment();

  // setup test CryptoKitties contract
  const CryptoKitties = await ethers.getContractFactory('TestCryptoKitties');
  const kitties = (await CryptoKitties.connect(nftfiSCOwner).deploy()) as TestCryptoKitties;
  await kitties.waitForDeployment();

  // setup test   legacy ERC721 contract
  const TestLegacyERC721 = await ethers.getContractFactory('TestLegacyERC721');
  const legacyERC721 = (await TestLegacyERC721.connect(nftfiSCOwner).deploy()) as TestLegacyERC721;
  await legacyERC721.waitForDeployment();

  const DummyPunks = await ethers.getContractFactory('DummyPunks');
  const dummyPunks = (await DummyPunks.connect(nftfiSCOwner).deploy()) as DummyPunks;
  await dummyPunks.waitForDeployment();

  // setup test erc1155 contract
  const TestERC1155 = await ethers.getContractFactory('TestERC1155');
  const testERC1155 = (await TestERC1155.connect(nftfiSCOwner).deploy()) as TestERC1155;
  await testERC1155.waitForDeployment();

  const erc721Wrapper = (await ethers.getContract('ERC721Wrapper', nftfiSCOwner)) as INftWrapper;

  const nftTypeERC721 = 'ERC721';
  const nftTypeERC721Legacy = 'ERC721_LEGACY';
  const nftTypeCryptoKitties = 'CryptoKitties';
  const nftTypeERC1155 = 'ERC1155';
  const nftTypePunks = 'PUNKS';

  const nftTypeRegistry = (await ethers.getContract(
    'PermittedNFTsAndTypeRegistry',
    nftfiSCOwner,
  )) as PermittedNFTsAndTypeRegistry;

  const nftfiLoanOffer = (await ethers.getContract('AssetOfferLoan', nftfiSCOwner)) as AssetOfferLoan;

  const nftfiCollectionOffer = (await ethers.getContract('CollectionOfferLoan', nftfiSCOwner)) as CollectionOfferLoan;

  const permittedNFTs = (await ethers.getContract(
    'PermittedNFTsAndTypeRegistry',
    nftfiSCOwner,
  )) as PermittedNFTsAndTypeRegistry;

  const loanCoordinator = (await ethers.getContract('LoanCoordinator', nftfiSCOwner)) as LoanCoordinator;

  const refinancing = (await ethers.getContract('Refinancing', nftfiSCOwner)) as Refinancing;

  const escrow = (await ethers.getContract('Escrow', nftfiSCOwner)) as Escrow;

  const personalEscrowFactory = (await ethers.getContract(
    'PersonalEscrowFactory',
    nftfiSCOwner,
  )) as PersonalEscrowFactory;

  const erc20TransferManager = (await ethers.getContract('ERC20TransferManager', nftfiSCOwner)) as ERC20TransferManager;

  const ownables: { [key: string]: Ownable } = {
    nftfiHub: nftfiHub,
    permittedNFTs: permittedNFTs,
    AssetOfferLoan: nftfiLoanOffer,
    loanCoordinator: loanCoordinator,
    refinancing: refinancing,
  };

  for (const ownableKey in ownables) {
    if ((await ownables[ownableKey].owner()) != nftfiSCOwner.address) {
      await ownables[ownableKey].connect(nftfiSCOwner).acceptTransferOwnership();
    }
  }

  await nftfiHub.setContracts([CONTRACTS_KEYS.REFINANCING], [refinancing.getAddress()]);

  await nftfiLoanOffer.setERC20Permits([await erc20SC.getAddress(), await erc20SC2.getAddress()], [true, true]);
  await nftfiCollectionOffer.setERC20Permits([await erc20SC.getAddress(), await erc20SC2.getAddress()], [true, true]);

  const loanRegistry = (await ethers.getContract('LoanCoordinator', nftfiSCOwner)) as LoanCoordinator;

  const permittedERC20s = (await ethers.getContract('AssetOfferLoan', nftfiSCOwner)) as AssetOfferLoan;
  await permittedERC20s.setERC20Permits([erc20SC.getAddress(), erc20SC2.getAddress()], [true, true]);

  const promissoryNote = (await ethers.getContract('PromissoryNote', nftfiSCOwner)) as SmartNft;

  const obligationReceipt = (await ethers.getContract('ObligationReceipt', nftfiSCOwner)) as SmartNft;

  // setup NFT permits
  await permittedNFTs.setNFTPermit(await nftSC.getAddress(), nftTypeERC721);
  await permittedNFTs.setNFTPermit(await kitties.getAddress(), nftTypeCryptoKitties);
  await permittedNFTs.setNFTPermit(await legacyERC721.getAddress(), nftTypeERC721Legacy);
  await permittedNFTs.setNFTPermit(await testERC1155.getAddress(), nftTypeERC1155);
  await permittedNFTs.setNFTPermit(await dummyPunks.getAddress(), nftTypePunks);

  const kittiesWrapper = await ethers.getContract('CryptoKittiesWrapper');
  const erc721LegacyWrapper = await ethers.getContract('ERC721LegacyWrapper');
  const erc1155Wrapper = await ethers.getContract('ERC1155Wrapper');
  const punkWrapper = await ethers.getContract('PunkWrapper');

  await permittedNFTs.setNftTypes(
    [nftTypeERC721, nftTypeCryptoKitties, nftTypeERC721Legacy, nftTypeERC1155, nftTypePunks],
    [
      await erc721Wrapper.getAddress(),
      await kittiesWrapper.getAddress(),
      await erc721LegacyWrapper.getAddress(),
      await erc1155Wrapper.getAddress(),
      await punkWrapper.getAddress(),
    ],
  );

  const mockDyDxFlashloan = (await ethers.getContract('MockDyDxFlashloan')) as MockDyDxFlashloan;
  await mockDyDxFlashloan.setMarkets([await erc20SC.getAddress(), await erc20SC2.getAddress()], [0, 1]);

  await refinancing.loadTokens();

  const delegateCashPlugin = (await ethers.getContract('DelegateCashPlugin')) as DelegateCashPlugin;

  return {
    nft: nftSC,
    erc20: erc20SC,
    erc202: erc20SC2,
    kitties,
    nftfiLoanOffer,
    nftfiCollectionOffer,
    legacyERC721,
    loanCoordinator,
    promissoryNote,
    obligationReceipt,
    erc721Wrapper,
    nftTypeRegistry,
    permittedNFTs,
    permittedERC20s,
    loanRegistry,
    nftfiHub,
    testERC1155,
    dummyPunks,
    refinancing,
    escrow,
    personalEscrowFactory,
    erc20TransferManager,
    mockDyDxFlashloan,
    delegateCashPlugin,
  };
}
