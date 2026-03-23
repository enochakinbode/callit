import { useState, useEffect, useRef } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useToast } from '../context/ToastContext'
import { parseAbi } from 'viem'
import { formatUSDC, ACTIVE_CHAIN, parseUSDC, shortAddr } from '../lib/config'

const ERC20_ABI = parseAbi(['function approve(address spender, uint256 amount) returns (bool)'])
const FACTORY_ABI = parseAbi(['function acceptBet(uint256 betId, uint256 acceptorStake)'])

// ── Live Chart (Polymarket style) ─────────────────────────────
const sr = (seed, i) => ((seed * 9301 + i * 49297 + 233) % 233280) / 233280

const PERIODS = ['1H', '4H', '1D', '1W', '1M', 'ALL']
const PERIOD_POINTS = { '1H': 24, '4H': 32, '1D': 48, '1W': 60, '1M': 80, 'ALL': 120 }

function LiveChart({ baseProb, seed, side }) {
  const [period, setPeriod] = useState('1W')
  const [data, setData] = useState(() => {
    const pts = PERIOD_POINTS['1W']
    let v = Math.max(5, Math.min(90, baseProb - 10 + sr(seed, 0) * 20))
    return Array.from({ length: pts }, (_, i) => {
      v = Math.max(3, Math.min(97, v + (sr(seed + i, i) - 0.47) * 4))
      return parseFloat(v.toFixed(1))
    })
  })
  const [hovered, setHovered] = useState(null)
  const svgRef = useRef(null)

  useEffect(() => {
    const pts = PERIOD_POINTS[period]
    let v = Math.max(5, Math.min(90, baseProb - 10 + sr(seed + pts, 0) * 20))
    const d = Array.from({ length: pts }, (_, i) => {
      v = Math.max(3, Math.min(97, v + (sr(seed + pts + i, i) - 0.47) * 4))
      return parseFloat(v.toFixed(1))
    })
    setData(d)
  }, [period, baseProb, seed])

  useEffect(() => {
    const t = setInterval(() => {
      setData(prev => {
        const last = prev[prev.length - 1]
        const next = Math.max(3, Math.min(97, last + (Math.random() - 0.48) * 2))
        return [...prev.slice(1), parseFloat(next.toFixed(1))]
      })
    }, 3000)
    return () => clearInterval(t)
  }, [period])

  const W = 600, H = 160
  const pad = { t: 16, b: 24, l: 8, r: 40 }
  const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b
  const maxV = Math.max(...data), minV = Math.min(...data)
  const range = maxV - minV || 1
  const tx = i => pad.l + (i / (data.length - 1)) * cW
  const ty = v => pad.t + cH - ((v - minV) / range) * cH
  const pts = data.map((v, i) => `${tx(i)},${ty(v)}`).join(' ')
  const cur = data[data.length - 1]
  const start = data[0]
  const isUp = cur >= start
  const color = '#3B82F6'
  const displayVal = hovered !== null ? data[hovered] : cur
  const change = (displayVal - start).toFixed(1)

  const onMove = e => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (W / rect.width)
    const i = Math.round(((x - pad.l) / cW) * (data.length - 1))
    setHovered(Math.max(0, Math.min(data.length - 1, i)))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '28px', fontWeight: 900, color, letterSpacing: '-0.02em' }}>{displayVal.toFixed(0)}%</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: parseFloat(change) >= 0 ? 'var(--yes-color)' : 'var(--no-color)' }}>
          {parseFloat(change) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(change))}%
        </span>
        <span style={{ fontSize: '11px', color: '#555' }}>chance YES</span>
      </div>

      <div style={{ cursor: 'crosshair' }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}
          onMouseMove={onMove} onMouseLeave={() => setHovered(null)}>
          <defs>
            <linearGradient id="abg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.14" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[minV, minV + range * 0.5, maxV].map((v, i) => (
            <g key={i}>
              <line x1={pad.l} y1={ty(v)} x2={pad.l + cW} y2={ty(v)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3,3" />
              <text x={pad.l + cW + 5} y={ty(v) + 4} fontSize="9" fill="#555" fontFamily="var(--mono)">{v.toFixed(0)}%</text>
            </g>
          ))}
          <polygon points={`${pad.l},${pad.t + cH} ${pts} ${pad.l + cW},${pad.t + cH}`} fill="url(#abg)" />
          <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {hovered !== null ? (
            <>
              <line x1={tx(hovered)} y1={pad.t} x2={tx(hovered)} y2={pad.t + cH} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <circle cx={tx(hovered)} cy={ty(data[hovered])} r="4.5" fill={color} stroke="#000" strokeWidth="2" />
              <rect x={Math.min(tx(hovered) - 24, W - pad.r - 48)} y={pad.t - 16} width="48" height="16" rx="4" fill="rgba(0,0,0,0.85)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <text x={Math.min(tx(hovered), W - pad.r - 24)} y={pad.t - 4} fontSize="10" fill="#FFF" textAnchor="middle" fontFamily="var(--mono)">{data[hovered].toFixed(1)}%</text>
            </>
          ) : (
            <circle cx={tx(data.length - 1)} cy={ty(cur)} r="4.5" fill={color} />
          )}
        </svg>
      </div>

      <div style={{ display: 'flex', gap: '2px', marginTop: '8px' }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: '4px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer',
            background: period === p ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: period === p ? '#3B82F6' : '#555',
            fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font)', transition: 'all 0.14s',
          }}>{p}</button>
        ))}
      </div>
    </div>
  )
}

