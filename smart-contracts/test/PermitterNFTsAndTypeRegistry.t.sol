pragma solidity 0.8.19;

import "forge-std/Test.sol";

import {NftfiHub} from "../contracts/NftfiHub.sol";

import {CryptoKittiesWrapper} from "../contracts/nftTypeRegistry/nftTypes/CryptoKittiesWrapper.sol";
import {ERC1155Wrapper} from "../contracts/nftTypeRegistry/nftTypes/ERC1155Wrapper.sol";
import {ERC721Wrapper} from "../contracts/nftTypeRegistry/nftTypes/ERC721Wrapper.sol";

import {PermittedNFTsAndTypeRegistry} from "../contracts/permittedLists/PermittedNFTsAndTypeRegistry.sol";

contract BaseLoanTest is Test {
    PermittedNFTsAndTypeRegistry public permittedNFTsAndTypeRegistry;

    string public constant nftTypeERC721 = "ERC721";
    string public constant nftTypeCryptoKitties = "CryptoKitties";
    string public constant nftTypeERC1155 = "ERC1155";
    string public constant nftTypeNonRegistered = "NONRGISTERED";

    ERC721Wrapper public erc721Wrapper;
    CryptoKittiesWrapper public cryptoKittiesWrapper;
    ERC1155Wrapper public erc1155Wrapper;

    address public cryptoKittiesContract = address(99);
    address public erc721Contract = address(999);

    NftfiHub public nftfiHub;

    function setUp() public {
        string[] memory types = new string[](2);
        types[0] = "INITIAL_TYPE1";
        types[1] = "INITIAL_TYPE2";

        address[] memory adrr = new address[](2);
        adrr[0] = address(1);
        adrr[1] = address(2);

        nftfiHub = new NftfiHub(address(1), types, adrr);

        cryptoKittiesWrapper = new CryptoKittiesWrapper();
        erc721Wrapper = new ERC721Wrapper();
        erc1155Wrapper = new ERC1155Wrapper();

        string[] memory typesWrapper = new string[](3);
        typesWrapper[0] = nftTypeERC721;
        typesWrapper[1] = nftTypeCryptoKitties;
        typesWrapper[2] = nftTypeERC1155;

        string[] memory contractsTypes = new string[](2);
        contractsTypes[0] = nftTypeERC721;
        contractsTypes[1] = nftTypeCryptoKitties;

        address[] memory wrappers = new address[](3);
        wrappers[0] = address(erc721Wrapper);
        wrappers[1] = address(cryptoKittiesWrapper);
        wrappers[2] = address(erc1155Wrapper);

        address[] memory contracts = new address[](2);
        contracts[0] = erc721Contract;
        contracts[1] = cryptoKittiesContract;

        permittedNFTsAndTypeRegistry = new PermittedNFTsAndTypeRegistry(
            address(1),
            typesWrapper,
            wrappers,
            contracts,
            contractsTypes
        );
    }

    function test_SetOwnerProperly() public view {
        assertEq(permittedNFTsAndTypeRegistry.owner(), address(1));
    }

    function test_InitializePermittedListUponDeploymet() public view {
        assertEq(permittedNFTsAndTypeRegistry.getNFTPermit(address(erc721Contract)), bytes32(bytes(nftTypeERC721)));
        assertEq(
            permittedNFTsAndTypeRegistry.getNFTPermit(address(cryptoKittiesContract)),
            bytes32(bytes(nftTypeCryptoKitties))
        );
    }

    function test_NonOwnerShouldNotBeAbleToCallSetNFTPermits() public {
        vm.expectRevert("Ownable: caller is not the owner");
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(99);

        string[] memory types = new string[](1);
        types[0] = "SOME_TYPE";

        permittedNFTsAndTypeRegistry.setNFTPermits(nftAddresses, types);
    }

    function test_NonOwnerShouldNotBeAbleToCallSetNFTPermit() public {
        vm.expectRevert("Ownable: caller is not the owner");
        permittedNFTsAndTypeRegistry.setNFTPermit(address(0), "SOME_TYPE");
    }

    function test_OwnerShouldNotBeAbleToAddPermitsForZeroAddress() public {
        vm.prank(address(1));
        vm.expectRevert("nftContract is zero address");

        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(0);

        string[] memory types = new string[](1);
        types[0] = "SOME_TYPE";

        permittedNFTsAndTypeRegistry.setNFTPermits(nftAddresses, types);
    }

    function test_OwnerShouldNotBeAbleToAddPermitForZeroAddress() public {
        vm.prank(address(1));
        vm.expectRevert("nftContract is zero address");
        permittedNFTsAndTypeRegistry.setNFTPermit(address(0), "SOME_TYPE");
    }

    function test_OwnerShouldNotBeAbleToCallSetPermitsForNonRegisteredNFTType() public {
        vm.prank(address(1));
        vm.expectRevert("NFT type not registered");

        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(99);

        string[] memory types = new string[](1);
        types[0] = "SOME_TYPE";

        permittedNFTsAndTypeRegistry.setNFTPermits(nftAddresses, types);
    }

    function test_OwnerShouldNotBeAbleToCallSetPermitForNonRegisteredNFTType() public {
        vm.prank(address(1));
        vm.expectRevert("NFT type not registered");
        permittedNFTsAndTypeRegistry.setNFTPermit(address(10), "SOME_TYPE");
    }

    function test_OwnerShouldBeAbleToCallSetPermit() public {
        vm.prank(address(1));
        permittedNFTsAndTypeRegistry.setNFTPermit(address(10), nftTypeERC721);

        assertEq(permittedNFTsAndTypeRegistry.getNFTPermit(address(10)), bytes32(bytes(nftTypeERC721)));
    }

    function test_OwnerShouldNotBeAbleToCallSetPermitsWithArityMismatch() public {
        vm.prank(address(1));
        vm.expectRevert("setNFTPermits function information arity mismatch");

        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(99);

        string[] memory types = new string[](0);

        permittedNFTsAndTypeRegistry.setNFTPermits(nftAddresses, types);
    }

    function test_OwnerShouldBeAbleToCallSetPermits() public {
        vm.prank(address(1));

        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(99);

        string[] memory types = new string[](1);
        types[0] = nftTypeERC721;

        permittedNFTsAndTypeRegistry.setNFTPermits(nftAddresses, types);

        assertEq(permittedNFTsAndTypeRegistry.getNFTPermit(address(99)), bytes32(bytes(nftTypeERC721)));
    }

    function test_ShouldReturnTheRightWrapper() public {
        vm.prank(address(1));
        assertEq(
            permittedNFTsAndTypeRegistry.getNFTWrapper(address(cryptoKittiesContract)),
            address(cryptoKittiesWrapper)
        );
    }
}
