import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useToast } from '../context/ToastContext'
import { MIN_STAKE_USDC, MAX_STAKE_USDC, ACTIVE_CHAIN } from '../lib/config'

const ORACLE_OPTIONS = [
  { label: 'ETH/USD', value: ACTIVE_CHAIN.priceFeeds.ETH },
  { label: 'BTC/USD', value: ACTIVE_CHAIN.priceFeeds.BTC },
  { label: 'No oracle (manual)', value: '0x0000000000000000000000000000000000000000' },
]

export default function CreateBetModal({ onClose, onSuccess }) {
  const { address } = useAccount()
  const { addToast } = useToast()

  const [form, setForm] = useState({
    description: '',
    stake: '',
    resDate: '',
    resTime: '',
    resType: 'manual', // 'manual' | 'chainlink'
    oracle: ORACLE_OPTIONS[2].value,
    targetPrice: '',
    creatorAbove: true,
    token: 'USDC',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  // Sanitize text input — strip any HTML/script tags users might inject
  const sanitize = (str) => str.replace(/<[^>]*>/g, '').slice(0, 500)
  const set = (k, v) => setForm(p => ({ ...p, [k]: typeof v === 'string' ? sanitize(v) : v }))

  const validate = () => {
    const e = {}
    if (!form.description.trim()) e.description = 'Required'
    if (!form.stake || isNaN(form.stake) || +form.stake < MIN_STAKE_USDC) e.stake = `Min ${MIN_STAKE_USDC} USDC`
    if (+form.stake > MAX_STAKE_USDC) e.stake = `Max ${MAX_STAKE_USDC.toLocaleString()} USDC`
    if (!form.resDate) e.resDate = 'Required'
    if (!form.resTime) e.resTime = 'Required'
    if (form.resType === 'chainlink' && form.oracle === ORACLE_OPTIONS[2].value) e.oracle = 'Select an oracle'
    if (form.resType === 'chainlink' && !form.targetPrice) e.targetPrice = 'Required for Chainlink'
    const resDateTime = new Date(`${form.resDate}T${form.resTime}`)
    if (resDateTime <= new Date()) e.resDate = 'Must be in the future'
    return e
  }

  const handleSubmit = async () => {
    if (loading) return // prevent double-submit
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    try {
      // TODO: wire to contract
      // const resolutionTime = BigInt(Math.floor(new Date(`${form.resDate}T${form.resTime}`).getTime() / 1000))
      // const creatorStake = parseUSDC(form.stake)
      // await contract.createBet(...)
      await new Promise(r => setTimeout(r, 1200)) // simulate
      addToast('Market created! Waiting for acceptor.', 'success')
      onSuccess?.()
    } catch (err) {
      addToast(err.message || 'Transaction failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const Err = ({ field }) => errors[field] ? (
    <span style={{ fontSize: '11px', color: 'var(--no-color)', marginTop: '4px', display: 'block' }}>{errors[field]}</span>
  ) : null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Create P2P Markets</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Fee notice */}
        <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#888' }}>
          💡 Winner takes <strong style={{ color: 'var(--gold)' }}>98%</strong> of the pool. 2% fee to platform.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Description */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#CCC', display: 'block', marginBottom: '6px' }}>
              Market Statement <span style={{ color: 'var(--no-color)' }}>*</span>
            </label>
            <textarea
              className="input"
              placeholder='e.g. "ETH will be above $4,000 by April 30, 2026"'
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
            />
            <Err field="description" />
          </div>

          {/* Stake + Token */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#CCC', display: 'block', marginBottom: '6px' }}>
                Your Stake (YES side) <span style={{ color: 'var(--no-color)' }}>*</span>
              </label>
              <input
                className="input"
                type="number"
                placeholder="e.g. 65"
                min={MIN_STAKE_USDC}
                max={MAX_STAKE_USDC}
                value={form.stake}
                onChange={e => set('stake', e.target.value)}
              />
              <Err field="stake" />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#CCC', display: 'block', marginBottom: '6px' }}>Token</label>
              <select className="input" value={form.token} onChange={e => set('token', e.target.value)} style={{ height: '42px' }}>
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
              </select>
            </div>
          </div>

          {/* Resolution Date + Time */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#CCC', display: 'block', marginBottom: '6px' }}>
              Resolution Date & Time <span style={{ color: 'var(--no-color)' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              <div>
                <input type="date" className="input" value={form.resDate} onChange={e => set('resDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <input type="time" className="input" value={form.resTime} onChange={e => set('resTime', e.target.value)} />
              </div>
            </div>
            <Err field="resDate" />
          </div>

          {/* Resolution Type */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#CCC', display: 'block', marginBottom: '8px' }}>
              Resolution Type <span style={{ color: 'var(--no-color)' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              {[
                { val: 'manual', icon: '🛡', label: 'Manual', sub: 'Admin resolves. 24h delay after expiry.', badge: 'MANUAL' },
                { val: 'chainlink', icon: '⚡', label: 'Chainlink', sub: 'Auto-resolves via price oracle.', badge: 'AUTO' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => set('resType', opt.val)}
                  style={{
                    background: form.resType === opt.val ? 'rgba(232,184,75,0.08)' : 'var(--bg-input)',
                    border: `1px solid ${form.resType === opt.val ? 'var(--gold)' : 'var(--border)'}`,
                    borderRadius: '10px', padding: '14px', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.16s ease', fontFamily: 'var(--font)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span>{opt.icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: form.resType === opt.val ? 'var(--gold)' : '#CCC' }}>{opt.label}</span>
                    <span className={`badge ${opt.val === 'chainlink' ? 'badge-auto' : 'badge-manual'}`} style={{ marginLeft: 'auto' }}>{opt.badge}</span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#666', lineHeight: 1.4 }}>{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Chainlink oracle options */}
          {form.resType === 'chainlink' && (
            <div style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: '10px', padding: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#CCC', display: 'block', marginBottom: '8px' }}>
                Price Feed Oracle
              </label>
              <select className="input" value={form.oracle} onChange={e => set('oracle', e.target.value)} style={{ marginBottom: '10px' }}>
                {ORACLE_OPTIONS.slice(0, 2).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <Err field="oracle" />

              <label style={{ fontSize: '13px', fontWeight: 600, color: '#CCC', display: 'block', marginBottom: '6px' }}>
                Target Price (USD)
              </label>
              <input className="input" type="number" placeholder="e.g. 4000" value={form.targetPrice} onChange={e => set('targetPrice', e.target.value)} />
              <Err field="targetPrice" />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginTop: '10px' }}>
                {['above', 'below'].map(dir => (
                  <button
                    key={dir}
                    onClick={() => set('creatorAbove', dir === 'above')}
                    className={`btn ${(dir === 'above' ? form.creatorAbove : !form.creatorAbove) ? 'btn-gold' : 'btn-ghost'} btn-sm`}
                  >
                    {dir === 'above' ? '↑ Price goes ABOVE' : '↓ Price goes BELOW'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {form.stake && form.description && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: '#888' }}>Your stake (YES)</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--yes-color)', fontFamily: 'var(--mono)' }}>${form.stake} {form.token}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: '#888' }}>Acceptor matches</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--no-color)', fontFamily: 'var(--mono)' }}>${form.stake} {form.token}</span>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#888' }}>You win (if YES)</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>
                  ${(+form.stake * 2 * 0.98).toFixed(2)} {form.token}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>50/50 odds · 98% payout · 2% platform fee</div>
            </div>
          )}

          {/* Submit */}
          <button className="btn btn-gold btn-lg" onClick={handleSubmit} disabled={loading} style={{ width: '100%' }}>
            {loading ? <><span className="spinner" /> Creating Market...</> : '+ Create Market'}
          </button>
        </div>
      </div>
    </div>
  )
}
