import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import BetCard from '../components/BetCard'
import CreateBetModal from '../components/CreateBetModal'
import AcceptBetModal from '../components/AcceptBetModal'
import { P2P_MARKETS } from '../data/markets'

const FILTER_TABS = ['All', 'Open', 'Matched', 'Resolved']

export default function P2PMarket() {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [showCreate, setShowCreate] = useState(false)
  const [acceptingBet, setAcceptingBet] = useState(null)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [resTypeFilter, setResTypeFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')

  const categories = ['All', ...new Set(P2P_MARKETS.map(b => b.category))]

  const filtered = P2P_MARKETS.filter(b => {
    const statusMap = { All: true, Open: b.status === 0, Matched: b.status === 1, Resolved: b.status === 2 }
    const resMap = { All: true, Auto: b.resType === 1, Manual: b.resType === 0 }
    const catMatch = categoryFilter === 'All' || b.category === categoryFilter
    return statusMap[filter] && resMap[resTypeFilter] && catMatch && b.description.toLowerCase().includes(search.toLowerCase())
  })

  const counts = {
    All: P2P_MARKETS.length,
    Open: P2P_MARKETS.filter(b => b.status === 0).length,
    Matched: P2P_MARKETS.filter(b => b.status === 1).length,
    Resolved: P2P_MARKETS.filter(b => b.status === 2).length,
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>P2P Markets</h1>
            <p style={{ fontSize: '14px', color: '#666', maxWidth: '480px', lineHeight: 1.6 }}>
              {P2P_MARKETS.length} markets. Creator stakes their side. You take the other. 98% to the winner.
            </p>
          </div>
          {isConnected ? (
            <button className="btn btn-gold" onClick={() => setShowCreate(true)} style={{ fontWeight: 700, flexShrink: 0 }}>+ Create Market</button>
          ) : (
            <button className="btn btn-outline" onClick={openConnectModal} style={{ flexShrink: 0 }}>Connect to Create</button>
          )}
        </div>

        {/* Category pills */}
        <div className="pill-tabs" style={{ marginBottom: '16px' }}>
          {categories.map(cat => (
            <button key={cat} className={`pill-tab ${categoryFilter === cat ? 'active' : ''}`} onClick={() => setCategoryFilter(cat)}>{cat}</button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="tabs" style={{ flex: '0 0 auto' }}>
            {FILTER_TABS.map(f => (
              <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f} <span style={{ fontSize: '10px', opacity: 0.6 }}>({counts[f]})</span>
              </button>
            ))}
          </div>
          <select className="input" style={{ width: 'auto', minWidth: '120px' }} value={resTypeFilter} onChange={e => setResTypeFilter(e.target.value)}>
            <option value="All">All Types</option>
            <option value="Auto">⚡ Auto</option>
            <option value="Manual">🛡 Manual</option>
          </select>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }}>🔍</span>
            <input className="input" placeholder="Search markets..." style={{ paddingLeft: '36px' }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#444', marginBottom: '14px' }}>{filtered.length} market{filtered.length !== 1 ? 's' : ''}</div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">⚔️</div>
            <h3>No markets found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
            {filtered.map(bet => (
              <BetCard
                key={bet.id}
                bet={bet}
                currentUser={address}
                onAccept={b => isConnected ? setAcceptingBet(b) : openConnectModal()}
                onCancel={id => console.log('cancel', id)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateBetModal onClose={() => setShowCreate(false)} onSuccess={() => setShowCreate(false)} />}
      {acceptingBet && <AcceptBetModal bet={acceptingBet} onClose={() => setAcceptingBet(null)} onSuccess={() => setAcceptingBet(null)} />}
    </div>
  )
}
