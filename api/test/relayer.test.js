import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { deriveVaultMarketId } from '../_lib/utils.js'
import { StateStore } from '../_lib/store.js'
import { RelayerService } from '../_lib/service.js'

test('deriveVaultMarketId is deterministic and bytes32-shaped', () => {
  const first = deriveVaultMarketId('gl-market-42')
  const second = deriveVaultMarketId('gl-market-42')
  assert.equal(first, second)
  assert.match(first, /^0x[a-f0-9]{64}$/)
})

test('StateStore persists merged market records', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'callit-relayer-store-'))
  const filePath = path.join(tempDir, 'state.json')
  const store = new StateStore(filePath)

  await store.upsertMarket('gl-market-1', {
    statement: 'Will BTC close above $100k on Jan 1?',
    genlayer: { status: 'APPROVED_PENDING_FUNDING' },
  })
  await store.upsertMarket('gl-market-1', {
    base: { vaultMarketId: deriveVaultMarketId('gl-market-1') },
  })
  await store.save()

  const reloaded = new StateStore(filePath)
  const record = await reloaded.getMarket('gl-market-1')

  assert.equal(record.statement, 'Will BTC close above $100k on Jan 1?')
  assert.equal(record.genlayer.status, 'APPROVED_PENDING_FUNDING')
  assert.match(record.base.vaultMarketId, /^0x[a-f0-9]{64}$/)
})

test('RelayerService returns a frontend-compatible market after submission', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'callit-relayer-service-'))
  const store = new StateStore(path.join(tempDir, 'state.json'))

  const service = new RelayerService({
    config: {
      genlayer: { network: 'testnet-asimov' },
    },
    store,
    logger: console,
    genlayer: {
      isReady: () => true,
      isReadable: () => true,
      submitMarket: async () => ({
        market_id: 'gl-market-9',
        category: 'Crypto',
        template_id: 'crypto-threshold',
        settlement_mode: 'PRIMARY_SOURCE_CONSENSUS',
        status: 'APPROVED_PENDING_FUNDING',
        probability_bps: 5700,
        confidence_bps: 7600,
        primary_sources: ['coingecko', 'defillama'],
      }),
      listMarkets: async () => [],
      getResolutionPacket: async () => ({}),
      getChallenge: async () => ({ exists: false }),
      resolveMarket: async () => null,
      finalizeMarket: async () => null,
    },
    base: {
      canRegister: () => false,
      canSettle: () => false,
      isReadable: () => false,
    },
  })

  const market = await service.submitMarket({
    statement: 'Will BTC close above $100k on Jan 1?',
    creatorAddress: '0x000000000000000000000000000000000000dEaD',
    creatorPosition: 'YES',
    stakeUsdc: 25,
    cutoffIso: '2026-12-31T23:00:00.000Z',
    fundingDeadlineIso: '2026-12-31T22:45:00.000Z',
    resolutionRule: 'Resolve from approved crypto market data sources only.',
    supplementalSources: [],
  })

  assert.equal(market.marketId, 'gl-market-9')
  assert.equal(market.vaultMarketId, '')
  assert.equal(market.category, 'Crypto')
  assert.equal(market.probabilityPercent, 57)
  assert.equal(market.fundingStatus, 'registered')
  assert.equal(market.dataSource, 'relayer')
})

test('RelayerService filters markets by related wallet address', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'callit-relayer-address-'))
  const store = new StateStore(path.join(tempDir, 'state.json'))

  await store.upsertMarket('gl-market-1', {
    statement: 'Market one',
    creatorAddress: '0x000000000000000000000000000000000000dEaD',
    genlayer: { category: 'Crypto', probabilityBps: 5100 },
    base: {
      vaultMarketId: deriveVaultMarketId('gl-market-1'),
      onchain: {
        creator: '0x000000000000000000000000000000000000dEaD',
        taker: '0x000000000000000000000000000000000000bEEF',
        creatorStake: '1000000',
        takerStake: '1000000',
        resolutionTime: '1767222000',
        state: 3,
      },
    },
  })

  await store.upsertMarket('gl-market-2', {
    statement: 'Market two',
    creatorAddress: '0x000000000000000000000000000000000000c0Fe',
    genlayer: { category: 'Sports', probabilityBps: 6200 },
  })

  const service = new RelayerService({
    config: { genlayer: { network: 'testnet-asimov' } },
    store,
    logger: console,
    genlayer: {
      isReady: () => false,
      isReadable: () => false,
    },
    base: {
      canRegister: () => false,
      canSettle: () => false,
      isReadable: () => false,
    },
  })

  const related = await service.listMarkets({
    address: '0x000000000000000000000000000000000000bEEF',
  })

  assert.equal(related.length, 1)
  assert.equal(related[0].marketId, 'gl-market-1')
})
