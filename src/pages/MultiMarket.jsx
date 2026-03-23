import { useState, useEffect, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useToast } from '../context/ToastContext'
import { MULTI_ADMIN_MARKETS, GROUPED_MARKETS } from '../data/markets'
import MarketDetailModal from '../components/MarketDetailModal'
import { MIN_STAKE_USDC, MAX_STAKE_USDC } from '../lib/config'

const CATEGORIES = ['All', 'Crypto', 'Sports', 'Politics', 'Economy', 'Social Media', 'Tech']
const sr = (seed, i) => ((seed * 9301 + i * 49297 + 233) % 233280) / 233280

const CAT_COLOR = {
  Crypto: 'badge-gold', Sports: 'badge-green', Economy: 'badge-gray',
  Politics: 'badge-blue', 'Social Media': 'badge-purple', Tech: 'badge-blue',
}

// ── Circular probability gauge (like Polymarket) ──────────────
function CircleGauge({ prob, size = 56 }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const filled = (prob / 100) * circ
  const color = prob >= 60 ? 'var(--yes-color)' : prob <= 35 ? 'var(--no-color)' : '#E8B84B'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 800, color, fontFamily: 'var(--mono)', lineHeight: 1 }}>{prob}%</span>
        <span style={{ fontSize: '8px', color: '#666', lineHeight: 1, marginTop: '1px' }}>chance</span>
      </div>
    </div>
  )
}

