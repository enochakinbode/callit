import {
  deriveVaultMarketId,
  formatError,
  isoToUnixSeconds,
  nowIso,
  sortBySubmittedAtDesc,
  zeroAddress,
} from './utils.js'

const BASE_STATE = {
  ApprovedPendingFunding: 1,
  ActiveOpen: 2,
  ActiveMatched: 3,
  ProvisionallyResolved: 4,
  InDispute: 5,
  FinalSettled: 6,
  FinalRefunded: 7,
  SafetyUnwound: 8,
}

const GEN_FINAL_STATUSES = new Set([
  'FINAL_CREATOR_WINS',
  'FINAL_TAKER_WINS',
  'FINAL_REFUNDED',
])

function validateDraft(draft) {
  if (!draft || typeof draft !== 'object') throw new Error('Market payload is required')
  if (!String(draft.statement || '').trim()) throw new Error('Statement is required')
  if (!String(draft.cutoffIso || '').trim()) throw new Error('Cutoff time is required')
  if (!String(draft.fundingDeadlineIso || '').trim()) throw new Error('Funding deadline is required')
  if (!String(draft.resolutionRule || '').trim()) throw new Error('Resolution rule is required')
  if (!String(draft.creatorAddress || '').trim()) throw new Error('Creator address is required')
}

function probabilityPercent(probabilityBps) {
  const value = Number(probabilityBps || 0)
  if (!Number.isFinite(value) || value <= 0) return 50
  return Math.max(1, Math.min(99, Math.round(value / 100)))
}

function frontEndStatus(record, baseMarket) {
  if (baseMarket) {
    if (baseMarket.state === BASE_STATE.ActiveMatched) return 1
    if (baseMarket.state === BASE_STATE.ProvisionallyResolved || baseMarket.state === BASE_STATE.InDispute) return 4
    if (baseMarket.state === BASE_STATE.FinalSettled) return 2
    if (baseMarket.state === BASE_STATE.FinalRefunded || baseMarket.state === BASE_STATE.SafetyUnwound) return 3
    return 0
  }

  if (record.genlayer?.status === 'FINAL_REFUNDED') return 3
  return 0
}

function fundingStatus(record, baseMarket) {
  if (!baseMarket) return record.base?.registeredAtIso ? 'ready_to_fund' : 'registered'
  if (baseMarket.state === BASE_STATE.ApprovedPendingFunding) return 'ready_to_fund'
  if (baseMarket.state === BASE_STATE.ActiveOpen) return 'funded-on-base'
  if (baseMarket.state === BASE_STATE.ActiveMatched) return 'matched'
  if (baseMarket.state === BASE_STATE.ProvisionallyResolved) return 'provisional'
  if (baseMarket.state === BASE_STATE.InDispute) return 'in_dispute'
  if (baseMarket.state === BASE_STATE.FinalSettled) return 'settled'
  if (baseMarket.state === BASE_STATE.FinalRefunded || baseMarket.state === BASE_STATE.SafetyUnwound) return 'refunded'
  return 'registered'
}

function relayerMessage(record, baseMarket) {
  if (baseMarket?.state === BASE_STATE.FinalSettled) {
    return 'GenLayer finalized the market and the relayer settled it on Base.'
  }
  if (baseMarket?.state === BASE_STATE.FinalRefunded || baseMarket?.state === BASE_STATE.SafetyUnwound) {
    return 'GenLayer marked this market for refund and the relayer returned funds on Base.'
  }
  if (baseMarket?.state === BASE_STATE.ProvisionallyResolved || baseMarket?.state === BASE_STATE.InDispute) {
    return 'GenLayer has produced a provisional outcome and the relayer mirrored it into the Base vault.'
  }
  if (record.base?.registeredAtIso) {
    return 'Relayer submitted the market to GenLayer, approved it, and registered it on Base.'
  }
  return 'Relayer submitted the market to GenLayer and is waiting to finish Base registration.'
}

function isFinalGenStatus(status) {
  return GEN_FINAL_STATUSES.has(status)
}

export class RelayerService {
  constructor({ config, store, genlayer, base, logger = console }) {
    this.config = config
    this.store = store
    this.genlayer = genlayer
    this.base = base
    this.logger = logger
    this.syncInFlight = null
  }

