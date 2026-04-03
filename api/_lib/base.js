import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  zeroAddress,
  zeroHash,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { isPrivateKeyHex, isoToUnixSeconds, normalizeSettlementHash } from './utils.js'

const VAULT_ABI = parseAbi([
  'function registerApprovedMarket(bytes32 marketId, address creator, uint64 fundingDeadline, uint64 resolutionTime, bool accumulator)',
  'function recordProvisionalOutcome(bytes32 marketId, bytes32 settlementHash, uint64 disputeDeadline)',
  'function recordDispute(bytes32 marketId)',
  'function settleMarket(bytes32 marketId, uint8 outcome, uint256 creatorPayout, uint256 takerPayout, bytes32 settlementHash)',
  'function refundMarket(bytes32 marketId, bytes32 settlementHash)',
  'function markets(bytes32 marketId) view returns (address creator, address taker, uint128 creatorStake, uint128 takerStake, uint64 fundingDeadline, uint64 resolutionTime, uint64 disputeDeadline, uint8 state, bool accumulator, bytes32 settlementHash)',
])

const FEE_BPS = 200n
const BPS_DENOMINATOR = 10_000n

function makeChain(config) {
  return {
    id: config.chainId,
    name: `Base ${config.chainId}`,
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [config.rpcUrl] },
      public: { http: [config.rpcUrl] },
    },
  }
}

function normalizeMarket(result) {
  const market = Array.isArray(result)
    ? {
        creator: result[0],
        taker: result[1],
        creatorStake: result[2],
        takerStake: result[3],
        fundingDeadline: result[4],
        resolutionTime: result[5],
        disputeDeadline: result[6],
        state: result[7],
        accumulator: result[8],
        settlementHash: result[9],
      }
    : result

  if (!market || market.creator === zeroAddress) return null
  return market
}

export class BaseAdapter {
  constructor(config) {
    this.config = config
    this.chain = config.rpcUrl ? makeChain(config) : null
    const approvalKey = isPrivateKeyHex(config.approvalPrivateKey) ? config.approvalPrivateKey : ''
    const settlementKey = isPrivateKeyHex(config.settlementPrivateKey) ? config.settlementPrivateKey : ''
    this.publicClient = this.chain
      ? createPublicClient({ chain: this.chain, transport: http(config.rpcUrl) })
      : null
    this.approvalClient = approvalKey && this.chain
      ? createWalletClient({
          account: privateKeyToAccount(approvalKey),
          chain: this.chain,
          transport: http(config.rpcUrl),
        })
      : null
    this.settlementClient = settlementKey && this.chain
      ? createWalletClient({
          account: privateKeyToAccount(settlementKey),
          chain: this.chain,
          transport: http(config.rpcUrl),
        })
      : null
  }

  isReadable() {
    return Boolean(this.publicClient && this.config.vaultAddress)
  }

  canRegister() {
    return Boolean(this.approvalClient && this.publicClient && this.config.vaultAddress)
  }

  canSettle() {
    return Boolean(this.settlementClient && this.publicClient && this.config.vaultAddress)
  }

  async getMarket(vaultMarketId) {
    if (!this.isReadable()) return null
    const result = await this.publicClient.readContract({
      address: this.config.vaultAddress,
      abi: VAULT_ABI,
      functionName: 'markets',
      args: [vaultMarketId],
    })
    return normalizeMarket(result)
  }

  async #write(client, functionName, args) {
    const hash = await client.writeContract({
      address: this.config.vaultAddress,
      abi: VAULT_ABI,
      functionName,
      args,
      chain: this.chain,
      account: client.account,
    })
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
    return { hash, receipt }
  }

  async registerApprovedMarket({ vaultMarketId, creatorAddress, fundingDeadlineIso, cutoffIso }) {
    return this.#write(this.approvalClient, 'registerApprovedMarket', [
      vaultMarketId,
      creatorAddress,
      BigInt(isoToUnixSeconds(fundingDeadlineIso)),
      BigInt(isoToUnixSeconds(cutoffIso)),
      false,
    ])
  }

  async recordProvisionalOutcome({ vaultMarketId, settlementHash, disputeDeadlineIso }) {
    return this.#write(this.settlementClient, 'recordProvisionalOutcome', [
      vaultMarketId,
      normalizeSettlementHash(settlementHash),
      BigInt(isoToUnixSeconds(disputeDeadlineIso)),
    ])
  }

  async recordDispute({ vaultMarketId }) {
    return this.#write(this.settlementClient, 'recordDispute', [vaultMarketId])
  }

  async settleMarket({ vaultMarketId, creatorStake, takerStake, creatorWins, settlementHash }) {
    const creatorStakeAmount = BigInt(creatorStake)
    const takerStakeAmount = BigInt(takerStake)
    const grossPool = creatorStakeAmount + takerStakeAmount
    const fee = (grossPool * FEE_BPS) / BPS_DENOMINATOR
    const netPool = grossPool - fee
    return this.#write(this.settlementClient, 'settleMarket', [
      vaultMarketId,
      creatorWins ? 1 : 2,
      creatorWins ? netPool : 0n,
      creatorWins ? 0n : netPool,
      normalizeSettlementHash(settlementHash),
    ])
  }

  async refundMarket({ vaultMarketId, settlementHash }) {
    return this.#write(this.settlementClient, 'refundMarket', [
      vaultMarketId,
      settlementHash ? normalizeSettlementHash(settlementHash) : zeroHash,
    ])
  }
}
