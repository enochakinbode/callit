import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Link } from 'react-router-dom'
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi'
import { useToast } from '../context/ToastContext'
import {
  ACTIVE_CHAIN,
  BASE_VAULT_ABI,
  ERC20_ABI,
  FEE_PERCENT,
  GENLAYER_NETWORK_LABEL,
  MAX_STAKE_USDC,
  MIN_STAKE_USDC,
  parseUSDC,
  USDC_DECIMALS,
} from '../lib/config'
import {
  inferGenLayerDraftDecision,
} from '../data/marketArchitecture'
import { markLocalMarketFunded, submitMarketToRelayer } from '../lib/relayer'

const sanitize = (str) => str.replace(/<[^>]*>/g, '').trim()
const openNativePicker = (event) => {
  event.currentTarget.showPicker?.()
}
const buildUtcDate = (date, time = '00:00') => new Date(`${date}T${time || '00:00'}:00Z`)
const formatUtcDateTime = (value) => new Date(value).toLocaleString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
}) + ' UTC'
const formatUsdcBalance = (amount) => (Number(amount) / 1e6).toLocaleString('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export default function CreateBetModal({ onClose, onSuccess }) {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const { openConnectModal } = useConnectModal()
  const { address, chainId, isConnected } = useAccount()
  const publicClient = usePublicClient({ chainId: ACTIVE_CHAIN.id })
  const { writeContractAsync } = useWriteContract()
  const [step, setStep] = useState('draft')
  const [loading, setLoading] = useState(false)
  const [funding, setFunding] = useState(false)
  const [approvedPreview, setApprovedPreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    statement: '',
    stake: '',
    token: 'USDC',
    cutoffDate: '',
    cutoffTime: '00:00',
    creatorPosition: 'YES',
    supplementalSources: '',
  })
  const vaultAddress = ACTIVE_CHAIN.vault || undefined
  const usdcAddress = ACTIVE_CHAIN.tokens.USDC || undefined
  const stakeAmountRaw = useMemo(() => parseUSDC(form.stake || 0), [form.stake])
  const { data: vaultMinStakeRaw } = useReadContract({
    address: vaultAddress || '0x0000000000000000000000000000000000000000',
    abi: BASE_VAULT_ABI,
    functionName: 'minStakeAmount',
    query: {
      enabled: Boolean(vaultAddress),
    },
  })
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress || '0x0000000000000000000000000000000000000000',
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && vaultAddress ? [address, vaultAddress] : undefined,
    query: {
      enabled: Boolean(address && vaultAddress && usdcAddress),
    },
  })
  const { data: walletBalanceRaw } = useReadContract({
    address: usdcAddress || '0x0000000000000000000000000000000000000000',
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && usdcAddress),
    },
  })

  const minStakeUSDC = useMemo(() => {
    if (typeof vaultMinStakeRaw === 'bigint' && vaultMinStakeRaw > 0n) {
      return Number(vaultMinStakeRaw) / 1e6
    }
    return MIN_STAKE_USDC
  }, [vaultMinStakeRaw])
  const supplementalList = useMemo(
    () => form.supplementalSources.split('\n').map(line => sanitize(line)).filter(Boolean),
    [form.supplementalSources],
  )
  const walletBalanceLabel = useMemo(() => {
    if (!address) return 'Connect wallet'
    if (typeof walletBalanceRaw !== 'bigint') return 'Loading...'
    return `${formatUsdcBalance(walletBalanceRaw)} USDC`
  }, [address, walletBalanceRaw])
  const inferredDraft = useMemo(
    () => inferGenLayerDraftDecision(form.statement),
    [form.statement],
  )

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const validateDraft = () => {
    const nextErrors = {}
    if (!sanitize(form.statement)) nextErrors.statement = 'Statement is required'
    if (!form.stake || Number.isNaN(Number(form.stake)) || Number(form.stake) < minStakeUSDC) {
      nextErrors.stake = `Minimum stake is ${minStakeUSDC} USDC`
    }
    if (Number(form.stake) > MAX_STAKE_USDC) {
      nextErrors.stake = `Maximum stake is ${MAX_STAKE_USDC.toLocaleString()} USDC`
    }
    if (!form.cutoffDate) nextErrors.cutoffDate = 'Cutoff date is required'
    if (!form.cutoffTime) nextErrors.cutoffTime = 'Cutoff time is required'
    const cutoff = buildUtcDate(form.cutoffDate, form.cutoffTime)
    if (cutoff <= new Date()) nextErrors.cutoffDate = 'Cutoff must be in the future'
    return nextErrors
  }

  const buildDraftPayload = () => {
    const cutoff = buildUtcDate(form.cutoffDate, form.cutoffTime)
    const fundingDeadline = new Date(cutoff.getTime() - 15 * 60 * 1000)
    return {
      statement: sanitize(form.statement),
      stakeUsdc: Number(form.stake),
      creatorPosition: form.creatorPosition,
      creatorAddress: address,
      cutoffIso: cutoff.toISOString(),
      fundingDeadlineIso: fundingDeadline.toISOString(),
      resolutionRule: inferredDraft.template?.resolutionRule || sanitize(form.statement),
      supplementalSources: supplementalList,
    }
  }

  const handleReview = () => {
    const nextErrors = validateDraft()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setStep('review')
  }

  const requestGenLayerApproval = async () => {
    setLoading(true)
    try {
      const draft = buildDraftPayload()
      const result = await submitMarketToRelayer(draft)
      const preview = {
        marketId: result.marketId,
        vaultMarketId: result.vaultMarketId,
        canonicalStatement: draft.statement,
        category: result.category,
        templateLabel: result.templateLabel,
        probabilityPercent: result.probabilityPercent,
        fundingDeadline: formatUtcDateTime(result.fundingDeadlineIso),
        cutoffDisplay: formatUtcDateTime(result.cutoffIso),
        settlementMode: 'GenLayer primary-source consensus',
        relayerMessage: result.relayerMessage,
        genlayerNetwork: result.genlayerNetwork || GENLAYER_NETWORK_LABEL,
      }
      setApprovedPreview(preview)
      setStep('registered')
      addToast(`Relayer registered the market and returned ${result.marketId}.`, 'success')
      queryClient.invalidateQueries({ queryKey: ['p2p-markets'] })
      onSuccess?.(result.marketId)
    } catch (error) {
      addToast(error.message || 'Relayer submission failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleFundOnBase = async () => {
    if (!isConnected) {
      openConnectModal?.()
      return
    }
    if (chainId !== ACTIVE_CHAIN.id) {
      addToast(`Switch wallet to ${ACTIVE_CHAIN.label} before funding the market.`, 'error')
      return
    }
    if (!approvedPreview?.vaultMarketId) {
      addToast('The relayer has not returned a vault market ID yet.', 'error')
      return
    }
    if (!vaultAddress || !usdcAddress) {
      addToast('Vault or USDC address is not configured in the UI yet.', 'error')
      return
    }
    if (!publicClient) {
      addToast('Base client is not ready yet. Try again.', 'error')
      return
    }

    setFunding(true)
    try {
      if ((allowanceRaw || 0n) < stakeAmountRaw) {
        const approveHash = await writeContractAsync({
          address: usdcAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [vaultAddress, stakeAmountRaw],
          chainId: ACTIVE_CHAIN.id,
        })
        await publicClient.waitForTransactionReceipt({ hash: approveHash })
        await refetchAllowance()
      }

      const fundHash = await writeContractAsync({
        address: vaultAddress,
        abi: BASE_VAULT_ABI,
        functionName: 'fundCreatorSide',
        args: [approvedPreview.vaultMarketId, stakeAmountRaw],
        chainId: ACTIVE_CHAIN.id,
      })
      await publicClient.waitForTransactionReceipt({ hash: fundHash })
      markLocalMarketFunded(approvedPreview.vaultMarketId, stakeAmountRaw)
      queryClient.invalidateQueries({ queryKey: ['p2p-markets'] })
      addToast('Creator side funded on Base vault.', 'success')
      setApprovedPreview(prev => prev ? { ...prev, fundedOnBase: true } : prev)
    } catch (error) {
      addToast(error.shortMessage || error.message || 'Base vault funding failed', 'error')
    } finally {
      setFunding(false)
    }
  }

  const stakeValue = Number(form.stake || 0)
  const grossPool = stakeValue * 2
  const winnerPayout = grossPool * (1 - FEE_PERCENT / 100)

  const ErrorText = ({ field }) => (
    errors[field] ? <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--no-color)' }}>{errors[field]}</div> : null
  )

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Create P2P Market</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginBottom: '18px' }}>
          {[
            { id: 'draft', label: 'Draft' },
            { id: 'review', label: 'Review' },
            { id: 'registered', label: 'Registered' },
          ].map(item => {
            const active =
              item.id === step ||
              (item.id === 'review' && ['review', 'registered'].includes(step)) ||
              (item.id === 'registered' && ['registered'].includes(step)) ||
              (item.id === 'draft' && ['draft', 'review', 'registered'].includes(step))
            return (
              <div
                key={item.id}
                style={{
                  borderRadius: '10px',
                  border: `1px solid ${active ? 'rgba(232,184,75,0.24)' : 'rgba(255,255,255,0.08)'}`,
                  background: active ? 'rgba(232,184,75,0.06)' : 'rgba(255,255,255,0.03)',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: '11px', color: active ? 'var(--gold)' : '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {item.label}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: '10px', padding: '12px 14px', marginBottom: '18px', fontSize: '13px', color: '#aac6f8', lineHeight: 1.6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            Call the market. We&apos;ll handle the rest.
          </div>
          <Link to="/how-it-works" style={{ color: '#60a5fa', fontWeight: 700, whiteSpace: 'nowrap' }}>
            See how it works
          </Link>
        </div>

        {step === 'draft' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#CCC', marginBottom: '6px' }}>
                Market statement
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder='Example: "Will ETH trade above $5,000 before December 31, 2026?"'
                value={form.statement}
                onChange={event => setField('statement', event.target.value)}
              />
              <ErrorText field="statement" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#CCC', marginBottom: '6px' }}>Cutoff date</label>
                <input
                  type="date"
                  className="input"
                  value={form.cutoffDate}
                  min={new Date().toISOString().split('T')[0]}
                  onClick={openNativePicker}
                  onFocus={openNativePicker}
                  onChange={event => setField('cutoffDate', event.target.value)}
                />
                <ErrorText field="cutoffDate" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#CCC', marginBottom: '6px' }}>Cutoff time (UTC)</label>
                <input
                  type="time"
                  className="input"
                  value={form.cutoffTime}
                  onClick={openNativePicker}
                  onFocus={openNativePicker}
                  onChange={event => setField('cutoffTime', event.target.value)}
                />
                <ErrorText field="cutoffTime" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#CCC', marginBottom: '6px' }}>Your side</label>
                <select className="input" value={form.creatorPosition} onChange={event => setField('creatorPosition', event.target.value)}>
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto minmax(0, 1fr)', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Balance: {walletBalanceLabel}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#CCC', whiteSpace: 'nowrap', marginRight: '128px' }}>USDC</div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#CCC', whiteSpace: 'nowrap' }}>Stake</label>
                  <div style={{ minWidth: 0 }}>
                    <input
                      type="number"
                      className="input"
                      min={minStakeUSDC}
                      max={MAX_STAKE_USDC}
                      placeholder="50"
                      value={form.stake}
                      onChange={event => setField('stake', event.target.value)}
                      style={{ minWidth: 0 }}
                    />
                  </div>
                  <div style={{ gridColumn: '4 / -1', fontSize: '11px', color: errors.stake ? 'var(--no-color)' : 'var(--text-muted)' }}>
                    {errors.stake || `Minimum stake is ${minStakeUSDC} USDC`}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#CCC', marginBottom: '6px' }}>
                Supporting links
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="Optional. One link per line."
                value={form.supplementalSources}
                onChange={event => setField('supplementalSources', event.target.value)}
              />
            </div>

            <button className="btn btn-gold btn-lg" onClick={handleReview} style={{ width: '100%' }}>
              Review Market
            </button>
          </div>
        )}

        {step === 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#777', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Review</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFF', marginBottom: '10px' }}>{sanitize(form.statement)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '13px', color: '#888' }}>
                <div>Your side: <span style={{ color: '#FFF' }}>{form.creatorPosition}</span></div>
                <div>Your stake: <span style={{ color: '#FFF', fontFamily: 'var(--mono)' }}>${stakeValue.toFixed(2)} USDC</span></div>
                <div>Cutoff: <span style={{ color: '#FFF' }}>{formatUtcDateTime(buildUtcDate(form.cutoffDate, form.cutoffTime).toISOString())}</span></div>
                <div>Supporting links: <span style={{ color: '#FFF' }}>{supplementalList.length || 0}</span></div>
              </div>
              <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)', fontSize: '13px', color: '#aac6f8', lineHeight: 1.6 }}>
                The relayer will send this draft to GenLayer. If it is approved and registered on Base, you will get the market ID and can fund your side from here.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <button className="btn btn-outline btn-lg" onClick={() => setStep('draft')} disabled={loading}>Back To Draft</button>
              <button className="btn btn-gold btn-lg" onClick={requestGenLayerApproval} disabled={loading}>
                {loading ? <><span className="spinner" /> Sending To Relayer...</> : 'Send To Relayer'}
              </button>
            </div>
          </div>
        )}

        {step === 'registered' && approvedPreview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(38,161,123,0.08)', border: '1px solid rgba(38,161,123,0.22)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#8fd6bf', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Registered by relayer</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>{approvedPreview.canonicalStatement}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '13px', color: '#b7d8cc' }}>
                <div>Market ID: <span style={{ color: '#FFF', fontFamily: 'var(--mono)' }}>{approvedPreview.marketId}</span></div>
                <div>Vault market ID: <span style={{ color: '#FFF', fontFamily: 'var(--mono)' }}>{approvedPreview.vaultMarketId || 'Waiting for relayer registration on Base'}</span></div>
                <div>Category: <span style={{ color: '#FFF' }}>{approvedPreview.category}</span></div>
                <div>Template: <span style={{ color: '#FFF' }}>{approvedPreview.templateLabel}</span></div>
                <div>Initial probability: <span style={{ color: '#FFF' }}>{Math.round(approvedPreview.probabilityPercent || 50)}%</span></div>
                <div>Funding deadline: <span style={{ color: '#FFF' }}>{approvedPreview.fundingDeadline}</span></div>
                <div>Resolution cutoff: <span style={{ color: '#FFF' }}>{approvedPreview.cutoffDisplay}</span></div>
                <div>Settlement mode: <span style={{ color: '#FFF' }}>{approvedPreview.settlementMode}</span></div>
                <div>GenLayer network: <span style={{ color: '#FFF' }}>{approvedPreview.genlayerNetwork}</span></div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#c0dbd0', lineHeight: 1.6 }}>
                {approvedPreview.relayerMessage}
              </div>
            </div>

            <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.16)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Next step</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '13px', color: '#d0c1a0' }}>
                <div>Your stake: <span style={{ color: '#FFF', fontFamily: 'var(--mono)' }}>${stakeValue.toFixed(2)} USDC</span></div>
                <div>Winner payout after fee: <span style={{ color: '#FFF', fontFamily: 'var(--mono)' }}>${winnerPayout.toFixed(2)} USDC</span></div>
                <div>Counterparty side: <span style={{ color: '#FFF' }}>{form.creatorPosition === 'YES' ? 'NO' : 'YES'}</span></div>
                <div>Gross pool target: <span style={{ color: '#FFF', fontFamily: 'var(--mono)' }}>${grossPool.toFixed(2)} USDC</span></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <button className="btn btn-danger btn-lg" onClick={onClose}>Close</button>
              <button
                className="btn btn-gold btn-lg"
                disabled={funding || !approvedPreview.vaultMarketId}
                onClick={handleFundOnBase}
              >
                {funding ? <><span className="spinner" /> Funding On Base...</> : approvedPreview.fundedOnBase ? 'Funded On Base' : 'Approve And Fund On Base'}
              </button>
            </div>
            {!approvedPreview.vaultMarketId && (
              <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
                The relayer response did not include a Base vault market ID yet, so the UI cannot fund this market onchain from here.
              </div>
            )}
            {approvedPreview.vaultMarketId && !approvedPreview.fundedOnBase && (
              <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
                Funding uses the configured {ACTIVE_CHAIN.label} vault and {USDC_DECIMALS}-decimal USDC. Your wallet will approve USDC first if needed, then call the vault.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