  async submitMarket(draft) {
    validateDraft(draft)
    if (!this.genlayer.isReady()) {
      throw new Error('GenLayer relayer is not fully configured yet')
    }

    const remoteMarket = await this.genlayer.submitMarket(draft)
    let record = await this.store.upsertMarket(remoteMarket.market_id, {
      genlayerMarketId: remoteMarket.market_id,
      submittedAtIso: nowIso(),
      statement: draft.statement,
      creatorAddress: draft.creatorAddress,
      creatorPosition: draft.creatorPosition || 'YES',
      requestedStakeUsdc: Number(draft.stakeUsdc || 0),
      supplementalSources: draft.supplementalSources || [],
      fundingDeadlineIso: draft.fundingDeadlineIso,
      cutoffIso: draft.cutoffIso,
      resolutionRule: draft.resolutionRule,
      genlayer: {
        category: remoteMarket.category,
        templateId: remoteMarket.template_id,
        settlementMode: remoteMarket.settlement_mode,
        status: remoteMarket.status,
        probabilityBps: remoteMarket.probability_bps,
        confidenceBps: remoteMarket.confidence_bps,
        primarySources: remoteMarket.primary_sources || [],
        updatedAtIso: nowIso(),
      },
      base: {
        candidateVaultMarketId: deriveVaultMarketId(remoteMarket.market_id),
      },
    })

    record = await this.#attemptBaseRegistration(record)
    await this.store.save()
    return this.#toMarketView(record)
  }

