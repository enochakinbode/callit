import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import Logo from '../components/Logo'
import BetCard from '../components/BetCard'
import AcceptBetModal from '../components/AcceptBetModal'
import CreateBetModal from '../components/CreateBetModal'
import { useToast } from '../context/ToastContext'
import { P2P_MARKETS, MULTI_ADMIN_MARKETS } from '../data/markets'

// ── Data pulled from real sources — NO hardcoded markets ──────
// Trending = newest 3 open P2P markets
const TRENDING_P2P = P2P_MARKETS.filter(m => m.status === 0).slice(0, 3)
// Trending Multi = top 2 by bettors
const TRENDING_MULTI = [...MULTI_ADMIN_MARKETS].sort((a, b) => (b.bettors || 0) - (a.bettors || 0)).slice(0, 2)

const STATS = [
  { label: 'Total Volume', value: '$0',  sub: 'All time',    icon: '💰' },
  { label: 'Active Markets', value: String(P2P_MARKETS.filter(m => m.status === 0).length + MULTI_ADMIN_MARKETS.length), sub: 'Right now', icon: '⚡' },
  { label: 'Platform Fee', value: '2%',  sub: 'Winner pays', icon: '🏦' },
  { label: 'Network',      value: 'Base', sub: 'Mainnet live', icon: '⛓' },
]

const CAT_COLOR = {
  Crypto: 'badge-gold', Sports: 'badge-green', Economy: 'badge-gray',
  Politics: 'badge-blue', 'Social Media': 'badge-purple', Tech: 'badge-blue',
}

// ── Arc gauge (same as BetCard) ───────────────────────────────
function ArcGauge({ prob, size = 52 }) {
  const r = (size - 7) / 2
  const circ = 2 * Math.PI * r
  const filled = (prob / 100) * circ
  const isGreen = prob >= 50
  const color = isGreen ? 'var(--yes-color)' : 'var(--no-color)'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="rgba(255,255,255,0.04)" stroke={isGreen ? 'rgba(38,161,123,0.15)' : 'rgba(232,93,93,0.15)'} strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.7s ease, stroke 0.4s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px' }}>
        <span style={{ fontSize: '11px', fontWeight: 900, color, lineHeight: 1, fontFamily: 'var(--mono)' }}>{prob}%</span>
        <span style={{ fontSize: '6px', color: 'var(--text-muted)', lineHeight: 1 }}>chance</span>
      </div>
    </div>
  )
}

// ── Trending Multi Card — uses real MULTI_ADMIN_MARKETS data ──
function TrendingMultiCard({ market }) {
  const [liveYes, setLiveYes] = useState(market.yesProb)
  const seed = market.id + 3

  useEffect(() => {
    const t = setInterval(() => {
      setLiveYes(prev => parseFloat(Math.max(3, Math.min(97, prev + (Math.random() - 0.49) * 2)).toFixed(1)))
    }, 3000 + seed * 300 % 2000)
    return () => clearInterval(t)
  }, [seed])

  const liveNo = parseFloat((100 - liveYes).toFixed(1))

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'border-color 0.15s' }}>
      {/* Badges + gauge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '7px' }}>
            <span className={`badge ${CAT_COLOR[market.category] || 'badge-gray'}`}>{market.category}</span>
            <span className="badge badge-purple">MULTI</span>
          </div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.45, margin: 0 }}>{market.description}</p>
        </div>
        <ArcGauge prob={Math.round(liveYes)} size={52} />
      </div>

      {/* YES/NO prices */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--yes-color)', fontFamily: 'var(--mono)' }}>YES {Math.round(liveYes)}¢</span>
        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--no-color)', fontFamily: 'var(--mono)' }}>NO {Math.round(liveNo)}¢</span>
      </div>

      {/* Expires + volume */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
        <span>{market.endDate}</span>
        <span style={{ color: 'var(--gold)', fontFamily: 'var(--mono)', fontWeight: 700 }}>{market.volume}</span>
      </div>

      <Link to="/multi" className="btn btn-ghost btn-sm" style={{ textAlign: 'center', fontSize: '12px' }}>
        View Market →
      </Link>
    </div>
  )
}

