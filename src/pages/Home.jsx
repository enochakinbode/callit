import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import Logo from '../components/Logo'
import BetCard from '../components/BetCard'
import CreateBetModal from '../components/CreateBetModal'
import MarketDetailModal from '../components/MarketDetailModal'
import { GENLAYER_NETWORK_LABEL } from '../lib/config'
import { useP2PMarkets } from '../hooks/useP2PMarkets'

export default function Home() {
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [showCreate, setShowCreate] = useState(false)
  const [viewDetail, setViewDetail] = useState(null)
  const { markets, liveMarkets, hasRelayerFeed, isUsingStaticFallback } = useP2PMarkets()

  const openP2P = useMemo(() => markets.filter(m => m.status === 0), [markets])
  const trendingP2P = useMemo(() => openP2P.slice(0, 3), [openP2P])
  const stats = useMemo(() => ([
    { label: 'Live P2P Markets', value: String(openP2P.length), sub: hasRelayerFeed ? 'Static + relayer feed' : 'Static fallback', icon: '⚡' },
    { label: 'Platform Fee', value: '2%', sub: 'Winner pays', icon: '🏦' },
    { label: 'Money Layer', value: 'Base Vault', sub: 'USDC custody', icon: '⛓' },
    { label: 'Decision Layer', value: 'GenLayer', sub: GENLAYER_NETWORK_LABEL, icon: '🧠' },
  ]), [GENLAYER_NETWORK_LABEL, hasRelayerFeed, openP2P.length])

  const activityPoints = useMemo(() => [22, 35, 28, 42, 38, 55, 48, 62, 58, 70, 65, 80], [])
  const maxP = Math.max(...activityPoints)
  const h = 60
  const w = 200
  const pts = activityPoints.map((v, i) => `${(i / (activityPoints.length - 1)) * w},${h - (v / maxP) * h}`).join(' ')

  const handleCreateMarket = () => {
    if (!isConnected) {
      openConnectModal?.()
      return
    }
    setShowCreate(true)
  }

  return (
    <div className="page">
      <section style={{ padding: 'clamp(32px,6vw,64px) 20px 48px', textAlign: 'center', maxWidth: '780px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <Logo size={72} />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)', marginBottom: '20px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Powered by GenLayer</span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px,6vw,60px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '18px', lineHeight: 1.08, color: 'var(--text)' }}>
          P2P Markets With<br />
          <span style={{ color: 'var(--gold)' }}>Clearer Calls.</span>
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: 1.75, margin: '0 auto 36px', maxWidth: '560px' }}>
          Bring the market idea. Callit reviews it before it goes live, keeps the money in the Base vault, and pays the winning side once the result is final.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleCreateMarket} className="btn btn-gold btn-xl">+ Create P2P Market</button>
          <Link to="/markets" className="btn btn-outline btn-xl">Browse P2P Markets</Link>
        </div>
      </section>

      <section style={{ padding: '0 20px 40px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {stats.map((s, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '22px', marginBottom: '10px' }}>{s.icon}</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{s.value}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginTop: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '32px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Relayer Activity</div>
              <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--text)' }}>GenLayer-first</div>
              <div style={{ fontSize: '13px', color: 'var(--yes-color)', fontWeight: 600, marginTop: '4px' }}>
                {isUsingStaticFallback
                  ? 'Static markets stay visible while the relayer feed is not configured'
                  : 'Requests are reviewed by the relayer and mirrored into the live list'}
              </div>
            </div>
            <svg width={w} height={h + 8} style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="home-grid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#home-grid)" />
              <polyline points={pts} fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {activityPoints.map((v, i) => {
                const x = (i / (activityPoints.length - 1)) * w
                const y = h - (v / maxP) * h
                return <circle key={i} cx={x} cy={y} r={2.5} fill="#60a5fa" />
              })}
            </svg>
          </div>
        </div>
      </section>

      <section style={{ padding: '0 20px 48px' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>Latest P2P Markets</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
                {hasRelayerFeed
                  ? 'Live markets are starting to appear here, with the sample set still visible in the meantime.'
                  : 'Sample markets stay visible until the live market feed is fully connected.'}
              </p>
            </div>
            <Link to="/markets" className="btn btn-ghost btn-sm">View All</Link>
          </div>

          {trendingP2P.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {trendingP2P.map(bet => (
                <BetCard
                  key={bet.id}
                  bet={bet}
                  currentUser={null}
                  onViewDetail={selected => setViewDetail(selected)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="icon">⚔️</div>
              <h3>No open P2P markets yet</h3>
              <p>Be the first to submit one through the relayer.</p>
              <button className="btn btn-gold btn-sm" onClick={handleCreateMarket} style={{ marginTop: '12px' }}>Create Market</button>
            </div>
          )}
        </div>
      </section>

      <section style={{ padding: '0 20px 80px' }}>
        <div className="container">
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '48px 40px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '10px', color: 'var(--text)' }}>Start a Market</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Send in the market, let it get reviewed, and move into funding once it is approved.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleCreateMarket} className="btn btn-gold btn-lg">+ Create P2P Market</button>
              <Link to="/how-it-works" className="btn btn-outline btn-lg">How It Works</Link>
            </div>
          </div>
        </div>
      </section>

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
