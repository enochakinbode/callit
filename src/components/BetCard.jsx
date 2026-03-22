import { useState, useEffect } from 'react'
import { shortAddr, formatUSDC } from '../lib/config'

const sr = (seed, i) => ((seed * 9301 + i * 49297 + 233) % 233280) / 233280
const daysLeft = ts => Math.max(0, Math.ceil((Number(ts) * 1000 - Date.now()) / 86400000))

export default function BetCard({ bet, currentUser, onAccept, onCancel }) {
  const seedBase = bet.id * 17 + 31
  const [liveYes, setLiveYes] = useState(50)

  useEffect(() => {
    if (bet.status > 1) return
    const t = setInterval(() => {
      setLiveYes(prev => parseFloat(Math.max(48, Math.min(52, prev + (Math.random() - 0.5) * 1.2)).toFixed(1)))
    }, 3500 + seedBase % 2000)
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

  const catColor = { Crypto: 'badge-gold', Sports: 'badge-green', Economy: 'badge-gray', Politics: 'badge-blue', 'Social Media': 'badge-purple', Tech: 'badge-blue' }

  return (
    <div className="card card-gold" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Top badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span className={`badge ${catColor[bet.category] || 'badge-gray'}`}>{bet.category || 'Crypto'}</span>
          <span className={`badge ${isOpen ? 'badge-gray' : isMatched ? 'badge-blue' : 'badge-green'}`}>
            {isOpen ? 'Open' : isMatched ? 'Matched' : 'Resolved'}
          </span>
          <span className={`badge ${isManual ? 'badge-manual' : 'badge-auto'}`}>
            {isManual ? '🛡 MANUAL' : '⚡ AUTO'}
          </span>
        </div>
        <span style={{ fontSize: '11px', color: dl < 7 ? 'var(--no-color)' : '#555', fontWeight: 700, flexShrink: 0 }}>
          {dl}d left
        </span>
      </div>

      {/* Creator's statement */}
      <p style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', lineHeight: 1.55, margin: 0 }}>
        {bet.description}
      </p>

      {/* Expiry */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '12px', color: '#555' }}>
        <span>🕐</span>
        <span>{resDateStr} · {resTimeStr} UTC</span>
      </div>

      {/* Pool */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <span style={{ color: '#555' }}>Pool</span>
        <span style={{ fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>${totalPoolUSDC} USDC</span>
      </div>

      {/* CALL IT — the only action on the card */}
      {isOpen && !isCreator && (
        <button
          className={`btn ${acceptorSide === 'YES' ? 'btn-yes' : 'btn-no'}`}
          style={{ width: '100%', fontWeight: 800, fontSize: '15px', padding: '13px' }}
          onClick={() => onAccept({ ...bet, side: acceptorSide })}
        >
          CALL IT — {acceptorSide} {acceptorCents}¢
        </button>
      )}

      {isOpen && isCreator && (
        <button className="btn btn-danger btn-sm" onClick={() => onCancel(bet.id)}>
          Cancel Market
        </button>
      )}

      {isMatched && (
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#666', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
          ⏳ Matched — awaiting resolution
        </div>
      )}

    </div>
  )
}
