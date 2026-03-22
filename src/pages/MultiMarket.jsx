import { useState, useEffect } from 'react'
import MarketDetailModal from '../components/MarketDetailModal'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useToast } from '../context/ToastContext'
import { MULTI_ADMIN_MARKETS } from '../data/markets'
import { MIN_STAKE_USDC, MAX_STAKE_USDC } from '../lib/config'

const CATEGORIES = ['All', 'Crypto', 'Sports', 'Politics', 'Economy', 'Social Media', 'Tech']
const seededRand = (seed, i) => ((seed * 9301 + i * 49297 + 233) % 233280) / 233280

// Live sparkline
function Sparkline({ history, isUp, height = 56 }) {
  const w = 300
  if (!history || history.length < 2) return null
  const maxP = Math.max(...history), minP = Math.min(...history)
  const range = maxP - minP || 1
  const norm = history.map(v => height - 4 - ((v - minP) / range) * (height - 8))
  const pts = norm.map((y, i) => `${(i / (history.length - 1)) * w},${y}`).join(' ')
  const color = isUp ? '#26A17B' : '#E85D5D'
  const uid = `ms${history[0].toFixed(0)}${height}`
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: '100%', height }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} ${w},${height}`} fill={`url(#${uid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={norm[norm.length - 1]} r="3.5" fill={color} />
    </svg>
  )
}

