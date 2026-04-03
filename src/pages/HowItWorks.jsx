import { Link } from 'react-router-dom'
import {
  CHALLENGE_BOND_RULE,
  GENLAYER_DISPUTE_WINDOW_HOURS,
  MARKET_QUALITY_BOND_USDC,
  PLATFORM_FEE_PERCENT,
  SOURCE_REGISTRY,
} from '../data/marketArchitecture'

const Section = ({ title, children }) => (
  <section style={{ marginBottom: '40px' }}>
    <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '14px', color: '#FFF' }}>{title}</h2>
    {children}
  </section>
)

const Card = ({ title, body, badge, tone = 'default' }) => (
  <div style={{
    background: tone === 'genlayer' ? 'rgba(96,165,250,0.08)' : '#0D0D0D',
    border: tone === 'genlayer' ? '1px solid rgba(96,165,250,0.22)' : '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px',
    padding: '18px',
  }}>
    {badge && (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '99px',
        background: tone === 'genlayer' ? 'rgba(96,165,250,0.12)' : 'rgba(232,184,75,0.08)',
        border: tone === 'genlayer' ? '1px solid rgba(96,165,250,0.26)' : '1px solid rgba(232,184,75,0.18)',
        marginBottom: '10px',
      }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: tone === 'genlayer' ? '#60a5fa' : 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{badge}</span>
      </div>
    )}
    <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFF', marginBottom: '8px' }}>{title}</div>
    <div style={{ fontSize: '13px', color: tone === 'genlayer' ? '#c7dbfb' : '#777', lineHeight: 1.65 }}>{body}</div>
  </div>
)

const Step = ({ n, title, body }) => (
  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '18px' }}>
    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(232,184,75,0.10)', border: '1px solid rgba(232,184,75,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>
      {n}
    </div>
    <div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFF', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '13px', color: '#777', lineHeight: 1.65 }}>{body}</div>
    </div>
  </div>
)

export default function HowItWorks() {
  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
        <div style={{ marginBottom: '34px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '10px', letterSpacing: '-0.03em' }}>How Callit Works</h1>
          <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.7 }}>
            Callit is built so the part that decides whether a market is valid is separate from the part that holds user funds. When you create a P2P market, you submit the statement, deadline, and supporting sources. The relayer passes that request into GenLayer, and GenLayer acts as the decision layer: it decides whether the market is clear enough to approve, chooses the right source set, and later resolves the outcome. Base then acts as the money layer where USDC is deposited, matched, and paid out after finality.
          </p>
        </div>

        <Section title="Core split">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <Card
              badge="Relayer"
              title="Submission layer"
              body="The UI sends the market draft to the relayer. The relayer forwards it into GenLayer, receives the approved market response, registers the Base-side market when ready, and returns the market IDs back to the user."
            />
            <Card
              badge="GenLayer"
              title="Decision layer"
              body="Approves market definitions before any money moves, makes sure only valid markets are created, chooses the category and source set, resolves outcomes from evidence, and opens the dispute window."
              tone="genlayer"
            />
            <Card
              badge="Base"
              title="Money layer"
              body="Stores funds in a shared USDC vault with per-market accounting. Base never interprets evidence; it only pays or refunds after finalized settlement instructions."
            />
          </div>
        </Section>

        <Section title="P2P market flow">
          <Step n="1" title="Draft the market" body="The creator writes the binary statement, sets the cutoff time, and optionally adds supporting links." />
          <Step n="2" title="Submit to the relayer" body="The UI sends the request to the relayer. The relayer is the service that submits the market for review, receives the result, and handles registration." />
          <Step n="3" title="GenLayer admission" body="GenLayer checks that the market is clear, verifiable, and supported before it can exist in the system at all. It approves only valid markets, chooses the category, template, and approved primary sources, then returns a market ID and opens the path into Base." />
          <Step n="4" title="Base funding" body="Once admitted and registered on Base, the creator approves USDC and funds the market in the vault. Funds stay on Base for the full life of the market." />
          <Step n="5" title="Resolution and challenge" body={`GenLayer resolves the market from frozen primary sources and supporting evidence, then opens a ${GENLAYER_DISPUTE_WINDOW_HOURS} hour challenge window before final Base settlement.`} />
          <Step n="6" title="Settlement" body={`If the result survives appeals, the Base vault pays the winner and keeps a ${PLATFORM_FEE_PERCENT}% winner fee. If the market is unresolvable, the vault refunds both sides.`} />
        </Section>

        <Section title="Rules that matter">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <Card
              title="Strict templates only"
              body="Launch supports markets tied to exact thresholds, official results, official actions, or official releases. Opinion-style or subjective markets are rejected."
            />
            <Card
              title="Primary sources are frozen"
              body="GenLayer chooses the platform-approved primary sources and freezes them into the market definition. Creator-added sources are supplemental only and can support evidence, but cannot override agreeing primary sources."
              tone="genlayer"
            />
            <Card
              title="Refund on uncertainty"
              body={`If approved primary sources conflict or confidence is too weak, the market becomes unresolvable and user stakes are refunded. Creator quality bond default: $${MARKET_QUALITY_BOND_USDC}.`}
            />
            <Card
              title="Open challenges"
              body={`Anyone can challenge within the dispute window by posting a bond. Default challenge rule: ${CHALLENGE_BOND_RULE}. Appeals use GenLayer's native process.`}
            />
          </div>
        </Section>

        <Section title="Launch source registry">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
            {Object.entries(SOURCE_REGISTRY).map(([category, sources]) => (
              <div key={category} style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', marginBottom: '8px' }}>{category}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {sources.map(source => (
                    <div key={source.id} style={{ fontSize: '12px', color: '#777', lineHeight: 1.5 }}>
                      <span style={{ color: '#FFF', fontWeight: 600 }}>{source.name}</span>
                      <span> · {source.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="What Is Not Live Yet">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <Card
              title="Accumulator markets"
              body="Accumulators are not live in the current UI. They are being held back until the relayer, GenLayer, and Base vault flow is complete for P2P markets."
            />
            <Card
              title="Direct user-to-GenLayer calls"
              body="The user-facing app does not call GenLayer directly. The relayer is the server layer that submits and registers markets."
            />
          </div>
        </Section>

        <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(232,184,75,0.04)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '10px' }}>Build against the new flow</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Markets are no longer “creator decides, admin verifies.” GenLayer is the decision layer that approves valid market creation first, resolves the market, and protects the path into final settlement on Base.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/p2p" className="btn btn-gold btn-lg">Open P2P Builder</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
