import { Link } from 'react-router-dom'

export default function Markets() {
  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '48px', paddingBottom: '72px', maxWidth: '760px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)', marginBottom: '18px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Coming Soon</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text)', marginBottom: '10px', letterSpacing: '-0.03em' }}>P2P Markets</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.75, maxWidth: '560px', margin: '0 auto' }}>
            The live markets directory is not part of the current test flow. For now, the active path is creating the payload in the UI and testing the contract manually in GenLayer Studio.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {[
            {
              title: 'What is active now',
              body: 'A temporary builder that generates the JSON payload for a YES-side P2P market.',
            },
            {
              title: 'What is waiting',
              body: 'The full market list, live submissions, and the broader on-app browsing experience.',
            },
            {
              title: 'Why this page is paused',
              body: 'The product is centered on contract testing for now, so showing a fake or static market browser would be misleading.',
            },
          ].map(card => (
            <div key={card.title} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>{card.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7 }}>{card.body}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/p2p" className="btn btn-gold btn-lg">Open P2P Builder</Link>
          <Link to="/how-it-works" className="btn btn-outline btn-lg">See How It Works</Link>
        </div>
      </div>
    </div>
  )
}
