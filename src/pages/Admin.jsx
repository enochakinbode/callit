import { useState, useMemo, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useToast } from '../context/ToastContext'
import { formatUSDC, shortAddr } from '../lib/config'
import { MULTI_ADMIN_MARKETS } from '../data/markets'

// Fallback Polymarket markets shown when API is unreachable (real recent markets)
const POLY_FALLBACK = [
  { id: 'poly-1', question: 'Will Donald Trump pardon Ross Ulbricht before April 2026?', endDate: '2026-04-01', volume: 1200000, bestBid: '0.85', category: 'Politics' },
  { id: 'poly-2', question: 'Will the US enter a recession in 2026?', endDate: '2026-12-31', volume: 980000, bestBid: '0.32', category: 'Economy' },
  { id: 'poly-3', question: 'Will Bitcoin reach $150,000 before July 2026?', endDate: '2026-07-01', volume: 2400000, bestBid: '0.51', category: 'Crypto' },
  { id: 'poly-4', question: 'Will Ethereum ETF net inflows exceed $1B in Q2 2026?', endDate: '2026-06-30', volume: 450000, bestBid: '0.62', category: 'Crypto' },
  { id: 'poly-5', question: 'Will the Federal Reserve cut rates in May 2026?', endDate: '2026-05-15', volume: 1800000, bestBid: '0.44', category: 'Economy' },
  { id: 'poly-6', question: 'Will Real Madrid win the 2025/26 Champions League?', endDate: '2026-05-30', volume: 670000, bestBid: '0.28', category: 'Sports' },
  { id: 'poly-7', question: 'Will Argentina win the 2026 FIFA World Cup?', endDate: '2026-07-19', volume: 920000, bestBid: '0.22', category: 'Sports' },
  { id: 'poly-8', question: 'Will Elon Musk leave DOGE by June 2026?', endDate: '2026-06-30', volume: 340000, bestBid: '0.58', category: 'Politics' },
  { id: 'poly-9', question: 'Will SEC approve a Solana spot ETF before end of 2026?', endDate: '2026-12-31', volume: 780000, bestBid: '0.55', category: 'Crypto' },
  { id: 'poly-10', question: 'Will TikTok remain operational in the US through 2026?', endDate: '2026-12-31', volume: 560000, bestBid: '0.71', category: 'Social Media' },
  { id: 'poly-11', question: 'Will LeBron James retire before end of 2026?', endDate: '2026-12-31', volume: 280000, bestBid: '0.18', category: 'Sports' },
  { id: 'poly-12', question: 'Will OpenAI release GPT-5 before July 2026?', endDate: '2026-07-01', volume: 890000, bestBid: '0.67', category: 'Tech' },
]

// Only this wallet can access the admin panel
const ADMIN_WALLET = '0x3dc5b334EA7a6a33da61F950bBEfaC615cF1A55b'

// P2P pending manual resolutions
const PENDING_P2P = [
  { id: 2,  type: 'P2P',   category: 'Sports',   description: 'Nigeria Super Eagles will qualify for 2026 World Cup',                          creator: '0x1234...5678', acceptor: '0xABCD...EF01', pool: '$100.00', expired: 'May 1, 2026 · 08:00 PM WAT',  sourceHint: 'Check: FIFA / CAF / BBC Sport',           urgency: 'high'   },
  { id: 4,  type: 'P2P',   category: 'Politics', description: 'Binance will receive full US regulatory approval by end of 2026',               creator: '0x9876...4321', acceptor: '0x5678...9012', pool: '$400.00', expired: 'Dec 31, 2026 · 11:59 PM EST', sourceHint: 'Check: SEC.gov / Reuters / Bloomberg',    urgency: 'low'    },
  { id: 7,  type: 'P2P',   category: 'Politics', description: 'Donald Trump will sign a US crypto strategic reserve bill before Dec 31, 2026', creator: '0xCDEF...9012', acceptor: '0x2345...6789', pool: '$300.00', expired: 'Dec 31, 2026 · 11:59 PM EST', sourceHint: 'Check: whitehouse.gov / Reuters',          urgency: 'low'    },
  { id: 11, type: 'P2P',   category: 'Sports',   description: 'Chelsea will win the Premier League title in the 2025/26 season',              creator: '0xEF01...2345', acceptor: '0x3456...7890', pool: '$160.00', expired: 'May 25, 2026 · 05:00 PM UTC', sourceHint: 'Check: premierleague.com / BBC Sport',    urgency: 'medium' },
  { id: 15, type: 'P2P',   category: 'Sports',   description: 'Argentina will win the 2026 FIFA World Cup',                                   creator: '0x4567...8901', acceptor: '0x6789...0123', pool: '$200.00', expired: 'Jul 19, 2026 · 08:00 PM UTC', sourceHint: 'Check: FIFA official results',            urgency: 'medium' },
]

