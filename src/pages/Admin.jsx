import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { formatUSDC, shortAddr } from '../lib/config'

const PENDING_BETS = [
  {
    id: 2, type: 'P2P',
    description: 'Nigeria Super Eagles will qualify for 2026 World Cup',
    creator: '0x1234567890ABCDEF1234567890abcdef12345678',
    acceptor: '0xABCDEF1234567890abcdef1234567890ABCDEF12',
    creatorStake: BigInt(50000000), acceptorStake: BigInt(50000000), totalPool: BigInt(100000000),
    expired: 'May 1, 2026 · 08:00 PM WAT',
    resType: 0,
    sourceHint: 'Check: FIFA official site / CAF website / BBC Sport',
  },
  {
    id: 4, type: 'P2P',
    description: 'Binance will receive full US regulatory approval by end of 2026',
    creator: '0x9876543210FEDCBA9876543210fedcba98765432',
    acceptor: '0x5678901234abcdef5678901234ABCDEF56789012',
    creatorStake: BigInt(200000000), acceptorStake: BigInt(200000000), totalPool: BigInt(400000000),
    expired: 'Dec 31, 2026 · 11:59 PM EST',
    resType: 0,
    sourceHint: 'Check: SEC.gov / Reuters / Bloomberg',
  },
]

const PLATFORM_STATS = [
  { label: 'Total Volume', value: '$0.00', icon: '💰', color: 'var(--gold)' },
  { label: 'Total Fees', value: '$0.00', icon: '🏦', color: 'var(--yes-color)' },
  { label: 'Active P2P Markets', value: '34', icon: '⚔️', color: '#60a5fa' },
  { label: 'Active Multi Markets', value: '23', icon: '🎯', color: '#a78bfa' },
  { label: 'Total Bettors', value: '0', icon: '👥', color: '#fb923c' },
  { label: 'Pending Manual', value: '2', icon: '⏳', color: '#fbbf24' },
]

const P2P_TABLE = [
  { id: 0, description: 'ETH will enter $4,000 by April 30, 2026', pool: '$130', status: 'Open', resType: 'AUTO' },
  { id: 1, description: 'BTC will reach $100,000 before June 30, 2026', pool: '$200', status: 'Matched', resType: 'AUTO' },
  { id: 2, description: 'Nigeria Super Eagles will qualify for 2026 World Cup', pool: '$100', status: 'Matched', resType: 'MANUAL' },
  { id: 3, description: 'Base TVL will exceed $10 Billion by Q2 2026', pool: '$75', status: 'Open', resType: 'MANUAL' },
  { id: 4, description: 'Binance will receive full US regulatory approval', pool: '$400', status: 'Matched', resType: 'MANUAL' },
  { id: 5, description: 'Farcaster total users will exceed 1 million by July 2026', pool: '$90', status: 'Open', resType: 'MANUAL' },
  { id: 6, description: 'Chelsea will win the Premier League in 2025/26', pool: '$80', status: 'Open', resType: 'MANUAL' },
  { id: 7, description: 'Donald Trump will sign a US crypto reserve bill', pool: '$150', status: 'Open', resType: 'MANUAL' },
]

const MULTI_TABLE = [
  { id: 0, description: 'ETH $4k + BTC $100k + Base TVL $10B accumulator', legs: 3, pool: '$50', status: 'Open' },
  { id: 1, description: 'BTC above $100k + ETH above $4k', legs: 2, pool: '$80', status: 'Open' },
  { id: 2, description: 'Man City top 4 + Real Madrid wins UCL', legs: 2, pool: '$60', status: 'Open' },
]

