import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import BetCard from '../components/BetCard'
import CreateBetModal from '../components/CreateBetModal'
import MarketDetailModal from '../components/MarketDetailModal'
import { useP2PMarkets } from '../hooks/useP2PMarkets'

const CATEGORIES = ['All', 'Crypto', 'Sports', 'Politics', 'Economy', 'Social Media', 'Tech']

export default function Markets() {
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [viewDetail, setViewDetail] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const { markets } = useP2PMarkets()

  const handleCreateMarket = () => {
    if (!isConnected) {
      openConnectModal?.()
      return
    }
    setShowCreate(true)
  }

  const filtered = useMemo(() => {
    let list = markets
    if (category !== 'All') list = list.filter(m => m.category === category)
    if (search) list = list.filter(m => m.description.toLowerCase().includes(search.toLowerCase()))
    if (sortBy === 'deadline') {
      list = [...list].sort((a, b) => Number(a.resolutionTime) - Number(b.resolutionTime))
    } else {
      list = [...list].sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
    }
    return list
  }, [category, markets, search, sortBy])

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
        <div style={{ marginBottom: '22px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)', marginBottom: '12px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Powered by GenLayer</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ maxWidth: '760px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px', color: 'var(--text)' }}>P2P Markets</h1>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                Browse markets that have already been reviewed before going live. Funds stay in the Base vault, and payouts happen only after the result is final.
              </p>
            </div>
            <button className="btn btn-gold" onClick={handleCreateMarket}>+ Create Market</button>
          </div>
        </div>

        <div className="pill-tabs" style={{ marginBottom: '20px' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} className={`pill-tab ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }}>🔍</span>
            <input
              className="input"
              placeholder="Search P2P markets..."
              style={{ paddingLeft: '36px' }}
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <select className="input" style={{ width: 'auto', minWidth: '160px' }} value={sortBy} onChange={event => setSortBy(event.target.value)}>
            <option value="newest">Newest first</option>
            <option value="deadline">Closest deadline</option>
          </select>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {filtered.length} P2P market{filtered.length !== 1 ? 's' : ''}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>No P2P markets found</h3>
            <p>Try adjusting your filters.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {filtered.map(bet => (
              <BetCard
                key={bet.id}
                bet={bet}
                currentUser={null}
                onViewDetail={selected => setViewDetail(selected)}
              />
            ))}
          </div>
        )}
      </div>

      {viewDetail && (
        <MarketDetailModal
          market={{
            id: viewDetail.id,
            description: viewDetail.description,
            category: viewDetail.category,
            type: 'P2P',
            baseProb: viewDetail.yesProb || viewDetail.probabilityPercent || 50,
            status: viewDetail.status,
            endDate: new Date(Number(viewDetail.resolutionTime) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            endTime: new Date(Number(viewDetail.resolutionTime) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' UTC',
            volume: `$${(Number(viewDetail.totalPool) / 1e6).toFixed(0)}`,
            creatorBelievesYes: Boolean(viewDetail.creatorAbove),
          }}
          onClose={() => setViewDetail(null)}
        />
      )}

      {showCreate && <CreateBetModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
