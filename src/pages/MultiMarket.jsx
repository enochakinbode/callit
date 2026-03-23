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

// ── Liquid fill gauge — water inside a circle, rises/falls ──
// Green >= 50.1%, Red <= 49.99%. Level matches actual probability.
// clipPath keeps everything strictly inside the circle boundary.
function CircleGauge({ prob, prevProb, size = 52 }) {
  const isGreen = prob >= 50
  const waterFill  = isGreen ? '#26A17B' : '#E85D5D'
  const waterLight = isGreen ? 'rgba(38,161,123,0.3)' : 'rgba(232,93,93,0.3)'
  const change = prevProb !== undefined ? parseFloat((prob - prevProb).toFixed(1)) : 0
  const isUp = change >= 0

  const cx = size / 2
  const cy = size / 2
  const R  = size / 2 - 2          // circle radius (2px inset for border)
  const clipId = `liq-${size}`

  // Water surface Y in SVG coords (top=0, bottom=size)
  // prob=100 → waterY=cy-R (full), prob=0 → waterY=cy+R (empty)
  const waterY = cy + R - (prob / 100) * (2 * R)

  // Wave amplitude (smaller when near 0 or 100)
  const amp = Math.min(4, Math.min(prob, 100 - prob) / 5 + 1)
  const W = size * 2  // wave tile width (2× so we can scroll)

  // Build wave path — two full sine cycles so scrolling loops seamlessly
  const wavePath = [
    `M 0 ${waterY}`,
    `Q ${W*0.125} ${waterY - amp} ${W*0.25} ${waterY}`,
    `Q ${W*0.375} ${waterY + amp} ${W*0.5}  ${waterY}`,
    `Q ${W*0.625} ${waterY - amp} ${W*0.75} ${waterY}`,
    `Q ${W*0.875} ${waterY + amp} ${W}      ${waterY}`,
    `L ${W} ${size + 4} L 0 ${size + 4} Z`,
  ].join(' ')

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block', overflow: 'hidden', borderRadius: '50%' }}
      >
        <defs>
          {/* Strict circle clip */}
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={R} />
          </clipPath>
          <style>{`
            @keyframes liquid-wave {
              from { transform: translateX(0); }
              to   { transform: translateX(-${size}px); }
            }
          `}</style>
        </defs>

        {/* Background circle */}
        <circle cx={cx} cy={cy} r={R}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
        />

        {/* Water — clipped to circle */}
        <g clipPath={`url(#${clipId})`}>
          {/* Solid water body */}
          <rect
            x={-2} y={waterY}
            width={size + 4} height={size - waterY + 4}
            fill={waterLight}
            style={{ transition: 'y 0.9s cubic-bezier(0.4,0,0.2,1)' }}
          />
          {/* Animated wave on surface */}
          <g style={{ animation: 'liquid-wave 2s linear infinite' }}>
            <path d={wavePath} fill={waterFill} opacity="0.85" />
          </g>
        </g>

        {/* Circle border on top of water */}
        <circle cx={cx} cy={cy} r={R}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
        />
      </svg>

      {/* Text — sits on top, high contrast shadow */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '1px', pointerEvents: 'none',
      }}>
        <span style={{
          fontSize: '7px', fontWeight: 800,
          color: isUp ? '#5eead4' : '#fca5a5',
          lineHeight: 1, fontFamily: 'var(--mono)',
          textShadow: '0 0 8px rgba(0,0,0,1)',
        }}>
          {isUp ? '▲' : '▼'}{Math.abs(change).toFixed(1)}
        </span>
        <span style={{
          fontSize: '11px', fontWeight: 900,
          color: '#FFFFFF',
          lineHeight: 1, fontFamily: 'var(--mono)',
          textShadow: '0 0 8px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,0.9)',
        }}>
          {prob}%
        </span>
        <span style={{
          fontSize: '6px', color: 'rgba(255,255,255,0.85)',
          lineHeight: 1, letterSpacing: '0.04em',
          textShadow: '0 0 6px rgba(0,0,0,1)',
        }}>
          chance
        </span>
      </div>
    </div>
  )
}

