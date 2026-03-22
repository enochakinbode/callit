// ─── Callit — Chain & Contract Configuration ───────────────
// All addresses are checksummed. Update after each deployment.

export const DEV_WALLET = "0x3dc5b334EA7a6a33da61F950bBEfaC615cF1A55b"

export const SUPPORTED_CHAINS = {
  base: {
    id: 8453,
    name: "Base",
    label: "Base",
    live: true,
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    factory: "0x4efc17c30391D5be0FA8B8C736b5222CC59F7818",
    tokens: {
      USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    },
    priceFeeds: {
      BTC: "0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F",
      ETH: "0x71041dddad3595F9CEd3dCCFBe3D1F4b0a16Bb70",
    },
  },
  arbitrum: {
    id: 42161,
    name: "Arbitrum",
    label: "Arbitrum",
    live: false, // coming soon
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    factory: "", // deploy next
    tokens: {
      USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    },
  },
  bnb: {
    id: 56,
    name: "BNB Chain",
    label: "BNB",
    live: false,
    rpc: "https://bsc-dataseed.binance.org",
    explorer: "https://bscscan.com",
    factory: "",
    tokens: {
      USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      USDT: "0x55d398326f99059fF775485246999027B3197955",
    },
  },
  solana: {
    id: null,
    name: "Solana",
    label: "Solana",
    live: false,
    soon: true,
  },
  tempo: {
    // Tempo Testnet (Moderato) — mainnet RPC pending official publish
    // Mainnet blog: https://tempo.xyz/blog/mainnet
    // Switch to mainnet chain ID + RPC once Tempo publishes: https://rpc.tempo.xyz
    id: 42431,
    name: "Tempo",
    label: "Tempo",
    live: false,
    soon: true,
    testnet: true,
    rpc: "https://rpc.moderato.tempo.xyz",
    rpcMainnet: "https://rpc.tempo.xyz", // mainnet — chain ID TBD
    explorer: "https://explore.tempo.xyz",
    factory: "", // deploy after mainnet chain ID is confirmed
    nativeGasToken: false, // Tempo has no native gas token — fees paid in stablecoins
    tokens: {
      // pathUSD is Tempo's first deployed stablecoin
      pathUSD: "0x20c0000000000000000000000000000000000000",
      // USDC address TBD after mainnet launch
    },
    mpp: true, // Machine Payments Protocol supported
    agentSettlement: true, // AI agents can auto-settle markets via MPP
    description: "Payment-optimized blockchain by Paradigm + Stripe. Instant settlement, predictable fees, AI agent support via MPP.",
  },
}

export const ACTIVE_CHAIN = SUPPORTED_CHAINS.base

// ─── Contract ABI (key functions only for frontend) ─────────
export const FACTORY_ABI = [
  // Read
  "function betCount() view returns (uint256)",
  "function multiBetCount() view returns (uint256)",
  "function getBet(uint256) view returns (tuple(uint256 id, address creator, address acceptor, uint256 creatorStake, uint256 acceptorStake, uint256 totalPool, uint256 creatorImpliedProb, uint256 resolutionTime, uint8 status, uint8 outcome, uint8 resType, uint8 token, address oracle, int256 targetPrice, bool creatorAbove, string description, uint256 createdAt))",
  "function getMultiBet(uint256) view returns (tuple(uint256 id, address creator, address acceptor, uint256[] legIds, uint256 creatorStake, uint256 acceptorStake, uint256 totalPool, uint256 combinedProb, uint256 resolutionTime, uint8 status, uint8 outcome, uint8 token, uint256 createdAt))",
  "function getUserBets(address) view returns (uint256[])",
  "function getUserMultiBets(address) view returns (uint256[])",
  "function getImpliedProbability(uint256) view returns (uint256 yesProb, uint256 noProb)",
  "function getPayoutMultiplier(uint256) view returns (uint256)",
  "function getOpenBets() view returns (uint256[])",
  "function getOpenMultiBets() view returns (uint256[])",
  // Write
  "function createBet(uint256 creatorStake, uint256 resolutionTime, uint8 resType, uint8 token, address oracle, int256 targetPrice, bool creatorAbove, string description) returns (uint256)",
  "function acceptBet(uint256 betId, uint256 acceptorStake)",
  "function cancelBet(uint256 betId)",
  "function resolveChainlinkBet(uint256 betId)",
  "function createMultiBet(uint256[] legIds, uint256 creatorStake, uint8 token, uint256 resolutionTime) returns (uint256)",
  "function acceptMultiBet(uint256 multiBetId, uint256 acceptorStake)",
  "function resolveMultiBet(uint256 multiBetId)",
  // Admin
  "function resolveManualBet(uint256 betId, uint8 outcome)",
  "function pause()",
  "function unpause()",
  // Events
  "event BetCreated(uint256 indexed betId, address indexed creator, uint256 creatorStake, string description, uint8 token)",
  "event BetAccepted(uint256 indexed betId, address indexed acceptor, uint256 acceptorStake, uint256 impliedProbBPS)",
  "event BetResolved(uint256 indexed betId, uint8 outcome, address winner, uint256 payout)",
  "event MultiBetCreated(uint256 indexed multiBetId, address indexed creator, uint256[] legIds)",
  "event MultiBetResolved(uint256 indexed multiBetId, uint8 outcome, address winner, uint256 payout)",
]

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
]


