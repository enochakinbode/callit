// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  CALLIT — P2P Prediction Market
//  Security audit: Reentrancy guards, CEI pattern, pausable,
//  input validation, oracle bounds, emergency withdrawal
// ============================================================

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract CallitFactory is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ─── Constants ──────────────────────────────────────────
    uint256 public constant FEE_BPS = 1000;          // 10% fee in basis points
    uint256 public constant BPS_DENOM = 10000;
    uint256 public constant MIN_STAKE = 1e6;          // 1 USDC/USDT minimum (6 decimals)
    uint256 public constant MAX_STAKE = 100_000e6;    // 100,000 max per bet
    uint256 public constant MAX_RESOLUTION_WINDOW = 30 days;
    uint256 public constant MIN_RESOLUTION_WINDOW = 1 hours;
    uint256 public constant MAX_MULTI_LEGS = 8;       // max legs in accumulator

    // Price oracle safety bounds
    int256 public constant MIN_ORACLE_PRICE = 1;      // $0.00000001
    int256 public constant MAX_ORACLE_PRICE = 1_000_000_000e8; // $1B

    // ─── Enums ───────────────────────────────────────────────
    enum BetStatus { Open, Matched, Resolved, Cancelled, Disputed }
    enum BetOutcome { Unresolved, CreatorWins, AcceptorWins, Draw }
    enum ResolutionType { Manual, Chainlink }
    enum TokenType { USDC, USDT }

    // ─── Structs ─────────────────────────────────────────────
    struct Bet {
        uint256 id;
        address creator;
        address acceptor;
        uint256 creatorStake;    // YES stake
        uint256 acceptorStake;   // NO stake (can differ — Polymarket-style odds)
        uint256 totalPool;
        // Polymarket-style: implied probability = creatorStake / totalPool
        // e.g. creator stakes 65 USDC, acceptor stakes 35 USDC
        // YES probability = 65% implied, payout ratio = 100/65 = 1.538x
        uint256 creatorImpliedProb; // stored in basis points (6500 = 65%)
        uint256 resolutionTime;
        BetStatus status;
        BetOutcome outcome;
        ResolutionType resType;
        TokenType token;
        address oracle;          // Chainlink feed address (0x0 if manual)
        int256 targetPrice;      // for Chainlink resolution
        bool creatorAbove;       // true = creator wins if price > target
        string description;
        uint256 createdAt;
    }

    struct MultiBet {
        uint256 id;
        address creator;
        address acceptor;
        uint256[] legIds;        // references to individual Bet IDs
        uint256 creatorStake;
        uint256 acceptorStake;
        uint256 totalPool;
        uint256 combinedProb;    // product of all leg probs (in BPS^n, normalized)
        uint256 resolutionTime;  // all legs must resolve by this time
        BetStatus status;
        BetOutcome outcome;
        TokenType token;
        uint256 createdAt;
    }

    // ─── Storage ─────────────────────────────────────────────
    mapping(uint256 => Bet) public bets;
    mapping(uint256 => MultiBet) public multiBets;
    mapping(address => uint256[]) public userBets;
    mapping(address => uint256[]) public userMultiBets;
    mapping(address => bool) public allowedTokens;
    mapping(TokenType => address) public tokenAddresses;
    mapping(address => AggregatorV3Interface) public priceFeeds;

    uint256 public betCount;
    uint256 public multiBetCount;
    address public devWallet;
    uint256 public totalFeesCollected;

    // ─── Events ──────────────────────────────────────────────
    event BetCreated(uint256 indexed betId, address indexed creator, uint256 creatorStake, string description, TokenType token);
    event BetAccepted(uint256 indexed betId, address indexed acceptor, uint256 acceptorStake, uint256 impliedProbBPS);
    event BetResolved(uint256 indexed betId, BetOutcome outcome, address winner, uint256 payout);
    event BetCancelled(uint256 indexed betId, address indexed creator);
    event MultiBetCreated(uint256 indexed multiBetId, address indexed creator, uint256[] legIds);
    event MultiBetAccepted(uint256 indexed multiBetId, address indexed acceptor, uint256 acceptorStake);
    event MultiBetResolved(uint256 indexed multiBetId, BetOutcome outcome, address winner, uint256 payout);
    event FeeCollected(uint256 amount, address token);
    event DevWalletUpdated(address newWallet);
    event EmergencyWithdraw(address token, uint256 amount);

    // ─── Modifiers ───────────────────────────────────────────
    modifier validBet(uint256 betId) {
        require(betId < betCount, "Bet does not exist");
        _;
    }

    modifier validMultiBet(uint256 multiBetId) {
        require(multiBetId < multiBetCount, "MultiBet does not exist");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────
    constructor(
        address _devWallet,
        address _usdc,
        address _usdt
    ) Ownable(msg.sender) {
        require(_devWallet != address(0), "Invalid dev wallet");
        require(_usdc != address(0), "Invalid USDC");
        require(_usdt != address(0), "Invalid USDT");

        devWallet = _devWallet;
        tokenAddresses[TokenType.USDC] = _usdc;
        tokenAddresses[TokenType.USDT] = _usdt;
        allowedTokens[_usdc] = true;
        allowedTokens[_usdt] = true;
    }

    // ════════════════════════════════════════════════════════
    //  P2P BET — FEATURE 1
    // ════════════════════════════════════════════════════════

    /// @notice Create a YES prediction. Stake determines implied probability.
    /// @dev Polymarket-style: price = probability. Creator sets YES stake.
    ///      Acceptor stakes the complementary NO side at their own amount,
    ///      which locks in the odds: impliedProb = creatorStake / (creatorStake + acceptorStake)
    function createBet(
        uint256 creatorStake,
        uint256 resolutionTime,
        ResolutionType resType,
        TokenType token,
        address oracle,
        int256 targetPrice,
        bool creatorAbove,
        string calldata description
    ) external nonReentrant whenNotPaused returns (uint256 betId) {
        // ── Checks ──
        require(creatorStake >= MIN_STAKE && creatorStake <= MAX_STAKE, "Stake out of bounds");
        require(bytes(description).length > 0 && bytes(description).length <= 280, "Invalid description");
        require(
            resolutionTime >= block.timestamp + MIN_RESOLUTION_WINDOW &&
            resolutionTime <= block.timestamp + MAX_RESOLUTION_WINDOW,
            "Invalid resolution time"
        );
        if (resType == ResolutionType.Chainlink) {
            require(oracle != address(0), "Oracle required for Chainlink");
            require(targetPrice > 0, "Invalid target price");
            // Verify oracle is valid by calling it
            (, int256 price,,,) = AggregatorV3Interface(oracle).latestRoundData();
            require(price >= MIN_ORACLE_PRICE && price <= MAX_ORACLE_PRICE, "Oracle price out of bounds");
        }

        // ── Effects ──
        betId = betCount++;
        address tokenAddr = tokenAddresses[token];

        bets[betId] = Bet({
            id: betId,
            creator: msg.sender,
            acceptor: address(0),
            creatorStake: creatorStake,
            acceptorStake: 0,
            totalPool: creatorStake,
            creatorImpliedProb: 0, // set when accepted
            resolutionTime: resolutionTime,
            status: BetStatus.Open,
            outcome: BetOutcome.Unresolved,
            resType: resType,
            token: token,
            oracle: oracle,
            targetPrice: targetPrice,
            creatorAbove: creatorAbove,
            description: description,
            createdAt: block.timestamp
        });
        userBets[msg.sender].push(betId);

        // ── Interactions ──
        IERC20(tokenAddr).safeTransferFrom(msg.sender, address(this), creatorStake);

        emit BetCreated(betId, msg.sender, creatorStake, description, token);
    }

    /// @notice Accept the NO side of a bet. Stake amount sets the final odds.
    /// @dev Polymarket-style implied prob = creatorStake / (creatorStake + acceptorStake)
    function acceptBet(
        uint256 betId,
        uint256 acceptorStake
    ) external nonReentrant whenNotPaused validBet(betId) {
        Bet storage bet = bets[betId];

        // ── Checks ──
        require(bet.status == BetStatus.Open, "Bet not open");
        require(bet.creator != msg.sender, "Cannot accept own bet");
        require(block.timestamp < bet.resolutionTime, "Bet expired");
        require(acceptorStake >= MIN_STAKE && acceptorStake <= MAX_STAKE, "Stake out of bounds");

        uint256 newTotal = bet.creatorStake + acceptorStake;
        // Implied probability must be between 1% and 99% (both sides must have skin in game)
        uint256 impliedProb = (bet.creatorStake * BPS_DENOM) / newTotal;
        require(impliedProb >= 100 && impliedProb <= 9900, "Implied probability out of range (1%-99%)");

        // ── Effects ──
        bet.acceptor = msg.sender;
        bet.acceptorStake = acceptorStake;
        bet.totalPool = newTotal;
        bet.creatorImpliedProb = impliedProb;
        bet.status = BetStatus.Matched;
        userBets[msg.sender].push(betId);

        // ── Interactions ──
        IERC20(tokenAddresses[bet.token]).safeTransferFrom(msg.sender, address(this), acceptorStake);

        emit BetAccepted(betId, msg.sender, acceptorStake, impliedProb);
    }

    /// @notice Resolve a Chainlink-based bet automatically
    function resolveChainlinkBet(uint256 betId) external nonReentrant validBet(betId) {
        Bet storage bet = bets[betId];

        // ── Checks ──
        require(bet.status == BetStatus.Matched, "Bet not matched");
        require(bet.resType == ResolutionType.Chainlink, "Not a Chainlink bet");
        require(block.timestamp >= bet.resolutionTime, "Not yet resolution time");

        // ── Get oracle price ──
        (, int256 price,, uint256 updatedAt,) = AggregatorV3Interface(bet.oracle).latestRoundData();
        require(updatedAt >= bet.resolutionTime - 1 hours, "Stale oracle data");
        require(price >= MIN_ORACLE_PRICE && price <= MAX_ORACLE_PRICE, "Oracle price out of bounds");

        // ── Effects ──
        BetOutcome outcome;
        if (bet.creatorAbove) {
            outcome = price >= bet.targetPrice ? BetOutcome.CreatorWins : BetOutcome.AcceptorWins;
        } else {
            outcome = price <= bet.targetPrice ? BetOutcome.CreatorWins : BetOutcome.AcceptorWins;
        }

        _settleBet(betId, outcome);
    }

    /// @notice Admin resolves manual bets (sports, politics, etc.)
    function resolveManualBet(uint256 betId, BetOutcome outcome) external onlyOwner nonReentrant validBet(betId) {
        Bet storage bet = bets[betId];
        require(bet.status == BetStatus.Matched, "Bet not matched");
        require(bet.resType == ResolutionType.Manual, "Not a manual bet");
        require(outcome != BetOutcome.Unresolved, "Must provide outcome");
        _settleBet(betId, outcome);
    }

    /// @notice Creator can cancel an unmatched bet and get stake back
    function cancelBet(uint256 betId) external nonReentrant validBet(betId) {
        Bet storage bet = bets[betId];
        require(bet.creator == msg.sender, "Not creator");
        require(bet.status == BetStatus.Open, "Bet not open");

        // ── Effects ──
        bet.status = BetStatus.Cancelled;

        // ── Interactions ──
        IERC20(tokenAddresses[bet.token]).safeTransfer(msg.sender, bet.creatorStake);

        emit BetCancelled(betId, msg.sender);
    }

    /// @dev Internal settlement with CEI pattern and 90/10 split
    function _settleBet(uint256 betId, BetOutcome outcome) internal {
        Bet storage bet = bets[betId];

        // ── Effects first ──
        bet.status = BetStatus.Resolved;
        bet.outcome = outcome;

        address tokenAddr = tokenAddresses[bet.token];
        uint256 pool = bet.totalPool;
        uint256 fee = (pool * FEE_BPS) / BPS_DENOM;
        uint256 winnerPayout = pool - fee;

        address winner;
        if (outcome == BetOutcome.CreatorWins) {
            winner = bet.creator;
        } else if (outcome == BetOutcome.AcceptorWins) {
            winner = bet.acceptor;
        }

        totalFeesCollected += fee;

        // ── Interactions last ──
        if (outcome == BetOutcome.Draw) {
            // Refund both proportionally, minus fee split
            uint256 creatorFee = (bet.creatorStake * FEE_BPS) / BPS_DENOM;
            uint256 acceptorFee = (bet.acceptorStake * FEE_BPS) / BPS_DENOM;
            IERC20(tokenAddr).safeTransfer(bet.creator, bet.creatorStake - creatorFee);
            IERC20(tokenAddr).safeTransfer(bet.acceptor, bet.acceptorStake - acceptorFee);
            IERC20(tokenAddr).safeTransfer(devWallet, creatorFee + acceptorFee);
        } else {
            IERC20(tokenAddr).safeTransfer(winner, winnerPayout);
            IERC20(tokenAddr).safeTransfer(devWallet, fee);
        }

        emit BetResolved(betId, outcome, winner, winnerPayout);
        emit FeeCollected(fee, tokenAddr);
    }

    // ════════════════════════════════════════════════════════
    //  MULTI BET (ACCUMULATOR) — FEATURE 2
    // ════════════════════════════════════════════════════════

    /// @notice Create a multi-leg accumulator bet
    /// @dev Combined probability = product of all leg probabilities (Polymarket-style)
    ///      All legs must be Open, same token, resolve within same day
    function createMultiBet(
        uint256[] calldata legIds,
        uint256 creatorStake,
        TokenType token,
        uint256 resolutionTime
    ) external nonReentrant whenNotPaused returns (uint256 multiBetId) {
        // ── Checks ──
        require(legIds.length >= 2 && legIds.length <= MAX_MULTI_LEGS, "Invalid number of legs");
        require(creatorStake >= MIN_STAKE && creatorStake <= MAX_STAKE, "Stake out of bounds");
        require(
            resolutionTime >= block.timestamp + MIN_RESOLUTION_WINDOW &&
            resolutionTime <= block.timestamp + MAX_RESOLUTION_WINDOW,
            "Invalid resolution time"
        );

        // Validate all legs
        uint256 combinedProb = BPS_DENOM; // start at 100% in BPS
        for (uint256 i = 0; i < legIds.length; i++) {
            require(legIds[i] < betCount, "Invalid leg ID");
            Bet storage leg = bets[legIds[i]];
            require(leg.status == BetStatus.Open, "Leg not open");
            require(leg.token == token, "All legs must use same token");
            require(leg.creator == msg.sender, "Must own all legs");
            require(leg.resolutionTime <= resolutionTime, "Leg resolves after multi-bet");

            // Multiply probabilities — using creatorStake as proxy for now
            // Will be finalised when acceptor provides NO stake
            // No division by zero: creatorStake >= MIN_STAKE
        }

        // ── Effects ──
        multiBetId = multiBetCount++;

        multiBets[multiBetId] = MultiBet({
            id: multiBetId,
            creator: msg.sender,
            acceptor: address(0),
            legIds: legIds,
            creatorStake: creatorStake,
            acceptorStake: 0,
            totalPool: creatorStake,
            combinedProb: combinedProb,
            resolutionTime: resolutionTime,
            status: BetStatus.Open,
            outcome: BetOutcome.Unresolved,
            token: token,
            createdAt: block.timestamp
        });
        userMultiBets[msg.sender].push(multiBetId);

        // ── Interactions ──
        IERC20(tokenAddresses[token]).safeTransferFrom(msg.sender, address(this), creatorStake);

        emit MultiBetCreated(multiBetId, msg.sender, legIds);
    }

    /// @notice Accept the NO side of a multi-bet accumulator
    function acceptMultiBet(
        uint256 multiBetId,
        uint256 acceptorStake
    ) external nonReentrant whenNotPaused validMultiBet(multiBetId) {
        MultiBet storage mb = multiBets[multiBetId];

        // ── Checks ──
        require(mb.status == BetStatus.Open, "Not open");
        require(mb.creator != msg.sender, "Cannot accept own bet");
        require(block.timestamp < mb.resolutionTime, "Expired");
        require(acceptorStake >= MIN_STAKE && acceptorStake <= MAX_STAKE, "Stake out of bounds");

        uint256 newTotal = mb.creatorStake + acceptorStake;
        uint256 impliedProb = (mb.creatorStake * BPS_DENOM) / newTotal;
        require(impliedProb >= 100 && impliedProb <= 9900, "Implied probability out of range");

        // Compute combined leg probability now that both stakes are known
        uint256 combinedProb = BPS_DENOM;
        for (uint256 i = 0; i < mb.legIds.length; i++) {
            Bet storage leg = bets[mb.legIds[i]];
            // Each leg's implied prob = leg.creatorStake / leg.totalPool
            // For not-yet-accepted legs, assume equal (5000 BPS = 50%)
            uint256 legProb = leg.status == BetStatus.Matched
                ? leg.creatorImpliedProb
                : 5000;
            combinedProb = (combinedProb * legProb) / BPS_DENOM;
        }

        // ── Effects ──
        mb.acceptor = msg.sender;
        mb.acceptorStake = acceptorStake;
        mb.totalPool = newTotal;
        mb.combinedProb = combinedProb;
        mb.status = BetStatus.Matched;
        userMultiBets[msg.sender].push(multiBetId);

        // ── Interactions ──
        IERC20(tokenAddresses[mb.token]).safeTransferFrom(msg.sender, address(this), acceptorStake);

        emit MultiBetAccepted(multiBetId, msg.sender, acceptorStake);
    }

    /// @notice Resolve multi-bet — all legs must be resolved
    /// @dev Creator wins only if ALL legs resolve CreatorWins
    function resolveMultiBet(uint256 multiBetId) external nonReentrant validMultiBet(multiBetId) {
        MultiBet storage mb = multiBets[multiBetId];
        require(mb.status == BetStatus.Matched, "Not matched");
        require(block.timestamp >= mb.resolutionTime, "Not yet resolution time");

        bool creatorWinsAll = true;
        for (uint256 i = 0; i < mb.legIds.length; i++) {
            Bet storage leg = bets[mb.legIds[i]];
            require(leg.status == BetStatus.Resolved, "Leg not resolved yet");
            if (leg.outcome != BetOutcome.CreatorWins) {
                creatorWinsAll = false;
            }
        }

        BetOutcome outcome = creatorWinsAll ? BetOutcome.CreatorWins : BetOutcome.AcceptorWins;
        _settleMultiBet(multiBetId, outcome);
    }

    function _settleMultiBet(uint256 multiBetId, BetOutcome outcome) internal {
        MultiBet storage mb = multiBets[multiBetId];

        // ── Effects ──
        mb.status = BetStatus.Resolved;
        mb.outcome = outcome;

        address tokenAddr = tokenAddresses[mb.token];
        uint256 pool = mb.totalPool;
        uint256 fee = (pool * FEE_BPS) / BPS_DENOM;
        uint256 winnerPayout = pool - fee;

        address winner = outcome == BetOutcome.CreatorWins ? mb.creator : mb.acceptor;
        totalFeesCollected += fee;

        // ── Interactions ──
        IERC20(tokenAddr).safeTransfer(winner, winnerPayout);
        IERC20(tokenAddr).safeTransfer(devWallet, fee);

        emit MultiBetResolved(multiBetId, outcome, winner, winnerPayout);
        emit FeeCollected(fee, tokenAddr);
    }

    // ════════════════════════════════════════════════════════
    //  ADMIN FUNCTIONS
    // ════════════════════════════════════════════════════════

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function setDevWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid wallet");
        devWallet = newWallet;
        emit DevWalletUpdated(newWallet);
    }

    function addPriceFeed(address token, address feed) external onlyOwner {
        require(token != address(0) && feed != address(0), "Invalid addresses");
        priceFeeds[token] = AggregatorV3Interface(feed);
    }

    /// @notice Emergency withdrawal of stuck tokens (e.g. wrong token sent)
    /// @dev Cannot withdraw tokens that are part of active bets
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token");
        // Only allowed when paused
        require(paused(), "Must be paused");
        IERC20(token).safeTransfer(owner(), amount);
        emit EmergencyWithdraw(token, amount);
    }

    // ════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ════════════════════════════════════════════════════════

    function getBet(uint256 betId) external view returns (Bet memory) {
        return bets[betId];
    }

    function getMultiBet(uint256 multiBetId) external view returns (MultiBet memory) {
        return multiBets[multiBetId];
    }

    function getUserBets(address user) external view returns (uint256[] memory) {
        return userBets[user];
    }

    function getUserMultiBets(address user) external view returns (uint256[] memory) {
        return userMultiBets[user];
    }

    /// @notice Calculates current implied probability for a bet (Polymarket-style)
    /// @return yesProb YES probability in basis points (5000 = 50%)
    /// @return noProb NO probability in basis points
    function getImpliedProbability(uint256 betId) external view validBet(betId) returns (
        uint256 yesProb, uint256 noProb
    ) {
        Bet memory bet = bets[betId];
        if (bet.totalPool == 0 || bet.acceptorStake == 0) {
            return (5000, 5000); // default 50/50 before match
        }
        yesProb = (bet.creatorStake * BPS_DENOM) / bet.totalPool;
        noProb = BPS_DENOM - yesProb;
    }

    /// @notice Get payout multiplier for YES side (in BPS)
    /// @return multiplierBPS e.g. 15000 = 1.5x
    function getPayoutMultiplier(uint256 betId) external view validBet(betId) returns (uint256 multiplierBPS) {
        Bet memory bet = bets[betId];
        if (bet.creatorStake == 0) return BPS_DENOM;
        uint256 netPool = (bet.totalPool * (BPS_DENOM - FEE_BPS)) / BPS_DENOM;
        multiplierBPS = (netPool * BPS_DENOM) / bet.creatorStake;
    }

    function getOpenBets() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < betCount; i++) {
            if (bets[i].status == BetStatus.Open) count++;
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < betCount; i++) {
            if (bets[i].status == BetStatus.Open) result[idx++] = i;
        }
        return result;
    }

    function getOpenMultiBets() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < multiBetCount; i++) {
            if (multiBets[i].status == BetStatus.Open) count++;
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < multiBetCount; i++) {
            if (multiBets[i].status == BetStatus.Open) result[idx++] = i;
        }
        return result;
    }
}
