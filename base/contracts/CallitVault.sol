// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CallitVault
/// @notice Shared Base vault for Callit v3. GenLayer decides, this contract only
///         accounts for funds, enforces one-time settlement, and executes payouts.
contract CallitVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint16 public constant FEE_BPS = 200;
    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant DEFAULT_MIN_STAKE = 1e6;

    enum MarketState {
        None,
        ApprovedPendingFunding,
        ActiveOpen,
        ActiveMatched,
        ProvisionallyResolved,
        InDispute,
        FinalSettled,
        FinalRefunded,
        SafetyUnwound
    }

    enum SettlementOutcome {
        None,
        CreatorWins,
        TakerWins,
        Refund
    }

    struct Market {
        address creator;
        address taker;
        uint128 creatorStake;
        uint128 takerStake;
        uint64 fundingDeadline;
        uint64 resolutionTime;
        uint64 disputeDeadline;
        MarketState state;
        bool accumulator;
        bytes32 settlementHash;
    }

    IERC20 public immutable USDC;
    address public treasury;
    uint256 public minStakeAmount;

    mapping(bytes32 => Market) public markets;
    mapping(address => bool) public approvalOperators;
    mapping(address => bool) public settlementRelayers;

    event ApprovalOperatorUpdated(address indexed operator, bool allowed);
    event SettlementRelayerUpdated(address indexed relayer, bool allowed);
    event TreasuryUpdated(address indexed treasury);
    event MinStakeAmountUpdated(uint256 minStakeAmount);
    event MarketApproved(
        bytes32 indexed marketId,
        address indexed creator,
        uint64 fundingDeadline,
        uint64 resolutionTime,
        bool accumulator
    );
    event CreatorFunded(bytes32 indexed marketId, address indexed creator, uint256 amount);
    event MarketMatched(bytes32 indexed marketId, address indexed taker, uint256 amount);
    event MarketCancelled(bytes32 indexed marketId);
    event ProvisionalOutcomeRecorded(bytes32 indexed marketId, bytes32 settlementHash, uint64 disputeDeadline);
    event MarketDisputed(bytes32 indexed marketId);
    event MarketSettled(
        bytes32 indexed marketId,
        SettlementOutcome outcome,
        uint256 creatorPayout,
        uint256 takerPayout,
        uint256 fee
    );
    event MarketRefunded(bytes32 indexed marketId, uint256 creatorRefund, uint256 takerRefund);
    event SafetyUnwind(bytes32 indexed marketId, uint256 creatorRefund, uint256 takerRefund, string reason);

    modifier onlyApprovalOperator() {
        _onlyApprovalOperator();
        _;
    }

    modifier onlySettlementRelayer() {
        _onlySettlementRelayer();
        _;
    }

    modifier marketExists(bytes32 marketId) {
        _marketExists(marketId);
        _;
    }

    function _onlyApprovalOperator() internal view {
        require(approvalOperators[msg.sender], "Approval operator only");
    }

    function _onlySettlementRelayer() internal view {
        require(settlementRelayers[msg.sender], "Settlement relayer only");
    }

    function _marketExists(bytes32 marketId) internal view {
        require(markets[marketId].creator != address(0), "Unknown market");
    }

    constructor(address usdcAddress, address treasuryAddress) Ownable(msg.sender) {
        require(usdcAddress != address(0), "Invalid USDC");
        require(treasuryAddress != address(0), "Invalid treasury");
        USDC = IERC20(usdcAddress);
        treasury = treasuryAddress;
        minStakeAmount = DEFAULT_MIN_STAKE;
    }

    function setApprovalOperator(address operator, bool allowed) external onlyOwner {
        require(operator != address(0), "Invalid operator");
        approvalOperators[operator] = allowed;
        emit ApprovalOperatorUpdated(operator, allowed);
    }

    function setSettlementRelayer(address relayer, bool allowed) external onlyOwner {
        require(relayer != address(0), "Invalid relayer");
        settlementRelayers[relayer] = allowed;
        emit SettlementRelayerUpdated(relayer, allowed);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setMinStakeAmount(uint256 newAmount) external onlyOwner {
        require(newAmount > 0, "Zero amount");
        minStakeAmount = newAmount;
        emit MinStakeAmountUpdated(newAmount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function registerApprovedMarket(
        bytes32 marketId,
        address creator,
        uint64 fundingDeadline,
        uint64 resolutionTime,
        bool accumulator
    ) external whenNotPaused onlyApprovalOperator {
        require(marketId != bytes32(0), "Invalid market ID");
        require(creator != address(0), "Invalid creator");
        require(markets[marketId].creator == address(0), "Market already registered");
        require(fundingDeadline > block.timestamp, "Funding deadline must be future");
        require(resolutionTime > fundingDeadline, "Resolution must follow funding");

        markets[marketId] = Market({
            creator: creator,
            taker: address(0),
            creatorStake: 0,
            takerStake: 0,
            fundingDeadline: fundingDeadline,
            resolutionTime: resolutionTime,
            disputeDeadline: 0,
            state: MarketState.ApprovedPendingFunding,
            accumulator: accumulator,
            settlementHash: bytes32(0)
        });

        emit MarketApproved(marketId, creator, fundingDeadline, resolutionTime, accumulator);
    }

    function fundCreatorSide(bytes32 marketId, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        marketExists(marketId)
    {
        Market storage market = markets[marketId];
        require(msg.sender == market.creator, "Creator only");
        require(market.state == MarketState.ApprovedPendingFunding, "Funding closed");
        require(block.timestamp <= market.fundingDeadline, "Funding expired");
        require(amount >= minStakeAmount, "Stake below minimum");
        require(market.creatorStake == 0, "Already funded");

        market.creatorStake = _toUint128(amount);
        market.state = MarketState.ActiveOpen;

        USDC.safeTransferFrom(msg.sender, address(this), amount);
        emit CreatorFunded(marketId, msg.sender, amount);
    }

    function matchMarket(bytes32 marketId, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        marketExists(marketId)
    {
        Market storage market = markets[marketId];
        require(market.state == MarketState.ActiveOpen, "Market not open");
        require(block.timestamp <= market.resolutionTime, "Resolution time reached");
        require(msg.sender != market.creator, "Creator cannot match");
        require(amount >= minStakeAmount, "Stake below minimum");
        require(market.taker == address(0), "Already matched");

        market.taker = msg.sender;
        market.takerStake = _toUint128(amount);
        market.state = MarketState.ActiveMatched;

        USDC.safeTransferFrom(msg.sender, address(this), amount);
        emit MarketMatched(marketId, msg.sender, amount);
    }

    function cancelUnmatched(bytes32 marketId)
        external
        whenNotPaused
        nonReentrant
        marketExists(marketId)
    {
        Market storage market = markets[marketId];
        require(msg.sender == market.creator, "Creator only");
        require(market.state == MarketState.ActiveOpen, "Not cancelable");
        require(block.timestamp > market.fundingDeadline, "Funding still open");

        uint256 creatorRefund = market.creatorStake;
        market.creatorStake = 0;
        market.state = MarketState.FinalRefunded;

        USDC.safeTransfer(market.creator, creatorRefund);
        emit MarketCancelled(marketId);
        emit MarketRefunded(marketId, creatorRefund, 0);
    }

    function recordProvisionalOutcome(bytes32 marketId, bytes32 settlementHash, uint64 disputeDeadline)
        external
        whenNotPaused
        marketExists(marketId)
        onlySettlementRelayer
    {
        Market storage market = markets[marketId];
        require(market.state == MarketState.ActiveMatched, "Not ready for resolution");
        require(block.timestamp >= market.resolutionTime, "Resolution time not reached");
        require(settlementHash != bytes32(0), "Invalid settlement hash");
        require(disputeDeadline > block.timestamp, "Invalid dispute deadline");

        market.state = MarketState.ProvisionallyResolved;
        market.disputeDeadline = disputeDeadline;
        market.settlementHash = settlementHash;

        emit ProvisionalOutcomeRecorded(marketId, settlementHash, disputeDeadline);
    }

    function recordDispute(bytes32 marketId)
        external
        whenNotPaused
        marketExists(marketId)
        onlySettlementRelayer
    {
        Market storage market = markets[marketId];
        require(market.state == MarketState.ProvisionallyResolved, "No provisional outcome");
        require(block.timestamp <= market.disputeDeadline, "Dispute window closed");

        market.state = MarketState.InDispute;
        emit MarketDisputed(marketId);
    }

    function settleMarket(
        bytes32 marketId,
        SettlementOutcome outcome,
        uint256 creatorPayout,
        uint256 takerPayout,
        bytes32 settlementHash
    ) external whenNotPaused nonReentrant marketExists(marketId) onlySettlementRelayer {
        Market storage market = markets[marketId];
        require(
            market.state == MarketState.ProvisionallyResolved || market.state == MarketState.InDispute,
            "Market not finalizable"
        );
        require(block.timestamp > market.disputeDeadline, "Dispute window still open");
        require(settlementHash == market.settlementHash, "Settlement hash mismatch");
        require(outcome == SettlementOutcome.CreatorWins || outcome == SettlementOutcome.TakerWins, "Invalid outcome");

        uint256 creatorStake = market.creatorStake;
        uint256 takerStake = market.takerStake;
        uint256 grossPool = creatorStake + takerStake;
        uint256 fee = (grossPool * FEE_BPS) / BPS_DENOMINATOR;
        uint256 netPool = grossPool - fee;

        if (outcome == SettlementOutcome.CreatorWins) {
            require(creatorPayout == netPool && takerPayout == 0, "Bad creator payout");
        } else {
            require(takerPayout == netPool && creatorPayout == 0, "Bad taker payout");
        }

        market.state = MarketState.FinalSettled;
        market.creatorStake = 0;
        market.takerStake = 0;

        if (creatorPayout > 0) {
            USDC.safeTransfer(market.creator, creatorPayout);
        }
        if (takerPayout > 0) {
            USDC.safeTransfer(market.taker, takerPayout);
        }
        if (fee > 0) {
            USDC.safeTransfer(treasury, fee);
        }

        emit MarketSettled(marketId, outcome, creatorPayout, takerPayout, fee);
    }

    function refundMarket(bytes32 marketId, bytes32 settlementHash)
        external
        whenNotPaused
        nonReentrant
        marketExists(marketId)
        onlySettlementRelayer
    {
        Market storage market = markets[marketId];
        require(
            market.state == MarketState.ProvisionallyResolved ||
            market.state == MarketState.InDispute ||
            market.state == MarketState.ActiveMatched,
            "Market not refundable"
        );

        if (market.settlementHash != bytes32(0)) {
            require(settlementHash == market.settlementHash, "Settlement hash mismatch");
        }

        if (market.state == MarketState.ActiveMatched) {
            require(block.timestamp >= market.resolutionTime, "Resolution time not reached");
        } else {
            require(block.timestamp > market.disputeDeadline, "Dispute window still open");
        }

        uint256 creatorRefund = market.creatorStake;
        uint256 takerRefund = market.takerStake;

        market.state = MarketState.FinalRefunded;
        market.creatorStake = 0;
        market.takerStake = 0;

        if (creatorRefund > 0) {
            USDC.safeTransfer(market.creator, creatorRefund);
        }
        if (takerRefund > 0) {
            USDC.safeTransfer(market.taker, takerRefund);
        }

        emit MarketRefunded(marketId, creatorRefund, takerRefund);
    }

    function adminSafetyUnwind(bytes32 marketId, string calldata reason)
        external
        onlyOwner
        nonReentrant
        marketExists(marketId)
    {
        Market storage market = markets[marketId];
        require(paused(), "Pause required");
        require(
            market.state != MarketState.FinalSettled &&
            market.state != MarketState.FinalRefunded &&
            market.state != MarketState.SafetyUnwound,
            "Market already closed"
        );

        uint256 creatorRefund = market.creatorStake;
        uint256 takerRefund = market.takerStake;

        market.state = MarketState.SafetyUnwound;
        market.creatorStake = 0;
        market.takerStake = 0;

        if (creatorRefund > 0) {
            USDC.safeTransfer(market.creator, creatorRefund);
        }
        if (takerRefund > 0 && market.taker != address(0)) {
            USDC.safeTransfer(market.taker, takerRefund);
        }

        emit SafetyUnwind(marketId, creatorRefund, takerRefund, reason);
    }

    function _toUint128(uint256 value) internal pure returns (uint128) {
        require(value <= type(uint128).max, "Amount too large");
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint128(value);
    }
}