// ─── Constants ───────────────────────────────────────────────
export const FEE_PERCENT = 10
export const MIN_STAKE_USDC = 1        // 1 USDC
export const MAX_STAKE_USDC = 100_000  // 100K USDC
export const USDC_DECIMALS = 6

export const BET_STATUS = {
  0: "Open",
  1: "Matched",
  2: "Resolved",
  3: "Cancelled",
  4: "Disputed",
}

export const BET_OUTCOME = {
  0: "Unresolved",
  1: "Creator Wins",
  2: "Acceptor Wins",
  3: "Draw",
}

export const RESOLUTION_TYPE = {
  MANUAL: 0,
  CHAINLINK: 1,
}

export const TOKEN_TYPE = {
  USDC: 0,
  USDT: 1,
}

// ─── Helpers ─────────────────────────────────────────────────

/** Format USDC amount (6 decimals) to human readable */
export const formatUSDC = (amount) => {
  if (!amount) return "0.00"
  return (Number(amount) / 1e6).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Parse human USDC to contract units — with overflow and NaN protection */
export const parseUSDC = (amount) => {
  const n = Number(amount)
  if (!Number.isFinite(n) || n < 0) return BigInt(0)
  if (n > MAX_STAKE_USDC) return BigInt(MAX_STAKE_USDC * 1e6) // hard cap
  return BigInt(Math.floor(n * 1e6))
}

/** Validate an Ethereum address is properly formatted */
export const isValidAddress = (addr) => {
  return typeof addr === 'string' && /^0x[0-9a-fA-F]{40}$/.test(addr)
}

/** Validate a bet ID is a safe non-negative integer */
export const isValidBetId = (id) => {
  return Number.isInteger(id) && id >= 0 && id < 2**32
}

/** Convert BPS to percent string */
export const bpsToPercent = (bps) => {
  return ((Number(bps) / 10000) * 100).toFixed(1) + "%"
}

/** Implied probability from stakes (Polymarket style) */
export const calcImpliedProb = (yesStake, noStake) => {
  const total = Number(yesStake) + Number(noStake)
  if (total === 0) return { yes: 50, no: 50 }
  const yes = (Number(yesStake) / total) * 100
  return { yes: +yes.toFixed(1), no: +(100 - yes).toFixed(1) }
}

/** Payout multiplier for YES side (net of 10% fee) */
export const calcPayoutMultiplier = (yesStake, noStake) => {
  const total = Number(yesStake) + Number(noStake)
  if (!yesStake || yesStake === 0) return 1
  const net = total * 0.9 // 10% fee
  return +(net / Number(yesStake)).toFixed(2)
}

/** Combined accumulator probability */
export const calcCombinedProb = (legProbs) => {
  return legProbs.reduce((acc, p) => acc * (p / 100), 1) * 100
}

/** Format unix timestamp to readable */
export const formatDate = (ts) => {
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
  })
}

/** Shorten address */
export const shortAddr = (addr) => {
  if (!addr) return ""
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
