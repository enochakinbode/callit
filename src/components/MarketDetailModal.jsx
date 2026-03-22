import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { shortAddr } from '../lib/config'

const sr = (seed, i) => ((seed * 9301 + i * 49297 + 233) % 233280) / 233280
const PERIODS = ['1H', '4H', '1D', '1W', '1M', 'ALL']
const PERIOD_PTS = { '1H': 24, '4H': 32, '1D': 48, '1W': 60, '1M': 80, 'ALL': 120 }

const safeNum = (v, fallback = 50) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const genData = (prob, seed, pts) => {
  let v = Math.max(5, Math.min(90, prob - 12 + sr(seed, 0) * 24))
  const arr = []
  for (let i = 0; i < pts; i++) {
    v = Math.max(3, Math.min(97, v + (sr(seed + i, i) - 0.47) * 4))
    arr.push(parseFloat(v.toFixed(1)))
  }
  arr.push(parseFloat(prob.toFixed(1)))
  return arr
}

// ── Live Chart ────────────────────────────────────────────────
function Chart({ baseProb, seed }) {
  const [period, setPeriod] = useState('1W')
  const [data, setData] = useState(() => genData(baseProb, seed, PERIOD_PTS['1W']))
  const [hovered, setHovered] = useState(null)
  const svgRef = useRef(null)

  useEffect(() => {
    setData(genData(baseProb, seed + PERIOD_PTS[period], PERIOD_PTS[period]))
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

  const W = 700, H = 200
  const pad = { t: 16, b: 24, l: 8, r: 42 }
  const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b
  const maxV = Math.max(...data), minV = Math.min(...data)
  const range = maxV - minV || 1
  const tx = i => pad.l + (i / (data.length - 1)) * cW
  const ty = v => pad.t + cH - ((v - minV) / range) * cH
  const pts = data.map((v, i) => `${tx(i)},${ty(v)}`).join(' ')
  const cur = data[data.length - 1]
  const change = (cur - data[0]).toFixed(1)
  const isUp = parseFloat(change) >= 0
  const color = '#3B82F6'

  const onMove = e => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (W / rect.width)
    const i = Math.round(((x - pad.l) / cW) * (data.length - 1))
    setHovered(Math.max(0, Math.min(data.length - 1, i)))
  }

  const dv = hovered !== null ? data[hovered] : cur

  return (
    <div>
      {/* Current value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '32px', fontWeight: 900, color, letterSpacing: '-0.02em' }}>{dv.toFixed(0)}%</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: isUp ? 'var(--yes-color)' : 'var(--no-color)' }}>
          {isUp ? '▲' : '▼'} {Math.abs(parseFloat(change))}%
        </span>
        <span style={{ fontSize: '12px', color: '#555' }}>chance YES</span>
      </div>

      {/* SVG chart */}
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        onMouseMove={onMove} onMouseLeave={() => setHovered(null)}>
        <defs>
          <linearGradient id="mdcg" x1="0" y1="0" x2="0" y2="1">
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
        <polygon points={`${pad.l},${pad.t + cH} ${pts} ${pad.l + cW},${pad.t + cH}`} fill="url(#mdcg)" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {hovered !== null ? (
          <>
            <line x1={tx(hovered)} y1={pad.t} x2={tx(hovered)} y2={pad.t + cH} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <circle cx={tx(hovered)} cy={ty(data[hovered])} r="4.5" fill={color} stroke="#000" strokeWidth="2" />
          </>
        ) : (
          <circle cx={tx(data.length - 1)} cy={ty(cur)} r="4.5" fill={color} />
        )}
      </svg>

      {/* Period buttons */}
      <div style={{ display: 'flex', gap: '2px', marginTop: '8px' }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: '4px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer',
            background: period === p ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: period === p ? '#3B82F6' : '#555',
            fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font)',
          }}>{p}</button>
        ))}
      </div>
    </div>
  )
}