// ── Single outcome market card ────────────────────────────────
function SingleMarketCard({ market, selection, onSelect, onViewDetail }) {
  const [showDetail, setShowDetail] = useState(false)
  const seed = market.id + 5
  const [liveYes, setLiveYes] = useState(market.yesProb)
  const [history, setHistory] = useState(() =>
    Array.from({ length: 10 }, (_, i) => {
      const v = market.yesProb - 4 + Math.floor(sr(seed + i, i) * 8)
      return Math.max(3, Math.min(97, v))
    })
  )

  useEffect(() => {
    const t = setInterval(() => {
      setLiveYes(prev => {
        const next = Math.max(3, Math.min(97, prev + (Math.random() - 0.49) * 2))
        setHistory(h => [...h.slice(-9), parseFloat(next.toFixed(1))])
        return parseFloat(next.toFixed(1))
      })
    }, 3000 + seed * 200 % 2500)
    return () => clearInterval(t)
  }, [seed])

  const liveNo = parseFloat((100 - liveYes).toFixed(1))
  const isUp = liveYes >= history[0]
  const sel = selection
  const isNew = market.isNew || (market.id && market.id > 18)
  const freq = market.frequency || 'One-time'

  return (
    <div style={{
      background: sel ? 'rgba(232,184,75,0.03)' : 'var(--bg-card)',
      border: `1px solid ${sel ? 'rgba(232,184,75,0.3)' : 'var(--border)'}`,
      borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
      transition: 'all 0.18s',
    }}>
      {/* Top row — badges + gauge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' }}>
            <span className={`badge ${CAT_COLOR[market.category] || 'badge-gray'}`}>{market.category}</span>
            {isNew && <span style={{ background: 'rgba(232,184,75,0.15)', color: 'var(--gold)', border: '1px solid rgba(232,184,75,0.3)', borderRadius: '99px', fontSize: '9px', fontWeight: 800, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>✨ NEW</span>}
            <span style={{ fontSize: '10px', color: '#555', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', padding: '2px 6px' }}>🔄 {freq}</span>
          </div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>{market.description}</p>
        </div>
        <CircleGauge prob={Math.round(liveYes)} size={60} />
      </div>

      {/* YES/NO price row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ background: 'rgba(38,161,123,0.08)', border: '1px solid rgba(38,161,123,0.2)', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: 'var(--yes-color)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>YES</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--yes-color)', fontFamily: 'var(--mono)', transition: 'all 0.4s' }}>{Math.round(liveYes)}¢</div>
        </div>
        <div style={{ background: 'rgba(232,93,93,0.08)', border: '1px solid rgba(232,93,93,0.2)', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: 'var(--no-color)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>NO</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--no-color)', fontFamily: 'var(--mono)', transition: 'all 0.4s' }}>{Math.round(liveNo)}¢</div>
        </div>
      </div>

      {/* Green/red bar */}
      <div className="prob-bar-dual" style={{ height: '5px' }}>
        <div className="prob-bar-yes" style={{ width: `${liveYes}%`, transition: 'width 0.8s ease' }} />
        <div className="prob-bar-no" style={{ width: `${liveNo}%`, transition: 'width 0.8s ease' }} />
      </div>

      {/* Expires + volume */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '7px 10px' }}>
          <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Expires</div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--mono)', lineHeight: 1.3 }}>
            {market.endDate}<br /><span style={{ color: '#888', fontSize: '10px' }}>{market.endTime}</span>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '7px 10px' }}>
          <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Volume</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{market.volume}</div>
        </div>
      </div>

      {/* Live movement */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
        <span style={{ color: '#555' }}>{market.bettors} bettors</span>
        <span style={{ fontWeight: 700, fontFamily: 'var(--mono)', color: isUp ? 'var(--yes-color)' : 'var(--no-color)' }}>
          {isUp ? '▲' : '▼'} {Math.abs(liveYes - history[0]).toFixed(1)}¢
        </span>
      </div>

      {/* Bet buttons */}
      {sel ? (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className={`btn btn-sm ${sel.side === 'YES' ? 'btn-yes active' : 'btn-yes'}`} style={{ flex: 1, fontWeight: 700 }} onClick={() => onSelect(market, 'YES')}>YES {Math.round(liveYes)}¢</button>
          <button className={`btn btn-sm ${sel.side === 'NO' ? 'btn-no active' : 'btn-no'}`} style={{ flex: 1, fontWeight: 700 }} onClick={() => onSelect(market, 'NO')}>NO {Math.round(liveNo)}¢</button>
          <button onClick={() => onSelect(market, null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 10px', color: '#666', cursor: 'pointer', fontSize: '13px' }}>✕</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn btn-yes btn-sm" style={{ flex: 1, fontWeight: 700 }} onClick={() => onSelect(market, 'YES')}>+ YES {Math.round(liveYes)}¢</button>
          <button className="btn btn-no btn-sm" style={{ flex: 1, fontWeight: 700 }} onClick={() => onSelect(market, 'NO')}>+ NO {Math.round(liveNo)}¢</button>
        </div>
      )}

      {/* View chart button */}
      <button
        onClick={() => setShowDetail(true)}
        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px', color: '#666', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
      >
        📊 View Chart & Details
      </button>

      {showDetail && (
        <MarketDetailModal
          market={{ id: `multi-${market.id}`, description: market.description, category: market.category, type: 'Multi', baseProb: market.yesProb, status: 'Open', endDate: market.endDate, endTime: market.endTime, volume: market.volume, creatorBelievesYes: true }}
          onClose={() => setShowDetail(false)}
          onCallIt={() => setShowDetail(false)}
        />
      )}
    </div>
  )
}

// ── Grouped multi-outcome card (like Elon tweets card) ────────
function GroupedMarketCard({ group, selections, onSelect }) {
  const [liveProbs, setLiveProbs] = useState(() =>
    Object.fromEntries(group.outcomes.map(o => [o.id, o.yesProb]))
  )

  useEffect(() => {
    const t = setInterval(() => {
      setLiveProbs(prev => {
        const next = { ...prev }
        group.outcomes.forEach(o => {
          const delta = (Math.random() - 0.49) * 1.2
          next[o.id] = parseFloat(Math.max(2, Math.min(98, prev[o.id] + delta)).toFixed(1))
        })
        return next
      })
    }, 2800)
    return () => clearInterval(t)
  }, [group.id])

  const freq = group.frequency || 'One-time'

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span className={`badge ${CAT_COLOR[group.category] || 'badge-gray'}`}>{group.category}</span>
        {group.isNew && <span style={{ background: 'rgba(232,184,75,0.15)', color: 'var(--gold)', border: '1px solid rgba(232,184,75,0.3)', borderRadius: '99px', fontSize: '9px', fontWeight: 800, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>✨ NEW</span>}
        <span style={{ fontSize: '10px', color: '#555', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', padding: '2px 6px' }}>🔄 {freq}</span>
      </div>

      <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.45, margin: 0 }}>{group.title}</p>

      {/* Outcomes — each is a row with label + prob + YES/NO */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
        {group.outcomes.map(outcome => {
          const yp = liveProbs[outcome.id] || outcome.yesProb
          const np = parseFloat((100 - yp).toFixed(1))
          const sel = selections[outcome.id]
          return (
            <div key={outcome.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
              background: sel ? (sel.side === 'YES' ? 'rgba(38,161,123,0.08)' : 'rgba(232,93,93,0.08)') : 'rgba(255,255,255,0.03)',
              border: `1px solid ${sel ? (sel.side === 'YES' ? 'rgba(38,161,123,0.3)' : 'rgba(232,93,93,0.3)') : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '8px', transition: 'all 0.14s',
            }}>
              {/* Outcome label */}
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: 0 }}>{outcome.label}</span>
              {/* Probability */}
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#888', fontFamily: 'var(--mono)', flexShrink: 0 }}>{yp.toFixed(0)}%</span>
              {/* YES/NO buttons */}
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button
                  onClick={() => onSelect({ ...outcome, marketId: group.id, yesProb: yp, noProb: np }, 'YES')}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(38,161,123,0.4)', background: sel?.side === 'YES' ? 'var(--yes-color)' : 'rgba(38,161,123,0.12)', color: sel?.side === 'YES' ? '#000' : 'var(--yes-color)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.14s' }}
                >
                  Yes
                </button>
                <button
                  onClick={() => onSelect({ ...outcome, marketId: group.id, yesProb: yp, noProb: np }, 'NO')}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(232,93,93,0.4)', background: sel?.side === 'NO' ? 'var(--no-color)' : 'rgba(232,93,93,0.12)', color: sel?.side === 'NO' ? '#fff' : 'var(--no-color)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.14s' }}
                >
                  No
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#555' }}>
        <span>Vol: <span style={{ color: 'var(--gold)', fontFamily: 'var(--mono)', fontWeight: 700 }}>{group.volume}</span></span>
        <span>Expires: {group.endDate}</span>
      </div>
    </div>
  )
}

// ── Multi Market Page ─────────────────────────────────────────
export default function MultiMarket() {
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { addToast } = useToast()

  const [category, setCategory] = useState('All')
  const [selections, setSelections] = useState({}) // key: market.id, value: { market, side, prob }
  const [stake, setStake] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [bookmarks, setBookmarks] = useState(new Set())

  // Filter regular markets
  const filteredMarkets = useMemo(() => MULTI_ADMIN_MARKETS.filter(m => {
    const catMatch = category === 'All' || m.category === category
    const searchMatch = !search || m.description.toLowerCase().includes(search.toLowerCase())
    return catMatch && searchMatch
  }), [category, search])

  // Filter grouped markets
  const filteredGrouped = useMemo(() => GROUPED_MARKETS.filter(g => {
    const catMatch = category === 'All' || g.category === category
    const searchMatch = !search || g.title.toLowerCase().includes(search.toLowerCase())
    return catMatch && searchMatch
  }), [category, search])

  const selectedList = Object.values(selections)
  const selCount = selectedList.length

  const combinedProb = selCount > 0
    ? selectedList.reduce((acc, s) => acc * (s.prob / 100), 1) * 100
    : 0

  const stakeNum = parseFloat(stake) || 0

  // Show payout for ANY number of selections (including 1)
  const potentialPayout = stakeNum > 0 && selCount > 0 && combinedProb > 0
    ? (stakeNum * (100 / combinedProb) * 0.98).toFixed(2)
    : '0.00'

  const multiplier = selCount > 0 && combinedProb > 0
    ? (100 / combinedProb * 0.98).toFixed(2)
    : '1.00'

  const handleSelect = (market, side) => {
    setSelections(prev => {
      const next = { ...prev }
      const key = market.id
      if (!side) {
        delete next[key]
      } else if (selCount >= 10 && !next[key]) {
        addToast('Max 10 markets per bet', 'error')
        return prev
      } else {
        const prob = side === 'YES' ? (market.yesProb || 50) : (market.noProb || 50)
        next[key] = { market, side, prob }
      }
      return next
    })
  }

  const handleCallIt = async () => {
    if (loading) return
    if (!isConnected) { openConnectModal(); return }
    if (selCount < 1) { addToast('Select at least 1 market', 'error'); return }
    if (!stakeNum || stakeNum < MIN_STAKE_USDC) { addToast(`Min stake is ${MIN_STAKE_USDC} USDC`, 'error'); return }
    if (stakeNum > MAX_STAKE_USDC) { addToast(`Max stake is ${MAX_STAKE_USDC.toLocaleString()} USDC`, 'error'); return }
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 1400))
      addToast(`${selCount > 1 ? selCount + '-Leg' : 'Single'} market placed!`, 'success')
      setSelections({})
      setStake('')
    } catch (err) {
      addToast(err.message || 'Transaction failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>Multi Markets</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '540px', lineHeight: 1.6 }}>
            Pick 1–10 markets. Combined odds multiply together. All picks must win for payout.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }} className="multi-layout">

          {/* Left — Markets */}
          <div>
            {/* Category pills */}
            <div className="pill-tabs" style={{ marginBottom: '14px' }}>
              {CATEGORIES.map(cat => (
                <button key={cat} className={`pill-tab ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>{cat}</button>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }}>🔍</span>
              <input className="input" placeholder="Search markets..." style={{ paddingLeft: '36px' }} value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Grouped markets first (Polymarket-style multi-outcome cards) */}
            {filteredGrouped.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                  Multiple Outcomes
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {filteredGrouped.map(g => (
                    <GroupedMarketCard
                      key={g.id}
                      group={g}
                      selections={Object.fromEntries(
                        Object.entries(selections).filter(([k]) => k.startsWith(g.id))
                      )}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Regular single-outcome markets */}
            {filteredMarkets.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                  Single Outcome
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {filteredMarkets.map(m => (
                    <SingleMarketCard key={m.id} market={m} selection={selections[m.id]} onSelect={handleSelect} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — Bet Slip */}
          <div className="bet-slip-sticky" style={{ position: 'sticky', top: '84px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>Bet Slip</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{selCount}/10 markets selected</div>
                </div>
                {selCount > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setSelections({})}>Clear all</button>}
              </div>

              {/* Selected legs */}
              <div style={{ padding: '12px 16px', maxHeight: '300px', overflowY: 'auto' }}>
                {selCount === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎯</div>
                    <div style={{ fontSize: '13px' }}>Select 1–10 markets</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedList.map(({ market, side, prob }, i) => (
                      <div key={market.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px', border: `1px solid ${side === 'YES' ? 'rgba(38,161,123,0.2)' : 'rgba(232,93,93,0.2)'}`, display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: side === 'YES' ? 'var(--yes-color)' : 'var(--no-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: '#000', flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {market.label || market.description}
                          </div>
                          <div style={{ fontSize: '11px', marginTop: '3px', color: side === 'YES' ? 'var(--yes-color)' : 'var(--no-color)', fontWeight: 700 }}>{side} · {prob.toFixed(0)}¢</div>
                        </div>
                        <button onClick={() => handleSelect(market, null)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Combined odds — show for ANY selection count */}
              {selCount >= 1 && (
                <div style={{ padding: '0 16px 12px' }}>
                  <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {selCount === 1 ? 'Odds' : `Combined (${selCount} picks)`}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{combinedProb.toFixed(1)}¢</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Payout multiplier</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{multiplier}×</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#444', marginTop: '4px' }}>
                      {selectedList.map(s => `${s.prob.toFixed(0)}¢`).join(' × ')}
                    </div>
                  </div>
                </div>
              )}

              {/* Stake + payout */}
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Stake (USDC)</div>
                <input className="input" type="number" placeholder={isConnected ? 'Enter amount...' : 'Connect wallet to bet'}
                  value={stake} onChange={e => setStake(e.target.value)} min={MIN_STAKE_USDC} max={MAX_STAKE_USDC} />

                {/* Payout preview — shows for ANY selection */}
                {stakeNum > 0 && selCount >= 1 && (
                  <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(38,161,123,0.06)', border: '1px solid rgba(38,161,123,0.15)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {selCount === 1 ? 'If correct' : `If all ${selCount} correct`}
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--yes-color)', fontFamily: 'var(--mono)' }}>+${potentialPayout} USDC</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#444', marginTop: '4px' }}>98% payout · 2% fee deducted</div>
                  </div>
                )}

                {!isConnected && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', lineHeight: 1.4 }}>
                    Browse and calculate odds without a wallet. Connect to place bets.
                  </div>
                )}

                <button
                  className="btn btn-gold"
                  style={{ width: '100%', marginTop: '12px', fontWeight: 800, fontSize: '15px' }}
                  onClick={isConnected ? handleCallIt : openConnectModal}
                  disabled={loading || (isConnected && selCount < 1)}
                >
                  {loading ? (
                    <><span className="spinner" /> Confirming...</>
                  ) : !isConnected ? (
                    'Connect to Place Bet'
                  ) : selCount < 1 ? (
                    'Select a market'
                  ) : (
                    `CALL IT — ${selCount > 1 ? selCount + '-Leg' : 'Single'} →`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
