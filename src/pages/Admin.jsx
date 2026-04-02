import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useToast } from '../context/ToastContext'
import { CHALLENGE_BOND_RULE, GENLAYER_DISPUTE_WINDOW_HOURS, MARKET_QUALITY_BOND_USDC, SOURCE_REGISTRY } from '../data/marketArchitecture'

const ADMIN_WALLET = '0x3dc5b334EA7a6a33da61F950bBEfaC615cF1A55b'

const INITIAL_RELAYER_STATUS = [
  { key: 'approval', label: 'Approval relay', status: 'Healthy', detail: 'Registers GenLayer-approved markets in the Base vault.' },
  { key: 'settlement', label: 'Settlement relay', status: 'Healthy', detail: 'Mirrors finalized GenLayer outcomes into the Base vault.' },
  { key: 'refund', label: 'Refund relay', status: 'Healthy', detail: 'Handles unresolvable market refunds and safety unwind coordination.' },
]

const INITIAL_SAFETY_ACTIONS = [
  'Funding mismatch detected',
  'Vault accounting inconsistency',
  'Relay outage beyond timeout',
  'Market stuck in protocol error state',
  'Explicit unresolvable result from GenLayer',
]

function Section({ title, desc, children }) {
  return (
    <section style={{ marginBottom: '28px' }}>
      <div style={{ marginBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', marginBottom: '4px' }}>{title}</h2>
        {desc && <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.6, margin: 0 }}>{desc}</p>}
      </div>
      {children}
    </section>
  )
}

export default function Admin() {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { addToast } = useToast()
  const [sourceSearch, setSourceSearch] = useState('')
  const [disabledCategories, setDisabledCategories] = useState([])
  const [paused, setPaused] = useState(false)
  const [relayers, setRelayers] = useState(INITIAL_RELAYER_STATUS)

  const isAdmin = isConnected && address?.toLowerCase() === ADMIN_WALLET.toLowerCase()

  const filteredSources = useMemo(() => {
    const needle = sourceSearch.trim().toLowerCase()
    return Object.entries(SOURCE_REGISTRY).map(([category, sources]) => ({
      category,
      sources: sources.filter(source => {
        if (!needle) return true
        return `${source.name} ${source.note}`.toLowerCase().includes(needle)
      }),
    })).filter(entry => entry.sources.length > 0)
  }, [sourceSearch])

  const toggleCategory = (category) => {
    if (!isAdmin) return openConnectModal?.()
    setDisabledCategories(prev => prev.includes(category) ? prev.filter(item => item !== category) : [...prev, category])
  }

  const togglePause = () => {
    if (!isAdmin) return openConnectModal?.()
    setPaused(prev => !prev)
    addToast(paused ? 'Protocol unpaused for new market activity' : 'Protocol paused. Safety actions only.', 'success')
  }

  const bumpRelayer = (key) => {
    if (!isAdmin) return openConnectModal?.()
    setRelayers(prev => prev.map(relayer => (
      relayer.key === key ? { ...relayer, status: relayer.status === 'Healthy' ? 'Rotating' : 'Healthy' } : relayer
    )))
    addToast('Relayer key rotation queued in the admin console prototype', 'success')
  }

  if (!isAdmin) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: '60px', paddingBottom: '70px', maxWidth: '760px' }}>
          <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>Admin operations are wallet-gated</div>
            <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.7, marginBottom: '18px' }}>
              This panel no longer resolves winners. It only manages sources, templates, relayers, pauses, and safety unwinds under explicit rules.
            </p>
            <button className="btn btn-gold" onClick={openConnectModal}>Connect Admin Wallet</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px', maxWidth: '1020px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>Admin Ops</h1>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.6 }}>
            Admin may manage sources, templates, relayers, pauses, and safety unwinds. Admin may not choose winners or override outcomes.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '28px' }}>
          {[
            { label: 'Dispute window', value: `${GENLAYER_DISPUTE_WINDOW_HOURS} hour`, icon: '⏳' },
            { label: 'Challenge rule', value: CHALLENGE_BOND_RULE, icon: '⚖️' },
            { label: 'Quality bond', value: `$${MARKET_QUALITY_BOND_USDC}`, icon: '🧾' },
            { label: 'Protocol pause', value: paused ? 'Active' : 'Inactive', icon: '🛑' },
          ].map(card => (
            <div key={card.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontSize: '22px', marginBottom: '8px' }}>{card.icon}</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gold)', marginBottom: '4px' }}>{card.value}</div>
              <div style={{ fontSize: '12px', color: '#777' }}>{card.label}</div>
            </div>
          ))}
        </div>

        <Section title="Source registry" desc="Primary sources are frozen at creation time. User-submitted sources are supplemental only and can never replace agreeing primary sources.">
          <div style={{ marginBottom: '12px' }}>
            <input
              className="input"
              placeholder="Search source registry..."
              value={sourceSearch}
              onChange={event => setSourceSearch(event.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            {filteredSources.map(entry => (
              <div key={entry.category} style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>{entry.category}</div>
                  <button className={`btn btn-sm ${disabledCategories.includes(entry.category) ? 'btn-danger' : 'btn-ghost'}`} onClick={() => toggleCategory(entry.category)}>
                    {disabledCategories.includes(entry.category) ? 'Disabled' : 'Enabled'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {entry.sources.map(source => (
                    <div key={source.id} style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>{source.name}</span>
                        <span className="badge badge-blue">{source.role.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#777', lineHeight: 1.55 }}>{source.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Relayer health" desc="Relayers are couriers only. They can register approved markets and finalized settlements, but they cannot decide outcomes or withdraw arbitrary funds.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {relayers.map(relayer => (
              <div key={relayer.key} style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>{relayer.label}</div>
                  <span className={`badge ${relayer.status === 'Healthy' ? 'badge-green' : 'badge-gold'}`}>{relayer.status}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#777', lineHeight: 1.6, marginBottom: '12px' }}>{relayer.detail}</div>
                <button className="btn btn-outline btn-sm" onClick={() => bumpRelayer(relayer.key)}>Rotate Key</button>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Protocol controls" desc="Safety actions are narrow by design. Admin can stop new activity and unwind only under explicit operational failure states.">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFF', marginBottom: '10px' }}>Allowed safety unwind triggers</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {INITIAL_SAFETY_ACTIONS.map(item => (
                  <div key={item} style={{ fontSize: '12px', color: '#777', lineHeight: 1.6, padding: '8px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFF', marginBottom: '10px' }}>Pause control</div>
              <div style={{ fontSize: '12px', color: '#777', lineHeight: 1.6, marginBottom: '14px' }}>
                Pause stops new market activity so safety actions can be executed without changing already-finalized outcomes.
              </div>
              <button className={`btn btn-lg ${paused ? 'btn-danger' : 'btn-gold'}`} onClick={togglePause} style={{ width: '100%' }}>
                {paused ? 'Unpause Protocol' : 'Pause Protocol'}
              </button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