  async listMarkets({ address } = {}) {
    const count = await this.store.countMarkets()
    if (count === 0 && this.genlayer.isReadable()) {
      await this.syncOnce()
    }

    const records = address
      ? await this.store.listMarketsByAddress(address)
      : await this.store.getAllMarkets()

    if (records.length === 0 && address && this.genlayer.isReadable()) {
      await this.syncOnce()
      const refreshed = await this.store.listMarketsByAddress(address)
      return sortBySubmittedAtDesc(refreshed).map(record => this.#toMarketView(record))
    }

    return sortBySubmittedAtDesc(records).map(record => this.#toMarketView(record))
  }

  async syncOnce() {
    if (this.syncInFlight) return this.syncInFlight

    this.syncInFlight = (async () => {
      try {
        if (!this.genlayer.isReadable()) return

        const remoteMarkets = await this.genlayer.listMarkets()
        for (const remoteMarket of remoteMarkets) {
          await this.store.upsertMarket(remoteMarket.market_id, {
            genlayerMarketId: remoteMarket.market_id,
            statement: remoteMarket.statement,
            fundingDeadlineIso: remoteMarket.funding_deadline_iso,
            cutoffIso: remoteMarket.cutoff_iso,
            resolutionRule: remoteMarket.resolution_rule,
            supplementalSources: remoteMarket.supplemental_sources || [],
            genlayer: {
              category: remoteMarket.category,
              templateId: remoteMarket.template_id,
              settlementMode: remoteMarket.settlement_mode,
              status: remoteMarket.status,
              probabilityBps: remoteMarket.probability_bps,
              confidenceBps: remoteMarket.confidence_bps,
              primarySources: remoteMarket.primary_sources || [],
              updatedAtIso: nowIso(),
            },
            base: {
              candidateVaultMarketId: deriveVaultMarketId(remoteMarket.market_id),
            },
          })
        }

        for (const record of await this.store.getAllMarkets()) {
          await this.#syncMarket(record)
        }

        await this.store.save()
      } finally {
        this.syncInFlight = null
      }
    })()

    return this.syncInFlight
  }

  async #syncMarket(record) {
    record = await this.#attemptBaseRegistration(record)

    const vaultMarketId = record.base?.vaultMarketId
    const baseMarket = vaultMarketId && this.base.isReadable()
      ? await this.base.getMarket(vaultMarketId)
      : null

    if (baseMarket) {
      await this.store.upsertMarket(record.genlayerMarketId, {
        base: {
          vaultMarketId,
          onchain: {
            creator: baseMarket.creator,
            taker: baseMarket.taker,
            creatorStake: String(baseMarket.creatorStake),
            takerStake: String(baseMarket.takerStake),
            fundingDeadline: String(baseMarket.fundingDeadline),
            resolutionTime: String(baseMarket.resolutionTime),
            disputeDeadline: String(baseMarket.disputeDeadline),
            state: Number(baseMarket.state),
            settlementHash: baseMarket.settlementHash,
          },
          updatedAtIso: nowIso(),
        },
      })
    }

    if (!vaultMarketId || !baseMarket || !this.genlayer.isReady() || !this.base.canSettle()) {
      return
    }

    const resolutionReady =
      Number(baseMarket.state) === BASE_STATE.ActiveMatched &&
      Number(baseMarket.resolutionTime) <= Math.floor(Date.now() / 1000)

    if (resolutionReady && !record.genlayer?.resolutionPacket?.market_id && !isFinalGenStatus(record.genlayer?.status)) {
      const resolved = await this.genlayer.resolveMarket(record.genlayerMarketId)
      await this.store.upsertMarket(record.genlayerMarketId, {
        genlayer: {
          status: resolved.market.status,
          updatedAtIso: nowIso(),
          resolutionPacket: resolved.resolutionPacket,
        },
      })
      record = await this.store.getMarket(record.genlayerMarketId)
    }

    const packet = record.genlayer?.resolutionPacket
      || (record.genlayer?.status && record.genlayer.status !== 'APPROVED_PENDING_FUNDING'
        ? await this.genlayer.getResolutionPacket(record.genlayerMarketId)
        : null)

    if (packet?.market_id) {
      await this.store.upsertMarket(record.genlayerMarketId, {
        genlayer: {
          resolutionPacket: packet,
        },
      })
      record = await this.store.getMarket(record.genlayerMarketId)
    }

    const challengeEnvelope = packet?.market_id
      ? await this.genlayer.getChallenge(record.genlayerMarketId)
      : null
    const challenge = challengeEnvelope?.exists ? challengeEnvelope.challenge : null
    if (challenge) {
      await this.store.upsertMarket(record.genlayerMarketId, {
        genlayer: {
          challenge,
        },
      })
      record = await this.store.getMarket(record.genlayerMarketId)
    }

    if (packet?.status === 'PROVISIONAL' && Number(baseMarket.state) === BASE_STATE.ActiveMatched) {
      const tx = await this.base.recordProvisionalOutcome({
        vaultMarketId,
        settlementHash: packet.settlement_hash,
        disputeDeadlineIso: packet.dispute_deadline_iso,
      })
      await this.store.upsertMarket(record.genlayerMarketId, {
        base: {
          provisionalOutcomeTxHash: tx.hash,
          updatedAtIso: nowIso(),
        },
      })
      return this.#syncMarket(await this.store.getMarket(record.genlayerMarketId))
    }

    if (challenge?.status === 'OPEN' && Number(baseMarket.state) === BASE_STATE.ProvisionallyResolved) {
      const tx = await this.base.recordDispute({ vaultMarketId })
      await this.store.upsertMarket(record.genlayerMarketId, {
        base: {
          disputeTxHash: tx.hash,
          updatedAtIso: nowIso(),
        },
      })
      return
    }

    if (!isFinalGenStatus(record.genlayer?.status)) {
      const shouldFinalize =
        packet?.status === 'PROVISIONAL' &&
        (
          (!challenge && isoToUnixSeconds(packet.dispute_deadline_iso) < Math.floor(Date.now() / 1000)) ||
          (challenge && challenge.status && challenge.status !== 'OPEN')
        )

      if (shouldFinalize) {
        const finalized = await this.genlayer.finalizeMarket(record.genlayerMarketId)
        await this.store.upsertMarket(record.genlayerMarketId, {
          genlayer: {
            status: finalized.status,
            updatedAtIso: nowIso(),
          },
        })
        record = await this.store.getMarket(record.genlayerMarketId)
      }
    }

    const freshBaseMarket = await this.base.getMarket(vaultMarketId)
    if (!freshBaseMarket) return

    if (record.genlayer?.status === 'FINAL_REFUNDED') {
      const tx = await this.base.refundMarket({
        vaultMarketId,
        settlementHash: packet?.settlement_hash,
      })
      await this.store.upsertMarket(record.genlayerMarketId, {
        base: {
          refundTxHash: tx.hash,
          updatedAtIso: nowIso(),
        },
      })
      return
    }

    if (
      (record.genlayer?.status === 'FINAL_CREATOR_WINS' || record.genlayer?.status === 'FINAL_TAKER_WINS') &&
      (Number(freshBaseMarket.state) === BASE_STATE.ProvisionallyResolved || Number(freshBaseMarket.state) === BASE_STATE.InDispute) &&
      Number(freshBaseMarket.disputeDeadline) < Math.floor(Date.now() / 1000)
    ) {
      const tx = await this.base.settleMarket({
        vaultMarketId,
        creatorStake: freshBaseMarket.creatorStake,
        takerStake: freshBaseMarket.takerStake,
        creatorWins: record.genlayer.status === 'FINAL_CREATOR_WINS',
        settlementHash: packet?.settlement_hash,
      })
      await this.store.upsertMarket(record.genlayerMarketId, {
        base: {
          settlementTxHash: tx.hash,
          updatedAtIso: nowIso(),
        },
      })
    }
  }

  async #attemptBaseRegistration(record) {
    if (record.base?.vaultMarketId || !this.base.canRegister()) {
      return record
    }

    const candidateVaultMarketId = record.base?.candidateVaultMarketId || deriveVaultMarketId(record.genlayerMarketId)
    const existing = await this.base.getMarket(candidateVaultMarketId)

    if (existing) {
      return this.store.upsertMarket(record.genlayerMarketId, {
        base: {
          candidateVaultMarketId,
          vaultMarketId: candidateVaultMarketId,
          registeredAtIso: record.base?.registeredAtIso || nowIso(),
          updatedAtIso: nowIso(),
        },
      })
    }

    try {
      const tx = await this.base.registerApprovedMarket({
        vaultMarketId: candidateVaultMarketId,
        creatorAddress: record.creatorAddress,
        fundingDeadlineIso: record.fundingDeadlineIso,
        cutoffIso: record.cutoffIso,
      })

      return this.store.upsertMarket(record.genlayerMarketId, {
        base: {
          candidateVaultMarketId,
          vaultMarketId: candidateVaultMarketId,
          registrationTxHash: tx.hash,
          registeredAtIso: nowIso(),
          updatedAtIso: nowIso(),
        },
      })
    } catch (error) {
      this.logger.error(`Base registration failed for ${record.genlayerMarketId}: ${formatError(error)}`)
      return this.store.upsertMarket(record.genlayerMarketId, {
        base: {
          candidateVaultMarketId,
          registrationError: formatError(error),
          updatedAtIso: nowIso(),
        },
      })
    }
  }

