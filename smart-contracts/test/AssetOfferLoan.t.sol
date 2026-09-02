pragma solidity 0.8.19;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {NFTfiSigningUtils} from "@source/utils/NFTfiSigningUtils.sol";
import {NFTfiSigningUtilsContract} from "@source/utils/NFTfiSigningUtilsContract.sol";
import {LoanBaseMinimal, LoanData} from "@source/loans/loanTypes/LoanBaseMinimal.sol";
import {CollectionOfferLoan} from "@source/loans/loanTypes/CollectionOfferLoan.sol";
import {AssetOfferLoan} from "@source/loans/loanTypes/AssetOfferLoan.sol";
import {ILoanCoordinator} from "@source/interfaces/ILoanCoordinator.sol";
import {TestRealsies} from "@source/test/TestRealsies.sol";
import {TestERC721} from "@source/test/TestERC721.sol";
import {SmartNft} from "@source/smartNft/SmartNft.sol";
import {ContractKeyUtils} from "@source/utils/ContractKeyUtils.sol";
import {Fixture} from "./Fixture.t.sol";
import {Escrow} from "@source/escrow/Escrow.sol";

import {ICryptoKitties} from "@source/interfaces/ICryptoKitties.sol";

import {Test, console, Vm, StdStyle} from "forge-std/Test.sol";

