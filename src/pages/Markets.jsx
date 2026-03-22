import { useState, useMemo, useEffect } from 'react'
import MarketDetailModal from '../components/MarketDetailModal'
import { P2P_MARKETS, MULTI_ADMIN_MARKETS } from '../data/markets'

const CATEGORIES = ['All', 'Crypto', 'Politics', 'Sports', 'Social Media', 'Economy', 'Tech']

const catColors = {
  Crypto: 'badge-gold', Politics: 'badge-blue', Sports: 'badge-green',
  'Social Media': 'badge-purple', Entertainment: 'badge-orange', Economy: 'badge-gray', Tech: 'badge-blue',
}

const seededRand = (seed, i) => ((seed * 9301 + i * 49297 + 233) % 233280) / 233280

// Build unified market list from both data sources
const ALL_MARKETS = [
  ...P2P_MARKETS.map(m => ({
    id: `p2p-${m.id}`,
    type: 'P2P',
    category: m.category,
    description: m.description,
    baseProb: 50,
    pool: Number(m.totalPool) / 1000000,
    status: m.status === 0 ? 'Open' : m.status === 1 ? 'Matched' : 'Resolved',
    resType: m.resType === 1 ? 'auto' : 'manual',
    endDate: new Date(Number(m.resolutionTime) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    endTime: new Date(Number(m.resolutionTime) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' UTC',
    creatorBelievesYes: m.creatorAbove,
    betData: m,
  })),
  ...MULTI_ADMIN_MARKETS.map(m => ({
    id: `multi-${m.id}`,
    type: 'Multi',
    category: m.category,
    description: m.description,
    baseProb: m.yesProb,
    pool: 50,
    status: 'Open',
    resType: 'mixed',
    endDate: m.endDate,
    endTime: m.endTime,
    creatorBelievesYes: true,
  })),
]

// ── Prob Bar ─────────────────────────────────────────────────
const ProbBar = ({ yes }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--yes-color)' }}>YES {Math.round(yes)}¢</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--no-color)' }}>NO {Math.round(100 - yes)}¢</span>
    </div>
    <div className="prob-bar-dual">
      <div className="prob-bar-yes" style={{ width: `${yes}%`, transition: 'width 0.8s ease' }} />
      <div className="prob-bar-no" style={{ width: `${100 - yes}%`, transition: 'width 0.8s ease' }} />
    </div>
  </div>
)

