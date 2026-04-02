// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CallitVault} from "../contracts/CallitVault.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract CallitVaultTest is Test {
    MockUSDC internal usdc;
    CallitVault internal vault;

    address internal owner = address(0xA11CE);
    address internal approvalOperator = address(0xAA01);
    address internal relayer = address(0xBEEF);
    address internal treasury = address(0xFEE1);
    address internal creator = address(0xCA11);
    address internal taker = address(0xB0B);

    bytes32 internal marketId = keccak256("market-1");
    uint256 internal creatorStake = 75e6;
    uint256 internal takerStake = 25e6;

    function setUp() public {
        vm.startPrank(owner);
        usdc = new MockUSDC();
        vault = new CallitVault(address(usdc), treasury);
        vault.setApprovalOperator(approvalOperator, true);
        vault.setSettlementRelayer(relayer, true);
        vm.stopPrank();

        usdc.mint(creator, 500e6);
        usdc.mint(taker, 500e6);

        vm.prank(creator);
        usdc.approve(address(vault), type(uint256).max);

        vm.prank(taker);
        usdc.approve(address(vault), type(uint256).max);
    }

    function test_defaultMinStakeIsOneUsdc() public view {
        assertEq(vault.minStakeAmount(), 1e6);
    }

    function test_ownerCanUpdateMinStake() public {
        vm.prank(owner);
        vault.setMinStakeAmount(5e6);

        assertEq(vault.minStakeAmount(), 5e6);
    }

    function test_fundCreatorSideRevertsBelowMinStake() public {
        uint64 fundingDeadline = uint64(block.timestamp + 1 days);
        uint64 resolutionTime = uint64(block.timestamp + 2 days);

        vm.prank(approvalOperator);
        vault.registerApprovedMarket(marketId, creator, fundingDeadline, resolutionTime, false);

        vm.prank(creator);
        vm.expectRevert("Stake below minimum");
        vault.fundCreatorSide(marketId, 999_999);
    }

    function test_matchMarketRevertsBelowMinStake() public {
        uint64 fundingDeadline = uint64(block.timestamp + 1 days);
        uint64 resolutionTime = uint64(block.timestamp + 2 days);

        vm.prank(approvalOperator);
        vault.registerApprovedMarket(marketId, creator, fundingDeadline, resolutionTime, false);

        vm.prank(creator);
        vault.fundCreatorSide(marketId, creatorStake);

        vm.prank(taker);
        vm.expectRevert("Stake below minimum");
        vault.matchMarket(marketId, 999_999);
    }

    function test_registerFundMatchAndSettleCreatorWin() public {
        uint64 fundingDeadline = uint64(block.timestamp + 1 days);
        uint64 resolutionTime = uint64(block.timestamp + 2 days);

        vm.prank(approvalOperator);
        vault.registerApprovedMarket(marketId, creator, fundingDeadline, resolutionTime, false);

        vm.prank(creator);
        vault.fundCreatorSide(marketId, creatorStake);

        vm.prank(taker);
        vault.matchMarket(marketId, takerStake);

        bytes32 settlementHash = keccak256("settlement-creator");
        uint64 disputeDeadline = uint64(resolutionTime + 1 hours);

        vm.warp(resolutionTime);

        vm.prank(relayer);
        vault.recordProvisionalOutcome(marketId, settlementHash, disputeDeadline);

        vm.warp(disputeDeadline + 1);

        uint256 grossPool = creatorStake + takerStake;
        uint256 fee = (grossPool * 200) / 10_000;
        uint256 creatorPayout = grossPool - fee;

        vm.prank(relayer);
        vault.settleMarket(
            marketId,
            CallitVault.SettlementOutcome.CreatorWins,
            creatorPayout,
            0,
            settlementHash
        );

        assertEq(usdc.balanceOf(creator), 500e6 - creatorStake + creatorPayout);
        assertEq(usdc.balanceOf(taker), 500e6 - takerStake);
        assertEq(usdc.balanceOf(treasury), fee);

        (, , uint128 storedCreatorStake, uint128 storedTakerStake, , , , CallitVault.MarketState state, , ) = vault.markets(marketId);
        assertEq(uint256(storedCreatorStake), 0);
        assertEq(uint256(storedTakerStake), 0);
        assertEq(uint256(state), uint256(CallitVault.MarketState.FinalSettled));
    }

    function test_refundMatchedMarket() public {
        uint64 fundingDeadline = uint64(block.timestamp + 1 days);
        uint64 resolutionTime = uint64(block.timestamp + 2 days);

        vm.prank(approvalOperator);
        vault.registerApprovedMarket(marketId, creator, fundingDeadline, resolutionTime, false);

        vm.prank(creator);
        vault.fundCreatorSide(marketId, creatorStake);

        vm.prank(taker);
        vault.matchMarket(marketId, takerStake);

        bytes32 settlementHash = keccak256("refund");
        uint64 disputeDeadline = uint64(resolutionTime + 1 hours);

        vm.warp(resolutionTime);

        vm.prank(relayer);
        vault.recordProvisionalOutcome(marketId, settlementHash, disputeDeadline);

        vm.warp(disputeDeadline + 1);

        vm.prank(relayer);
        vault.refundMarket(marketId, settlementHash);

        assertEq(usdc.balanceOf(creator), 500e6);
        assertEq(usdc.balanceOf(taker), 500e6);

        (, , uint128 storedCreatorStake, uint128 storedTakerStake, , , , CallitVault.MarketState state, , ) = vault.markets(marketId);
        assertEq(uint256(storedCreatorStake), 0);
        assertEq(uint256(storedTakerStake), 0);
        assertEq(uint256(state), uint256(CallitVault.MarketState.FinalRefunded));
    }

    function test_recordProvisionalOutcomeRevertsBeforeResolutionTime() public {
        uint64 fundingDeadline = uint64(block.timestamp + 1 days);
        uint64 resolutionTime = uint64(block.timestamp + 2 days);

        vm.prank(approvalOperator);
        vault.registerApprovedMarket(marketId, creator, fundingDeadline, resolutionTime, false);

        vm.prank(creator);
        vault.fundCreatorSide(marketId, creatorStake);

        vm.prank(taker);
        vault.matchMarket(marketId, takerStake);

        vm.prank(relayer);
        vm.expectRevert("Resolution time not reached");
        vault.recordProvisionalOutcome(marketId, keccak256("too-early"), uint64(block.timestamp + 1 hours));
    }

    function test_settleMarketRevertsBeforeDisputeDeadline() public {
        uint64 fundingDeadline = uint64(block.timestamp + 1 days);
        uint64 resolutionTime = uint64(block.timestamp + 2 days);

        vm.prank(approvalOperator);
        vault.registerApprovedMarket(marketId, creator, fundingDeadline, resolutionTime, false);

        vm.prank(creator);
        vault.fundCreatorSide(marketId, creatorStake);

        vm.prank(taker);
        vault.matchMarket(marketId, takerStake);

        bytes32 settlementHash = keccak256("creator-win");
        uint64 disputeDeadline = uint64(resolutionTime + 1 hours);

        vm.warp(resolutionTime);

        vm.prank(relayer);
        vault.recordProvisionalOutcome(marketId, settlementHash, disputeDeadline);

        uint256 grossPool = creatorStake + takerStake;
        uint256 fee = (grossPool * 200) / 10_000;
        uint256 creatorPayout = grossPool - fee;

        vm.prank(relayer);
        vm.expectRevert("Dispute window still open");
        vault.settleMarket(
            marketId,
            CallitVault.SettlementOutcome.CreatorWins,
            creatorPayout,
            0,
            settlementHash
        );
    }

    function test_refundMatchedMarketRevertsBeforeResolutionTime() public {
        uint64 fundingDeadline = uint64(block.timestamp + 1 days);
        uint64 resolutionTime = uint64(block.timestamp + 2 days);

        vm.prank(approvalOperator);
        vault.registerApprovedMarket(marketId, creator, fundingDeadline, resolutionTime, false);

        vm.prank(creator);
        vault.fundCreatorSide(marketId, creatorStake);

        vm.prank(taker);
        vault.matchMarket(marketId, takerStake);

        vm.prank(relayer);
        vm.expectRevert("Resolution time not reached");
        vault.refundMarket(marketId, bytes32(0));
    }

    function test_recordDisputeRevertsAfterDisputeDeadline() public {
        uint64 fundingDeadline = uint64(block.timestamp + 1 days);
        uint64 resolutionTime = uint64(block.timestamp + 2 days);

        vm.prank(approvalOperator);
        vault.registerApprovedMarket(marketId, creator, fundingDeadline, resolutionTime, false);

        vm.prank(creator);
        vault.fundCreatorSide(marketId, creatorStake);

        vm.prank(taker);
        vault.matchMarket(marketId, takerStake);

        bytes32 settlementHash = keccak256("late-dispute");
        uint64 disputeDeadline = uint64(resolutionTime + 1 hours);

        vm.warp(resolutionTime);

        vm.prank(relayer);
        vault.recordProvisionalOutcome(marketId, settlementHash, disputeDeadline);

        vm.warp(disputeDeadline + 1);

        vm.prank(relayer);
        vm.expectRevert("Dispute window closed");
        vault.recordDispute(marketId);
    }
}
