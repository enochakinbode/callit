import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { formatError, isPrivateKeyHex, safeParseJson } from './utils.js'

const execFileAsync = promisify(execFile)

const NETWORK_EXPORTS = {
  localnet: 'localnet',
  studionet: 'studionet',
  'testnet-asimov': 'testnetAsimov',
  'testnet-bradbury': 'testnetBradbury',
}

let cachedSdk = null

async function resolveSdkPaths() {
  const { stdout } = await execFileAsync('npm', ['root', '-g'])
  const globalRoot = stdout.trim()
  return {
    sdkPath: path.join(globalRoot, 'genlayer', 'node_modules', 'genlayer-js', 'dist', 'index.js'),
    chainsPath: path.join(globalRoot, 'genlayer', 'node_modules', 'genlayer-js', 'dist', 'chains', 'index.js'),
  }
}

async function loadSdk() {
  if (cachedSdk) return cachedSdk
  const { sdkPath, chainsPath } = await resolveSdkPaths()
  const sdk = await import(pathToFileURL(sdkPath).href)
  const chains = await import(pathToFileURL(chainsPath).href)
  cachedSdk = { sdk, chains }
  return cachedSdk
}

function normalizeJsonResult(result) {
  if (typeof result === 'string') return safeParseJson(result, result)
  return result
}

function marketSortValue(marketId) {
  const match = String(marketId || '').match(/(\d+)$/)
  return match ? Number(match[1]) : -1
}

export class GenLayerAdapter {
  constructor(config, logger = console) {
    this.config = config
    this.logger = logger
    this.readClient = null
    this.writeClient = null
  }

  isReady() {
    return Boolean(this.config.rpcUrl && this.config.contractAddress && isPrivateKeyHex(this.config.privateKey))
  }

  isReadable() {
    return Boolean(this.config.rpcUrl && this.config.contractAddress)
  }

  async #getChain() {
    const { chains } = await loadSdk()
    return chains[NETWORK_EXPORTS[this.config.network] || 'testnetAsimov']
  }

  async #getReadClient() {
    if (this.readClient) return this.readClient
    const { sdk } = await loadSdk()
    this.readClient = sdk.createClient({
      chain: await this.#getChain(),
      endpoint: this.config.rpcUrl,
    })
    await this.readClient.initializeConsensusSmartContract()
    return this.readClient
  }

  async #getWriteClient() {
    if (this.writeClient) return this.writeClient
    const { sdk } = await loadSdk()
    this.writeClient = sdk.createClient({
      chain: await this.#getChain(),
      endpoint: this.config.rpcUrl,
      account: sdk.createAccount(this.config.privateKey),
    })
    await this.writeClient.initializeConsensusSmartContract()
    return this.writeClient
  }

  async #read(functionName, args = []) {
    const client = await this.#getReadClient()
    const result = await client.readContract({
      address: this.config.contractAddress,
      functionName,
      args,
    })
    return normalizeJsonResult(result)
  }

  async #write(functionName, args = []) {
    const client = await this.#getWriteClient()
    const hash = await client.writeContract({
      address: this.config.contractAddress,
      functionName,
      args,
      value: 0n,
    })
    const receipt = await client.waitForTransactionReceipt({
      hash,
      retries: 100,
      interval: 5000,
    })

    if (receipt?.txExecutionResultName === 'FINISHED_WITH_ERROR') {
      throw new Error(`GenLayer ${functionName} failed`)
    }

    return { hash, receipt }
  }

  async listMarkets() {
    if (!this.isReadable()) return []
    const result = await this.#read('get_all_markets')
    const markets = Array.isArray(result?.markets) ? result.markets : []
    return [...markets].sort((left, right) => marketSortValue(right.market_id) - marketSortValue(left.market_id))
  }

  async getMarket(marketId) {
    return this.#read('get_market', [marketId])
  }

  async getResolutionPacket(marketId) {
    return this.#read('get_resolution_packet', [marketId])
  }

  async getChallenge(marketId) {
    return this.#read('get_challenge', [marketId])
  }

  async submitMarket(draft) {
    const before = await this.listMarkets()
    const knownIds = new Set(before.map(market => market.market_id))

    await this.#write('submit_market', [JSON.stringify({
      statement: draft.statement,
      cutoff_iso: draft.cutoffIso,
      funding_deadline_iso: draft.fundingDeadlineIso,
      resolution_rule: draft.resolutionRule,
      supplemental_sources: draft.supplementalSources || [],
    })])

    const after = await this.listMarkets()
    const newlyCreated = after.find(market => !knownIds.has(market.market_id))
    if (newlyCreated) return newlyCreated

    const matched = after.find(market =>
      market.statement === draft.statement &&
      market.cutoff_iso === draft.cutoffIso &&
      market.funding_deadline_iso === draft.fundingDeadlineIso,
    )
    if (matched) return matched

    throw new Error('Market was submitted to GenLayer but could not be located afterwards')
  }

  async resolveMarket(marketId) {
    await this.#write('resolve_market', [marketId])
    return {
      market: await this.getMarket(marketId),
      resolutionPacket: await this.getResolutionPacket(marketId),
    }
  }

  async finalizeMarket(marketId) {
    await this.#write('finalize_market', [marketId])
    return this.getMarket(marketId)
  }

  logFailure(label, error) {
    this.logger.error(`${label}: ${formatError(error)}`)
  }
}
