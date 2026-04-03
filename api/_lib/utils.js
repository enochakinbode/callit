import fs from 'node:fs'
import path from 'node:path'
import { keccak256, stringToHex, zeroAddress, zeroHash } from 'viem'

export { zeroAddress, zeroHash }

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

export function ensureParentDir(filePath) {
  ensureDir(path.dirname(filePath))
}

export function safeParseJson(value, fallback = null) {
  if (value == null || value === '') return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function nowIso() {
  return new Date().toISOString()
}

export function isoToUnixSeconds(value) {
  if (!value) return 0
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return 0
  return Math.floor(parsed / 1000)
}

export function deriveVaultMarketId(genlayerMarketId) {
  return keccak256(stringToHex(String(genlayerMarketId)))
}

export function normalizeSettlementHash(value) {
  if (typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value)) {
    return value
  }
  if (!value) return zeroHash
  return keccak256(stringToHex(String(value)))
}

export function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function formatError(error) {
  if (!error) return 'Unknown error'
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return JSON.stringify(error)
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function sortBySubmittedAtDesc(records) {
  return [...records].sort((left, right) => {
    const leftTime = Date.parse(left.submittedAtIso || 0)
    const rightTime = Date.parse(right.submittedAtIso || 0)
    return rightTime - leftTime
  })
}

export function normalizeAddress(value) {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().toLowerCase()
  return /^0x[a-f0-9]{40}$/.test(normalized) ? normalized : ''
}

export function isPrivateKeyHex(value) {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value.trim())
}