// Individual market card — each has own isolated state
function MultiMarketCard({ market, selection, onSelect }) {
  const [showDetail, setShowDetail] = useState(false)
  const isSelected = !!selection
  const seed = market.id + 5

  const [liveYes, setLiveYes] = useState(market.yesProb)
  const [history, setHistory] = useState(() =>
    Array.from({ length: 12 }, (_, i) => {
      const v = market.yesProb - 5 + Math.floor(seededRand(seed + i, i) * 10)
      return Math.max(5, Math.min(95, v))
    })
  )
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setLiveYes(prev => {
        const next = Math.max(5, Math.min(95, prev + (Math.random() - 0.49) * 2))
        setHistory(h => [...h.slice(-11), parseFloat(next.toFixed(1))])
        return parseFloat(next.toFixed(1))
      })
    }, 3000 + seed * 200 % 2500)
    return () => clearInterval(t)
  }, [])

  const liveNo = parseFloat((100 - liveYes).toFixed(1))
  const isUp = liveYes >= history[0]
  const catColors = { Crypto: 'badge-gold', Politics: 'badge-blue', Sports: 'badge-green', 'Social Media': 'badge-purple', Tech: 'badge-blue', Economy: 'badge-gray' }

  return (
    <div style={{
      background: isSelected ? 'rgba(232,184,75,0.04)' : '#0D0D0D',
      border: `1px solid ${isSelected ? 'rgba(232,184,75,0.35)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '12px', padding: '14px', transition: 'all 0.18s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
          <span className={`badge ${catColors[market.category] || 'badge-gray'}`}>{market.category}</span>
          {isSelected && (
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#000', background: selection.side === 'YES' ? '#26A17B' : '#E85D5D', borderRadius: '4px', padding: '2px 7px', display: 'flex', alignItems: 'center' }}>
              {selection.side} {Math.round(selection.side === 'YES' ? liveYes : liveNo)}¢
            </span>
          )}
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--mono)', color: isUp ? 'var(--yes-color)' : 'var(--no-color)', flexShrink: 0 }}>
          {isUp ? '▲' : '▼'} {Math.abs(liveYes - history[0]).toFixed(1)}¢
        </span>
      </div>

      <p style={{ fontSize: '13px', fontWeight: 600, color: '#DDD', lineHeight: 1.5, marginBottom: '10px' }}>{market.description}</p>

      {/* ¢ price display */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
        <div style={{ background: 'rgba(38,161,123,0.08)', border: '1px solid rgba(38,161,123,0.2)', borderRadius: '8px', padding: '7px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: '#26A17B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>YES</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#26A17B', fontFamily: 'var(--mono)', transition: 'all 0.4s' }}>{Math.round(liveYes)}¢</div>
        </div>
        <div style={{ background: 'rgba(232,93,93,0.08)', border: '1px solid rgba(232,93,93,0.2)', borderRadius: '8px', padding: '7px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: '#E85D5D', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>NO</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#E85D5D', fontFamily: 'var(--mono)', transition: 'all 0.4s' }}>{Math.round(liveNo)}¢</div>
        </div>
      </div>

      {/* Prob bar */}
      <div className="prob-bar-dual" style={{ marginBottom: '10px' }}>
        <div className="prob-bar-yes" style={{ width: `${liveYes}%`, transition: 'width 0.8s ease' }} />
        <div className="prob-bar-no" style={{ width: `${liveNo}%`, transition: 'width 0.8s ease' }} />
      </div>

      {/* Expiry date + time + volume */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '7px 10px' }}>
          <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Expires</div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#CCC', fontFamily: 'var(--mono)', lineHeight: 1.3 }}>
            {market.endDate}<br />
            <span style={{ fontSize: '10px', color: '#888' }}>{market.endTime}</span>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '7px 10px' }}>
          <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Volume</div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{market.volume}</div>
        </div>
      </div>

      {/* Toggle chart */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{ background: 'none', border: 'none', color: '#555', fontSize: '11px', cursor: 'pointer', padding: '2px 0', fontFamily: 'var(--font)', display: 'block', width: '100%', textAlign: 'center', marginBottom: expanded ? '10px' : 0 }}
      >
        {expanded ? '▲ hide chart' : '▼ show chart'}
      </button>

      {/* Live chart */}
      {expanded && (
        <div style={{ marginBottom: '10px', animation: 'fadeIn 0.18s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Probability</span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: isUp ? 'var(--yes-color)' : 'var(--no-color)' }}>
              {history[0].toFixed(0)}¢ → {Math.round(liveYes)}¢
            </span>
          </div>
          <Sparkline history={history} isUp={isUp} height={56} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555', marginTop: '6px' }}>
            <span>{market.bettors} bettors</span>
            <span>{market.volume} total volume</span>
          </div>
        </div>
      )}

      {/* YES/NO selection */}
      {isSelected ? (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className={`btn btn-sm ${selection.side === 'YES' ? 'btn-yes active' : 'btn-yes'}`} style={{ flex: 1, fontWeight: 700 }} onClick={() => onSelect(market, 'YES')}>
            YES {Math.round(liveYes)}¢
          </button>
          <button className={`btn btn-sm ${selection.side === 'NO' ? 'btn-no active' : 'btn-no'}`} style={{ flex: 1, fontWeight: 700 }} onClick={() => onSelect(market, 'NO')}>
            NO {Math.round(liveNo)}¢
          </button>
          <button onClick={() => onSelect(market, null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 10px', color: '#555', cursor: 'pointer', fontSize: '13px' }}>✕</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn btn-yes btn-sm" style={{ flex: 1, fontWeight: 700 }} onClick={() => onSelect(market, 'YES')}>+ YES {Math.round(liveYes)}¢</button>
          <button className="btn btn-no btn-sm" style={{ flex: 1, fontWeight: 700 }} onClick={() => onSelect(market, 'NO')}>+ NO {Math.round(liveNo)}¢</button>
        </div>
      )}

      {/* View full chart & details */}
      <button
        onClick={e => { e.stopPropagation(); setShowDetail(true) }}
        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px', color: '#666', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.14s', marginTop: '4px' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#AAA'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
      >
        📊 View Chart & Details
      </button>

      {showDetail && (
        <MarketDetailModal
          market={{
            id: `multi-${market.id}`,
            description: market.description,
            category: market.category,
            type: 'Multi',
            baseProb: market.yesProb,
            status: 'Open',
            endDate: market.endDate,
            endTime: market.endTime,
            volume: market.volume,
            creatorBelievesYes: true,
          }}
          onClose={() => setShowDetail(false)}
          onCallIt={() => setShowDetail(false)}
        />
      )}
    </div>
  )
}

export default function MultiMarket() {
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { addToast } = useToast()

  const [category, setCategory] = useState('All')
  const [selections, setSelections] = useState({})
  const [stake, setStake] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const filteredMarkets = MULTI_ADMIN_MARKETS.filter(m => {
    const catMatch = category === 'All' || m.category === category
    const searchMatch = !search || m.description.toLowerCase().includes(search.toLowerCase())
    return catMatch && searchMatch
  })

  const selectedList = Object.values(selections)
  const selCount = selectedList.length

  const combinedProb = selCount > 0
    ? selectedList.reduce((acc, s) => acc * (s.prob / 100), 1) * 100
    : 0

  const stakeNum = parseFloat(stake) || 0
  const potentialPayout = stakeNum > 0 && combinedProb > 0
    ? (stakeNum * (100 / combinedProb) * 0.98).toFixed(2)
    : '0.00'
  const multiplier = combinedProb > 0 ? (100 / combinedProb * 0.98).toFixed(1) : '0'

  const handleSelect = (market, side) => {
    setSelections(prev => {
      const next = { ...prev }
      if (!side) {
        delete next[market.id]
      } else if (selCount >= 10 && !next[market.id]) {
        addToast('Max 10 markets per bet', 'error')
        return prev
      } else {
        const prob = side === 'YES' ? market.yesProb : market.noProb
        next[market.id] = { market, side, prob }
      }
      return next
    })
  }

  const handleCallIt = async () => {
    if (loading) return // prevent double-submit
    if (!isConnected) { openConnectModal(); return }
    if (selCount < 1) { addToast('Select at least 1 market', 'error'); return }
    if (!stakeNum || stakeNum < MIN_STAKE_USDC) { addToast(`Min stake is ${MIN_STAKE_USDC} USDC`, 'error'); return }
    if (stakeNum > MAX_STAKE_USDC) { addToast(`Max stake is ${MAX_STAKE_USDC.toLocaleString()} USDC`, 'error'); return }
    // Validate stake is a real positive number
    if (!Number.isFinite(stakeNum) || stakeNum <= 0) { addToast('Invalid stake amount', 'error'); return }

    setLoading(true)
    try {
      // TODO: wire to contract createMultiBet with wallet signature
      await new Promise(r => setTimeout(r, 1400))
      addToast(`${selCount}-leg market placed! Good luck.`, 'success')
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
          <p style={{ fontSize: '14px', color: '#666', maxWidth: '540px', lineHeight: 1.6 }}>
            Pick 2–10 markets and combine into one. All picks must win. Click "show chart" on any card for live odds.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }} className="multi-layout">
          {/* Left: Markets */}
          <div>
            <div className="pill-tabs" style={{ marginBottom: '14px' }}>
              {CATEGORIES.map(cat => (
                <button key={cat} className={`pill-tab ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>{cat}</button>
              ))}
            </div>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }}>🔍</span>
              <input className="input" placeholder="Search markets..." style={{ paddingLeft: '36px' }} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {filteredMarkets.map(m => (
                <MultiMarketCard key={m.id} market={m} selection={selections[m.id]} onSelect={handleSelect} />
              ))}
            </div>
          </div>

          {/* Right: Bet Slip */}
          <div className="bet-slip-sticky" style={{ position: 'sticky', top: '84px' }}>
            <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800 }}>Bet Slip</div>
                  <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>{selCount}/10 markets selected</div>
                </div>
                {selCount > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setSelections({})}>Clear all</button>}
              </div>

              {/* Selected legs */}
              <div style={{ padding: '12px 16px', maxHeight: '280px', overflowY: 'auto' }}>
                {selCount === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#444' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎯</div>
                    <div style={{ fontSize: '13px' }}>Select 2–10 markets</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedList.map(({ market, side }, i) => (
                      <div key={market.id} style={{
                        background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px',
                        border: `1px solid ${side === 'YES' ? 'rgba(38,161,123,0.2)' : 'rgba(232,93,93,0.2)'}`,
                        display: 'flex', gap: '10px', alignItems: 'center',
                      }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: side === 'YES' ? 'var(--yes-color)' : 'var(--no-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: '#000', flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#DDD', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{market.description}</div>
                          <div style={{ fontSize: '11px', marginTop: '3px', color: side === 'YES' ? 'var(--yes-color)' : 'var(--no-color)', fontWeight: 700 }}>{side} · {side === 'YES' ? market.yesProb : market.noProb}¢</div>
                        </div>
                        <button onClick={() => handleSelect(market, null)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Combined odds */}
              {selCount >= 2 && (
                <div style={{ padding: '0 16px 12px' }}>
                  <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>Combined odds</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{combinedProb.toFixed(1)}¢</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>Payout multiplier</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#CCC', fontFamily: 'var(--mono)' }}>{multiplier}×</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#444', marginTop: '4px' }}>
                      {selectedList.map(s => `${s.side === 'YES' ? s.market.yesProb : s.market.noProb}¢`).join(' × ')}
                    </div>
                  </div>
                </div>
              )}

              {/* Stake */}
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#CCC', marginBottom: '6px' }}>Stake (USDC)</div>
                <input className="input" type="number" placeholder={isConnected ? 'Enter amount...' : 'Connect wallet to bet'} value={stake} onChange={e => setStake(e.target.value)} min={MIN_STAKE_USDC} max={MAX_STAKE_USDC} />

                {stakeNum > 0 && selCount >= 2 && (
                  <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(38,161,123,0.06)', border: '1px solid rgba(38,161,123,0.15)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>If all correct</span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--yes-color)', fontFamily: 'var(--mono)' }}>${potentialPayout} USDC</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#444', marginTop: '4px' }}>98% payout · 2% fee deducted</div>
                  </div>
                )}

                {!isConnected && (
                  <div style={{ fontSize: '12px', color: '#555', marginTop: '8px', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', lineHeight: 1.4 }}>
                    You can browse and calculate odds without a wallet. Connect to place bets.
                  </div>
                )}

                <button
                  className="btn btn-gold"
                  style={{ width: '100%', marginTop: '12px', fontWeight: 800, fontSize: '15px' }}
                  onClick={isConnected ? handleCallIt : openConnectModal}
                  disabled={loading || (isConnected && selCount < 1)}
                >
                  {loading ? (
                    <><span className="spinner" /> Confirming in wallet...</>
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
