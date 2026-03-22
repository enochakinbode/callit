import { useState, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { shortAddr, formatUSDC } from '../lib/config'

// Mock bet history — in production this would come from contract events / subgraph
const MOCK_HISTORY = [
  { id: 1, type: 'P2P', side: 'NO', description: 'BTC will reach $100,000 before June 30, 2026 at 11:59 PM UTC', category: 'Crypto', status: 'Active', stake: '$100.00', pnl: null, date: 'Mar 20, 2026', expiry: 'Jun 30, 2026', resType: 'auto', counterparty: '0x742d...ABCD', result: null },
  { id: 2, type: 'P2P', side: 'YES', description: 'ETH will enter $4,000 by April 30, 2026 at 11:59 PM UTC', category: 'Crypto', status: 'Won', stake: '$65.00', pnl: '+$63.70', date: 'Mar 15, 2026', expiry: 'Apr 30, 2026', resType: 'auto', counterparty: '0x3dc5...55b', result: 'YES' },
  { id: 3, type: 'P2P', side: 'NO', description: 'Chelsea will win the Premier League title in the 2025/26 season', category: 'Sports', status: 'Lost', stake: '$80.00', pnl: '-$80.00', date: 'Mar 10, 2026', expiry: 'May 25, 2026', resType: 'manual', counterparty: '0xABCD...1234', result: 'YES' },
  { id: 4, type: 'Multi', side: 'YES', description: 'ETH $4k + BTC $100k + Base TVL $10B (3-leg)', category: 'Crypto', status: 'Active', stake: '$50.00', pnl: null, date: 'Mar 18, 2026', expiry: 'Jun 30, 2026', resType: 'mixed', counterparty: 'Admin', result: null },
  { id: 5, type: 'P2P', side: 'YES', description: 'Nigeria Super Eagles will qualify for the 2026 FIFA World Cup', category: 'Sports', status: 'Pending', stake: '$50.00', pnl: null, date: 'Mar 5, 2026', expiry: 'May 1, 2026', resType: 'manual', counterparty: '0x1234...5678', result: null },
  { id: 6, type: 'Multi', side: 'NO', description: 'Man City wins EPL + Real Madrid wins UCL (2-leg)', category: 'Sports', status: 'Lost', stake: '$60.00', pnl: '-$60.00', date: 'Feb 28, 2026', expiry: 'May 30, 2026', resType: 'mixed', counterparty: 'Admin', result: 'NO' },
  { id: 7, type: 'P2P', side: 'NO', description: 'Donald Trump will sign a US crypto strategic reserve bill before Dec 31, 2026', category: 'Politics', status: 'Active', stake: '$150.00', pnl: null, date: 'Feb 20, 2026', expiry: 'Dec 31, 2026', resType: 'manual', counterparty: '0x9876...4321', result: null },
  { id: 8, type: 'P2P', side: 'YES', description: 'Base TVL will exceed $10 Billion by June 30, 2026', category: 'Crypto', status: 'Won', stake: '$75.00', pnl: '+$73.50', date: 'Feb 10, 2026', expiry: 'Jun 30, 2026', resType: 'manual', counterparty: '0xCDEF...9012', result: 'YES' },
]

const STATUS_COLORS = { Active: 'badge-blue', Won: 'badge-green', Lost: 'badge-red', Pending: 'badge-manual' }
const STATUS_FILTERS = ['All', 'Active', 'Won', 'Lost', 'Pending']
const TYPE_FILTERS = ['All', 'P2P', 'Multi']
const CAT_FILTERS = ['All', 'Crypto', 'Sports', 'Politics', 'Economy', 'Tech']

export default function BetHistory() {
  const { isConnected, address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [catFilter, setCatFilter] = useState('All')
  const [sort, setSort] = useState('newest')

  const filtered = useMemo(() => {
    let list = MOCK_HISTORY
    if (statusFilter !== 'All') list = list.filter(b => b.status === statusFilter)
    if (typeFilter !== 'All') list = list.filter(b => b.type === typeFilter)
    if (catFilter !== 'All') list = list.filter(b => b.category === catFilter)
    if (search) list = list.filter(b => b.description.toLowerCase().includes(search.toLowerCase()) || b.category.toLowerCase().includes(search.toLowerCase()))
    if (sort === 'stake') list = [...list].sort((a, b) => parseFloat(b.stake.replace('$', '')) - parseFloat(a.stake.replace('$', '')))
    return list
  }, [statusFilter, typeFilter, catFilter, search, sort])

  const totalStaked = MOCK_HISTORY.reduce((acc, b) => acc + parseFloat(b.stake.replace('$', '')), 0)
  const totalWon = MOCK_HISTORY.filter(b => b.status === 'Won').length
  const totalLost = MOCK_HISTORY.filter(b => b.status === 'Lost').length
  const totalPnl = MOCK_HISTORY.reduce((acc, b) => acc + (b.pnl ? parseFloat(b.pnl.replace('$', '')) : 0), 0)

  if (!isConnected) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '10px' }}>Connect to see your history</h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px', lineHeight: 1.6 }}>Your bet history, positions and P&L will appear here once you connect your wallet.</p>
          <button className="btn btn-gold btn-lg" onClick={openConnectModal}>Connect Wallet</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>Bet History</h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Wallet: <span style={{ fontFamily: 'var(--mono)', color: '#888' }}>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '—'}</span>
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '28px' }}>
          {[
            { label: 'Total Staked', value: `$${totalStaked.toFixed(2)}`, color: 'var(--gold)', icon: '💰' },
            { label: 'Won', value: totalWon, color: 'var(--yes-color)', icon: '✅' },
            { label: 'Lost', value: totalLost, color: 'var(--no-color)', icon: '❌' },
            { label: 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? 'var(--yes-color)' : 'var(--no-color)', icon: '📊' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>{s.icon}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: s.color, fontFamily: 'var(--mono)' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }}>🔍</span>
            <input className="input" placeholder="Search markets..." style={{ paddingLeft: '36px' }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input" style={{ width: 'auto', minWidth: '110px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUS_FILTERS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select className="input" style={{ width: 'auto', minWidth: '100px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            {TYPE_FILTERS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select className="input" style={{ width: 'auto', minWidth: '110px' }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            {CAT_FILTERS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select className="input" style={{ width: 'auto', minWidth: '110px' }} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="stake">Highest Stake</option>
          </select>
        </div>

        <div style={{ fontSize: '13px', color: '#555', marginBottom: '14px' }}>{filtered.length} bet{filtered.length !== 1 ? 's' : ''}</div>

        {/* Bet list */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>No bets found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(bet => (
              <div key={bet.id} style={{
                background: '#0D0D0D',
                border: `1px solid ${bet.status === 'Won' ? 'rgba(38,161,123,0.2)' : bet.status === 'Lost' ? 'rgba(232,93,93,0.12)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '14px', padding: '16px 18px',
              }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span className={`badge ${STATUS_COLORS[bet.status]}`}>{bet.status}</span>
                    <span className="badge badge-gray">{bet.type}</span>
                    <span className={`badge ${bet.category === 'Crypto' ? 'badge-gold' : bet.category === 'Sports' ? 'badge-green' : 'badge-gray'}`}>{bet.category}</span>
                    <span className={`badge ${bet.side === 'YES' ? 'badge-green' : 'badge-red'}`}>{bet.side}</span>
                  </div>
                  {bet.pnl && (
                    <span style={{ fontSize: '14px', fontWeight: 800, color: bet.pnl.startsWith('+') ? 'var(--yes-color)' : 'var(--no-color)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                      {bet.pnl}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#DDD', lineHeight: 1.5, marginBottom: '12px' }}>{bet.description}</p>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                  {[
                    { label: 'Staked', value: bet.stake, color: 'var(--gold)' },
                    { label: 'Date', value: bet.date, color: '#CCC' },
                    { label: 'Expires', value: bet.expiry, color: '#CCC' },
                    { label: 'vs', value: shortAddr(bet.counterparty), color: '#888' },
                  ].map((d, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '7px 10px' }}>
                      <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{d.label}</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: d.color, fontFamily: 'var(--mono)' }}>{d.value}</div>
                    </div>
                  ))}
                </div>

                {/* Resolution badge */}
                {bet.status === 'Pending' && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🛡 Awaiting manual resolution
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
