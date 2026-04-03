import fs from 'node:fs'
import { Pool } from 'pg'
import { attachDatabasePool } from '@vercel/functions'
import { clone, ensureParentDir, normalizeAddress, nowIso } from './utils.js'

const EMPTY_STATE = {
  markets: {},
}

function defaultMarketRecord(genlayerMarketId) {
  return {
    genlayerMarketId,
    submittedAtIso: nowIso(),
    creatorPosition: 'YES',
    supplementalSources: [],
    requestedStakeUsdc: 0,
    genlayer: {},
    base: {},
  }
}

export function mergeMarketRecord(current, update) {
  const baseRecord = current || defaultMarketRecord(update.genlayerMarketId)
  return {
    ...baseRecord,
    ...update,
    genlayer: {
      ...(baseRecord.genlayer || {}),
      ...(update.genlayer || {}),
    },
    base: {
      ...(baseRecord.base || {}),
      ...(update.base || {}),
    },
    supplementalSources: update.supplementalSources || baseRecord.supplementalSources || [],
    submittedAtIso: update.submittedAtIso || baseRecord.submittedAtIso || nowIso(),
  }
}

export function collectParticipantAddresses(record) {
  return Array.from(new Set([
    normalizeAddress(record.creatorAddress),
    normalizeAddress(record.base?.onchain?.creator),
    normalizeAddress(record.base?.onchain?.taker),
    normalizeAddress(record.genlayer?.challenge?.challenger),
  ].filter(Boolean)))
}

export class StateStore {
  constructor(filePath) {
    this.filePath = filePath
    this.state = this.#read()
  }

  #read() {
    ensureParentDir(this.filePath)
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, `${JSON.stringify(EMPTY_STATE, null, 2)}\n`)
      return clone(EMPTY_STATE)
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'))
      return {
        ...clone(EMPTY_STATE),
        ...parsed,
        markets: parsed?.markets || {},
      }
    } catch {
      return clone(EMPTY_STATE)
    }
  }

  async save() {
    ensureParentDir(this.filePath)
    fs.writeFileSync(this.filePath, `${JSON.stringify(this.state, null, 2)}\n`)
  }

  async getMarket(genlayerMarketId) {
    return this.state.markets[genlayerMarketId] || null
  }

  async getAllMarkets() {
    return Object.values(this.state.markets)
  }

  async countMarkets() {
    return Object.keys(this.state.markets).length
  }

  async listMarketsByAddress(address) {
    const normalized = normalizeAddress(address)
    if (!normalized) return []
    return Object.values(this.state.markets).filter(record => collectParticipantAddresses(record).includes(normalized))
  }

  async upsertMarket(genlayerMarketId, update) {
    const current = await this.getMarket(genlayerMarketId)
    const next = mergeMarketRecord(current, {
      ...update,
      genlayerMarketId,
    })
    this.state.markets[genlayerMarketId] = next
    return next
  }
}

let sharedPool = null

function getPool(connectionString) {
  if (!sharedPool) {
    sharedPool = new Pool({
      connectionString,
      max: 4,
    })
    attachDatabasePool(sharedPool)
  }
  return sharedPool
}

export class PostgresStore {
  constructor(connectionString) {
    this.pool = getPool(connectionString)
    this.readyPromise = null
  }

  async #ensureSchema() {
    if (!this.readyPromise) {
      this.readyPromise = (async () => {
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS relayer_markets (
            genlayer_market_id TEXT PRIMARY KEY,
            vault_market_id TEXT,
            creator_address TEXT,
            participant_addresses TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
            submitted_at_iso TEXT NOT NULL,
            updated_at_iso TEXT NOT NULL,
            payload JSONB NOT NULL
          );
        `)
        await this.pool.query(`
          CREATE INDEX IF NOT EXISTS relayer_markets_participants_idx
          ON relayer_markets USING GIN (participant_addresses);
        `)
        await this.pool.query(`
          CREATE INDEX IF NOT EXISTS relayer_markets_submitted_idx
          ON relayer_markets (submitted_at_iso DESC);
        `)
      })()
    }

    await this.readyPromise
  }

  async save() {
    await this.#ensureSchema()
  }

  async getMarket(genlayerMarketId) {
    await this.#ensureSchema()
    const result = await this.pool.query(
      `SELECT payload
       FROM relayer_markets
       WHERE genlayer_market_id = $1`,
      [genlayerMarketId],
    )
    return result.rows[0]?.payload || null
  }

  async getAllMarkets() {
    await this.#ensureSchema()
    const result = await this.pool.query(
      `SELECT payload
       FROM relayer_markets
       ORDER BY submitted_at_iso DESC`,
    )
    return result.rows.map(row => row.payload)
  }

  async countMarkets() {
    await this.#ensureSchema()
    const result = await this.pool.query('SELECT COUNT(*)::int AS count FROM relayer_markets')
    return result.rows[0]?.count || 0
  }

  async listMarketsByAddress(address) {
    await this.#ensureSchema()
    const normalized = normalizeAddress(address)
    if (!normalized) return []

    const result = await this.pool.query(
      `SELECT payload
       FROM relayer_markets
       WHERE $1 = ANY(participant_addresses)
       ORDER BY submitted_at_iso DESC`,
      [normalized],
    )
    return result.rows.map(row => row.payload)
  }

  async upsertMarket(genlayerMarketId, update) {
    await this.#ensureSchema()
    const current = await this.getMarket(genlayerMarketId)
    const next = mergeMarketRecord(current, {
      ...update,
      genlayerMarketId,
    })
    const participantAddresses = collectParticipantAddresses(next)
    await this.pool.query(
      `INSERT INTO relayer_markets (
         genlayer_market_id,
         vault_market_id,
         creator_address,
         participant_addresses,
         submitted_at_iso,
         updated_at_iso,
         payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (genlayer_market_id) DO UPDATE SET
         vault_market_id = EXCLUDED.vault_market_id,
         creator_address = EXCLUDED.creator_address,
         participant_addresses = EXCLUDED.participant_addresses,
         submitted_at_iso = EXCLUDED.submitted_at_iso,
         updated_at_iso = EXCLUDED.updated_at_iso,
         payload = EXCLUDED.payload`,
      [
        genlayerMarketId,
        next.base?.vaultMarketId || null,
        normalizeAddress(next.creatorAddress) || null,
        participantAddresses,
        next.submittedAtIso || nowIso(),
        nowIso(),
        JSON.stringify(next),
      ],
    )
    return next
  }
}

export function createStore(config) {
  if (config.database?.url) {
    return new PostgresStore(config.database.url)
  }
  return new StateStore(config.statePath)
}