// ── Staker Chat (only between creator + acceptor) ─────────────
const STAKER_MESSAGES = [
  { id: 1, role: 'creator', text: 'I strongly believe this will happen. The fundamentals are clear.', time: '2h ago' },
  { id: 2, role: 'other', text: 'Interesting position. Let\'s see who is right.', time: '1h ago' },
]

function StakerChat({ bet, isCreator }) {
  const { address, isConnected } = useAccount()
  const [msgs, setMsgs] = useState(STAKER_MESSAGES)
  const [input, setInput] = useState('')

  const send = () => {
    if (!input.trim() || !isConnected) return
    setMsgs(prev => [...prev, {
      id: Date.now(),
      role: isCreator ? 'creator' : 'acceptor',
      text: input.trim().slice(0, 200),
      time: 'just now',
    }])
    setInput('')
  }

  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
        💬 Staker Discussion
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px', maxHeight: '140px', overflowY: 'auto' }}>
        {msgs.map(m => {
          const isMe = isCreator ? m.role === 'creator' : m.role === 'acceptor'
          return (
            <div key={m.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: isMe ? 'row-reverse' : 'row' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.role === 'creator' ? 'rgba(232,184,75,0.2)' : 'rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                {m.role === 'creator' ? '🟡' : '🔵'}
              </div>
              <div style={{ maxWidth: '75%' }}>
                <div style={{ fontSize: '10px', color: '#555', marginBottom: '3px', textAlign: isMe ? 'right' : 'left' }}>
                  {m.role === 'creator' ? 'Creator' : 'Acceptor'} · {m.time}
                </div>
                <div style={{
                  background: isMe ? 'rgba(232,184,75,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isMe ? 'rgba(232,184,75,0.2)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '10px', padding: '8px 12px',
                  fontSize: '13px', color: '#CCC', lineHeight: 1.5,
                }}>
                  {m.text}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          className="input"
          placeholder={isConnected ? 'Message...' : 'Connect wallet to chat'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          maxLength={200}
          style={{ flex: 1, fontSize: '13px' }}
        />
        <button className="btn btn-ghost btn-sm" onClick={send} disabled={!input.trim() || !isConnected} style={{ flexShrink: 0 }}>Send</button>
      </div>
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────
export default function AcceptBetModal({ bet, onClose, onSuccess }) {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { addToast } = useToast()
  const [step, setStep] = useState('idle')
  const [stakeInput, setStakeInput] = useState('')

  const { writeContract: approveWrite, data: approveTxHash, isPending: approvePending, error: approveWriteErr } = useWriteContract()
  const { writeContract: betWrite, data: betTxHash, isPending: betPending, error: betWriteErr } = useWriteContract()
  const { isLoading: approveConfirming, isSuccess: approveConfirmed, error: approveReceiptErr } = useWaitForTransactionReceipt({ hash: approveTxHash })
  const { isLoading: betConfirming, isSuccess: betConfirmed, error: betReceiptErr } = useWaitForTransactionReceipt({ hash: betTxHash })

  const side = bet.side || 'NO'
  const isManual = bet.resType === 0
  const creatorStakeUSDC = formatUSDC(bet.creatorStake)
  const stakeAmount = parseUSDC(creatorStakeUSDC)
  const payout = (+creatorStakeUSDC * 2 * 0.98).toFixed(2)
  const seed = (bet.id || 0) * 7 + 11

  const resDate = new Date(Number(bet.resolutionTime) * 1000)
  const resDateStr = resDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const resTimeStr = resDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const getCounterStatement = () => {
    if (!bet.creatorAbove) {
      return bet.description.replace(/\bwill not\b/gi, 'will').replace(/\bwill NOT\b/g, 'will').replace(/\bNOT\b/g, '').replace(/\s{2,}/g, ' ').trim()
    }
    return bet.description.replace(/ will /i, ' will NOT ')
  }

  // After approval → send bet
  useEffect(() => {
    if (approveConfirmed && step === 'approving') {
      setStep('betting')
      betWrite({ address: ACTIVE_CHAIN.factory, abi: FACTORY_ABI, functionName: 'acceptBet', args: [BigInt(bet.id), stakeAmount] })
    }
  }, [approveConfirmed]) // eslint-disable-line

  // After bet confirmed → success
  useEffect(() => {
    if (betConfirmed && step === 'betting') {
      setStep('done')
      addToast('Bet placed! Good luck.', 'success')
      setTimeout(() => onSuccess?.(), 1500)
    }
  }, [betConfirmed]) // eslint-disable-line

  // Handle errors
  useEffect(() => {
    const err = approveWriteErr || betWriteErr || approveReceiptErr || betReceiptErr
    if (err && step !== 'idle' && step !== 'done') {
      const msg = err.message?.includes('rejected') ? 'Transaction cancelled' : err.shortMessage || err.message || 'Transaction failed'
      addToast(msg, 'error')
      setStep('idle')
    }
  }, [approveWriteErr, betWriteErr, approveReceiptErr, betReceiptErr]) // eslint-disable-line

  const handleConfirm = () => {
    if (!isConnected) { openConnectModal(); return }
    if (!address) return
    setStep('approving')
    approveWrite({ address: ACTIVE_CHAIN.tokens.USDC, abi: ERC20_ABI, functionName: 'approve', args: [ACTIVE_CHAIN.factory, stakeAmount] })
  }

  const isLoading = step !== 'idle' && step !== 'done'

  const btnLabel = () => {
    if (approvePending) return 'Check your wallet...'
    if (step === 'approving' && approveConfirming) return 'Approving USDC...'
    if (betPending) return 'Check your wallet...'
    if (step === 'betting' && betConfirming) return 'Placing bet...'
    if (step === 'done') return 'Done!'
    return `Confirm Stake — $${creatorStakeUSDC} USDC`
  }

  useEffect(() => {
    const h = e => { if (e.key === 'Escape' && !isLoading) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isLoading, onClose])

  return (
    <div
      onClick={e => e.target === e.currentTarget && !isLoading && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)', zIndex: 2000, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', width: '100%', maxWidth: '580px', margin: '0 auto', padding: '24px 20px', animation: 'slideUp 0.25s ease' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Confirm Your Call</h2>
          <button onClick={onClose} disabled={isLoading} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 12px', color: '#888', cursor: 'pointer', fontSize: '16px', fontFamily: 'var(--font)' }}>✕</button>
        </div>

        {/* 1. Creator says */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
          <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '6px' }}>Creator Says</div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#FFF', lineHeight: 1.55, margin: 0 }}>{bet.description}</p>
          <div style={{ fontSize: '11px', color: '#555', marginTop: '6px' }}>🕐 {resDateStr} · {resTimeStr} UTC</div>
        </div>

        {/* 2. Your position (counter-statement) */}
        <div style={{
          background: side === 'YES' ? 'rgba(38,161,123,0.08)' : 'rgba(232,93,93,0.08)',
          border: `1px solid ${side === 'YES' ? 'rgba(38,161,123,0.3)' : 'rgba(232,93,93,0.3)'}`,
          borderRadius: '10px', padding: '14px', marginBottom: '20px',
        }}>
          <div style={{ fontSize: '10px', color: side === 'YES' ? 'var(--yes-color)' : 'var(--no-color)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '6px' }}>
            Your Position — {side}
          </div>
          <p style={{ fontSize: '14px', fontWeight: 700, color: side === 'YES' ? 'var(--yes-color)' : 'var(--no-color)', lineHeight: 1.55, margin: 0 }}>
            {getCounterStatement()}
          </p>
        </div>

        {/* 3. Live chart */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '12px' }}>Live Probability Chart</div>
          <LiveChart baseProb={50} seed={seed} side={side} />
        </div>

        {/* 4. Stake details */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '12px' }}>Stake Summary</div>
          {[
            { label: 'You stake', value: `$${creatorStakeUSDC} USDC`, color: side === 'NO' ? 'var(--no-color)' : 'var(--yes-color)' },
            { label: 'Creator staked', value: `$${creatorStakeUSDC} USDC`, color: 'var(--yes-color)' },
            { label: 'Total pool', value: `$${(+creatorStakeUSDC * 2).toFixed(2)} USDC`, color: 'var(--gold)' },
            { label: `You win if ${side}`, value: `$${payout} USDC`, color: '#FFF' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: i < 3 ? '8px' : 0, paddingBottom: i === 2 ? '8px' : 0, borderBottom: i === 2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <span style={{ fontSize: '13px', color: '#666' }}>{row.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: row.color, fontFamily: 'var(--mono)' }}>{row.value}</span>
            </div>
          ))}
          <div style={{ fontSize: '11px', color: '#444', marginTop: '8px' }}>98% payout · 2% fee deducted from winner</div>
        </div>

        {/* Suspicious Transaction explanation — shown before user confirms */}
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>Your wallet may show "Suspicious Transaction"</div>
              <p style={{ fontSize: '12px', color: '#888', lineHeight: 1.6, margin: 0 }}>
                This is normal for USDC approval on new contracts. We are only approving the exact amount you are staking (${creatorStakeUSDC} USDC) — not your entire wallet. Callit only ever touches this specific amount.
              </p>
            </div>
          </div>
        </div>

        {/* Cannot cancel warning — shown to acceptor before they stake */}
        <div style={{ background: 'rgba(232,93,93,0.06)', border: '1px solid rgba(232,93,93,0.18)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>🔒</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--no-color)', marginBottom: '3px' }}>This bet cannot be cancelled once staked</div>
              <p style={{ fontSize: '12px', color: '#888', lineHeight: 1.6, margin: 0 }}>
                By confirming, you are locking your stake into the smart contract. Neither you nor the creator can cancel after this point. Only market expiry or resolution will release the funds.
              </p>
            </div>
          </div>
        </div>

        {/* Manual warning */}
        {isManual && (
          <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#fbbf24', lineHeight: 1.5 }}>
            🛡 Manual resolution — admin settles within 24h after expiry
          </div>
        )}

        {/* 5. Staker chat */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
          <StakerChat bet={bet} isCreator={false} />
        </div>

        {/* Progress indicator */}
        {isLoading && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
            {[
              { label: 'Approve USDC', done: approveConfirmed || step === 'betting' || step === 'done', active: step === 'approving' },
              { label: 'Confirm bet', done: betConfirmed || step === 'done', active: step === 'betting' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: i === 0 ? '6px' : 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, background: s.done ? 'var(--yes-color)' : s.active ? 'var(--gold)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#000' }}>
                  {s.done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '12px', color: s.active ? '#FFF' : s.done ? 'var(--yes-color)' : '#555' }}>{s.label}</span>
                {s.active && <span className="spinner" style={{ width: 14, height: 14 }} />}
              </div>
            ))}
          </div>
        )}

        {/* 6. Confirm button */}
        {step === 'done' ? (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--yes-color)', fontSize: '15px', fontWeight: 700 }}>✅ Bet placed successfully!</div>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={isLoading} style={{ flex: 1 }}>Cancel</button>
            <button
              className={`btn ${side === 'YES' ? 'btn-yes' : 'btn-no'}`}
              onClick={handleConfirm}
              disabled={isLoading}
              style={{ flex: 2, fontWeight: 800, fontSize: '14px', whiteSpace: 'normal', lineHeight: 1.3, padding: '12px 10px', textAlign: 'center' }}
            >
              {isLoading ? <><span className="spinner" /> {btnLabel()}</> : btnLabel()}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