// ── Home ──────────────────────────────────────────────────────
export default function Home() {
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const navigate = useNavigate()
  const [acceptingBet, setAcceptingBet] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [chartHover, setChartHover] = useState(null)

  const chartPoints = [22, 35, 28, 42, 38, 55, 48, 62, 58, 70, 65, 80]
  const maxP = Math.max(...chartPoints)
  const h = 60, w = 200
  const pts = chartPoints.map((v, i) => `${(i / (chartPoints.length - 1)) * w},${h - (v / maxP) * h}`).join(' ')

  const handleCreateMarket = () => {
    if (!isConnected) { openConnectModal(); return }
    setShowCreate(true)
  }

  return (
    <div className="page">

      {/* Hero */}
      <section style={{ padding: 'clamp(32px,6vw,64px) 20px 48px', textAlign: 'center', maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <Logo size={72} />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '99px', background: 'rgba(38,161,123,0.10)', border: '1px solid rgba(38,161,123,0.20)', marginBottom: '20px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#26A17B', display: 'inline-block' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#26A17B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live on Base</span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px,6vw,60px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '18px', lineHeight: 1.08, color: 'var(--text)' }}>
          Make Your Call.<br />
          <span style={{ color: 'var(--gold)' }}>Win On-Chain.</span>
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: 1.75, marginBottom: '36px', maxWidth: '520px', margin: '0 auto 36px' }}>
          Prediction markets on Base. You set the odds. Take a side. Everything settled on-chain.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleCreateMarket} className="btn btn-gold btn-xl">+ Create Market</button>
          <Link to="/markets" className="btn btn-outline btn-xl">Browse Markets</Link>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '0 20px 48px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {STATS.map((s, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '22px', marginBottom: '10px' }}>{s.icon}</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{s.value}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginTop: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Activity chart */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '32px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Market Activity</div>
              <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--text)' }}>↑ Trending</div>
              <div style={{ fontSize: '13px', color: 'var(--yes-color)', fontWeight: 600, marginTop: '4px' }}>+24.3% volume this week</div>
            </div>
            <svg width={w} height={h + 8} style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E8B84B" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#E8B84B" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#cg)" />
              <polyline points={pts} fill="none" stroke="#E8B84B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {chartPoints.map((v, i) => {
                const x = (i / (chartPoints.length - 1)) * w
                const y = h - (v / maxP) * h
                return <circle key={i} cx={x} cy={y} r={chartHover === i ? 4 : 2.5} fill={chartHover === i ? '#E8B84B' : '#B8902A'} style={{ cursor: 'pointer' }} onMouseEnter={() => setChartHover(i)} onMouseLeave={() => setChartHover(null)} />
              })}
            </svg>
          </div>
        </div>
      </section>

      {/* Tempo banner */}
      <section style={{ padding: '0 20px 32px' }}>
        <div className="container">
          <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: '14px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ fontSize: '28px' }}>⚡</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--gold)' }}>Tempo Integration Coming</span>
                  <span style={{ background: 'rgba(232,184,75,0.12)', border: '1px solid rgba(232,184,75,0.25)', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Soon</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  AI agents will auto-settle all markets. Chelsea wins → money in your wallet instantly.
                </p>
              </div>
            </div>
            <Link to="/how-it-works" className="btn btn-outline btn-sm">Learn More</Link>
          </div>
        </div>
      </section>

      {/* Trending P2P */}
      <section style={{ padding: '0 20px 48px' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>Trending P2P Markets</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>Latest open markets from creators</p>
            </div>
            <Link to="/p2p" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          {TRENDING_P2P.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {TRENDING_P2P.map(bet => (
                <BetCard key={bet.id} bet={bet} currentUser={null} onAccept={setAcceptingBet} onCancel={() => {}} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="icon">⚔️</div>
              <h3>No open P2P markets yet</h3>
              <p>Be the first to create one</p>
              <button className="btn btn-gold btn-sm" onClick={handleCreateMarket} style={{ marginTop: '12px' }}>Create Market</button>
            </div>
          )}
        </div>
      </section>

      {/* Trending Multi */}
      <section style={{ padding: '0 20px 48px' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>Trending Multi Markets</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>Most active markets this week</p>
            </div>
            <Link to="/multi" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {TRENDING_MULTI.map(m => <TrendingMultiCard key={m.id} market={m} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '0 20px 80px' }}>
        <div className="container">
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '48px 40px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '10px', color: 'var(--text)' }}>Ready to Call It?</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>Create a market or place your bet. All funds held by smart contract.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleCreateMarket} className="btn btn-gold btn-lg">+ Create P2P Market</button>
              <Link to="/multi" className="btn btn-outline btn-lg">Explore Multi Markets</Link>
            </div>
          </div>
        </div>
      </section>

      {acceptingBet && <AcceptBetModal bet={acceptingBet} onClose={() => setAcceptingBet(null)} onSuccess={() => setAcceptingBet(null)} />}
      {showCreate && <CreateBetModal onClose={() => setShowCreate(false)} onSuccess={() => setShowCreate(false)} />}
    </div>
  )
}
