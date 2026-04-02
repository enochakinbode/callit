import { useState, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { shortAddr } from '../lib/config'

// Production: fetch from contract events / subgraph filtered by connected wallet
// For now showing empty — no fake data for new users
const MOCK_HISTORY = [] // will be populated from on-chain events

const MOCK_HISTORY_DISABLED = [
  { id: 1,  type: 'P2P',   side: 'NO',  description: 'ETH will enter $4,000 by April 30, 2026 at 11:59 PM UTC',                         category: 'Crypto',       status: 'Active',  stake: 65,   payout: 127.40, date: 'Mar 20, 2026', expiry: 'Apr 30, 2026', resType: 'auto',   counterparty: '0x742d...ABCD', result: null    },
  { id: 2,  type: 'P2P',   side: 'NO',  description: 'BTC will reach $100,000 before June 30, 2026 at 11:59 PM UTC',                    category: 'Crypto',       status: 'Matched', stake: 100,  payout: 196.00, date: 'Mar 18, 2026', expiry: 'Jun 30, 2026', resType: 'auto',   counterparty: '0x3dc5...55b',  result: null    },
  { id: 3,  type: 'Multi', side: 'YES', description: 'ETH $4k + BTC $100k + Base TVL $10B — 3-leg accumulator',                        category: 'Crypto',       status: 'Active',  stake: 50,   payout: 412.00, date: 'Mar 15, 2026', expiry: 'Jun 30, 2026', resType: 'mixed',  counterparty: 'Admin',         result: null    },
  { id: 4,  type: 'P2P',   side: 'YES', description: 'Nigeria Super Eagles will qualify for the 2026 FIFA World Cup',                   category: 'Sports',       status: 'Active',  stake: 50,   payout: 98.00,  date: 'Mar 12, 2026', expiry: 'May 1, 2026',  resType: 'manual', counterparty: '0x1234...5678', result: null    },
  { id: 5,  type: 'P2P',   side: 'YES', description: 'Nigeria Naira will NOT stabilize below 1,500 to the dollar by Dec 31, 2026',     category: 'Economy',      status: 'Won',     stake: 60,   payout: 117.60, date: 'Mar 5, 2026',  expiry: 'Dec 31, 2026', resType: 'manual', counterparty: '0xABCD...EF01', result: 'YES'   },
  { id: 6,  type: 'P2P',   side: 'NO',  description: 'Chelsea will win the Premier League title in the 2025/26 season',                category: 'Sports',       status: 'Lost',    stake: 80,   payout: 0,      date: 'Feb 28, 2026', expiry: 'May 25, 2026', resType: 'manual', counterparty: '0x9876...4321', result: 'YES'   },
  { id: 7,  type: 'Multi', side: 'NO',  description: 'Man City wins EPL + Real Madrid wins Champions League — 2-leg',                  category: 'Sports',       status: 'Lost',    stake: 60,   payout: 0,      date: 'Feb 20, 2026', expiry: 'May 31, 2026', resType: 'mixed',  counterparty: 'Admin',         result: 'NO'    },
  { id: 8,  type: 'P2P',   side: 'NO',  description: 'Donald Trump will sign a US crypto strategic reserve bill before Dec 31, 2026',  category: 'Politics',     status: 'Matched', stake: 150,  payout: 294.00, date: 'Feb 15, 2026', expiry: 'Dec 31, 2026', resType: 'manual', counterparty: '0xCDEF...9012', result: null    },
  { id: 9,  type: 'P2P',   side: 'YES', description: 'Base TVL will exceed $10 Billion by June 30, 2026 at 11:59 PM UTC',             category: 'Crypto',       status: 'Won',     stake: 75,   payout: 147.00, date: 'Feb 10, 2026', expiry: 'Jun 30, 2026', resType: 'manual', counterparty: '0xEF01...2345', result: 'YES'   },
  { id: 10, type: 'P2P',   side: 'YES', description: 'OpenAI will release GPT-5 publicly before June 30, 2026',                       category: 'Tech',         status: 'Won',     stake: 110,  payout: 215.60, date: 'Jan 25, 2026', expiry: 'Jun 30, 2026', resType: 'manual', counterparty: '0x2345...6789', result: 'YES'   },
  { id: 11, type: 'Multi', side: 'YES', description: 'Argentina wins 2026 World Cup + Brazil reaches semifinals — 2-leg',             category: 'Sports',       status: 'Active',  stake: 40,   payout: 320.00, date: 'Jan 20, 2026', expiry: 'Jul 19, 2026', resType: 'mixed',  counterparty: 'Admin',         result: null    },
  { id: 12, type: 'P2P',   side: 'NO',  description: 'Solana will NOT surpass Ethereum in daily active addresses by Sep 30, 2026',    category: 'Crypto',       status: 'Active',  stake: 90,   payout: 176.40, date: 'Jan 15, 2026', expiry: 'Sep 30, 2026', resType: 'manual', counterparty: '0x3456...7890', result: null    },
]

const STATUS_STYLE = {
  Active:  { bg: 'rgba(232,184,75,0.10)',  color: '#E8B84B',  border: 'rgba(232,184,75,0.2)'  },
  Matched: { bg: 'rgba(96,165,250,0.10)',  color: '#60a5fa',  border: 'rgba(96,165,250,0.2)'  },
  Won:     { bg: 'rgba(38,161,123,0.10)',  color: '#26A17B',  border: 'rgba(38,161,123,0.2)'  },
  Lost:    { bg: 'rgba(232,93,93,0.10)',   color: '#E85D5D',  border: 'rgba(232,93,93,0.2)'   },
  Pending: { bg: 'rgba(245,158,11,0.10)',  color: '#fbbf24',  border: 'rgba(245,158,11,0.2)'  },
}

const CAT_COLOR = { Crypto: 'badge-gold', Sports: 'badge-green', Economy: 'badge-gray', Politics: 'badge-blue', 'Social Media': 'badge-purple', Tech: 'badge-blue' }

const STATUS_FILTERS = ['All', 'Active', 'Matched', 'Won', 'Lost']
const TYPE_FILTERS   = ['All', 'P2P', 'Multi']
const CAT_FILTERS    = ['All', 'Crypto', 'Sports', 'Politics', 'Economy', 'Tech', 'Social Media']

export default function StakeHistory() {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('All')
  const [type, setType]       = useState('All')
  const [category, setCat]    = useState('All')
  const [sortBy, setSort]     = useState('newest')

  const filtered = useMemo(() => {
    let list = MOCK_HISTORY // empty until on-chain data connected
    if (search)       list = list.filter(b => b.description.toLowerCase().includes(search.toLowerCase()))
    if (status !== 'All') list = list.filter(b => b.status === status)
    if (type !== 'All')   list = list.filter(b => b.type === type)
    if (category !== 'All') list = list.filter(b => b.category === category)
    if (sortBy === 'stake-high') list = [...list].sort((a, b) => b.stake - a.stake)
    if (sortBy === 'payout-high') list = [...list].sort((a, b) => b.payout - a.payout)
    return list
  }, [search, status, type, category, sortBy])

  // Summary stats
  const totalStaked  = MOCK_HISTORY.reduce((s, b) => s + b.stake, 0)
  const totalWon     = MOCK_HISTORY.filter(b => b.status === 'Won').reduce((s, b) => s + b.payout, 0)
  const totalLost    = MOCK_HISTORY.filter(b => b.status === 'Lost').reduce((s, b) => s + b.stake, 0)
  const pnl          = totalWon - totalLost
  const openBets     = MOCK_HISTORY.filter(b => b.status === 'Active' || b.status === 'Matched').length
  const wonBets      = MOCK_HISTORY.filter(b => b.status === 'Won').length

  if (!isConnected) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 360, padding: '0 20px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Portfolio</h2>
          <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7, marginBottom: 24 }}>
            Connect your wallet to see your open positions, settled markets, and overall performance in one place.
          </p>
          <button className="btn btn-gold btn-lg" onClick={openConnectModal} style={{ width: '100%', fontWeight: 700 }}>
            Connect Wallet
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>Portfolio</h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Wallet: <span style={{ fontFamily: 'var(--mono)', color: 'var(--gold)' }}>{address ? shortAddr(address) : '—'}</span>
          </p>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '28px' }}>
          {[
            { label: 'Total Staked', value: `$${totalStaked.toLocaleString()}`, icon: '💰', color: 'var(--gold)' },
            { label: 'Total Won', value: `$${totalWon.toFixed(0)}`, icon: '✅', color: 'var(--yes-color)' },
            { label: 'P&L', value: `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)}`, icon: '📈', color: pnl >= 0 ? 'var(--yes-color)' : 'var(--no-color)' },
            { label: 'Open Bets', value: openBets, icon: '⏳', color: '#E8B84B' },
            { label: 'Won', value: wonBets, icon: '🏆', color: 'var(--yes-color)' },
            { label: 'Total Bets', value: MOCK_HISTORY.length, icon: '🎯', color: '#CCC' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '18px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: s.color, fontFamily: 'var(--mono)' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#555', marginTop: '3px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }}>🔍</span>
            <input className="input" placeholder="Search markets..." style={{ paddingLeft: '36px' }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input" style={{ width: 'auto', minWidth: '110px' }} value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_FILTERS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
          </select>
          <select className="input" style={{ width: 'auto', minWidth: '100px' }} value={type} onChange={e => setType(e.target.value)}>
            {TYPE_FILTERS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Types' : s}</option>)}
          </select>
          <select className="input" style={{ width: 'auto', minWidth: '130px' }} value={sortBy} onChange={e => setSort(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="stake-high">Highest Stake</option>
            <option value="payout-high">Highest Payout</option>
          </select>
        </div>

        {/* Category pills */}
        <div className="pill-tabs" style={{ marginBottom: '20px' }}>
          {CAT_FILTERS.map(cat => (
            <button key={cat} className={`pill-tab ${category === cat ? 'active' : ''}`} onClick={() => setCat(cat)}>{cat}</button>
          ))}
        </div>

        <div style={{ fontSize: '13px', color: '#555', marginBottom: '14px' }}>
          {filtered.length} bet{filtered.length !== 1 ? 's' : ''}
        </div>

        {/* Bet list */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>No bets found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(bet => {
              const ss = STATUS_STYLE[bet.status] || STATUS_STYLE.Active
              const isWon = bet.status === 'Won'
              const isLost = bet.status === 'Lost'
              const pnlVal = isWon ? +(bet.payout - bet.stake).toFixed(2) : isLost ? -bet.stake : null

              return (
                <div key={bet.id} style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px', transition: 'border-color 0.16s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                >
                  {/* Row 1 — badges + status + date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span className={`badge ${CAT_COLOR[bet.category] || 'badge-gray'}`}>{bet.category}</span>
                      <span className={`badge ${bet.type === 'P2P' ? 'badge-gray' : 'badge-purple'}`}>{bet.type}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                        {bet.status}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, background: bet.side === 'YES' ? 'rgba(38,161,123,0.12)' : 'rgba(232,93,93,0.12)', color: bet.side === 'YES' ? 'var(--yes-color)' : 'var(--no-color)', border: `1px solid ${bet.side === 'YES' ? 'rgba(38,161,123,0.25)' : 'rgba(232,93,93,0.25)'}` }}>
                        {bet.side}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#555', flexShrink: 0 }}>{bet.date}</span>
                  </div>

                  {/* Row 2 — description */}
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#DDD', lineHeight: 1.55, margin: '0 0 12px' }}>{bet.description}</p>

                  {/* Row 3 — stake / payout / expiry / counterparty */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>Staked</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--no-color)', fontFamily: 'var(--mono)' }}>${bet.stake.toFixed(2)}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>
                        {isWon || isLost ? 'P&L' : 'Pot. Payout'}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--mono)', color: isWon ? 'var(--yes-color)' : isLost ? 'var(--no-color)' : 'var(--gold)' }}>
                        {pnlVal !== null ? `${pnlVal >= 0 ? '+' : ''}$${Math.abs(pnlVal).toFixed(2)}` : `$${bet.payout.toFixed(2)}`}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>Expires</div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#CCC', fontFamily: 'var(--mono)' }}>{bet.expiry}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>Opponent</div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#888', fontFamily: 'var(--mono)' }}>{bet.counterparty}</div>
                    </div>
                  </div>

                  {/* Won/Lost banner */}
                  {(isWon || isLost) && (
                    <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '8px', background: isWon ? 'rgba(38,161,123,0.08)' : 'rgba(232,93,93,0.08)', border: `1px solid ${isWon ? 'rgba(38,161,123,0.2)' : 'rgba(232,93,93,0.2)'}`, fontSize: '13px', fontWeight: 700, color: isWon ? 'var(--yes-color)' : 'var(--no-color)', textAlign: 'center' }}>
                      {isWon ? `✅ Won +$${(bet.payout - bet.stake).toFixed(2)} USDC` : `❌ Lost -$${bet.stake.toFixed(2)} USDC`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
