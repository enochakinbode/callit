import { useState, useEffect } from 'react'
import { formatUSDC } from '../lib/config'

const daysLeft = ts => Math.max(0, Math.ceil((Number(ts) * 1000 - Date.now()) / 86400000))
const CAT_COLOR = {
  Crypto: 'badge-gold', Sports: 'badge-green', Economy: 'badge-gray',
  Politics: 'badge-blue', 'Social Media': 'badge-purple', Tech: 'badge-blue',
}

// Arc gauge — not water, just animated arc fill. Green ≥50, red <50
function ArcGauge({ prob, prevProb, size = 56 }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const filled = (prob / 100) * circ
  const isGreen = prob >= 50
  const color = isGreen ? 'var(--yes-color)' : 'var(--no-color)'
  const trackColor = isGreen ? 'rgba(38,161,123,0.15)' : 'rgba(232,93,93,0.15)'
  const change = prevProb !== undefined ? parseFloat((prob - prevProb).toFixed(1)) : 0
  const isUp = change >= 0

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="rgba(255,255,255,0.03)" stroke={trackColor} strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.7s ease, stroke 0.4s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px' }}>
        <span style={{ fontSize: '7px', fontWeight: 800, color: isUp ? 'var(--yes-color)' : 'var(--no-color)', lineHeight: 1, fontFamily: 'var(--mono)' }}>
          {isUp ? '▲' : '▼'}{Math.abs(change).toFixed(1)}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 900, color, lineHeight: 1, fontFamily: 'var(--mono)' }}>{prob}%</span>
        <span style={{ fontSize: '6px', color: 'var(--text-muted)', lineHeight: 1 }}>chance</span>
      </div>
    </div>
  )
}

export default function BetCard({ bet, currentUser, onAccept, onCancel }) {
  const seedBase = bet.id * 17 + 31
  const [liveYes, setLiveYes] = useState(50)
  const [prevYes, setPrevYes] = useState(50)

  useEffect(() => {
    if (bet.status > 1) return
    const t = setInterval(() => {
      setLiveYes(prev => {
        setPrevYes(prev)
        return parseFloat(Math.max(46, Math.min(54, prev + (Math.random() - 0.5) * 1.5)).toFixed(1))
      })
    }, 3200 + seedBase % 2000)
    return () => clearInterval(t)
  }, [bet.status, seedBase])

  const liveNo = parseFloat((100 - liveYes).toFixed(1))
  const isCreator = currentUser?.toLowerCase() === bet.creator?.toLowerCase()
  const isOpen = bet.status === 0
  const isMatched = bet.status === 1
  const isManual = bet.resType === 0
  const acceptorSide = bet.creatorAbove ? 'NO' : 'YES'
  const acceptorCents = Math.round(acceptorSide === 'YES' ? liveYes : liveNo)
  const totalPoolUSDC = formatUSDC(bet.totalPool)
  const dl = daysLeft(bet.resolutionTime)
  const resDate = new Date(Number(bet.resolutionTime) * 1000)
  const resDateStr = resDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const resTimeStr = resDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '14px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      transition: 'border-color 0.15s',
    }}>
      {/* Badges + gauge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className={`badge ${CAT_COLOR[bet.category] || 'badge-gray'}`}>{bet.category || 'Crypto'}</span>
            <span className="badge badge-gray">P2P</span>
            <span className={`badge ${isManual ? 'badge-manual' : 'badge-auto'}`}>
              {isManual ? 'MANUAL' : 'AUTO'}
            </span>
            {isCreator && <span className="badge badge-gold">YOU</span>}
          </div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.45, margin: 0 }}>
            {bet.description}
          </p>
        </div>
        <ArcGauge prob={Math.round(liveYes)} prevProb={Math.round(prevYes)} size={56} />
      </div>

      {/* Pool + Expires */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '7px 10px' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '2px' }}>Pool</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>${totalPoolUSDC} USDC</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '7px 10px' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '2px' }}>Expires</div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--mono)', lineHeight: 1.3 }}>
            {resDateStr}<br /><span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{resTimeStr} UTC</span>
          </div>
        </div>
      </div>

      {/* Status + days left */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
        <span style={{ color: 'var(--text-muted)' }}>{isOpen ? 'Open' : isMatched ? 'Matched' : 'Resolved'}</span>
        <span style={{ color: dl < 7 ? 'var(--no-color)' : 'var(--text-muted)', fontWeight: 600 }}>{dl}d left</span>
      </div>

      {/* CALL IT */}
      {isOpen && !isCreator && (
        <button
          className={`btn ${acceptorSide === 'YES' ? 'btn-yes' : 'btn-no'}`}
          style={{ width: '100%', fontWeight: 800, fontSize: '14px', padding: '11px' }}
          onClick={() => onAccept({ ...bet, side: acceptorSide })}
        >
          CALL IT {acceptorSide} {acceptorCents}¢
        </button>
      )}

      {isOpen && isCreator && bet.acceptor === '0x0000000000000000000000000000000000000000' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Once accepted, this market cannot be cancelled
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => onCancel?.(bet.id)}>
            Cancel Market
          </button>
        </div>
      )}

      {isMatched && (
        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', padding: '7px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
          Matched — awaiting resolution
        </div>
      )}
    </div>
  )
}
