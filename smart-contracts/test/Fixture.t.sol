pragma solidity 0.8.19;

import {ContractKeys} from "@source/utils/ContractKeys.sol";
import {LoanCoordinator} from "@source/loans/LoanCoordinator.sol";
import {AssetOfferLoan} from "@source/loans/loanTypes/AssetOfferLoan.sol";
import {CollectionOfferLoan} from "@source/loans/loanTypes/CollectionOfferLoan.sol";
import {PermittedNFTsAndTypeRegistry} from "@source/permittedLists/PermittedNFTsAndTypeRegistry.sol";
import {SmartNft} from "@source/smartNft/SmartNft.sol";
import {NftfiHub} from "@source/NftfiHub.sol";
import {Escrow} from "@source/escrow/Escrow.sol";
import {DelegateCashPlugin} from "@source/escrow/plugins/DelegateCashPlugin.sol";
import {PersonalEscrow} from "@source/escrow/PersonalEscrow.sol";
import {PersonalEscrowFactory} from "@source/escrow/PersonalEscrowFactory.sol";
import {ERC20TransferManager} from "@source/ERC20TransferManager.sol";

import {SwapFlashloanWETH} from "@source/refinancing/SwapFlashloanWETH.sol";

import {TestGaspMasks} from "../contracts/test/TestGaspMasks.sol";
import {TestCryptoKitties} from "../contracts/test/TestCryptoKitties.sol";
import {TestLegacyERC721} from "../contracts/test/TestLegacyERC721.sol";
import {TestERC1155} from "../contracts/test/TestERC1155.sol";
import {DummyPunks} from "../contracts/test/DummyPunks.sol";

import {CryptoKittiesWrapper} from "../contracts/nftTypeRegistry/nftTypes/CryptoKittiesWrapper.sol";
import {ERC721LegacyWrapper} from "../contracts/nftTypeRegistry/nftTypes/ERC721LegacyWrapper.sol";
import {ERC1155Wrapper} from "../contracts/nftTypeRegistry/nftTypes/ERC1155Wrapper.sol";
import {PunkWrapper} from "../contracts/nftTypeRegistry/nftTypes/PunkWrapper.sol";
import {TestERC721} from "../contracts/test/TestERC721.sol";
import {ERC721Wrapper} from "../contracts/nftTypeRegistry/nftTypes/ERC721Wrapper.sol";

import {IDelegateRegistry} from "@source/interfaces/IDelegateRegistry.sol";
import {IPunks} from "@source/interfaces/IPunks.sol";
import {ICryptoKitties} from "@source/interfaces/ICryptoKitties.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {NftfiRefinancingAdapter} from "@source/refinancing/refinancingAdapters/NftfiRefinancingAdapter.sol";
import {
    LegacyNftfiRefinancingAdapterV2_1
} from "@source/refinancing/refinancingAdapters/LegacyNftfiRefinancingAdapterV2_1.sol";
import {
    LegacyNftfiRefinancingAdapterV2_3
} from "@source/refinancing/refinancingAdapters/LegacyNftfiRefinancingAdapterV2_3.sol";
import {Refinancing} from "@source/refinancing/Refinancing.sol";

import {TestRealsies} from "../contracts/test/TestRealsies.sol";

import "forge-std/Test.sol";

