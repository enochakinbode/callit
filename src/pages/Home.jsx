import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import Logo from '../components/Logo'
import BetCard from '../components/BetCard'
import AcceptBetModal from '../components/AcceptBetModal'
import MarketDetailModal from '../components/MarketDetailModal'
import { useToast } from '../context/ToastContext'
import { MIN_STAKE_USDC, MAX_STAKE_USDC, calcCombinedProb } from '../lib/config'
import { P2P_MARKETS } from '../data/markets'

// Show first 3 open P2P markets as trending
const TRENDING_P2P = P2P_MARKETS.filter(m => m.status === 0).slice(0, 3)

const sr = (seed, i) => ((seed * 9301 + i * 49297 + 233) % 233280) / 233280


const TRENDING_MULTI = [
  {
    id: 300, legs: 3, pool: '$50', category: 'Crypto',
    description: 'ETH $4k + BTC $100k + Base TVL $10B accumulator',
    markets: [
      { id: 0, desc: 'ETH above $4,000 by Apr 30, 2026', yesProb: 65, noProb: 35 },
      { id: 1, desc: 'BTC above $100,000 by Jun 30, 2026', yesProb: 72, noProb: 28 },
      { id: 2, desc: 'Base TVL exceeds $10B by Jun 30, 2026', yesProb: 55, noProb: 45 },
    ],
  },
  {
    id: 301, legs: 2, pool: '$80', category: 'Sports',
    description: 'Man City wins EPL + Real Madrid wins Champions League',
    markets: [
      { id: 3, desc: 'Man City wins Premier League 2025/26', yesProb: 48, noProb: 52 },
      { id: 4, desc: 'Real Madrid wins Champions League 2025/26', yesProb: 62, noProb: 38 },
    ],
  },
]

const STATS = [
  { label: 'Total Volume', value: '$0', sub: 'All time', icon: '💰' },
  { label: 'Active Markets', value: '0', sub: 'Right now', icon: '⚡' },
  { label: 'Platform Fee', value: '2%', sub: 'Winner pays', icon: '🏦' },
  { label: 'Network', value: 'Base', sub: 'Mainnet live', icon: '⛓' },
]