export default function Admin() {
  const { addToast } = useToast()
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [resolving, setResolving] = useState(null)
  const [tab, setTab] = useState('pending')
  const [searchMarkets, setSearchMarkets] = useState('')

  const handleLogin = () => {
    const now = Date.now()
    if (now < lockedUntil) {
      const secs = Math.ceil((lockedUntil - now) / 1000)
      setPwError(`Too many attempts. Wait ${secs}s`)
      return
    }
    const adminPw = import.meta.env.VITE_ADMIN_PASSWORD
    if (!adminPw) {
      setPwError('VITE_ADMIN_PASSWORD not set in .env')
      return
    }
    if (password === adminPw) {
      setAuthenticated(true)
      setPwError('')
      setAttempts(0)
    } else {
      const next = attempts + 1
      setAttempts(next)
      if (next >= 5) {
        setLockedUntil(Date.now() + 30000)
        setPwError('Too many attempts. Locked for 30s.')
        setAttempts(0)
      } else {
        setPwError(`Incorrect password (${5 - next} left)`)
      }
      setPassword('')
    }
  }

  const handleResolve = async (betId, outcome) => {
    setResolving(`${betId}-${outcome}`)
    try {
      await new Promise(r => setTimeout(r, 1400))
      addToast(`Bet #${betId} resolved: ${outcome} wins`, 'success')
    } catch (err) {
      addToast(err.message || 'Resolution failed', 'error')
    } finally {
      setResolving(null)
    }
  }

  if (!authenticated) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '36px', width: '100%', maxWidth: '380px', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔐</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Admin Panel</h2>
            <p style={{ fontSize: '13px', color: '#555', marginTop: '6px' }}>Enter your admin password</p>
          </div>
          <input
            className="input"
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={e => { setPassword(e.target.value); setPwError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ marginBottom: '10px' }}
          />
          {pwError && <div style={{ fontSize: '12px', color: 'var(--no-color)', marginBottom: '10px' }}>{pwError}</div>}
          <button className="btn btn-gold" style={{ width: '100%', fontWeight: 700 }} onClick={handleLogin}>
            Enter Admin
          </button>
        </div>
      </div>
    )
  }

  const filteredP2P = P2P_TABLE.filter(b => b.description.toLowerCase().includes(searchMarkets.toLowerCase()))

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 800 }}>Admin Panel</h1>
              <span className="badge badge-gold">ADMIN</span>
            </div>
            <p style={{ fontSize: '13px', color: '#555' }}>Callit · Base Mainnet · Factory: 0x4efc...7818</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setAuthenticated(false)}>Logout</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '28px' }}>
          {PLATFORM_STATS.map((s, i) => (
            <div key={i} style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>{s.icon}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: s.color, fontFamily: 'var(--mono)' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: '24px', maxWidth: '520px' }}>
          {[
            { id: 'pending', label: `⏳ Pending (${PENDING_BETS.length})` },
            { id: 'all-p2p', label: '⚔️ P2P Markets' },
            { id: 'all-multi', label: '🎯 Multi Markets' },
          ].map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Pending Resolutions */}
        {tab === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {PENDING_BETS.length === 0 ? (
              <div className="empty-state">
                <div className="icon">✅</div>
                <h3>All clear!</h3>
                <p>No bets pending resolution.</p>
              </div>
            ) : PENDING_BETS.map(bet => (
              <div key={bet.id} style={{ background: '#0D0D0D', border: '1px solid rgba(245,158,11,0.20)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span className="badge badge-manual">🛡 MANUAL</span>
                  <span className="badge badge-orange">{bet.type}</span>
                  <span className="badge badge-gray">#{bet.id}</span>
                </div>

                <p style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginBottom: '14px', lineHeight: 1.5 }}>
                  {bet.description}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                  {[
                    { label: 'Creator', value: shortAddr(bet.creator) },
                    { label: 'Acceptor', value: shortAddr(bet.acceptor) },
                    { label: 'Total Pool', value: `$${formatUSDC(bet.totalPool)} USDC` },
                    { label: 'Expired', value: bet.expired },
                  ].map((s, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>{s.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#CCC', fontFamily: 'var(--mono)' }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#888' }}>
                  📰 <strong style={{ color: '#fbbf24' }}>Verify result:</strong> {bet.sourceHint}
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-yes"
                    style={{ flex: 1, minWidth: '120px', fontWeight: 700 }}
                    disabled={!!resolving}
                    onClick={() => handleResolve(bet.id, 'YES')}
                  >
                    {resolving === `${bet.id}-YES` ? <><span className="spinner" /> Resolving...</> : '✅ YES Wins'}
                  </button>
                  <button
                    className="btn btn-no"
                    style={{ flex: 1, minWidth: '120px', fontWeight: 700 }}
                    disabled={!!resolving}
                    onClick={() => handleResolve(bet.id, 'NO')}
                  >
                    {resolving === `${bet.id}-NO` ? <><span className="spinner" /> Resolving...</> : '❌ NO Wins'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* All P2P */}
        {tab === 'all-p2p' && (
          <div>
            <input
              className="input"
              placeholder="Search P2P markets..."
              value={searchMarkets}
              onChange={e => setSearchMarkets(e.target.value)}
              style={{ marginBottom: '16px', maxWidth: '400px' }}
            />
            <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ minWidth: '480px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px 90px 70px', gap: '10px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>ID</span><span>Description</span><span>Pool</span><span>Status</span><span>Type</span>
                </div>
                {filteredP2P.map((b, i) => (
                  <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px 90px 70px', gap: '10px', padding: '10px 16px', borderBottom: i < filteredP2P.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#555', fontFamily: 'var(--mono)' }}>#{b.id}</span>
                    <span style={{ fontSize: '12px', color: '#CCC', lineHeight: 1.4 }}>{b.description}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{b.pool}</span>
                    <span><span className={`badge ${b.status === 'Open' ? 'badge-gray' : b.status === 'Matched' ? 'badge-blue' : 'badge-green'}`}>{b.status}</span></span>
                    <span><span className={`badge ${b.resType === 'AUTO' ? 'badge-auto' : 'badge-manual'}`}>{b.resType}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All Multi */}
        {tab === 'all-multi' && (
          <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: '400px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 60px 90px 90px', gap: '10px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>ID</span><span>Description</span><span>Legs</span><span>Pool</span><span>Status</span>
              </div>
              {MULTI_TABLE.map((mb, i) => (
                <div key={mb.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 60px 90px 90px', gap: '10px', padding: '10px 16px', borderBottom: i < MULTI_TABLE.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#555', fontFamily: 'var(--mono)' }}>#{mb.id}</span>
                  <span style={{ fontSize: '12px', color: '#CCC' }}>{mb.description}</span>
                  <span className="badge badge-gold">🎯 {mb.legs}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{mb.pool}</span>
                  <span><span className="badge badge-gray">{mb.status}</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
