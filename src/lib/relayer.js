import {
  GENLAYER_NETWORK_LABEL,
  parseUSDC,
  RELAYER_API_URL,
  RELAYER_CREATE_MARKET_PATH,
  RELAYER_MARKETS_PATH,
} from './config'
import { inferGenLayerDraftDecision } from '../data/marketArchitecture'

const LOCAL_MARKETS_KEY = 'callit.liveMarkets'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const trimTrailingSlash = (value) => value.replace(/\/+$/, '')

const buildUrl = (path) => {
  if (!RELAYER_API_URL) return ''
  return `${trimTrailingSlash(RELAYER_API_URL)}${path}`
}

const isBytes32Hex = (value) => typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value)

const normalizeUnixSeconds = (value, fallback = Math.floor(Date.now() / 1000)) => {
  if (typeof value === 'bigint') return value > 1_000_000_000_000n ? Number(value / 1000n) : Number(value)
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value)
  }
  if (typeof value === 'string' && value.trim()) {
    const asNumber = Number(value)
    if (Number.isFinite(asNumber) && value.trim() !== '') {
      return asNumber > 1_000_000_000_000 ? Math.floor(asNumber / 1000) : Math.floor(asNumber)
    }
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000)
  }
  return fallback
}

const normalizeProbabilityPercent = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(1, Math.min(99, value))
  if (typeof value === 'string' && value.trim()) {
    const asNumber = Number(value)
    if (Number.isFinite(asNumber)) return Math.max(1, Math.min(99, asNumber))
  }
  return 50
}

const normalizeStakeAmount = (value) => {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 100000 ? BigInt(Math.floor(value)) : parseUSDC(value)
  }
  if (typeof value === 'string' && value.trim()) {
    const normalized = value.trim()
    if (/^\d+$/.test(normalized)) {
      return BigInt(normalized)
    }
    const asNumber = Number(normalized)
    if (Number.isFinite(asNumber)) return parseUSDC(asNumber)
  }
  return 0n
}

const normalizeStatus = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['open', 'approved', 'registered', 'awaiting_funding', 'live'].includes(normalized)) return 0
    if (['matched', 'funded', 'locked'].includes(normalized)) return 1
    if (['resolved', 'finalized', 'settled'].includes(normalized)) return 2
    if (['cancelled', 'canceled'].includes(normalized)) return 3
    if (['disputed', 'challenged'].includes(normalized)) return 4
  }
  return 0
}

const normalizeCreatorAbove = (rawPosition, fallback = true) => {
  if (typeof rawPosition === 'boolean') return rawPosition
  if (typeof rawPosition === 'string') return rawPosition.trim().toUpperCase() !== 'NO'
  return fallback
}

const safeStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null
  return window.localStorage
}

