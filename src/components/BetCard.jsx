import { useState, useEffect } from 'react'
import { shortAddr, formatUSDC } from '../lib/config'

const sr = (seed, i) => ((seed * 9301 + i * 49297 + 233) % 233280) / 233280
const daysLeft = ts => Math.max(0, Math.ceil((Number(ts) * 1000 - Date.now()) / 86400000))
const CAT_COLOR = {
  Crypto: 'badge-gold', Sports: 'badge-green', Economy: 'badge-gray',
  Politics: 'badge-blue', 'Social Media': 'badge-purple', Tech: 'badge-blue',
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
  const change = parseFloat((liveYes - prevYes).toFixed(1))
  const isUp = change >= 0
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
    <div className="card card-gold" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Badges row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span className={`badge ${CAT_COLOR[bet.category] || 'badge-gray'}`}>{bet.category || 'Crypto'}</span>
          <span className="badge badge-gray">P2P</span>
          <span className={`badge ${isManual ? 'badge-manual' : 'badge-auto'}`}>
            {isManual ? '🛡 MANUAL' : '⚡ AUTO'}
          </span>
        </div>
        {(isCreator) && <span className="badge badge-gold" style={{ flexShrink: 0 }}>YOU</span>}
      </div>

      {/* Market description */}
      <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>
        {bet.description}
      </p>

      {/* YES / NO price display — matches screenshot */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--yes-color)', fontFamily: 'var(--mono)' }}>
          YES {Math.round(liveYes)}¢
        </span>
        <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--no-color)', fontFamily: 'var(--mono)' }}>
          NO {Math.round(liveNo)}¢
        </span>
      </div>

      {/* Green / Red probability bar */}
      <div className="prob-bar-dual" style={{ height: '7px', borderRadius: '99px' }}>
        <div className="prob-bar-yes" style={{ width: `${liveYes}%`, transition: 'width 0.8s ease', borderRadius: '99px 0 0 99px' }} />
        <div className="prob-bar-no" style={{ width: `${liveNo}%`, transition: 'width 0.8s ease', borderRadius: '0 99px 99px 0' }} />
      </div>

      {/* Pool + Expires boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 14px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: '4px' }}>Pool</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>${totalPoolUSDC} USDC</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 14px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: '4px' }}>Expires</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)', lineHeight: 1.35 }}>
            {resDateStr}<br />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{resTimeStr} UTC</span>
          </div>
        </div>
      </div>

      {/* Status + live movement */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
        <span style={{ color: 'var(--text-muted)' }}>
          {isOpen ? 'Open' : isMatched ? 'Matched' : 'Resolved'}
        </span>
        <span style={{ fontWeight: 700, fontFamily: 'var(--mono)', color: isUp ? 'var(--yes-color)' : 'var(--no-color)', fontSize: '13px' }}>
          {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(1)}¢
        </span>
      </div>

      {/* CALL IT button */}
      {isOpen && !isCreator && (
        <button
          className={`btn ${acceptorSide === 'YES' ? 'btn-yes' : 'btn-no'}`}
          style={{ width: '100%', fontWeight: 800, fontSize: '15px', padding: '13px', letterSpacing: '-0.01em' }}
          onClick={() => onAccept({ ...bet, side: acceptorSide })}
        >
          CALL IT — {acceptorSide} {acceptorCents}¢
        </button>
      )}

      {isOpen && isCreator && (
        <button className="btn btn-danger btn-sm" onClick={() => onCancel?.(bet.id)}>
          Cancel Market
        </button>
      )}

      {isMatched && (
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
          Matched — awaiting resolution
        </div>
      )}

    </div>
  )
}