// ── Sparkline ────────────────────────────────────────────────
const Sparkline = ({ history, isUp }) => {
  const w = 300, h = 56
  if (!history || history.length < 2) return null
  const maxP = Math.max(...history), minP = Math.min(...history)
  const range = maxP - minP || 1
  const norm = history.map(v => h - 4 - ((v - minP) / range) * (h - 8))
  const pts = norm.map((y, i) => `${(i / (history.length - 1)) * w},${y}`).join(' ')
  const color = isUp ? '#26A17B' : '#E85D5D'
  const uid = `sp${Math.abs(history[0] * 100).toFixed(0)}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${uid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={norm[norm.length - 1]} r="3" fill={color} />
    </svg>
  )
}

// ── Order Book ───────────────────────────────────────────────
const genBook = (centerYes, seed) => {
  const asks = [], bids = []
  for (let i = 0; i < 4; i++) {
    const price = Math.min(98, Math.round(centerYes + (i + 1) * (1 + seededRand(seed, i) * 1.5)))
    const shares = Math.floor(3000 + seededRand(seed + i, i + 3) * 70000)
    asks.push({ price, shares: shares.toLocaleString(), total: `$${Math.floor(shares * price / 100).toLocaleString()}` })
  }
  for (let i = 0; i < 4; i++) {
    const price = Math.max(2, Math.round(centerYes - (i + 1) * (1 + seededRand(seed + 10, i) * 1.5)))
    const shares = Math.floor(4000 + seededRand(seed + i + 20, i + 7) * 80000)
    bids.push({ price, shares: shares.toLocaleString(), total: `$${Math.floor(shares * price / 100).toLocaleString()}` })
  }
  return { asks: asks.reverse(), bids }
}

const OrderBook = ({ liveYes, seed }) => {
  const { asks, bids } = genBook(Math.round(liveYes), seed)
  const allTotals = [...asks, ...bids].map(r => parseFloat(r.total.replace(/[$,]/g, '')))
  const maxVal = Math.max(...allTotals) || 1
  const barW = v => Math.max(4, (parseFloat(v.replace(/[$,]/g, '')) / maxVal) * 100)

  const rowStyle = { position: 'relative', display: 'grid', gridTemplateColumns: '50px 1fr 1fr 1fr', gap: '6px', padding: '6px 12px', alignItems: 'center' }
  const headerStyle = { display: 'grid', gridTemplateColumns: '50px 1fr 1fr 1fr', gap: '6px', padding: '7px 12px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }

  return (
    <div style={{ borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ minWidth: '300px' }}>
        <div style={headerStyle}>
          {['', 'PRICE', 'SHARES', 'TOTAL'].map((h, i) => (
            <span key={i} style={{ fontSize: '9px', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: i > 1 ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>
        {asks.map((row, i) => (
          <div key={`ask-${i}`} style={{ ...rowStyle, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${barW(row.total)}%`, background: 'rgba(232,93,93,0.07)', pointerEvents: 'none' }} />
            {i === 0 && <span style={{ position: 'absolute', left: 5, top: 5, fontSize: '8px', fontWeight: 800, color: '#fff', background: '#E85D5D', borderRadius: '3px', padding: '1px 5px' }}>Asks</span>}
            <span />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#E85D5D', fontFamily: 'var(--mono)' }}>{row.price}¢</span>
            <span style={{ fontSize: '11px', color: '#777', fontFamily: 'var(--mono)', textAlign: 'right' }}>{row.shares}</span>
            <span style={{ fontSize: '11px', color: '#777', fontFamily: 'var(--mono)', textAlign: 'right' }}>{row.total}</span>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 1fr', gap: '6px', padding: '7px 12px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '10px', color: '#888', fontFamily: 'var(--mono)' }}>Last: <strong style={{ color: '#CCC' }}>{Math.round(liveYes)}¢</strong></span>
          <span style={{ fontSize: '10px', color: '#888', fontFamily: 'var(--mono)' }}>Spread: <strong style={{ color: '#CCC' }}>1¢</strong></span>
        </div>
        {bids.map((row, i) => (
          <div key={`bid-${i}`} style={{ ...rowStyle, borderBottom: i < bids.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${barW(row.total)}%`, background: 'rgba(38,161,123,0.07)', pointerEvents: 'none' }} />
            {i === 0 && <span style={{ position: 'absolute', left: 5, top: 5, fontSize: '8px', fontWeight: 800, color: '#fff', background: '#26A17B', borderRadius: '3px', padding: '1px 5px' }}>Bids</span>}
            <span />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#26A17B', fontFamily: 'var(--mono)' }}>{row.price}¢</span>
            <span style={{ fontSize: '11px', color: '#777', fontFamily: 'var(--mono)', textAlign: 'right' }}>{row.shares}</span>
            <span style={{ fontSize: '11px', color: '#777', fontFamily: 'var(--mono)', textAlign: 'right' }}>{row.total}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MarketCard — fully isolated state per card ───────────────
function MarketCard({ market, bookmarked, onBookmark, onCallIt }) {
  const [showDetail, setShowDetail] = useState(false)

  const seedBase = parseInt(market.id.replace(/\D/g, '') || '1') + 7
  const [liveYes, setLiveYes] = useState(market.baseProb)
  const [history, setHistory] = useState(() =>
    Array.from({ length: 12 }, (_, i) => {
      const v = market.baseProb - 6 + Math.floor(seededRand(seedBase + i, i) * 12)
      return Math.max(5, Math.min(95, v))
    })
  )

  useEffect(() => {
    if (market.status !== 'Open' && market.status !== 'Matched') return
    const t = setInterval(() => {
      setLiveYes(prev => {
        const next = Math.max(5, Math.min(95, prev + (Math.random() - 0.48) * 2.5))
        setHistory(h => [...h.slice(-11), parseFloat(next.toFixed(1))])
        return parseFloat(next.toFixed(1))
      })
    }, 3500 + seedBase * 200 % 2500)
    return () => clearInterval(t)
  }, [market.status, seedBase])

  const liveNo = parseFloat((100 - liveYes).toFixed(1))
  const isUp = liveYes >= history[0]
  const acceptorSide = market.creatorBelievesYes !== false ? 'NO' : 'YES'
  const acceptorProb = acceptorSide === 'YES' ? liveYes : liveNo

  return (
    <div className="card card-gold fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Badges + bookmark */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
          <span className={`badge ${catColors[market.category] || 'badge-gray'}`}>{market.category}</span>
          <span className={`badge ${market.type === 'P2P' ? 'badge-gray' : 'badge-purple'}`}>{market.type}</span>
          {market.resType !== 'mixed' && (
            <span className={`badge ${market.resType === 'auto' ? 'badge-auto' : 'badge-manual'}`}>
              {market.resType === 'auto' ? '⚡ AUTO' : '🛡 MANUAL'}
            </span>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onBookmark(market.id) }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '2px', flexShrink: 0, opacity: bookmarked ? 1 : 0.25, transition: 'all 0.16s' }}
        >🔖</button>
      </div>

      <p style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', lineHeight: 1.5 }}>{market.description}</p>

      <ProbBar yes={liveYes} />

      {/* Pool + expiry */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px 10px' }}>
          <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>Pool</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>${market.pool} USDC</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px 10px' }}>
          <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>Expires</div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#CCC', fontFamily: 'var(--mono)', lineHeight: 1.4 }}>
            {market.endDate}<br />
            {market.endTime && <span style={{ fontSize: '10px', color: '#888' }}>{market.endTime}</span>}
          </div>
        </div>
      </div>

      {/* Trend indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
        <span style={{ color: '#555' }}>{market.status}</span>
        <span style={{ fontWeight: 700, fontFamily: 'var(--mono)', color: isUp ? 'var(--yes-color)' : 'var(--no-color)' }}>
          {isUp ? '▲' : '▼'} {Math.abs(liveYes - history[0]).toFixed(1)}¢
        </span>
      </div>

      {/* View details button */}
      <button
        onClick={() => setShowDetail(true)}
        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '9px', color: '#888', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.14s' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#CCC' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#888' }}
      >
        📊 View Chart & Details
      </button>

      {showDetail && (
        <MarketDetailModal
          market={market}
          onClose={() => setShowDetail(false)}
          onCallIt={(m, side) => { setShowDetail(false); onCallIt(m, side) }}
        />
      )}
    </div>
  )
}

// ── Markets page ─────────────────────────────────────────────
export default function Markets() {
  const [category, setCategory] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [bookmarks, setBookmarks] = useState(new Set())
  const [showBookmarked, setShowBookmarked] = useState(false)
  const [sortBy, setSortBy] = useState('trending')

  const toggleBookmark = id => {
    setBookmarks(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = useMemo(() => {
    let list = ALL_MARKETS
    if (category !== 'All') list = list.filter(m => m.category === category)
    if (typeFilter !== 'All') list = list.filter(m => m.type === typeFilter)
    if (statusFilter !== 'All') list = list.filter(m => m.status === statusFilter)
    if (search) list = list.filter(m => m.description.toLowerCase().includes(search.toLowerCase()))
    if (showBookmarked) list = list.filter(m => bookmarks.has(m.id))
    if (sortBy === 'pool') list = [...list].sort((a, b) => b.pool - a.pool)
    return list
  }, [category, typeFilter, statusFilter, search, showBookmarked, bookmarks, sortBy])

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>Markets</h1>
          <p style={{ fontSize: '14px', color: '#666' }}>All prediction markets. Browse, filter, and make your call.</p>
        </div>

        {/* Category pills */}
        <div className="pill-tabs" style={{ marginBottom: '20px' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} className={`pill-tab ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>{cat}</button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '180px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }}>🔍</span>
            <input className="input" placeholder="Search markets..." style={{ paddingLeft: '36px' }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input" style={{ width: 'auto', minWidth: '110px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="All">All Types</option>
            <option value="P2P">P2P</option>
            <option value="Multi">Multi</option>
          </select>
          <select className="input" style={{ width: 'auto', minWidth: '120px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Open">Open</option>
            <option value="Matched">Matched</option>
            <option value="Resolved">Resolved</option>
          </select>
          <select className="input" style={{ width: 'auto', minWidth: '120px' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="trending">Trending</option>
            <option value="pool">Highest Pool</option>
          </select>
          <button className={`btn ${showBookmarked ? 'btn-gold' : 'btn-ghost'} btn-sm`} onClick={() => setShowBookmarked(v => !v)}>
            🔖 {bookmarks.size > 0 ? bookmarks.size : ''}
          </button>
        </div>

        <div style={{ fontSize: '13px', color: '#555', marginBottom: '16px' }}>
          {filtered.length} market{filtered.length !== 1 ? 's' : ''}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">{showBookmarked ? '🔖' : '🔍'}</div>
            <h3>{showBookmarked ? 'No bookmarks yet' : 'No markets found'}</h3>
            <p>{showBookmarked ? 'Bookmark markets to track them here' : 'Try adjusting your filters'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {filtered.map(m => (
              <MarketCard
                key={m.id}
                market={m}
                bookmarked={bookmarks.has(m.id)}
                onBookmark={toggleBookmark}
                onCallIt={(market, side) => console.log('CALL IT', market.id, side)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
