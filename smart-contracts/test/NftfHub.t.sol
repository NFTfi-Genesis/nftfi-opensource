pragma solidity 0.8.19;

import "forge-std/Test.sol";
import {NftfiHub} from "../contracts/NftfiHub.sol";

contract NftfiHubTest is Test {
    NftfiHub public nftfiHub;

    function setUp() public {
        string[] memory types = new string[](2);
        types[0] = "INITIAL_TYPE1";
        types[1] = "INITIAL_TYPE2";

        address[] memory adrr = new address[](2);
        adrr[0] = address(1);
        adrr[1] = address(2);

        nftfiHub = new NftfiHub(address(1), types, adrr);
    }

    function test_SetOwnerProperly() public view {
        assertEq(nftfiHub.owner(), address(1));
    }

    function test_ShouldInitializeContractsList() public view {
        assertEq(nftfiHub.getContract(bytes32("INITIAL_TYPE1")), address(1));
        assertEq(nftfiHub.getContract(bytes32("INITIAL_TYPE2")), address(2));
    }

    function test_NonOwnerShouldNotBeAbleToSetContract() public {
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        nftfiHub.setContract("TEST_TYPE", address(3));
    }

    function test_OwnerShouldBeAbleToSetContract() public {
        vm.prank(address(1));
        nftfiHub.setContract("TEST_TYPE", address(3));
        assertEq(nftfiHub.getContract(bytes32("TEST_TYPE")), address(3));
    }

    function test_SetContractsArityMismatch() public {
        vm.prank(address(1));
        string[] memory types = new string[](2);
        types[0] = "TEST_TYPE1";
        types[1] = "TEST_TYPE2";

        vm.expectRevert(bytes("setContracts function information arity mismatch"));
        nftfiHub.setContracts(types, new address[](1));
    }

    function test_SetContractShouldOverwriteAddress() public {
        assertEq(nftfiHub.getContract(bytes32("INITIAL_TYPE1")), address(1));

        vm.prank(address(1));
        nftfiHub.setContract("INITIAL_TYPE1", address(100));

        assertEq(nftfiHub.getContract(bytes32("INITIAL_TYPE1")), address(100));
    }
}