  #toMarketView(record) {
    const baseMarket = record.base?.onchain || null
    const creatorStake = baseMarket?.creatorStake ?? '0'
    const acceptorStake = baseMarket?.takerStake ?? '0'
    const totalPool = (BigInt(creatorStake) + BigInt(acceptorStake)).toString()

    return {
      id: record.base?.vaultMarketId || record.genlayerMarketId,
      marketId: record.genlayerMarketId,
      vaultMarketId: record.base?.vaultMarketId || '',
      statement: record.statement,
      description: record.statement,
      category: record.genlayer?.category || 'Politics',
      creatorAbove: record.creatorPosition !== 'NO',
      creatorStake,
      acceptorStake,
      totalPool,
      status: frontEndStatus(record, baseMarket),
      cutoffIso: record.cutoffIso,
      resolutionTime: String(baseMarket?.resolutionTime || isoToUnixSeconds(record.cutoffIso)),
      createdAt: String(isoToUnixSeconds(record.submittedAtIso)),
      creator: record.creatorAddress || baseMarket?.creator || zeroAddress,
      acceptor: baseMarket?.taker || zeroAddress,
      probabilityPercent: probabilityPercent(record.genlayer?.probabilityBps),
      primarySources: record.genlayer?.primarySources || [],
      supplementalSources: record.supplementalSources || [],
      relayerMessage: relayerMessage(record, baseMarket),
      fundingStatus: fundingStatus(record, baseMarket),
      dataSource: 'relayer',
      genlayerNetwork: this.config.genlayer.network,
    }
  }

  async getHealth() {
    return {
      syncInFlight: Boolean(this.syncInFlight),
      knownMarkets: await this.store.countMarkets(),
      genlayerReady: this.genlayer.isReady(),
      genlayerReadable: this.genlayer.isReadable(),
      baseReadable: this.base.isReadable(),
      baseRegisterReady: this.base.canRegister(),
      baseSettlementReady: this.base.canSettle(),
    }
  }
}
