import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureParentDir, isPrivateKeyHex, parseInteger } from './utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..', '..')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const separator = line.indexOf('=')
    const key = line.slice(0, separator).trim()
    if (!key || process.env[key]) continue
    let value = line.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

export function loadEnvironment() {
  loadEnvFile(path.join(ROOT_DIR, '.env'))
  loadEnvFile(path.join(ROOT_DIR, '.env.local'))
  loadEnvFile(path.join(ROOT_DIR, 'genlayer', '.env'))
  loadEnvFile(path.join(ROOT_DIR, 'base', '.env'))
}

function readEnv(name, fallback = '') {
  return (process.env[name] || fallback).trim()
}

function chainIdFromNetwork(networkName) {
  if (networkName === 'testnet-bradbury') return 28516
  if (networkName === 'testnet-asimov') return 58754
  return 84532
}

export function getRelayerConfig() {
  loadEnvironment()

  const genlayerNetwork = readEnv('RELAYER_GENLAYER_NETWORK', readEnv('VITE_GENLAYER_NETWORK', 'testnet-asimov'))
  const defaultStatePath = process.env.VERCEL
    ? '/tmp/callit-relayer-state.json'
    : path.join(ROOT_DIR, 'api', 'data', 'state.json')
  const statePath = readEnv(
    'RELAYER_STATE_PATH',
    defaultStatePath,
  )

  ensureParentDir(statePath)

  return {
    rootDir: ROOT_DIR,
    host: readEnv('RELAYER_HOST', '127.0.0.1'),
    port: parseInteger(readEnv('RELAYER_PORT', '8787'), 8787),
    pollIntervalMs: parseInteger(readEnv('RELAYER_POLL_INTERVAL_MS', '15000'), 15000),
    publicApiUrl: readEnv('RELAYER_PUBLIC_API_URL'),
    statePath,
    database: {
      url: readEnv('DATABASE_URL', readEnv('POSTGRES_URL')),
    },
    genlayer: {
      network: genlayerNetwork,
      chainId: chainIdFromNetwork(genlayerNetwork),
      rpcUrl: readEnv('RELAYER_GENLAYER_RPC_URL', readEnv('GENLAYER_RPC_URL')),
      contractAddress: readEnv('RELAYER_GENLAYER_CONTRACT_ADDRESS'),
      privateKey: readEnv('RELAYER_GENLAYER_PRIVATE_KEY', readEnv('RELAYER_RESOLVER_PRIVATE_KEY')),
    },
    base: {
      rpcUrl: readEnv('RELAYER_BASE_RPC_URL', readEnv('BASE_SEPOLIA_RPC_URL')),
      chainId: parseInteger(readEnv('RELAYER_BASE_CHAIN_ID', '84532'), 84532),
      vaultAddress: readEnv(
        'RELAYER_BASE_VAULT_ADDRESS',
        readEnv('VITE_BASE_SEPOLIA_VAULT_ADDRESS', readEnv('VITE_BASE_VAULT_ADDRESS')),
      ),
      approvalPrivateKey: readEnv(
        'RELAYER_BASE_APPROVAL_PRIVATE_KEY',
        readEnv('RELAYER_BASE_OPERATOR_PRIVATE_KEY', readEnv('RELAYER_BASE_PRIVATE_KEY')),
      ),
      settlementPrivateKey: readEnv(
        'RELAYER_BASE_SETTLEMENT_PRIVATE_KEY',
        readEnv('RELAYER_BASE_OPERATOR_PRIVATE_KEY', readEnv('RELAYER_BASE_PRIVATE_KEY')),
      ),
    },
  }
}

export function describeConfig(config) {
  return {
    host: config.host,
    port: config.port,
    statePath: config.statePath,
    storageMode: config.database?.url ? 'postgres' : 'file',
    genlayer: {
      network: config.genlayer.network,
      rpcConfigured: Boolean(config.genlayer.rpcUrl),
      contractConfigured: Boolean(config.genlayer.contractAddress),
      signerConfigured: isPrivateKeyHex(config.genlayer.privateKey),
    },
    base: {
      rpcConfigured: Boolean(config.base.rpcUrl),
      vaultConfigured: Boolean(config.base.vaultAddress),
      approvalSignerConfigured: isPrivateKeyHex(config.base.approvalPrivateKey),
      settlementSignerConfigured: isPrivateKeyHex(config.base.settlementPrivateKey),
    },
  }
}
