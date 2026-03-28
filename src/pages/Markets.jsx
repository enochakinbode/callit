import { useState, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { P2P_MARKETS, MULTI_ADMIN_MARKETS, GROUPED_MARKETS } from '../data/markets'
import BetCard from '../components/BetCard'
import AcceptBetModal from '../components/AcceptBetModal'
import MarketDetailModal from '../components/MarketDetailModal'
import { formatUSDC } from '../lib/config'

const CATEGORIES = ['All', 'Crypto', 'Sports', 'Politics', 'Economy', 'Social Media', 'Tech']

const sr = (seed, i) => ((seed * 9301 + i * 49297 + 233) % 233280) / 233280

const CAT_COLOR = {
  Crypto: 'badge-gold', Sports: 'badge-green', Economy: 'badge-gray',
  Politics: 'badge-blue', 'Social Media': 'badge-purple', Tech: 'badge-blue',
}

// ── Circular gauge (reused from MultiMarket) ──────────────────
function CircleGauge({ prob, size = 52 }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const filled = (prob / 100) * circ
  const color = prob >= 60 ? 'var(--yes-color)' : prob <= 35 ? 'var(--no-color)' : '#E8B84B'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color, fontFamily: 'var(--mono)', lineHeight: 1 }}>{prob}%</span>
      </div>
    </div>
  )
}