// ── Single outcome market card — compact ─────────────────────
function SingleMarketCard({ market, selection, onSelect }) {
  const [showDetail, setShowDetail] = useState(false)
  const seed = (market.id || 0) + 5
  const [liveYes, setLiveYes] = useState(market.yesProb)
  const [prevYes, setPrevYes] = useState(market.yesProb)

  useEffect(() => {
    const t = setInterval(() => {
      setLiveYes(prev => {
        setPrevYes(prev)
        return parseFloat(Math.max(3, Math.min(97, prev + (Math.random() - 0.49) * 2)).toFixed(1))
      })
    }, 3000 + seed * 200 % 2500)
    return () => clearInterval(t)
  }, [seed])

  const liveNo = parseFloat((100 - liveYes).toFixed(1))
  const isAbove = liveYes >= 50
  const isNew = market.isNew || false
  const freq = market.frequency || 'One-time'
  const sel = selection

  return (
    <div style={{
      background: sel ? 'rgba(232,184,75,0.03)' : 'var(--bg-card)',
      border: `1px solid ${sel ? 'rgba(232,184,75,0.3)' : 'var(--border)'}`,
      borderRadius: '14px', padding: '14px',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      {/* Top — badges + gauge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '7px', alignItems: 'center' }}>
            <span className={`badge ${CAT_COLOR[market.category] || 'badge-gray'}`}>{market.category}</span>
            {isNew && <span style={{ background: 'rgba(232,184,75,0.15)', color: 'var(--gold)', border: '1px solid rgba(232,184,75,0.3)', borderRadius: '99px', fontSize: '9px', fontWeight: 800, padding: '2px 7px' }}>✨ NEW</span>}
            <span style={{ fontSize: '9px', color: '#555', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', padding: '1px 5px' }}>🔄 {freq}</span>
          </div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.45, margin: 0 }}>{market.description}</p>
        </div>
        <CircleGauge prob={Math.round(liveYes)} prevProb={Math.round(prevYes)} size={52} />
      </div>

      {/* YES/NO buttons — directly, no price boxes */}
      {sel ? (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className={`btn btn-sm ${sel.side === 'YES' ? 'btn-yes active' : 'btn-yes'}`} style={{ flex: 1, fontWeight: 700 }} onClick={() => onSelect(market, 'YES')}>
            YES {Math.round(liveYes)}¢
          </button>
          <button className={`btn btn-sm ${sel.side === 'NO' ? 'btn-no active' : 'btn-no'}`} style={{ flex: 1, fontWeight: 700 }} onClick={() => onSelect(market, 'NO')}>
            NO {Math.round(liveNo)}¢
          </button>
          <button onClick={() => onSelect(market, null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 10px', color: '#666', cursor: 'pointer', fontSize: '13px' }}>✕</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn btn-yes btn-sm" style={{ flex: 1, fontWeight: 700 }} onClick={() => onSelect(market, 'YES')}>+ YES {Math.round(liveYes)}¢</button>
          <button className="btn btn-no btn-sm" style={{ flex: 1, fontWeight: 700 }} onClick={() => onSelect(market, 'NO')}>+ NO {Math.round(liveNo)}¢</button>
        </div>
      )}

      {/* View Chart row — includes bettors + expires */}
      <button
        onClick={() => setShowDetail(true)}
        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.14s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      >
        <span style={{ fontSize: '12px', color: '#666' }}>📊 Chart & Details · <span style={{ color: 'var(--text-muted)' }}>{market.bettors || 0} bettors</span></span>
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

// ── Grouped multi-outcome card — 2 visible, scroll button for rest ──
function GroupedMarketCard({ group, selections, onSelect }) {
  const [liveProbs, setLiveProbs] = useState(() =>
    Object.fromEntries(group.outcomes.map(o => [o.id, o.yesProb]))
  )

  useEffect(() => {
    const t = setInterval(() => {
      setLiveProbs(prev => {
        const next = { ...prev }
        group.outcomes.forEach(o => {
          next[o.id] = parseFloat(Math.max(2, Math.min(98, prev[o.id] + (Math.random() - 0.49) * 1.2)).toFixed(1))
        })
        return next
      })
    }, 2800)
    return () => clearInterval(t)
  }, [group.id])

  // Show only 2 outcomes by default
  const visibleOutcomes = group.outcomes
  const freq = group.frequency || 'One-time'

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span className={`badge ${CAT_COLOR[group.category] || 'badge-gray'}`}>{group.category}</span>
        {group.isNew && <span style={{ background: 'rgba(232,184,75,0.15)', color: 'var(--gold)', border: '1px solid rgba(232,184,75,0.3)', borderRadius: '99px', fontSize: '9px', fontWeight: 800, padding: '2px 7px' }}>✨ NEW</span>}
        <span style={{ fontSize: '9px', color: '#555', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', padding: '1px 5px' }}>🔄 {freq}</span>
      </div>

      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.45, margin: 0 }}>{group.title}</p>

      {/* Outcomes — 2 visible, natural scroll for more */}
      <div style={{ overflowY: 'auto', maxHeight: '104px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {visibleOutcomes.map(outcome => {
            const yp = liveProbs[outcome.id] || outcome.yesProb
            const np = parseFloat((100 - yp).toFixed(1))
            const sel = selections[outcome.id]
            return (
              <div key={outcome.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px',
                background: sel ? (sel.side === 'YES' ? 'rgba(38,161,123,0.08)' : 'rgba(232,93,93,0.08)') : 'rgba(255,255,255,0.03)',
                border: `1px solid ${sel ? (sel.side === 'YES' ? 'rgba(38,161,123,0.25)' : 'rgba(232,93,93,0.25)') : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '8px', transition: 'all 0.14s',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', flex: 1 }}>{outcome.label}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#888', fontFamily: 'var(--mono)', flexShrink: 0 }}>{yp.toFixed(0)}%</span>
                <button onClick={() => onSelect({ ...outcome, marketId: group.id, yesProb: yp, noProb: np }, 'YES')}
                  style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid rgba(38,161,123,0.4)', background: sel?.side === 'YES' ? 'var(--yes-color)' : 'rgba(38,161,123,0.12)', color: sel?.side === 'YES' ? '#000' : 'var(--yes-color)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Yes
                </button>
                <button onClick={() => onSelect({ ...outcome, marketId: group.id, yesProb: yp, noProb: np }, 'NO')}
                  style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid rgba(232,93,93,0.4)', background: sel?.side === 'NO' ? 'var(--no-color)' : 'rgba(232,93,93,0.12)', color: sel?.side === 'NO' ? '#fff' : 'var(--no-color)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  No
                </button>
              </div>
            )
          })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#555' }}>
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
  const [selections, setSelections] = useState({})
  const [stake, setStake] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const filteredMarkets = useMemo(() => MULTI_ADMIN_MARKETS.filter(m =>
    (category === 'All' || m.category === category) &&
    (!search || m.description.toLowerCase().includes(search.toLowerCase()))
  ), [category, search])

  const filteredGrouped = useMemo(() => GROUPED_MARKETS.filter(g =>
    (category === 'All' || g.category === category) &&
    (!search || g.title.toLowerCase().includes(search.toLowerCase()))
  ), [category, search])

  const selectedList = Object.values(selections)
  const selCount = selectedList.length

  const combinedProb = selCount > 0
    ? selectedList.reduce((acc, s) => acc * (s.prob / 100), 1) * 100
    : 0

  const stakeNum = parseFloat(stake) || 0

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
      if (!side) { delete next[key] }
      else if (selCount >= 10 && !next[key]) { addToast('Max 10 markets per bet', 'error'); return prev }
      else {
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
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>Multi Markets</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pick 1–10 markets. Combined odds multiply. All picks must win.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }} className="multi-layout">
          <div>
            <div className="pill-tabs" style={{ marginBottom: '12px' }}>
              {CATEGORIES.map(cat => (
                <button key={cat} className={`pill-tab ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>{cat}</button>
              ))}
            </div>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#444' }}>🔍</span>
              <input className="input" placeholder="Search markets..." style={{ paddingLeft: '36px' }} value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Grouped cards */}
            {filteredGrouped.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Multiple Outcomes</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '10px' }}>
                  {filteredGrouped.map(g => (
                    <GroupedMarketCard key={g.id} group={g}
                      selections={Object.fromEntries(Object.entries(selections).filter(([k]) => k.startsWith(g.id)))}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Single outcome cards */}
            {filteredMarkets.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Single Outcome</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '10px' }}>
                  {filteredMarkets.map(m => (
                    <SingleMarketCard key={m.id} market={m} selection={selections[m.id]} onSelect={handleSelect} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bet Slip */}
          <div className="bet-slip-sticky" style={{ position: 'sticky', top: '84px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>Bet Slip</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selCount}/10 selected</div>
                </div>
                {selCount > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setSelections({})}>Clear</button>}
              </div>

              <div style={{ padding: '10px 14px', maxHeight: '260px', overflowY: 'auto' }}>
                {selCount === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>🎯</div>
                    <div style={{ fontSize: '12px' }}>Select 1–10 markets</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedList.map(({ market, side, prob }, i) => (
                      <div key={market.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '7px', padding: '8px 10px', border: `1px solid ${side === 'YES' ? 'rgba(38,161,123,0.2)' : 'rgba(232,93,93,0.2)'}`, display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: side === 'YES' ? 'var(--yes-color)' : 'var(--no-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, color: '#000', flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {market.label || market.description}
                          </div>
                          <div style={{ fontSize: '10px', color: side === 'YES' ? 'var(--yes-color)' : 'var(--no-color)', fontWeight: 700 }}>{side} · {prob.toFixed(0)}¢</div>
                        </div>
                        <button onClick={() => handleSelect(market, null)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selCount >= 1 && (
                <div style={{ padding: '0 14px 10px' }}>
                  <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selCount === 1 ? 'Odds' : `Combined (${selCount})`}</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{combinedProb.toFixed(1)}¢</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Multiplier</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{multiplier}×</span>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ padding: '0 14px 14px' }}>
                <input className="input" type="number" placeholder={isConnected ? 'Stake (USDC)' : 'Connect wallet'}
                  value={stake} onChange={e => setStake(e.target.value)} style={{ fontSize: '13px' }} />
                {stakeNum > 0 && selCount >= 1 && (
                  <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(38,161,123,0.06)', border: '1px solid rgba(38,161,123,0.15)', borderRadius: '7px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selCount === 1 ? 'If correct' : `If all ${selCount} correct`}</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--yes-color)', fontFamily: 'var(--mono)' }}>+${potentialPayout}</span>
                  </div>
                )}
                <button
                  className="btn btn-gold"
                  style={{ width: '100%', marginTop: '10px', fontWeight: 800, fontSize: '14px' }}
                  onClick={isConnected ? handleCallIt : openConnectModal}
                  disabled={loading || (isConnected && selCount < 1)}
                >
                  {loading ? <><span className="spinner" /> Confirming...</>
                    : !isConnected ? 'Connect to Bet'
                    : selCount < 1 ? 'Select a market'
                    : `CALL IT — ${selCount > 1 ? selCount + '-Leg' : 'Single'} →`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
