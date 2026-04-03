// ─── Callit — Chain & Contract Configuration ───────────────
// All addresses are checksummed. Update after each deployment.

export const DEV_WALLET = "0x3dc5b334EA7a6a33da61F950bBEfaC615cF1A55b"

export const SUPPORTED_CHAINS = {
  baseSepolia: {
    id: 84532,
    name: "Base Sepolia",
    label: "Base Sepolia",
    live: false,
    testnet: true,
    rpc: "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    vault: (import.meta.env.VITE_BASE_SEPOLIA_VAULT_ADDRESS || '').trim(),
    tokens: {
      // Native USDC on Base Sepolia — Circle docs
      USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      USDT: "",
    },
  },
  base: {
    id: 8453,
    name: "Base",
    label: "Base Mainnet",
    live: true,
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    vault: (import.meta.env.VITE_BASE_VAULT_ADDRESS || '').trim(),
    tokens: {
      USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    },
  },
}

export const ACTIVE_CHAIN = SUPPORTED_CHAINS.baseSepolia
const DEFAULT_RELAYER_API_URL = import.meta.env.DEV ? '' : '/api'
export const RELAYER_API_URL = (import.meta.env.VITE_RELAYER_API_URL || DEFAULT_RELAYER_API_URL).trim()
export const RELAYER_CREATE_MARKET_PATH = '/markets'
export const RELAYER_MARKETS_PATH = '/markets'
export const GENLAYER_NETWORK = (import.meta.env.VITE_GENLAYER_NETWORK || 'testnet-asimov').trim()
export const GENLAYER_NETWORK_LABEL = GENLAYER_NETWORK === 'testnet-asimov' ? 'GenLayer Asimov' : GENLAYER_NETWORK
export const GENLAYER_STUDIO_URL = (import.meta.env.VITE_GENLAYER_STUDIO_URL || 'https://studio.genlayer.com/contracts?import-contract=0xC0e1cDF15dA2AD5880e8D73C14FF84C510eF293f').trim()

export const BASE_VAULT_ABI = [
  "function minStakeAmount() view returns (uint256)",
  "function registerApprovedMarket(bytes32 marketId, address creator, uint64 fundingDeadline, uint64 resolutionTime, bool accumulator)",
  "function fundCreatorSide(bytes32 marketId, uint256 amount)",
  "function matchMarket(bytes32 marketId, uint256 amount)",
  "function cancelUnmatched(bytes32 marketId)",
  "function recordProvisionalOutcome(bytes32 marketId, bytes32 settlementHash, uint64 disputeDeadline)",
  "function recordDispute(bytes32 marketId)",
  "function settleMarket(bytes32 marketId, uint8 outcome, uint256 creatorPayout, uint256 takerPayout, bytes32 settlementHash)",
  "function refundMarket(bytes32 marketId, bytes32 settlementHash)",
  "function setMinStakeAmount(uint256 newAmount)",
]

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
]


// ─── Constants ───────────────────────────────────────────────
export const FEE_PERCENT = 2
export const MIN_STAKE_USDC = 1        // 1 USDC
export const MAX_STAKE_USDC = 100_000  // 100K USDC
export const USDC_DECIMALS = 6
export const GENLAYER_DISPUTE_WINDOW_HOURS = 1
export const DEFAULT_MARKET_QUALITY_BOND_USDC = 25

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

/** Payout multiplier for YES side (net of 2% fee) */
export const calcPayoutMultiplier = (yesStake, noStake) => {
  const total = Number(yesStake) + Number(noStake)
  if (!yesStake || yesStake === 0) return 1
  const net = total * 0.98 // 2% fee
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