// ── Mini Multi Card for Markets page ─────────────────────────
function MultiCard({ market, onViewDetail }) {
  const [liveYes, setLiveYes] = useState(market.yesProb)
  const seed = (market.id || 0) + 7

  useMemo(() => {
    // no interval needed for static browse
  }, [])

  const liveNo = 100 - liveYes
  const isNew = market.isNew || false

  return (
    <div className="card card-gold" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
          <span className={`badge ${CAT_COLOR[market.category] || 'badge-gray'}`}>{market.category}</span>
          <span className="badge badge-purple">MULTI</span>
          {isNew && <span style={{ background: 'rgba(232,184,75,0.15)', color: 'var(--gold)', border: '1px solid rgba(232,184,75,0.3)', borderRadius: '99px', fontSize: '9px', fontWeight: 800, padding: '2px 8px' }}>✨ NEW</span>}
        </div>
        <CircleGauge prob={Math.round(liveYes)} size={52} />
      </div>

      {/* Description */}
      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>{market.description}</p>

      {/* YES/NO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--yes-color)', fontFamily: 'var(--mono)' }}>YES {Math.round(liveYes)}¢</span>
        <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--no-color)', fontFamily: 'var(--mono)' }}>NO {Math.round(liveNo)}¢</span>
      </div>

      {/* Bar */}
      <div className="prob-bar-dual" style={{ height: '5px' }}>
        <div className="prob-bar-yes" style={{ width: `${liveYes}%` }} />
        <div className="prob-bar-no" style={{ width: `${liveNo}%` }} />
      </div>

      {/* Pool + Expires */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <div style={{ background: 'rgba(128,128,128,0.06)', borderRadius: '8px', padding: '8px 10px' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Pool</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{market.volume || '$0'}</div>
        </div>
        <div style={{ background: 'rgba(128,128,128,0.06)', borderRadius: '8px', padding: '8px 10px' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Expires</div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--mono)', lineHeight: 1.3 }}>
            {market.endDate}<br /><span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{market.endTime}</span>
          </div>
        </div>
      </div>

      {/* Open + movement */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
        <span style={{ color: 'var(--text-muted)' }}>Open · {market.bettors || 0} bettors</span>
      </div>

      {/* View details */}
      <button
        onClick={onViewDetail}
        style={{ width: '100%', background: 'rgba(128,128,128,0.06)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '9px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
      >
        📊 View Chart & Details
      </button>
    </div>
  )
}

// ── Markets page ──────────────────────────────────────────────
export default function Markets() {
  const { address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [category, setCategory] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [bookmarks, setBookmarks] = useState(new Set())
  const [showBookmarked, setShowBookmarked] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const [acceptingBet, setAcceptingBet] = useState(null)
  const [viewDetail, setViewDetail] = useState(null)

  const toggleBookmark = id => setBookmarks(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // Build unified list from BOTH data sources
  const allMarkets = useMemo(() => {
    const p2p = P2P_MARKETS.map(m => ({
      _id: `p2p-${m.id}`,
      _type: 'P2P',
      category: m.category,
      description: m.description,
      volume: `$${(Number(m.totalPool) / 1000000).toFixed(0)}`,
      endDate: new Date(Number(m.resolutionTime) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      endTime: new Date(Number(m.resolutionTime) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' UTC',
      bettors: 0,
      yesProb: 50,
      isNew: Number(m.createdAt) > (Date.now() / 1000) - 86400 * 3,
      raw: m,
    }))
    const multi = MULTI_ADMIN_MARKETS.map(m => ({
      _id: `multi-${m.id}`,
      _type: 'Multi',
      category: m.category,
      description: m.description,
      volume: m.volume,
      endDate: m.endDate,
      endTime: m.endTime,
      bettors: m.bettors,
      yesProb: m.yesProb,
      isNew: m.isNew || false,
      raw: m,
    }))
    return [...p2p, ...multi]
  }, [])

  const filtered = useMemo(() => {
    let list = allMarkets
    if (category !== 'All') list = list.filter(m => m.category === category)
    if (typeFilter !== 'All') list = list.filter(m => m._type === typeFilter)
    if (search) list = list.filter(m => m.description.toLowerCase().includes(search.toLowerCase()))
    if (showBookmarked) list = list.filter(m => bookmarks.has(m._id))
    if (sortBy === 'volume') list = [...list].sort((a, b) => parseFloat(b.volume?.replace(/[$,]/g, '') || 0) - parseFloat(a.volume?.replace(/[$,]/g, '') || 0))
    if (sortBy === 'newest') list = [...list].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0))
    return list
  }, [allMarkets, category, typeFilter, search, showBookmarked, bookmarks, sortBy])

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>Markets</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            All prediction markets — {P2P_MARKETS.length} P2P + {MULTI_ADMIN_MARKETS.length} Multi = {P2P_MARKETS.length + MULTI_ADMIN_MARKETS.length} total
          </p>
        </div>

        {/* Category pills */}
        <div className="pill-tabs" style={{ marginBottom: '20px' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} className={`pill-tab ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>{cat}</button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }}>🔍</span>
            <input className="input" placeholder="Search markets..." style={{ paddingLeft: '36px' }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input" style={{ width: 'auto', minWidth: '110px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="All">All Types</option>
            <option value="P2P">P2P Only</option>
            <option value="Multi">Multi Only</option>
          </select>
          <select className="input" style={{ width: 'auto', minWidth: '120px' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">✨ Newest</option>
            <option value="volume">💰 Volume</option>
          </select>
          <button
            className={`btn ${showBookmarked ? 'btn-gold' : 'btn-ghost'} btn-sm`}
            onClick={() => setShowBookmarked(v => !v)}
          >
            🔖 {bookmarks.size > 0 ? bookmarks.size : ''}
          </button>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {filtered.length} market{filtered.length !== 1 ? 's' : ''}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>{showBookmarked ? 'No bookmarks yet' : 'No markets found'}</h3>
            <p>{showBookmarked ? 'Bookmark markets to track them here' : 'Try adjusting your filters'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {filtered.map(m => {
              if (m._type === 'P2P') {
                return (
                  <BetCard
                    key={m._id}
                    bet={m.raw}
                    currentUser={address}
                    onAccept={bet => setAcceptingBet(bet)}
                    onCancel={id => console.log('cancel', id)}
                  />
                )
              }
              return (
                <MultiCard
                  key={m._id}
                  market={m.raw}
                  onViewDetail={() => setViewDetail(m)}
                />
              )
            })}
          </div>
        )}
      </div>

      {acceptingBet && (
        <AcceptBetModal bet={acceptingBet} onClose={() => setAcceptingBet(null)} onSuccess={() => setAcceptingBet(null)} />
      )}

      {viewDetail && (
        <MarketDetailModal
          market={{ id: viewDetail._id, description: viewDetail.description, category: viewDetail.category, type: viewDetail._type, baseProb: viewDetail.yesProb, status: 'Open', endDate: viewDetail.endDate, endTime: viewDetail.endTime, volume: viewDetail.volume, creatorBelievesYes: true }}
          onClose={() => setViewDetail(null)}
          onCallIt={() => setViewDetail(null)}
        />
      )}
    </div>
  )
}