// Multi markets pending manual resolution
const PENDING_MULTI = MULTI_ADMIN_MARKETS
  .filter(m => ['Sports', 'Politics', 'Economy', 'Social Media'].includes(m.category))
  .map(m => ({
    id: m.id,
    type: 'Multi',
    category: m.category,
    description: m.description,
    pool: m.volume,
    expired: `${m.endDate} · ${m.endTime}`,
    sourceHint: m.category === 'Sports' ? 'Check: official league website / BBC Sport'
      : m.category === 'Politics' ? 'Check: official government source / Reuters'
      : m.category === 'Economy' ? 'Check: fed.gov / Bloomberg / Reuters'
      : 'Check: platform official stats',
    urgency: m.category === 'Sports' ? 'high' : 'medium',
    yesProb: m.yesProb,
    bettors: m.bettors,
  }))

const ALL_PENDING = [...PENDING_P2P, ...PENDING_MULTI]

const URGENCY_STYLE = {
  high:   { bg: 'rgba(232,93,93,0.10)',   color: '#E85D5D',  border: 'rgba(232,93,93,0.2)',   label: '🔴 High'   },
  medium: { bg: 'rgba(245,158,11,0.10)',  color: '#fbbf24',  border: 'rgba(245,158,11,0.2)',  label: '🟡 Medium' },
  low:    { bg: 'rgba(96,165,250,0.10)',  color: '#60a5fa',  border: 'rgba(96,165,250,0.2)',  label: '🔵 Low'    },
}

const CAT_COLOR = { Crypto: 'badge-gold', Sports: 'badge-green', Economy: 'badge-gray', Politics: 'badge-blue', 'Social Media': 'badge-purple', Tech: 'badge-blue' }

const PLATFORM_STATS = [
  { label: 'Total Volume',       value: '$0.00',              icon: '💰', color: 'var(--gold)'      },
  { label: 'Total Fees',         value: '$0.00',              icon: '🏦', color: 'var(--yes-color)' },
  { label: 'Active P2P Markets', value: '34',                 icon: '⚔️', color: '#60a5fa'          },
  { label: 'Active Multi',       value: String(MULTI_ADMIN_MARKETS.length), icon: '🎯', color: '#a78bfa' },
  { label: 'Total Bettors',      value: String(MULTI_ADMIN_MARKETS.reduce((s, m) => s + m.bettors, 0).toLocaleString()), icon: '👥', color: '#fb923c' },
  { label: 'Pending Manual',     value: String(ALL_PENDING.length), icon: '⏳', color: '#fbbf24'   },
]