// ── Trending Multi Card ───────────────────────────────────────
function TrendingMultiCard({ mb }) {
  const [expanded, setExpanded] = useState(false)
  const [selections, setSelections] = useState({})
  const [stake, setStake] = useState('')
  const [loading, setLoading] = useState(false)
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { addToast } = useToast()

  const [liveProbs, setLiveProbs] = useState(() =>
    Object.fromEntries(mb.markets.map(m => [m.id, m.yesProb]))
  )

  useEffect(() => {
    const t = setInterval(() => {
      setLiveProbs(prev => {
        const next = { ...prev }
        mb.markets.forEach(m => {
          const delta = (Math.random() - 0.49) * 1.5
          next[m.id] = parseFloat(Math.max(5, Math.min(95, prev[m.id] + delta)).toFixed(1))
        })
        return next
      })
    }, 3000 + mb.id * 400)
    return () => clearInterval(t)
  }, [mb.id, mb.markets])

  const selList = Object.values(selections)
  const combinedProb = selList.length > 0
    ? selList.reduce((acc, s) => acc * (s.prob / 100), 1) * 100
    : 0
  const stakeNum = parseFloat(stake) || 0
  const payout = combinedProb > 0 ? (stakeNum * (100 / combinedProb) * 0.98).toFixed(2) : '0.00'

  const handleSelect = (market, side) => {
    setSelections(prev => {
      const next = { ...prev }
      if (next[market.id]?.side === side) {
        delete next[market.id]
      } else {
        const prob = side === 'YES' ? liveProbs[market.id] : 100 - liveProbs[market.id]
        next[market.id] = { market, side, prob }
      }
      return next
    })
  }

  const handleCallIt = async () => {
    if (loading) return
    if (!isConnected) { openConnectModal?.(); return }
    if (selList.length < 2) return
    if (!stakeNum || stakeNum < 1) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    addToast(`${selList.length}-leg market placed!`, 'success')
    setLoading(false)
    setSelections({})
    setStake('')
  }

  return (
    <div className="card card-gold" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span className="badge badge-gold">🎯 {mb.legs}-LEG</span>
          <span className={`badge ${mb.category === 'Crypto' ? 'badge-gold' : mb.category === 'Sports' ? 'badge-green' : 'badge-gray'}`}>{mb.category}</span>
        </div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{mb.pool} USDC</span>
      </div>

      <p style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', lineHeight: 1.5 }}>{mb.description}</p>

      <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Combined Odds</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>
            {combinedProb > 0 ? combinedProb.toFixed(1) : '—'}¢
          </div>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ background: 'none', border: 'none', color: '#555', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font)' }}
        >
          {expanded ? '▲ collapse' : '▼ select & bet'}
        </button>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.18s ease' }}>
          {mb.markets.map(market => {
            const sel = selections[market.id]
            const yp = liveProbs[market.id] || market.yesProb
            const np = parseFloat((100 - yp).toFixed(1))
            return (
              <div key={market.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '10px 12px', border: sel ? `1px solid ${sel.side === 'YES' ? 'rgba(38,161,123,0.4)' : 'rgba(232,93,93,0.4)'}` : '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#DDD', marginBottom: '8px', lineHeight: 1.4 }}>{market.desc}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className={`btn btn-sm ${sel?.side === 'YES' ? 'btn-yes active' : 'btn-yes'}`} style={{ flex: 1, fontWeight: 700 }} onClick={() => handleSelect(market, 'YES')}>YES {yp.toFixed(0)}¢</button>
                  <button className={`btn btn-sm ${sel?.side === 'NO' ? 'btn-no active' : 'btn-no'}`} style={{ flex: 1, fontWeight: 700 }} onClick={() => handleSelect(market, 'NO')}>NO {np.toFixed(0)}¢</button>
                </div>
              </div>
            )
          })}

          {selList.length >= 2 && (
            <>
              <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>Combined: {selList.map(s => `${s.prob.toFixed(0)}¢`).join(' × ')}</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{combinedProb.toFixed(1)}¢</span>
                </div>
              </div>
              <input className="input" type="number" placeholder="Stake amount (USDC)" min="1" value={stake} onChange={e => setStake(e.target.value)} />
              {stakeNum > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--yes-color)', fontFamily: 'var(--mono)', textAlign: 'center' }}>
                  Win: ${payout} USDC if all {selList.length} correct
                </div>
              )}
              <button
                className="btn btn-gold"
                style={{ width: '100%', fontWeight: 800 }}
                onClick={handleCallIt}
                disabled={loading || selList.length < 2 || !stakeNum}
              >
                {loading ? <><span className="spinner" /> Confirming...</> : `CALL IT — ${selList.length}-Leg`}
              </button>
            </>
          )}
          {selList.length < 2 && (
            <div style={{ textAlign: 'center', fontSize: '12px', color: '#555' }}>
              Select {2 - selList.length} more market{2 - selList.length !== 1 ? 's' : ''} to continue
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Home page ─────────────────────────────────────────────────
export default function Home() {
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [acceptingBet, setAcceptingBet] = useState(null)
  const [chartHover, setChartHover] = useState(null)

  const chartPoints = [22, 35, 28, 42, 38, 55, 48, 62, 58, 70, 65, 80]
  const maxP = Math.max(...chartPoints)
  const h = 60, w = 200
  const pts = chartPoints.map((v, i) => `${(i / (chartPoints.length - 1)) * w},${h - (v / maxP) * h}`).join(' ')

  return (
    <div className="page">
      {/* Hero */}
      <section style={{ padding: 'clamp(32px,6vw,64px) 20px 48px', textAlign: 'center', maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -16, background: 'radial-gradient(circle, rgba(232,184,75,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
            <Logo size={76} />
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '99px', background: 'rgba(38,161,123,0.10)', border: '1px solid rgba(38,161,123,0.20)', marginBottom: '20px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#26A17B', display: 'inline-block' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#26A17B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live on Base</span>
        </div>
        <h1 style={{ fontSize: 'clamp(38px,6vw,62px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '18px', lineHeight: 1.08 }}>
          Make Your Call.<br /><span className="glow-text">Win On-Chain.</span>
        </h1>
        <p style={{ fontSize: '16px', color: '#888', lineHeight: 1.75, marginBottom: '36px', maxWidth: '520px', margin: '0 auto 36px' }}>
          Prediction markets on Base. You set the odds. Take a side. Everything settled on-chain.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isConnected ? (
            <><Link to="/p2p" className="btn btn-gold btn-xl">+ Create Market</Link><Link to="/markets" className="btn btn-outline btn-xl">Browse Markets</Link></>
          ) : (
            <><button onClick={openConnectModal} className="btn btn-gold btn-xl">Connect Wallet</button><Link to="/markets" className="btn btn-outline btn-xl">Browse Markets</Link></>
          )}
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '0 20px 48px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {STATS.map((s, i) => (
              <div key={i} style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '22px', marginBottom: '10px' }}>{s.icon}</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{s.value}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFF', marginTop: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '32px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Market Activity</div>
              <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--mono)', color: '#FFF' }}>↑ Trending</div>
              <div style={{ fontSize: '13px', color: 'var(--yes-color)', fontWeight: 600, marginTop: '4px' }}>+24.3% volume this week</div>
            </div>
            <svg width={w} height={h + 8} style={{ overflow: 'visible' }}>
              <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E8B84B" stopOpacity="0.15" /><stop offset="100%" stopColor="#E8B84B" stopOpacity="0" /></linearGradient></defs>
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

      {/* Tempo Banner */}
      <section style={{ padding: '0 20px 32px' }}>
        <div className="container">
          <div style={{ background: 'linear-gradient(135deg, rgba(232,184,75,0.06) 0%, rgba(96,165,250,0.06) 100%)', border: '1px solid rgba(232,184,75,0.18)', borderRadius: '14px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ fontSize: '28px' }}>⚡</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--gold)' }}>Tempo Integration Coming</span>
                  <span style={{ background: 'rgba(232,184,75,0.12)', border: '1px solid rgba(232,184,75,0.25)', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Soon</span>
                </div>
                <p style={{ fontSize: '13px', color: '#666', margin: 0, lineHeight: 1.5 }}>
                  AI agents will auto-settle all markets via Tempo + MPP. Chelsea wins → money in your wallet instantly.
                </p>
              </div>
            </div>
            <Link to="/how-it-works" className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>Learn More →</Link>
          </div>
        </div>
      </section>

      {/* Trending P2P */}
      <section style={{ padding: '0 20px 48px' }}>
        <div className="container">
          <div className="section-header">
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>🔥 Trending P2P Markets</h2>
              <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Click "View Chart" to see live odds and place your bet</p>
            </div>
            <Link to="/p2p" className="btn btn-ghost btn-sm">View All →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {TRENDING_P2P.map(bet => (
              <BetCard key={bet.id} bet={bet} currentUser={null} onAccept={setAcceptingBet} onCancel={() => {}} />
            ))}
          </div>
        </div>
      </section>

      {/* Trending Multi */}
      <section style={{ padding: '0 20px 48px' }}>
        <div className="container">
          <div className="section-header">
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>🎯 Trending Multi Markets</h2>
              <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Select YES/NO on each leg — stake from here</p>
            </div>
            <Link to="/multi" className="btn btn-ghost btn-sm">View All →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {TRENDING_MULTI.map(mb => <TrendingMultiCard key={mb.id} mb={mb} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '0 20px 80px' }}>
        <div className="container">
          <div style={{ background: 'linear-gradient(135deg, rgba(232,184,75,0.08) 0%, rgba(232,184,75,0.03) 100%)', border: '1px solid rgba(232,184,75,0.18)', borderRadius: '20px', padding: '48px 40px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '12px' }}>Ready to Call It?</h2>
            <p style={{ fontSize: '15px', color: '#888', marginBottom: '28px' }}>Create a market or place your bet. All funds held by smart contract.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {isConnected ? (
                <><Link to="/p2p" className="btn btn-gold btn-lg">+ Create P2P Market</Link><Link to="/multi" className="btn btn-outline btn-lg">Explore Multi Markets</Link></>
              ) : (
                <button onClick={openConnectModal} className="btn btn-gold btn-lg">Connect Wallet to Start</button>
              )}
            </div>
          </div>
        </div>
      </section>

      {acceptingBet && (
        <AcceptBetModal bet={acceptingBet} onClose={() => setAcceptingBet(null)} onSuccess={() => setAcceptingBet(null)} />
      )}
    </div>
  )
}
