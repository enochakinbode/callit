import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="page">
      <section style={{ padding: 'clamp(32px,6vw,64px) 20px 48px', textAlign: 'center', maxWidth: '780px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)', marginBottom: '20px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Powered by GenLayer</span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px,6vw,60px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '18px', lineHeight: 1.08, color: 'var(--text)' }}>
          Where Calls Meet<br />
          <span style={{ color: 'var(--gold)' }}>Clearer Decisions.</span>
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: 1.75, margin: '0 auto 36px', maxWidth: '560px' }}>
          The current homepage is focused on testing market creation. Build the JSON payload here, then use GenLayer Studio to try the contract flow while the wider infrastructure catches up.
        </p>
      </section>

      <section style={{ padding: '0 20px 80px' }}>
        <div className="container" style={{ maxWidth: '920px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '40px clamp(24px, 5vw, 44px)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', justifyItems: 'center', textAlign: 'center' }}>
              <div style={{ maxWidth: '620px' }}>
                <div style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '8px' }}>
                  What Happens Here
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text)', marginBottom: '10px' }}>
                  Generate The Payload First
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.75 }}>
                  Enter the statement, amount, cutoff time, and supporting sources. GenLayer is the decision layer here: it approves whether a market is valid first, then handles the market decision flow after submission.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Link to="/p2p" className="btn btn-gold">Proceed to test creating a market</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
