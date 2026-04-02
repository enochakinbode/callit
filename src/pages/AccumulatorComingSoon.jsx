import { Link } from 'react-router-dom'

export default function AccumulatorComingSoon() {
  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '48px', paddingBottom: '72px', maxWidth: '760px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)', marginBottom: '18px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Coming Soon</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text)', marginBottom: '10px', letterSpacing: '-0.03em' }}>Accumulator Markets</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.75, maxWidth: '560px', margin: '0 auto' }}>
            P2P markets now flow through the relayer, GenLayer, and the Base vault. Accumulator markets will arrive after that P2P path is fully live end-to-end.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {[
            {
              title: 'What is live now',
              body: 'P2P markets. The relayer submits the request to GenLayer, GenLayer admits the market and chooses sources, and the market gets a real market ID.',
            },
            {
              title: 'What is next',
              body: 'Accumulator admission, leg linking, Base funding, and final settlement rules for multi-leg outcomes.',
            },
            {
              title: 'Why it is delayed',
              body: 'Accumulators need their own funding, refund, and settlement rules. The UI should not pretend that path already exists.',
            },
          ].map(card => (
            <div key={card.title} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>{card.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7 }}>{card.body}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/markets" className="btn btn-gold btn-lg">Browse P2P Markets</Link>
          <Link to="/how-it-works" className="btn btn-outline btn-lg">See How It Works</Link>
        </div>
      </div>
    </div>
  )
}