const readLocalMarkets = () => {
  const storage = safeStorage()
  if (!storage) return []
  try {
    const parsed = JSON.parse(storage.getItem(LOCAL_MARKETS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeLocalMarkets = (markets) => {
  const storage = safeStorage()
  if (!storage) return
  storage.setItem(
    LOCAL_MARKETS_KEY,
    JSON.stringify(markets, (_, value) => (typeof value === 'bigint' ? value.toString() : value)),
  )
}

const normalizeListPayload = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.markets)) return payload.markets
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const buildUiMarket = (raw, fallbackDraft = {}) => {
  const statement = raw.statement || raw.description || raw.canonicalStatement || fallbackDraft.statement || 'Untitled market'
  const inferred = inferGenLayerDraftDecision(statement)
  const creatorStake = normalizeStakeAmount(
    raw.creatorStake ??
    raw.creator_stake ??
    raw.stakeUsdc ??
    raw.stake_usdc ??
    fallbackDraft.stakeUsdc ??
    0,
  )
  const acceptorStake = normalizeStakeAmount(
    raw.acceptorStake ??
    raw.acceptor_stake ??
    raw.takerStake ??
    raw.taker_stake ??
    0,
  )
  const totalPool = normalizeStakeAmount(raw.totalPool ?? raw.total_pool ?? creatorStake + acceptorStake)
  const marketId = raw.marketId || raw.market_id || raw.id || `gl-market-${Date.now().toString(36).toUpperCase()}`
  const vaultMarketId = raw.vaultMarketId || raw.vault_market_id || raw.baseMarketId || raw.base_market_id || (isBytes32Hex(marketId) ? marketId : '')
  const probabilityBps = raw.probabilityBps ?? raw.probability_bps
  const probabilityPercent = normalizeProbabilityPercent(
    raw.probabilityPercent ??
    raw.probability_percent ??
    (typeof probabilityBps === 'number' || typeof probabilityBps === 'string' ? Number(probabilityBps) / 100 : undefined) ??
    raw.yesProb,
  )

  return {
    id: vaultMarketId || marketId,
    marketId,
    vaultMarketId,
    description: statement,
    category: raw.category || inferred.category,
    creatorAbove: normalizeCreatorAbove(raw.creatorPosition ?? raw.creator_position ?? raw.creatorAbove, fallbackDraft.creatorPosition !== 'NO'),
    status: normalizeStatus(raw.status),
    creatorStake,
    acceptorStake,
    totalPool,
    resolutionTime: BigInt(normalizeUnixSeconds(raw.cutoffIso ?? raw.cutoff_iso ?? raw.resolutionTime ?? raw.resolution_time ?? fallbackDraft.cutoffIso)),
    createdAt: BigInt(normalizeUnixSeconds(raw.createdAt ?? raw.created_at)),
    creator: raw.creator || raw.creatorAddress || raw.creator_address || ZERO_ADDRESS,
    acceptor: raw.acceptor || raw.acceptorAddress || raw.acceptor_address || raw.taker || ZERO_ADDRESS,
    probabilityPercent,
    yesProb: probabilityPercent,
    primarySourceIds: raw.primarySources || raw.primary_sources || raw.primarySourceIds || inferred.primarySourceIds,
    supplementalSources: raw.supplementalSources || raw.supplemental_sources || fallbackDraft.supplementalSources || [],
    relayerMessage: raw.message || raw.relayerMessage || 'Live market fetched from the relayer.',
    fundingStatus: raw.fundingStatus || raw.funding_status || (vaultMarketId ? 'ready_to_fund' : 'registered'),
    dataSource: raw.dataSource || 'relayer',
    genlayerNetwork: raw.genlayerNetwork || raw.genlayer_network || GENLAYER_NETWORK_LABEL,
  }
}

const normalizeResponse = (response, draft) => {
  const inferred = inferGenLayerDraftDecision(draft.statement)
  const market = buildUiMarket(response, draft)
  return {
    marketId: market.marketId,
    vaultMarketId: market.vaultMarketId,
    category: response.category || inferred.category,
    templateLabel: response.templateLabel || response.template_label || inferred.template?.label || 'GenLayer-selected template',
    settlementMode: response.settlementMode || response.settlement_mode || inferred.settlementMode,
    primarySourceIds: response.primarySources || response.primary_sources || inferred.primarySourceIds,
    fundingDeadlineIso: response.fundingDeadlineIso || response.funding_deadline_iso || draft.fundingDeadlineIso,
    cutoffIso: response.cutoffIso || response.cutoff_iso || draft.cutoffIso,
    resolutionRule: response.resolutionRule || response.resolution_rule || draft.resolutionRule,
    probabilityPercent: market.probabilityPercent,
    relayerMessage: response.message || 'Relayer submitted the market to GenLayer and returned a market ID.',
    genlayerNetwork: response.genlayerNetwork || response.genlayer_network || GENLAYER_NETWORK_LABEL,
    market,
  }
}

const createDemoResponse = async (draft) => {
  await new Promise(resolve => setTimeout(resolve, 900))
  return normalizeResponse({}, draft)
}

export function getLocalMarkets() {
  return readLocalMarkets().map(entry => buildUiMarket(entry))
}

export function persistLocalMarket(market) {
  const current = readLocalMarkets()
  const next = [market, ...current.filter(entry => (entry.vaultMarketId || entry.marketId || entry.id) !== (market.vaultMarketId || market.marketId || market.id))]
  writeLocalMarkets(next)
}

export function markLocalMarketFunded(marketId, creatorStake) {
  const current = readLocalMarkets()
  const next = current.map(entry => {
    const entryId = entry.vaultMarketId || entry.marketId || entry.id
    if (entryId !== marketId) return entry
    const stake = normalizeStakeAmount(creatorStake ?? entry.creatorStake)
    return {
      ...entry,
      creatorStake: stake.toString(),
      totalPool: stake.toString(),
      status: 0,
      fundingStatus: 'funded-on-base',
    }
  })
  writeLocalMarkets(next)
}

export function mergeMarkets(...lists) {
  const merged = new Map()
  for (const list of lists) {
    for (const market of list || []) {
      const key = String(market.vaultMarketId || market.marketId || market.id)
      if (!key) continue
      if (!merged.has(key)) {
        merged.set(key, market)
        continue
      }
      const current = merged.get(key)
      merged.set(key, { ...current, ...market })
    }
  }
  return Array.from(merged.values())
}

export async function fetchMarketsFromRelayer() {
  const url = buildUrl(RELAYER_MARKETS_PATH)

  if (!url) {
    return []
  }

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  const payload = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = payload.message || payload.error || 'Failed to load markets from the relayer'
    throw new Error(message)
  }

  return normalizeListPayload(payload).map(entry => buildUiMarket(entry))
}

export async function fetchMarketsForAddress(address) {
  const url = buildUrl(RELAYER_MARKETS_PATH)
  if (!url || !address) {
    return []
  }

  const requestUrl = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
  requestUrl.searchParams.set('address', address)

  const res = await fetch(requestUrl.toString(), { headers: { Accept: 'application/json' } })
  const payload = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = payload.message || payload.error || 'Failed to load user markets from the relayer'
    throw new Error(message)
  }

  return normalizeListPayload(payload).map(entry => buildUiMarket(entry))
}

export async function submitMarketToRelayer(draft) {
  const url = buildUrl(RELAYER_CREATE_MARKET_PATH)

  if (!url) {
    const demo = await createDemoResponse(draft)
    persistLocalMarket(demo.market)
    return demo
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      statement: draft.statement,
      cutoffIso: draft.cutoffIso,
      fundingDeadlineIso: draft.fundingDeadlineIso,
      resolutionRule: draft.resolutionRule,
      creatorPosition: draft.creatorPosition,
      creatorAddress: draft.creatorAddress,
      stakeUsdc: draft.stakeUsdc,
      supplementalSources: draft.supplementalSources,
    }),
  })

  const payload = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = payload.message || payload.error || 'Relayer rejected the market request'
    throw new Error(message)
  }

  const normalized = normalizeResponse(payload, draft)
  persistLocalMarket(normalized.market)
  return normalized
}