// ── Order Book ────────────────────────────────────────────────
function OrderBook({ prob, seed }) {
  const [open, setOpen] = useState(false)
  const asks = [], bids = []
  for (let i = 0; i < 4; i++) {
    const price = Math.min(97, Math.round(prob + (i + 1) * (1 + sr(seed, i) * 2)))
    const shares = Math.floor(2000 + sr(seed + i, i + 3) * 70000)
    asks.push({ price, shares: shares.toLocaleString(), total: `$${Math.floor(shares * price / 100).toLocaleString()}` })
  }
  for (let i = 0; i < 4; i++) {
    const price = Math.max(3, Math.round(prob - (i + 1) * (1 + sr(seed + 10, i) * 2)))
    const shares = Math.floor(3000 + sr(seed + i + 20, i + 7) * 80000)
    bids.push({ price, shares: shares.toLocaleString(), total: `$${Math.floor(shares * price / 100).toLocaleString()}` })
  }

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', background: 'rgba(255,255,255,0.02)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>Order Book</span>
        <span style={{ color: '#555', fontSize: '13px' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '55px 1fr 1fr', gap: '6px', padding: '7px 16px', background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['PRICE', 'SHARES', 'TOTAL'].map((h, i) => (
              <span key={i} style={{ fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: i > 0 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>
          {asks.reverse().map((r, i) => (
            <div key={`a${i}`} style={{ display: 'grid', gridTemplateColumns: '55px 1fr 1fr', gap: '6px', padding: '6px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#E85D5D', fontFamily: 'var(--mono)' }}>{r.price}¢</span>
              <span style={{ fontSize: '11px', color: '#666', fontFamily: 'var(--mono)', textAlign: 'right' }}>{r.shares}</span>
              <span style={{ fontSize: '11px', color: '#666', fontFamily: 'var(--mono)', textAlign: 'right' }}>{r.total}</span>
            </div>
          ))}
          <div style={{ padding: '5px 16px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '11px', color: '#888', fontFamily: 'var(--mono)' }}>Last: <strong style={{ color: '#CCC' }}>{Math.round(prob)}¢</strong><span style={{ marginLeft: 14 }}>Spread: <strong style={{ color: '#CCC' }}>1¢</strong></span></span>
          </div>
          {bids.map((r, i) => (
            <div key={`b${i}`} style={{ display: 'grid', gridTemplateColumns: '55px 1fr 1fr', gap: '6px', padding: '6px 16px', borderBottom: i < bids.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#26A17B', fontFamily: 'var(--mono)' }}>{r.price}¢</span>
              <span style={{ fontSize: '11px', color: '#666', fontFamily: 'var(--mono)', textAlign: 'right' }}>{r.shares}</span>
              <span style={{ fontSize: '11px', color: '#666', fontFamily: 'var(--mono)', textAlign: 'right' }}>{r.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Comments + Activity ───────────────────────────────────────
const SEED_COMMENTS = [
  { id: 1, user: '0xA1b2...C3d4', avatar: '🦊', text: 'The macro environment strongly favors this. Watch the data drop next week.', time: '2h ago', likes: 12, liked: false },
  { id: 2, user: '0xDe45...Fa67', avatar: '🐻', text: 'On-chain volume spiking hard. Whales positioning YES right now.', time: '5h ago', likes: 8, liked: false },
  { id: 3, user: '0xBc89...01Ef', avatar: '🦈', text: 'Disagree. Fundamentals don\'t support this moving higher from here.', time: '12h ago', likes: 3, liked: false },
  { id: 4, user: '0x23Cd...45Ab', avatar: '🐊', text: 'Same pattern as the last 3 similar markets. Always resolves NO.', time: '1d ago', likes: 21, liked: false },
]

const SEED_ACTIVITY = [
  { user: '0xA1b2...C3d4', avatar: '🦊', action: 'Bought YES', amount: '$500', time: '3m ago', color: 'var(--yes-color)' },
  { user: '0xDe45...Fa67', avatar: '🐻', action: 'Bought NO', amount: '$200', time: '8m ago', color: 'var(--no-color)' },
  { user: '0xBc89...01Ef', avatar: '🦈', action: 'Bought YES', amount: '$1,200', time: '22m ago', color: 'var(--yes-color)' },
  { user: '0x23Cd...45Ab', avatar: '🐊', action: 'Sold NO', amount: '$400', time: '1h ago', color: 'var(--no-color)' },
]

function CommentsActivity() {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [tab, setTab] = useState('comments')
  const [comments, setComments] = useState(SEED_COMMENTS)
  const [text, setText] = useState('')
  const [sort, setSort] = useState('newest')

  const post = () => {
    if (!isConnected) { openConnectModal?.(); return }
    if (!text.trim()) return
    setComments(prev => [{ id: Date.now(), user: address ? shortAddr(address) : '0xAnon', avatar: '🙂', text: text.trim().slice(0, 280), time: 'just now', likes: 0, liked: false }, ...prev])
    setText('')
  }

  const toggleLike = id => setComments(prev => prev.map(c => c.id === id ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 } : c))
  const sorted = [...comments].sort((a, b) => sort === 'top' ? b.likes - a.likes : 0)

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
        {[{ id: 'comments', label: `Comments (${comments.length})` }, { id: 'activity', label: 'Activity' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '14px', fontWeight: 700, padding: '0 0 10px', color: tab === t.id ? '#FFF' : '#555', borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent', transition: 'all 0.16s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'comments' && (
        <div>
          {/* Input */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <input className="input" placeholder={isConnected ? 'Add a comment...' : 'Connect wallet to comment'} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && post()} maxLength={280} style={{ flex: 1 }} />
            <button className="btn btn-gold btn-sm" onClick={isConnected ? post : openConnectModal} disabled={isConnected && !text.trim()} style={{ fontWeight: 700, flexShrink: 0 }}>Post</button>
          </div>
          {/* Sort */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['newest', 'top'].map(s => (
                <button key={s} onClick={() => setSort(s)} style={{ background: sort === s ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid ' + (sort === s ? 'rgba(255,255,255,0.15)' : 'transparent'), borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: sort === s ? '#FFF' : '#555', fontFamily: 'var(--font)', textTransform: 'capitalize' }}>{s}</button>
              ))}
            </div>
            <span style={{ fontSize: '11px', color: '#555' }}>⚠️ Beware of external links</span>
          </div>
          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sorted.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{c.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#999', fontFamily: 'var(--mono)' }}>{c.user}</span>
                    <span style={{ fontSize: '11px', color: '#555' }}>{c.time}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#CCC', lineHeight: 1.55, margin: 0 }}>{c.text}</p>
                  <button onClick={() => toggleLike(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: c.liked ? 'var(--no-color)' : '#555', marginTop: '6px', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {c.liked ? '♥' : '♡'} {c.likes}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {SEED_ACTIVITY.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 0', borderBottom: i < SEED_ACTIVITY.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>{a.avatar}</div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--mono)' }}>{a.user} </span>
                <span style={{ fontSize: '12px', color: a.color, fontWeight: 700 }}>{a.action} </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFF', fontFamily: 'var(--mono)' }}>{a.amount}</span>
              </div>
              <span style={{ fontSize: '11px', color: '#555', flexShrink: 0 }}>{a.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────
export default function MarketDetailModal({ market, onClose, onCallIt }) {
  const [showFullRules, setShowFullRules] = useState(false)

  if (!market) return null

  // Safe defaults — never crash on bad props
  const baseProb = safeNum(market.baseProb ?? market.yesProb, 50)
  const seed = (() => {
    const raw = String(market.id ?? '1').replace(/\D/g, '')
    return (parseInt(raw || '1', 10) || 1) + 3
  })()
  const isP2P = market.type === 'P2P'
  const acceptorSide = (market.creatorBelievesYes === false || market.creatorAbove === false) ? 'YES' : 'NO'
  const acceptorProb = acceptorSide === 'YES' ? baseProb : 100 - baseProb
  const desc = market.description || ''
  const rules = market.rules || `This market resolves "Yes" if ${desc.endsWith('?') ? desc.slice(0, -1) : desc}. Otherwise resolves "No". Based on verifiable sources at expiry: ${market.endDate || ''} ${market.endTime || ''}.`

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)', zIndex: 2000, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px 16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', width: '100%', maxWidth: '760px', margin: '0 auto', padding: '24px 20px', animation: 'slideUp 0.22s ease' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span className={`badge ${market.category === 'Crypto' ? 'badge-gold' : market.category === 'Sports' ? 'badge-green' : market.category === 'Politics' ? 'badge-blue' : 'badge-gray'}`}>{market.category || 'Market'}</span>
              <span className={`badge ${isP2P ? 'badge-gray' : 'badge-purple'}`}>{market.type || 'P2P'}</span>
              {market.resType && market.resType !== 'mixed' && (
                <span className={`badge ${market.resType === 'auto' ? 'badge-auto' : 'badge-manual'}`}>{market.resType === 'auto' ? '⚡ AUTO' : '🛡 MANUAL'}</span>
              )}
            </div>
            <h2 style={{ fontSize: 'clamp(15px, 2.5vw, 19px)', fontWeight: 800, color: '#FFF', lineHeight: 1.4, margin: 0 }}>{desc}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 12px', color: '#888', cursor: 'pointer', fontSize: '16px', fontFamily: 'var(--font)', flexShrink: 0 }}>✕</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '18px', flexWrap: 'wrap' }}>
          {[
            { label: 'Vol.', value: market.volume || `$${(seed * 3700 + 4200).toLocaleString()}` },
            { label: 'Expires', value: market.endDate || '—' },
            { label: 'Time', value: market.endTime || '—' },
          ].map((s, i) => (
            <div key={i}>
              <span style={{ fontSize: '11px', color: '#555' }}>{s.label} </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#CCC', fontFamily: 'var(--mono)' }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <Chart baseProb={baseProb} seed={seed} />
        </div>

        {/* Order Book */}
        <OrderBook prob={baseProb} seed={seed} />

        {/* Rules */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '12px', paddingBottom: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFF', borderBottom: '2px solid var(--gold)', paddingBottom: '10px' }}>Rules</span>
          </div>
          <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.7, margin: 0 }}>
            {showFullRules ? rules : rules.slice(0, 200) + (rules.length > 200 ? '...' : '')}
            {rules.length > 200 && (
              <button onClick={() => setShowFullRules(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font)', marginLeft: '4px' }}>
                {showFullRules ? 'Show less' : 'Show more'}
              </button>
            )}
          </p>
        </div>

        {/* Comments & Activity */}
        <CommentsActivity />

        {/* CALL IT — only for P2P markets */}
        {isP2P && (market.status === 'Open' || market.status === 0) && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ background: acceptorSide === 'YES' ? 'rgba(38,161,123,0.06)' : 'rgba(232,93,93,0.06)', border: `1px solid ${acceptorSide === 'YES' ? 'rgba(38,161,123,0.2)' : 'rgba(232,93,93,0.2)'}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', color: acceptorSide === 'YES' ? 'var(--yes-color)' : 'var(--no-color)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>You are saying</div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: acceptorSide === 'YES' ? 'var(--yes-color)' : 'var(--no-color)', margin: 0 }}>
                {acceptorSide === 'NO'
                  ? desc.replace(/ will /i, ' will NOT ')
                  : desc.replace(/\bwill NOT\b/i, 'will').replace(/\bNOT\b/g, '').replace(/\s{2,}/g, ' ').trim()}
              </p>
            </div>
            <button
              className={`btn ${acceptorSide === 'YES' ? 'btn-yes' : 'btn-no'}`}
              style={{ width: '100%', fontWeight: 800, fontSize: '16px', padding: '14px' }}
              onClick={() => { onCallIt?.(market, acceptorSide); onClose() }}
            >
              CALL IT — {acceptorSide} {Math.round(acceptorProb)}¢
            </button>
          </div>
        )}

        {/* Multi — just a note, betting is done on the card */}
        {!isP2P && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>Select YES or NO directly on the market card to add to your bet slip.</p>
            <button onClick={onClose} className="btn btn-outline btn-lg" style={{ width: '100%' }}>Back to Markets →</button>
          </div>
        )}

      </div>
    </div>
  )
}