contract AssetOfferLoanTest is Test {
    using ECDSA for bytes32;

    Fixture public f;
    uint public factorX;
    uint public principal;
    uint public repayment;
    uint32 public duration;
    uint public tokenId;
    uint16 public adminFeeInBasisPoints;
    uint256 public lenderPk;
    address public lender;
    address public borrower;
    uint32 public expectedLoanId;
    uint256 public startTime;
    uint256 originationFee;

    function setUp() public {
        string memory rpcUrl = vm.envOr("MAINNET_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) {
            string memory alchemyApiKey = vm.envOr("ALCHEMY_API_KEY", string(""));
            require(bytes(alchemyApiKey).length != 0, "Set MAINNET_RPC_URL or ALCHEMY_API_KEY");
            rpcUrl = string(abi.encodePacked("https://eth-mainnet.g.alchemy.com/v2/", alchemyApiKey));
        }

        uint mainnetFork = vm.createFork(rpcUrl);
        vm.selectFork(mainnetFork);

        f = new Fixture();
    }

    function test_Fallback() public {
        hoax(address(10), 1 ether);
        (bool success, ) = payable(address(f.assetOfferLoan())).call{value: 1 ether}("");
        assert(!success);
    }

    function test_ShouldAcceptOffer() public {
        uint64 smartNftId;
        bytes32 offerType = ContractKeyUtils.getIdFromStringKey("ASSET_OFFER_LOAN");

        {
            factorX = 1000;
            principal = 100 * factorX;
            repayment = 150 * factorX;
            duration = 7 days;
            tokenId = 10;
            adminFeeInBasisPoints = 500;
            lenderPk = 0x0001;
            lender = vm.addr(lenderPk);
            borrower = address(101);

            _mintAndApproveERC20(f.erc20SC(), lender, address(f.erc20TransferManager()), principal);
            _mintAndApproveNFT(address(f.nftSC()), borrower, address(f.escrow()), tokenId);

            startTime = block.timestamp;
            uint sigExpiry = startTime + 10 days;

            bytes32 offerType = ContractKeyUtils.getIdFromStringKey("ASSET_OFFER_LOAN");

            bytes memory signature = _getLendersSignature(
                LenderSignatureParam(
                    lenderPk,
                    address(f.erc20SC()),
                    principal,
                    repayment,
                    address(f.nftSC()),
                    tokenId,
                    duration,
                    0,
                    sigExpiry,
                    offerType,
                    block.chainid,
                    false,
                    0
                )
            );

            vm.startPrank(borrower);
            vm.recordLogs();

            f.assetOfferLoan().acceptOffer(
                LoanData.Offer({
                    loanERC20Denomination: address(f.erc20SC()),
                    loanPrincipalAmount: principal,
                    maximumRepaymentAmount: repayment,
                    nftCollateralContract: address(f.nftSC()),
                    nftCollateralId: tokenId,
                    loanDuration: duration,
                    isProRata: false,
                    originationFee: 0
                }),
                LoanData.Signature({signer: vm.addr(lenderPk), nonce: 0, expiry: sigExpiry, signature: signature})
            );
            expectedLoanId = 1;

            vm.stopPrank();

            assertEq(TestERC721(f.nftSC()).balanceOf(address(f.escrow())), 1);

            ILoanCoordinator.Loan memory loan = f.loanCoordinator().getLoanData(expectedLoanId);

            assertEq(f.erc20SC().balanceOf(borrower), principal);
            assertEq(f.erc20SC().balanceOf(lender), 0);

            smartNftId = loan.smartNftId;
        }

        {
            LoanData.LoanTerms memory lt = f.assetOfferLoan().getLoanTerms(expectedLoanId);

            assertEq(lt.loanPrincipalAmount, principal);
            assertEq(lt.maximumRepaymentAmount, repayment);
            assertEq(lt.nftCollateralId, tokenId);
            assertEq(lt.loanStartTime, startTime);
            assertEq(lt.loanDuration, duration);

            assertEq(lt.loanAdminFeeInBasisPoints, adminFeeInBasisPoints);
            assertEq(lt.nftCollateralContract, address(f.nftSC()));
            assertEq(lt.nftCollateralWrapper, address(f.erc721Wrapper()));
            assertEq(lt.loanERC20Denomination, address(f.erc20SC()));
            assertEq(lt.isProRata, false);
            assertEq(lt.originationFee, 0);
            assertEq(lt.lender, lender);

            assertTrue(f.loanCoordinator().getWhetherNonceHasBeenUsedForUser(offerType, lender, 0));
        }
    }

    function test_ShouldTestAdminFeeCapturingWhenFeeIsChanged() public {
        {
            factorX = 1000;
            principal = 100 * factorX;
            repayment = 150 * factorX;
            duration = 7 days;
            tokenId = 10;
            adminFeeInBasisPoints = 500;
            lenderPk = 0x0001;
            lender = vm.addr(lenderPk);
            borrower = address(101);

            _mintAndApproveERC20(f.erc20SC(), lender, address(f.erc20TransferManager()), principal);
            _mintAndApproveNFT(address(f.nftSC()), borrower, address(f.escrow()), tokenId);

            startTime = block.timestamp;
            uint sigExpiry = startTime + 10 days;

            bytes32 offerType = ContractKeyUtils.getIdFromStringKey("ASSET_OFFER_LOAN");

            bytes memory signature = _getLendersSignature(
                LenderSignatureParam(
                    lenderPk,
                    address(f.erc20SC()),
                    principal,
                    repayment,
                    address(f.nftSC()),
                    tokenId,
                    duration,
                    0,
                    sigExpiry,
                    offerType,
                    block.chainid,
                    false,
                    0
                )
            );

            vm.startPrank(borrower);
            vm.recordLogs();

            f.assetOfferLoan().acceptOffer(
                LoanData.Offer({
                    loanERC20Denomination: address(f.erc20SC()),
                    loanPrincipalAmount: principal,
                    maximumRepaymentAmount: repayment,
                    nftCollateralContract: address(f.nftSC()),
                    nftCollateralId: tokenId,
                    loanDuration: duration,
                    isProRata: false,
                    originationFee: 0
                }),
                LoanData.Signature({signer: vm.addr(lenderPk), nonce: 0, expiry: sigExpiry, signature: signature})
            );
            expectedLoanId = 1;

            vm.stopPrank();
        }

        {
            uint16 newAdminFeeInBasisPoints = 1000;
            vm.startPrank(f.deployer());
            f.assetOfferLoan().updateAdminFee(newAdminFeeInBasisPoints);

            LoanData.LoanTerms memory lt = f.assetOfferLoan().getLoanTerms(expectedLoanId);
            assertEq(lt.loanAdminFeeInBasisPoints, adminFeeInBasisPoints);
            assertEq(newAdminFeeInBasisPoints, f.assetOfferLoan().adminFeeInBasisPoints());
        }
    }

    function test_ShouldTestOriginationFee() public {
        {
            factorX = 1000;
            principal = 100 * factorX;
            repayment = 150 * factorX;
            duration = 7 days;
            tokenId = 10;
            adminFeeInBasisPoints = 500;
            lenderPk = 0x0001;
            lender = vm.addr(lenderPk);
            borrower = address(101);
            originationFee = 1000;

            _mintAndApproveERC20(f.erc20SC(), lender, address(f.erc20TransferManager()), principal);
            _mintAndApproveNFT(address(f.nftSC()), borrower, address(f.escrow()), tokenId);

            startTime = block.timestamp;
            uint sigExpiry = startTime + 10 days;

            bytes32 offerType = ContractKeyUtils.getIdFromStringKey("ASSET_OFFER_LOAN");

            bytes memory signature = _getLendersSignature(
                LenderSignatureParam(
                    lenderPk,
                    address(f.erc20SC()),
                    principal,
                    repayment,
                    address(f.nftSC()),
                    tokenId,
                    duration,
                    0,
                    sigExpiry,
                    offerType,
                    block.chainid,
                    false,
                    originationFee
                )
            );

            vm.startPrank(borrower);

            f.assetOfferLoan().acceptOffer(
                LoanData.Offer({
                    loanERC20Denomination: address(f.erc20SC()),
                    loanPrincipalAmount: principal,
                    maximumRepaymentAmount: repayment,
                    nftCollateralContract: address(f.nftSC()),
                    nftCollateralId: tokenId,
                    loanDuration: duration,
                    isProRata: false,
                    originationFee: originationFee
                }),
                LoanData.Signature({signer: vm.addr(lenderPk), nonce: 0, expiry: sigExpiry, signature: signature})
            );
            expectedLoanId = 1;

            vm.stopPrank();
        }

        {
            assertEq(originationFee, f.erc20SC().balanceOf(lender));
            assertEq(principal - originationFee, f.erc20SC().balanceOf(borrower));
        }
    }

    function test_ShouldFailBecauseOriginationFeeIsTooHigh() public {
        {
            factorX = 1000;
            principal = 100 * factorX;
            repayment = 150 * factorX;
            duration = 7 days;
            tokenId = 10;
            adminFeeInBasisPoints = 500;
            lenderPk = 0x0001;
            lender = vm.addr(lenderPk);
            borrower = address(101);
            originationFee = principal;

            _mintAndApproveERC20(f.erc20SC(), lender, address(f.erc20TransferManager()), principal);
            _mintAndApproveNFT(address(f.nftSC()), borrower, address(f.escrow()), tokenId);

            startTime = block.timestamp;
            uint sigExpiry = startTime + 10 days;

            bytes32 offerType = ContractKeyUtils.getIdFromStringKey("ASSET_OFFER_LOAN");

            bytes memory signature = _getLendersSignature(
                LenderSignatureParam(
                    lenderPk,
                    address(f.erc20SC()),
                    principal,
                    repayment,
                    address(f.nftSC()),
                    tokenId,
                    duration,
                    0,
                    sigExpiry,
                    offerType,
                    block.chainid,
                    false,
                    originationFee
                )
            );

            AssetOfferLoan aol = f.assetOfferLoan();

            LoanData.Offer memory _offer = LoanData.Offer({
                loanERC20Denomination: address(f.erc20SC()),
                loanPrincipalAmount: principal,
                maximumRepaymentAmount: repayment,
                nftCollateralContract: address(f.nftSC()),
                nftCollateralId: tokenId,
                loanDuration: duration,
                isProRata: false,
                originationFee: originationFee
            });

            LoanData.Signature memory _sig = LoanData.Signature({
                signer: vm.addr(lenderPk),
                nonce: 0,
                expiry: sigExpiry,
                signature: signature
            });

            vm.startPrank(borrower);

            vm.expectRevert(AssetOfferLoan.OriginationFeeIsTooHigh.selector);
            aol.acceptOffer(_offer, _sig);

            vm.stopPrank();
        }
    }

    /* ***** */
    /* Utils */
    /* ***** */

    function _mintAndApproveERC20(TestRealsies erc20SC, address mintFor, address approveFor, uint amount) internal {
        vm.prank(f.deployer());
        erc20SC.mint(mintFor, amount);

        vm.prank(mintFor);
        erc20SC.approve(approveFor, amount);
    }

    function _mintAndApproveNFT(address nftContract, address mintFor, address approveFor, uint tokenId) internal {
        vm.prank(f.deployer());
        TestERC721(nftContract).mint(mintFor, tokenId);

        vm.prank(mintFor);
        TestERC721(nftContract).approve(approveFor, tokenId);
    }

    struct LenderSignatureParam {
        uint256 signerPk;
        address loanERC20Denomination;
        uint256 loanPrincipalAmount;
        uint256 maximumRepaymentAmount;
        address nftCollateralContract;
        uint256 nftCollateralId;
        uint32 loanDuration;
        uint256 nonce;
        uint256 expiry;
        bytes32 offerType;
        uint256 chainId;
        bool isProRata;
        uint256 originationFee;
    }

    function _getLendersSignature(LenderSignatureParam memory sigReq) internal returns (bytes memory) {
        bytes32 message;

        {
            message = keccak256(
                abi.encodePacked(
                    sigReq.loanERC20Denomination,
                    sigReq.loanPrincipalAmount,
                    sigReq.maximumRepaymentAmount,
                    sigReq.nftCollateralContract,
                    sigReq.nftCollateralId,
                    sigReq.loanDuration,
                    sigReq.isProRata,
                    sigReq.originationFee,
                    vm.addr(sigReq.signerPk),
                    sigReq.nonce,
                    sigReq.expiry,
                    sigReq.offerType,
                    sigReq.chainId
                )
            );
        }

        vm.startPrank(vm.addr(sigReq.signerPk));
        bytes32 ethSignedMessageHash = message.toEthSignedMessageHash();

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sigReq.signerPk, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        vm.stopPrank();

        return signature;
    }
}