export default function Admin() {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { addToast } = useToast()

  const [resolving, setResolving] = useState(null)
  const [tab, setTab] = useState('pending')
  const [resolved, setResolved] = useState({}) // betId -> outcome

  // Pending filters
  const [pendingSearch, setPendingSearch]   = useState('')
  const [pendingCat, setPendingCat]         = useState('All')
  const [pendingType, setPendingType]       = useState('All')
  const [pendingUrgency, setPendingUrgency] = useState('All')
  const [pendingSort, setPendingSort]       = useState('urgency') // urgency | expiry | newest

  // Multi table filters
  const [multiSearch, setMultiSearch]   = useState('')
  const [multiCat, setMultiCat]         = useState('All')
  const [multiSort, setMultiSort]       = useState('newest') // newest | bettors | volume

  // Create multi form
  const [multiForm, setMultiForm] = useState({ description: '', category: 'Crypto', yesProb: '50', endDate: '', endTime: '23:59' })
  const [createdMultis, setCreatedMultis] = useState([])
  const [creating, setCreating] = useState(false)
  const setMF = (k, v) => setMultiForm(p => ({ ...p, [k]: v }))

  // Market Slip settings
  const [maxSlipSize, setMaxSlipSize] = useState(10)
  const [slipCategoryRules, setSlipCategoryRules] = useState({
    Crypto: true, Sports: true, Politics: true, Economy: true, 'Social Media': true, Tech: true,
  })

  // Market on/off toggle (per market)
  const [marketEnabled, setMarketEnabled] = useState(() =>
    Object.fromEntries([...createdMultis, ...MULTI_ADMIN_MARKETS].map(m => [m.id, true]))
  )
  const toggleMarket = id => setMarketEnabled(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleCategory = cat => setSlipCategoryRules(prev => ({ ...prev, [cat]: !prev[cat] }))

  // Edit multi market
  const [editingMarket, setEditingMarket] = useState(null)
  const [editForm, setEditForm] = useState({})
  const setEF = (k, v) => setEditForm(p => ({ ...p, [k]: v }))

  const startEdit = (m) => {
    setEditingMarket(m.id)
    setEditForm({ description: m.description, category: m.category, yesProb: String(m.yesProb), endDate: '', endTime: m.endTime || '23:59' })
    setTab('create-multi')
  }

  const handleSaveEdit = () => {
    if (!editForm.description.trim()) { addToast('Description required', 'error'); return }
    setCreatedMultis(prev => prev.map(m => m.id === editingMarket ? { ...m, ...editForm, yesProb: +editForm.yesProb, noProb: 100 - +editForm.yesProb } : m))
    setEditingMarket(null)
    setEditForm({})
    setTab('all-multi')
    addToast('Market updated', 'success')
  }

  // Polymarket import
  const [polySearch, setPolySearch] = useState('')
  const [polyResults, setPolyResults] = useState([])
  const [polyLoading, setPolyLoading] = useState(false)
  const [polyError, setPolyError] = useState('')
  const [pushedToCallit, setPushedToCallit] = useState(new Set()) // track already-added market IDs

  // Fetch from Polymarket — loads on mount and on search
  const fetchPolymarkets = async (query = '') => {
    setPolyLoading(true)
    setPolyError('')
    try {
      // Use multiple CORS-friendly endpoints as fallback
      const endpoints = [
        `https://gamma-api.polymarket.com/markets?limit=20&active=true&closed=false${query ? '&_c=' + encodeURIComponent(query) : '&order=volume&ascending=false'}`,
        `https://clob.polymarket.com/markets?next_cursor=&${query ? 'keyword=' + encodeURIComponent(query) + '&' : ''}active=true&closed=false`,
      ]

      let markets = []
      for (const url of endpoints) {
        try {
          const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
          if (!res.ok) continue
          const data = await res.json()
          const raw = Array.isArray(data) ? data : (data.markets || data.data || data.results || [])
          if (raw.length > 0) {
            markets = raw
            break
          }
        } catch { continue }
      }

      if (markets.length === 0) {
        // Fallback: show curated real markets if API unreachable
        markets = POLY_FALLBACK.filter(m =>
          !query || m.question.toLowerCase().includes(query.toLowerCase())
        )
      }

      setPolyResults(markets.slice(0, 15).map(m => ({
        id: m.id || m.conditionId || String(Math.random()),
        question: m.question || m.title || m.description || 'No title',
        endDate: m.endDateIso || m.end_date_iso || m.expirationDate || m.end_date || '',
        volume: m.volumeNum || m.volume || 0,
        bestBid: m.bestBid || m.outcomePrices?.[0] || '0.50',
        category: m.category || (m.tags?.[0]) || 'Politics',
      })))

      if (markets.length === 0) setPolyError('No markets found. Try different keywords.')
    } catch (err) {
      setPolyError('Could not reach Polymarket. Showing cached markets below.')
      setPolyResults(POLY_FALLBACK)
    } finally {
      setPolyLoading(false)
    }
  }

  const searchPolymarket = () => fetchPolymarkets(polySearch)

  const importFromPoly = (market) => {
    const yesProb = Math.round(parseFloat(market.bestBid) * 100) || 50
    const endDate = market.endDate ? market.endDate.split('T')[0] : ''
    const cat = market.category
    setMultiForm({
      description: market.question,
      category: ['Crypto','Sports','Politics','Economy','Social Media','Tech'].includes(cat) ? cat : 'Politics',
      yesProb: String(Math.min(99, Math.max(1, yesProb))),
      endDate,
      endTime: '23:59',
    })
    setTab('create-multi')
    addToast('Market imported — review and adjust before creating', 'success')
  }

  // Mark market as pushed after creating
  const markAsPushed = (polyId) => {
    if (polyId) setPushedToCallit(prev => new Set([...prev, polyId]))
  }

  // Auth
  const isAdmin = isConnected && address?.toLowerCase() === ADMIN_WALLET.toLowerCase()

  // Auto-load Polymarket markets when import tab is opened
  useEffect(() => {
    if (tab === 'import-poly' && polyResults.length === 0 && !polyLoading) {
      fetchPolymarkets('')
    }
  }, [tab])

  // ── Filtered pending ──────────────────────────────────────
  const filteredPending = useMemo(() => {
    let list = ALL_PENDING.filter(b => !resolved[`${b.type}-${b.id}`])
    if (pendingSearch) list = list.filter(b => b.description.toLowerCase().includes(pendingSearch.toLowerCase()))
    if (pendingCat !== 'All') list = list.filter(b => b.category === pendingCat)
    if (pendingType !== 'All') list = list.filter(b => b.type === pendingType)
    if (pendingUrgency !== 'All') list = list.filter(b => b.urgency === pendingUrgency.toLowerCase())
    list = [...list].sort((a, b) => {
      if (pendingSort === 'urgency') {
        const order = { high: 0, medium: 1, low: 2 }
        return order[a.urgency] - order[b.urgency]
      }
      if (pendingSort === 'expiry') {
        return new Date(a.expired.split(' · ')[0]) - new Date(b.expired.split(' · ')[0])
      }
      return b.id - a.id // newest first
    })
    return list
  }, [pendingSearch, pendingCat, pendingType, pendingUrgency, pendingSort, resolved])

  // ── Filtered multi markets ────────────────────────────────
  const allMultiMarkets = useMemo(() => [...createdMultis, ...MULTI_ADMIN_MARKETS], [createdMultis])

  const filteredMulti = useMemo(() => {
    let list = allMultiMarkets
    if (multiSearch) list = list.filter(m => m.description.toLowerCase().includes(multiSearch.toLowerCase()))
    if (multiCat !== 'All') list = list.filter(m => m.category === multiCat)
    list = [...list].sort((a, b) => {
      if (multiSort === 'bettors') return (b.bettors || 0) - (a.bettors || 0)
      if (multiSort === 'volume') return parseFloat((b.volume || b.pool || '$0').replace(/[$,]/g, '')) - parseFloat((a.volume || a.pool || '$0').replace(/[$,]/g, ''))
      return b.id - a.id
    })
    return list
  }, [allMultiMarkets, multiSearch, multiCat, multiSort])

  const handleResolve = async (type, id, outcome) => {
    const key = `${type}-${id}`
    setResolving(key + '-' + outcome)
    await new Promise(r => setTimeout(r, 1000))
    // TODO: wire to contract resolveManualBet / resolveMultiBet
    setResolved(prev => ({ ...prev, [key]: outcome }))
    addToast(`${type} #${id} resolved: ${outcome} wins`, 'success')
    setResolving(null)
  }

  const handleCreateMulti = async () => {
    if (!multiForm.description.trim()) { addToast('Description required', 'error'); return }
    if (!multiForm.endDate) { addToast('End date required', 'error'); return }
    if (isNaN(+multiForm.yesProb) || +multiForm.yesProb < 1 || +multiForm.yesProb > 99) { addToast('Probability must be 1–99', 'error'); return }
    setCreating(true)
    await new Promise(r => setTimeout(r, 600))
    const newId = Date.now()
    setCreatedMultis(prev => [{
      id: newId,
      description: multiForm.description.trim(),
      category: multiForm.category,
      yesProb: +multiForm.yesProb,
      noProb: 100 - +multiForm.yesProb,
      endDate: new Date(multiForm.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      endTime: multiForm.endTime + ' UTC',
      volume: '$0',
      bettors: 0,
      status: 'Open',
    }, ...prev])
    setMultiForm({ description: '', category: 'Crypto', yesProb: '50', endDate: '', endTime: '23:59' })
    setCreating(false)
    setTab('all-multi')
    // Mark imported polymarket as pushed
    const matchedPoly = polyResults.find(p => p.question === multiForm.description)
    if (matchedPoly) markAsPushed(matchedPoly.id)
    addToast('Multi market created!', 'success')
  }

  // ── Not connected ─────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '36px', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔐</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Admin Panel</h2>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '24px' }}>Connect your admin wallet to continue</p>
          <button className="btn btn-gold" style={{ width: '100%', fontWeight: 700 }} onClick={openConnectModal}>Connect Wallet</button>
        </div>
      </div>
    )
  }

  // ── Wrong wallet ──────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ background: '#0D0D0D', border: '1px solid rgba(232,93,93,0.2)', borderRadius: '20px', padding: '36px', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⛔</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Access Denied</h2>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>This wallet is not authorised.</p>
          <p style={{ fontSize: '12px', color: '#444', fontFamily: 'var(--mono)' }}>{shortAddr(address)}</p>
        </div>
      </div>
    )
  }

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
          <span style={{ fontSize: '12px', color: 'var(--gold)', fontFamily: 'var(--mono)', background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: '8px', padding: '6px 12px' }}>
            {shortAddr(address)}
          </span>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '28px' }}>
          {PLATFORM_STATS.map((s, i) => (
            <div key={i} style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: s.color, fontFamily: 'var(--mono)' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#555', marginTop: '3px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: '24px' }}>
          {[
            { id: 'pending',      label: `⏳ Pending (${filteredPending.length}/${ALL_PENDING.length})` },
            { id: 'all-multi',    label: `🎯 Multi Markets (${filteredMulti.length})` },
            { id: 'create-multi', label: '➕ Create Market' },
            { id: 'import-poly', label: '📥 Import Polymarket' },
            { id: 'slip-settings', label: '⚙️ Market Slip' },
          ].map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* ── PENDING RESOLUTIONS ── */}
        {tab === 'pending' && (
          <div>
            {/* Filters */}
            <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Filters & Sort</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '180px' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#444', fontSize: '13px' }}>🔍</span>
                  <input className="input" placeholder="Search markets..." style={{ paddingLeft: '30px' }} value={pendingSearch} onChange={e => setPendingSearch(e.target.value)} />
                </div>
                <select className="input" style={{ width: 'auto', minWidth: '120px' }} value={pendingSort} onChange={e => setPendingSort(e.target.value)}>
                  <option value="urgency">Sort: Urgency</option>
                  <option value="expiry">Sort: Expiry (soonest)</option>
                  <option value="newest">Sort: Newest first</option>
                </select>
                <select className="input" style={{ width: 'auto', minWidth: '110px' }} value={pendingUrgency} onChange={e => setPendingUrgency(e.target.value)}>
                  <option value="All">All Urgency</option>
                  <option value="High">🔴 High</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="Low">🔵 Low</option>
                </select>
                <select className="input" style={{ width: 'auto', minWidth: '100px' }} value={pendingType} onChange={e => setPendingType(e.target.value)}>
                  <option value="All">All Types</option>
                  <option value="P2P">P2P</option>
                  <option value="Multi">Multi</option>
                </select>
                <select className="input" style={{ width: 'auto', minWidth: '120px' }} value={pendingCat} onChange={e => setPendingCat(e.target.value)}>
                  <option value="All">All Categories</option>
                  {['Sports', 'Politics', 'Economy', 'Social Media'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Quick filter pills */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#555', marginRight: '4px', alignSelf: 'center' }}>Quick:</span>
                {[
                  { label: '🔴 Resolve now', action: () => { setPendingSort('urgency'); setPendingUrgency('High') } },
                  { label: '⏰ Expiring soon', action: () => { setPendingSort('expiry'); setPendingUrgency('All') } },
                  { label: '🆕 Just arrived', action: () => { setPendingSort('newest'); setPendingUrgency('All') } },
                  { label: '⚽ Sports only', action: () => { setPendingCat('Sports'); setPendingUrgency('All') } },
                  { label: '🏛 Politics only', action: () => { setPendingCat('Politics'); setPendingUrgency('All') } },
                  { label: 'Reset', action: () => { setPendingSort('urgency'); setPendingUrgency('All'); setPendingCat('All'); setPendingType('All'); setPendingSearch('') } },
                ].map((pill, i) => (
                  <button key={i} onClick={pill.action} style={{ padding: '4px 12px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#888', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.14s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#FFF'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: '13px', color: '#555', marginBottom: '14px' }}>
              {filteredPending.length} pending · {Object.keys(resolved).length} resolved this session
            </div>

            {filteredPending.length === 0 ? (
              <div className="empty-state">
                <div className="icon">✅</div>
                <h3>All clear!</h3>
                <p>No markets pending resolution</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredPending.map(bet => {
                  const urg = URGENCY_STYLE[bet.urgency]
                  const key = `${bet.type}-${bet.id}`
                  return (
                    <div key={key} style={{ background: '#0D0D0D', border: '1px solid rgba(245,158,11,0.18)', borderRadius: '14px', padding: '18px' }}>
                      {/* Top row */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className={`badge ${CAT_COLOR[bet.category] || 'badge-gray'}`}>{bet.category}</span>
                        <span className="badge badge-manual">🛡 MANUAL</span>
                        <span className={`badge ${bet.type === 'P2P' ? 'badge-gray' : 'badge-purple'}`}>{bet.type}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', background: urg.bg, color: urg.color, border: `1px solid ${urg.border}` }}>
                          {urg.label}
                        </span>
                        <span style={{ fontSize: '11px', color: '#555', marginLeft: 'auto' }}>#{bet.id}</span>
                      </div>

                      <p style={{ fontSize: '15px', fontWeight: 700, color: '#FFF', marginBottom: '12px', lineHeight: 1.5 }}>{bet.description}</p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                        {[
                          { label: 'Pool', value: bet.pool },
                          { label: 'Expired', value: bet.expired },
                          bet.type === 'P2P'
                            ? { label: 'Creator', value: bet.creator }
                            : { label: 'Bettors', value: bet.bettors },
                          bet.type === 'P2P'
                            ? { label: 'Acceptor', value: bet.acceptor }
                            : { label: 'YES Prob', value: `${bet.yesProb}%` },
                        ].map((s, i) => (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '8px 10px' }}>
                            <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{s.label}</div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#CCC', fontFamily: 'var(--mono)' }}>{s.value}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', fontSize: '12px', color: '#888' }}>
                        📰 <strong style={{ color: '#fbbf24' }}>Verify:</strong> {bet.sourceHint}
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button className="btn btn-yes" style={{ flex: 1, minWidth: '120px', fontWeight: 700 }}
                          disabled={!!resolving} onClick={() => handleResolve(bet.type, bet.id, 'YES')}>
                          {resolving === key + '-YES' ? <><span className="spinner" /> Resolving...</> : '✅ YES Wins'}
                        </button>
                        <button className="btn btn-no" style={{ flex: 1, minWidth: '120px', fontWeight: 700 }}
                          disabled={!!resolving} onClick={() => handleResolve(bet.type, bet.id, 'NO')}>
                          {resolving === key + '-NO' ? <><span className="spinner" /> Resolving...</> : '❌ NO Wins'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ALL MULTI MARKETS ── */}
        {tab === 'all-multi' && (
          <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '180px' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#444', fontSize: '13px' }}>🔍</span>
                <input className="input" placeholder="Search multi markets..." style={{ paddingLeft: '30px' }} value={multiSearch} onChange={e => setMultiSearch(e.target.value)} />
              </div>
              <select className="input" style={{ width: 'auto', minWidth: '120px' }} value={multiSort} onChange={e => setMultiSort(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="bettors">Most bettors</option>
                <option value="volume">Highest volume</option>
              </select>
              <select className="input" style={{ width: 'auto', minWidth: '120px' }} value={multiCat} onChange={e => setMultiCat(e.target.value)}>
                <option value="All">All Categories</option>
                {['Crypto', 'Sports', 'Politics', 'Economy', 'Social Media', 'Tech'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="btn btn-gold btn-sm" onClick={() => setTab('create-multi')} style={{ fontWeight: 700, flexShrink: 0 }}>
                + Create Market
              </button>
            </div>

            <div style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>{filteredMulti.length} markets</div>

            <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflowX: 'auto' }}>
              <div style={{ minWidth: '560px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 70px 60px 70px 120px', gap: '10px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>ID</span><span>Description</span><span>Cat</span><span>YES%</span><span>Vol</span><span>Actions</span>
                </div>
                {filteredMulti.map((m, i) => (
                  <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 70px 60px 70px 120px', gap: '10px', padding: '10px 16px', borderBottom: i < filteredMulti.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#555', fontFamily: 'var(--mono)' }}>#{m.id}</span>
                    <div>
                      <div style={{ fontSize: '12px', color: '#DDD', lineHeight: 1.4, marginBottom: '2px' }}>{m.description}</div>
                      <div style={{ fontSize: '10px', color: '#555' }}>{m.endDate} · {m.endTime}</div>
                    </div>
                    <span><span className={`badge ${CAT_COLOR[m.category] || 'badge-gray'}`}>{m.category}</span></span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--yes-color)', fontFamily: 'var(--mono)' }}>{m.yesProb}%</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{m.volume || '$0'}</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button onClick={() => toggleMarket(m.id)} style={{ padding: '3px 10px', borderRadius: '99px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font)', background: marketEnabled[m.id] !== false ? 'rgba(38,161,123,0.15)' : 'rgba(232,93,93,0.12)', color: marketEnabled[m.id] !== false ? 'var(--yes-color)' : 'var(--no-color)' }}>
                        {marketEnabled[m.id] !== false ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={() => startEdit(m)} style={{ padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MARKET SLIP SETTINGS ── */}
        {tab === 'slip-settings' && (
          <div style={{ maxWidth: '700px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>Market Slip Settings</h2>

            {/* Max markets in slip */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>Max markets per slip</div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input className="input" type="number" min="1" max="10" value={maxSlipSize}
                  onChange={e => setMaxSlipSize(Math.min(10, Math.max(1, +e.target.value)))}
                  style={{ width: '80px', fontSize: '16px', fontWeight: 800, textAlign: 'center' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>markets max (1–10)</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Users cannot add more than this many markets to their slip at once.</p>
            </div>

            {/* Category allow/disallow */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>Category rules for market slip</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(slipCategoryRules).map(([cat, enabled]) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{cat}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>markets</span>
                    </div>
                    <button
                      onClick={() => toggleCategory(cat)}
                      style={{ padding: '5px 16px', borderRadius: '99px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'var(--font)', background: enabled ? 'rgba(38,161,123,0.15)' : 'rgba(232,93,93,0.12)', color: enabled ? 'var(--yes-color)' : 'var(--no-color)', transition: 'all 0.15s' }}
                    >
                      {enabled ? 'Allowed' : 'Blocked'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: '10px', padding: '12px 16px', fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
              💡 Changes apply immediately. Blocked categories prevent users from adding those markets to their slip.
            </div>
          </div>
        )}

        {/* ── IMPORT FROM POLYMARKET ── */}
        {tab === 'import-poly' && (
          <div style={{ maxWidth: '700px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>Import from Polymarket</h2>
              <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>
                Search Polymarket public markets, pick one, edit details, then push to Callit. Saves typing.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                className="input"
                placeholder='Search e.g. "Bitcoin ETF", "World Cup", "Fed rate"...'
                value={polySearch}
                onChange={e => setPolySearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchPolymarket()}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-gold btn-sm"
                onClick={searchPolymarket}
                disabled={polyLoading || !polySearch.trim()}
                style={{ fontWeight: 700, flexShrink: 0 }}
              >
                {polyLoading ? <><span className="spinner" /> Searching...</> : '🔍 Search'}
              </button>
            </div>

            {polyError && (
              <div style={{ background: 'rgba(232,93,93,0.08)', border: '1px solid rgba(232,93,93,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--no-color)' }}>
                {polyError}
              </div>
            )}

            {polyLoading && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#555' }}>
                <span className="spinner" style={{ width: 28, height: 28, display: 'inline-block' }} />
                <p style={{ fontSize: '14px', marginTop: '12px' }}>Loading markets from Polymarket...</p>
              </div>
            )}

            {!polyLoading && polyResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>
                  {polyResults.length} markets — {pushedToCallit.size > 0 ? `${pushedToCallit.size} already on Callit` : 'click any to import'}
                </div>
                {polyResults.map((m, i) => {
                  const alreadyPushed = pushedToCallit.has(m.id)
                  return (
                    <div key={i}
                      style={{ background: '#0D0D0D', border: `1px solid ${alreadyPushed ? 'rgba(38,161,123,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '14px', transition: 'border-color 0.14s', cursor: alreadyPushed ? 'default' : 'pointer', opacity: alreadyPushed ? 0.65 : 1 }}
                      onClick={() => !alreadyPushed && importFromPoly(m)}
                      onMouseEnter={e => { if (!alreadyPushed) e.currentTarget.style.borderColor = 'rgba(232,184,75,0.35)' }}
                      onMouseLeave={e => { if (!alreadyPushed) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <span className={`badge ${m.category === 'Crypto' ? 'badge-gold' : m.category === 'Sports' ? 'badge-green' : m.category === 'Economy' ? 'badge-gray' : 'badge-blue'}`}>{m.category}</span>
                            {alreadyPushed && <span className="badge badge-green">✅ On Callit</span>}
                          </div>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#DDD', lineHeight: 1.5, margin: '0 0 8px' }}>{m.question}</p>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px', color: '#666' }}>
                            {m.endDate && <span>Expires: {new Date(m.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                            {m.volume > 0 && <span>Vol: ${Number(m.volume).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>}
                            <span style={{ color: 'var(--yes-color)', fontWeight: 700 }}>YES {Math.round(parseFloat(m.bestBid || 0.5) * 100)}%</span>
                          </div>
                        </div>
                        {!alreadyPushed ? (
                          <button className="btn btn-gold btn-sm" style={{ fontWeight: 700, flexShrink: 0 }} onClick={e => { e.stopPropagation(); importFromPoly(m) }}>
                            Import →
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--yes-color)', fontWeight: 700, flexShrink: 0 }}>Added ✓</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!polyLoading && polyResults.length === 0 && !polyError && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#555' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                <p style={{ fontSize: '14px' }}>No markets found</p>
              </div>
            )}
          </div>
        )}

        {/* ── CREATE MULTI MARKET ── */}}
        {tab === 'create-multi' && (
          <div style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{editingMarket ? 'Edit Market' : 'Create Multi Market'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => { setTab('all-multi'); setEditingMarket(null); setEditForm({}) }}>← Back</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#CCC', display: 'block', marginBottom: '6px' }}>
                  Market Description <span style={{ color: 'var(--no-color)' }}>*</span>
                </label>
                <textarea className="input" placeholder='e.g. "ETH above $4,000 by Apr 30, 2026 at 11:59 PM UTC"'
                  value={editingMarket ? editForm.description : multiForm.description} onChange={e => editingMarket ? setEF('description', e.target.value) : setMF('description', e.target.value)} rows={3} maxLength={280} />
                <div style={{ fontSize: '11px', color: '#555', marginTop: '4px', textAlign: 'right' }}>{multiForm.description.length}/280</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#CCC', display: 'block', marginBottom: '6px' }}>Category</label>
                  <select className="input" value={editingMarket ? editForm.category : multiForm.category} onChange={e => editingMarket ? setEF('category', e.target.value) : setMF('category', e.target.value)}>
                    {['Crypto', 'Sports', 'Politics', 'Economy', 'Social Media', 'Tech'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#CCC', display: 'block', marginBottom: '6px' }}>
                    YES Probability (%) <span style={{ color: 'var(--no-color)' }}>*</span>
                  </label>
                  <input className="input" type="number" min="1" max="99" placeholder="e.g. 65"
                    value={editingMarket ? editForm.yesProb : multiForm.yesProb} onChange={e => editingMarket ? setEF('yesProb', e.target.value) : setMF('yesProb', e.target.value)} />
                  {multiForm.yesProb && (
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                      YES: {multiForm.yesProb}% · NO: {100 - +multiForm.yesProb}%
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#CCC', display: 'block', marginBottom: '6px' }}>
                    Expiry Date <span style={{ color: 'var(--no-color)' }}>*</span>
                  </label>
                  <input className="input" type="date" min={new Date().toISOString().split('T')[0]}
                    value={multiForm.endDate} onChange={e => setMF('endDate', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#CCC', display: 'block', marginBottom: '6px' }}>Expiry Time (UTC)</label>
                  <input className="input" type="time" value={multiForm.endTime} onChange={e => setMF('endTime', e.target.value)} />
                </div>
              </div>

              {multiForm.description && multiForm.endDate && (
                <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preview</div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#FFF', marginBottom: '10px', lineHeight: 1.5 }}>{multiForm.description}</p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--yes-color)', fontWeight: 700 }}>YES {multiForm.yesProb}%</span>
                    <span style={{ color: 'var(--no-color)', fontWeight: 700 }}>NO {100 - +multiForm.yesProb}%</span>
                    <span style={{ color: '#666' }}>Expires {new Date(multiForm.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {multiForm.endTime} UTC</span>
                    <span className={`badge ${CAT_COLOR[multiForm.category] || 'badge-gray'}`}>{multiForm.category}</span>
                  </div>
                </div>
              )}

              <button className="btn btn-gold btn-lg"
                onClick={editingMarket ? handleSaveEdit : handleCreateMulti}
                disabled={creating || (!editingMarket && (!multiForm.description.trim() || !multiForm.endDate))}
                style={{ width: '100%', fontWeight: 700 }}>
                {creating ? <><span className="spinner" /> Saving...</> : editingMarket ? 'Save Changes' : 'Create Multi Market'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