contract Fixture is Test {
    address public deployer = address(1);

    NftfiHub public nftfiHub;
    PermittedNFTsAndTypeRegistry public permittedNFTsAndTypeRegistry;
    AssetOfferLoan public assetOfferLoan;
    CollectionOfferLoan public collectionOfferLoan;
    LoanCoordinator public loanCoordinator;
    SmartNft public obligationReceipt;
    SmartNft public promissoryNote;
    Escrow public escrow;
    PersonalEscrowFactory public personalEscrowFactory;
    ERC20TransferManager public erc20TransferManager;
    PersonalEscrow public personalEscrow;
    Refinancing public refinancing;
    DelegateCashPlugin public delegateCashPlugin;

    NftfiRefinancingAdapter public nftfiRefinancingAdapter = new NftfiRefinancingAdapter();
    LegacyNftfiRefinancingAdapterV2_1 public legacyNftfiRefinancingAdapterV2_1 =
        new LegacyNftfiRefinancingAdapterV2_1();
    LegacyNftfiRefinancingAdapterV2_3 public legacyNftfiRefinancingAdapterV2_3 =
        new LegacyNftfiRefinancingAdapterV2_3();

    TestRealsies public erc20SC;
    TestRealsies public erc20SC2;

    TestERC721 public nftSC;
    TestCryptoKitties public cryptoKitties;
    TestLegacyERC721 public legacyERC721;
    TestERC1155 public erc1155;
    DummyPunks public dummyPunks;

    IERC721 public BAYC = IERC721(0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D);
    ICryptoKitties public KITTY = ICryptoKitties(0x06012c8cf97BEaD5deAe237070F9587f8E7A266d);
    // https://vscode.blockscan.com/ethereum/0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB
    IPunks public PUNKS = IPunks(0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB);

    string public constant nftTypeNFT = "NFT";
    string public constant nftTypeERC721 = "ERC721";
    string public constant nftTypeCryptoKitties = "CryptoKitties";
    string public constant nftTypeERC721Legacy = "ERC721_LEGACY";
    string public constant nftTypeERC1155 = "ERC1155";
    string public constant nftTypePunks = "PUNKS";

    ERC721Wrapper public erc721Wrapper;
    CryptoKittiesWrapper public cryptoKittiesWrapper;
    ERC1155Wrapper public erc1155Wrapper;
    ERC721LegacyWrapper public erc721LegacyWrapper;
    PunkWrapper public punkWrapper;

    IERC20 public WETH = IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    IERC20 public DAI = IERC20(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    IERC20 public USDC = IERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    IERC20 public wseth = IERC20(0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0);

    address public owner = vm.addr(100);
    address public user1 = vm.addr(101);
    address public user2 = vm.addr(102); // 0x88C0e901bd1fd1a77BdA342f0d2210fDC71Cef6B
    address public user3 = vm.addr(103);
    address public user4 = vm.addr(104);
    address public user5 = vm.addr(105);
    address public user6 = vm.addr(106);
    address public bob_wallet1_lender = vm.addr(201);
    address public bob_wallet2_borrower = vm.addr(202);
    address public alice = vm.addr(203);

    // Solo margin
    address public soloMargin = address(0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e);

    // delegate cash registry
    address public delegateCash = address(0x00000000000000447e69651d841bD8D104Bed493);

    // config
    address[] internal permittedErc20;

    modifier deployerPrank() {
        vm.startPrank(deployer);
        _;
        vm.stopPrank();
    }

    constructor() {
        deployNftfiHub();
        deployNFTWrappers();
        deployERC20Contracts();
        deployNFTContracts();
        deployEscrow();
        deployPersonalEscrowFactory();
        deployERC20TransferManager();
        deployAssetOfferLoan();
        deployCollectionOfferLoan();
        deployPermittedNFTs();
        deployLoanCoordinator();
        deployPrommisoryNodeAndObligationReceiptAndInitializeCoordinator();
        deployPlugin();
        setupContracts();
    }

    function deployNftfiHub() internal deployerPrank {
        string[] memory types = new string[](0);
        address[] memory adrr = new address[](0);

        nftfiHub = new NftfiHub(address(1), types, adrr);
    }

    function deployNFTWrappers() internal deployerPrank {
        cryptoKittiesWrapper = new CryptoKittiesWrapper();
        erc721Wrapper = new ERC721Wrapper();
        erc1155Wrapper = new ERC1155Wrapper();
        erc721LegacyWrapper = new ERC721LegacyWrapper();
        punkWrapper = new PunkWrapper();
    }

    function deployERC20Contracts() internal deployerPrank {
        erc20SC = new TestRealsies();
        erc20SC2 = new TestRealsies();
    }

    function deployNFTContracts() internal deployerPrank {
        nftSC = new TestERC721();
        cryptoKitties = new TestCryptoKitties();
        legacyERC721 = new TestLegacyERC721();
        erc1155 = new TestERC1155();
        dummyPunks = new DummyPunks();
    }

    function deployPlugin() internal deployerPrank {
        delegateCashPlugin = new DelegateCashPlugin(delegateCash, nftfiHub, deployer);
    }

    function deployEscrow() internal deployerPrank {
        escrow = new Escrow(deployer, address(nftfiHub));
    }

    function deployPersonalEscrowFactory() internal deployerPrank {
        personalEscrow = new PersonalEscrow(address(nftfiHub));
        personalEscrow.initialize(address(deployer));
        personalEscrowFactory = new PersonalEscrowFactory(address(personalEscrow), deployer);
        personalEscrowFactory.unpause();

        nftfiHub.setContract("PERSONAL_ESCROW_FACTORY", address(personalEscrowFactory));
        nftfiHub.setContract("ESCROW", address(escrow));
    }

    function deployERC20TransferManager() internal deployerPrank {
        erc20TransferManager = new ERC20TransferManager(deployer, address(nftfiHub));
    }

    function deployAssetOfferLoan() internal deployerPrank {
        permittedErc20.push(address(erc20SC));
        permittedErc20.push(address(erc20SC2));
        permittedErc20.push(address(WETH));
        permittedErc20.push(address(DAI));
        permittedErc20.push(address(USDC));
        permittedErc20.push(address(wseth));

        assetOfferLoan = new AssetOfferLoan(deployer, address(nftfiHub), permittedErc20);
    }

    function deployCollectionOfferLoan() internal deployerPrank {
        collectionOfferLoan = new CollectionOfferLoan(deployer, address(nftfiHub), permittedErc20);
    }

    function deployPermittedNFTs() internal deployerPrank {
        string[] memory definedNftTypes = new string[](7);
        definedNftTypes[0] = nftTypeERC721;
        definedNftTypes[1] = nftTypeCryptoKitties;
        definedNftTypes[2] = nftTypeERC721Legacy;
        definedNftTypes[3] = nftTypeERC1155;
        definedNftTypes[4] = nftTypePunks;
        definedNftTypes[5] = nftTypeNFT;
        definedNftTypes[6] = nftTypeCryptoKitties;

        address[] memory definedNftWrappers = new address[](7);
        definedNftWrappers[0] = address(erc721Wrapper);
        definedNftWrappers[1] = address(cryptoKittiesWrapper);
        definedNftWrappers[2] = address(erc721LegacyWrapper);
        definedNftWrappers[3] = address(erc1155Wrapper);
        definedNftWrappers[4] = address(punkWrapper);
        definedNftWrappers[5] = address(erc721LegacyWrapper);
        definedNftWrappers[6] = address(cryptoKittiesWrapper);

        address[] memory permittedNftContracts = new address[](7);
        permittedNftContracts[0] = address(nftSC);
        permittedNftContracts[1] = address(cryptoKitties);
        permittedNftContracts[2] = address(legacyERC721);
        permittedNftContracts[3] = address(erc1155);
        permittedNftContracts[4] = address(dummyPunks);
        permittedNftContracts[5] = address(BAYC);
        permittedNftContracts[6] = address(KITTY);

        string[] memory permittedNftTypes = new string[](7);
        permittedNftTypes[0] = nftTypeERC721;
        permittedNftTypes[1] = nftTypeCryptoKitties;
        permittedNftTypes[2] = nftTypeERC721Legacy;
        permittedNftTypes[3] = nftTypeERC1155;
        permittedNftTypes[4] = nftTypePunks;
        permittedNftTypes[5] = nftTypeNFT;
        permittedNftTypes[6] = nftTypeCryptoKitties;

        permittedNFTsAndTypeRegistry = new PermittedNFTsAndTypeRegistry(
            deployer,
            definedNftTypes,
            definedNftWrappers,
            permittedNftContracts,
            permittedNftTypes
        );
    }

    function deployLoanCoordinator() internal deployerPrank {
        string[] memory contractTypes = new string[](2);
        contractTypes[0] = "ASSET_OFFER_LOAN";
        contractTypes[1] = "COLLECTION_OFFER_LOAN";

        address[] memory contractAddresses = new address[](2);
        contractAddresses[0] = address(assetOfferLoan);
        contractAddresses[1] = address(collectionOfferLoan);

        loanCoordinator = new LoanCoordinator(address(nftfiHub), deployer, contractTypes, contractAddresses);
    }

    function deployPrommisoryNodeAndObligationReceiptAndInitializeCoordinator() internal deployerPrank {
        promissoryNote = new SmartNft(
            deployer,
            address(nftfiHub),
            address(loanCoordinator),
            "Promissory Note",
            "PN",
            "https://metadata.nftfi.com/loans/v2/promissory/"
        );

        obligationReceipt = new SmartNft(
            deployer,
            address(nftfiHub),
            address(loanCoordinator),
            "NFTfi Obligation Receipt",
            "ORNFI",
            "https://metadata.nftfi.com/loans/v2/obligation/"
        );

        loanCoordinator.initialize(address(promissoryNote), address(obligationReceipt));
    }

    function deployRefinancingAdapters() internal deployerPrank {
        nftfiRefinancingAdapter = new NftfiRefinancingAdapter();
        legacyNftfiRefinancingAdapterV2_1 = new LegacyNftfiRefinancingAdapterV2_1();
        legacyNftfiRefinancingAdapterV2_3 = new LegacyNftfiRefinancingAdapterV2_3();

        nftfiHub.setContract("NFTFI", address(nftfiRefinancingAdapter));
        nftfiHub.setContract("NFTFI_LEGACY_V2_1", address(legacyNftfiRefinancingAdapterV2_1));
        nftfiHub.setContract("NFTFI_LEGACY_V2_3", address(legacyNftfiRefinancingAdapterV2_3));

        string[] memory _definedRefinanceableTypes = new string[](3);
        _definedRefinanceableTypes[0] = "NFTFI";
        _definedRefinanceableTypes[1] = "NFTFI_LEGACY_V2_1";
        _definedRefinanceableTypes[2] = "NFTFI_LEGACY_V2_3";

        address[] memory _definedRefinancingAdapters = new address[](3);
        _definedRefinancingAdapters[0] = address(nftfiRefinancingAdapter);
        _definedRefinancingAdapters[1] = address(legacyNftfiRefinancingAdapterV2_1);
        _definedRefinancingAdapters[2] = address(legacyNftfiRefinancingAdapterV2_3);

        string[] memory _refinanceableTypes = new string[](4);
        _refinanceableTypes[0] = "NFTFI";
        _refinanceableTypes[1] = "NFTFI";
        _refinanceableTypes[2] = "NFTFI_LEGACY_V2_1";
        _refinanceableTypes[3] = "NFTFI_LEGACY_V2_3";

        address[] memory _refinancingAdapters = new address[](4);
        _refinancingAdapters[0] = address(assetOfferLoan);
        _refinancingAdapters[1] = address(collectionOfferLoan);
        _refinancingAdapters[2] = address(legacyNftfiRefinancingAdapterV2_1);
        _refinancingAdapters[3] = address(legacyNftfiRefinancingAdapterV2_3);

        address[] memory _supportedTokens = new address[](1);
        _supportedTokens[0] = 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0;
        uint24[] memory _swapFeeRates = new uint24[](1);
        _swapFeeRates[0] = 100;

        SwapFlashloanWETH.SwapConstructorParams memory _swapContructorParams = SwapFlashloanWETH.SwapConstructorParams({
            swapRouterAddress: 0xE592427A0AEce92De3Edee1F18E0157C05861564, // https://etherscan.io/address/0xe592427a0aece92de3edee1f18e0157c05861564
            quoterAddress: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, // https://etherscan.io/address/0xb27308f9f90d607463bb33ea1bebb41c27ce5ab6
            wethAddress: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, // https://etherscan.io/address/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
            supportedTokens: _supportedTokens, // wstETH https://etherscan.io/address/0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0
            swapFeeRates: _swapFeeRates // 0.01% https://etherscan.io/address/0x109830a1aaad605bbf02a9dfa7b0b92ec2fb7daa#readContract#F2
        });

        refinancing = new Refinancing(
            address(nftfiHub),
            address(assetOfferLoan),
            address(collectionOfferLoan),
            deployer,
            _definedRefinanceableTypes,
            _definedRefinancingAdapters,
            _refinanceableTypes,
            _refinancingAdapters,
            soloMargin,
            2,
            _swapContructorParams
        );
    }

    function setupContracts() internal deployerPrank {
        string[] memory contractKeys = new string[](11);
        contractKeys[0] = "PERMITTED_NFTS";
        contractKeys[1] = "PERMITTED_ERC20S";
        contractKeys[2] = "LOAN_COORDINATOR";
        contractKeys[3] = "ESCROW";
        contractKeys[4] = "PERSONAL_ESCROW_FACTORY";
        contractKeys[5] = "ERC20_TRANSFER_MANAGER";
        contractKeys[7] = "BAYC";
        contractKeys[8] = "PUNKS";
        contractKeys[9] = "KITTY";
        contractKeys[10] = "1155";

        address[] memory contractAddresses = new address[](11);
        contractAddresses[0] = address(permittedNFTsAndTypeRegistry);
        contractAddresses[1] = address(assetOfferLoan);
        contractAddresses[2] = address(loanCoordinator);
        contractAddresses[3] = address(escrow);
        contractAddresses[4] = address(personalEscrowFactory);
        contractAddresses[5] = address(erc20TransferManager);
        contractAddresses[7] = address(BAYC);
        contractAddresses[8] = address(PUNKS);
        contractAddresses[9] = address(KITTY);
        contractAddresses[10] = address(erc1155);

        nftfiHub.setContracts(contractKeys, contractAddresses);
        nftfiHub.setContract("PERSONAL_ESCROW_FACTORY", address(personalEscrowFactory));
        nftfiHub.setContract("ESCROW", address(escrow));
        nftfiHub.setContract("ERC20_TRANSFER_MANAGER", address(erc20TransferManager));
        nftfiHub.setContract("DIRECT_LOAN_COORDINATOR", address(loanCoordinator));
        nftfiHub.setContract("PERMITTED_NFTS", address(permittedNFTsAndTypeRegistry));
        nftfiHub.setContract("ASSET_OFFER_LOAN", address(assetOfferLoan));
        nftfiHub.setContract("COLLECTION_OFFER_LOAN", address(collectionOfferLoan));
        nftfiHub.setContract("DELEGATE_PLUGIN", address(delegateCashPlugin));
    }
}
