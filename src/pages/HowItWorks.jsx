import { Link } from 'react-router-dom'

const Section = ({ title, children }) => (
  <div style={{ marginBottom: '52px' }}>
    <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px', color: '#FFFFFF' }}>{title}</h2>
    {children}
  </div>
)

const Step = ({ n, title, desc, note, color = 'var(--gold)' }) => (
  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
    <div style={{
      width: 36, height: 36, borderRadius: '50%', background: `${color}18`,
      border: `1px solid ${color}40`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color, fontWeight: 800, fontSize: '14px', flexShrink: 0,
    }}>{n}</div>
    <div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '13px', color: '#777', lineHeight: 1.65 }}>{desc}</div>
      {note && (
        <div style={{ fontSize: '12px', color: '#555', marginTop: '6px', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: `2px solid ${color}60` }}>
          {note}
        </div>
      )}
    </div>
  </div>
)

const InfoCard = ({ icon, title, desc }) => (
  <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '20px' }}>
    <div style={{ fontSize: '28px', marginBottom: '12px' }}>{icon}</div>
    <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>{title}</div>
    <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.65 }}>{desc}</div>
  </div>
)

export default function HowItWorks() {
  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '40px', paddingBottom: '72px', maxWidth: '800px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '10px', letterSpacing: '-0.03em' }}>How Callit Works</h1>
          <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.7 }}>
            Prediction markets on Base. You set the odds. Take a side. Everything settled on-chain.
          </p>
        </div>

        {/* Core concepts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '52px' }}>
          <InfoCard icon="⚔️" title="P2P Markets" desc="Create a prediction. Someone takes the other side. Equal stakes. Winner takes 98%." />
          <InfoCard icon="🎯" title="Multi Markets" desc="Pick 1–10 markets. Combine into one accumulator. All must win for payout." />
          <InfoCard icon="⛓" title="On-Chain" desc="Smart contract holds all funds. No custody. No admin can steal. Code is law." />
          <InfoCard icon="💰" title="2% Fee" desc="Winner pays 2% to the platform. 98% goes to the winner. No other fees." />
        </div>

        {/* P2P */}
        <Section title="⚔️ P2P Markets — Step by Step">
          <Step n="1" title="Creator creates a market"
            desc='Write a clear statement like "ETH will enter $4,000 by April 30, 2026 at 2:00 PM UTC." Stake USDC on your position. Set resolution type — Auto (Chainlink oracle) or Manual (admin).'
            note="Every market shows exact date and time of expiry. No ambiguity at settlement."
          />
          <Step n="2" title="Acceptor takes the opposite side"
            desc="The card shows the acceptor's counter-statement clearly. If creator says ETH WILL enter $4k — acceptor sees: you are betting ETH will NOT enter $4k. One button only: CALL IT."
            note="Acceptor stakes the exact same amount as creator. Pool = 2× creator stake. 50/50 always."
          />
          <Step n="3" title="How odds work — ¢ pricing"
            desc="Odds are shown in cents (¢). 50¢ YES means you pay 50 cents per $1 payout — which equals a 50% probability. Since P2P stakes are always equal, both sides are always 50¢."
          />
          <Step n="4" title="Resolution"
            desc="Auto markets (⚡) resolve via Chainlink oracle the moment the expiry date arrives. Manual markets (🛡) are resolved by admin after verifying results from official sources."
            note="Manual resolution notice: Admin resolves within 24 hours after market expiry date and time."
          />
          <Step n="5" title="Payout"
            desc="Winner receives 98% of the total pool. 2% goes to the platform automatically. No manual claiming — smart contract handles it."
          />
        </Section>

        {/* Multi */}
        <Section title="🎯 Multi Markets — Step by Step">
          <Step n="1" title="Browse admin-created markets"
            desc="Callit admins create curated markets across Crypto, Politics, Sports, Economy, Social Media, and Tech. Every market shows exact expiry date and time in your local timezone."
          />
          <Step n="2" title="Select YES or NO on each market"
            desc="Pick between 1 and 10 markets. Choose YES or NO for each. Current probability shown in ¢. Click 'show chart' on any card to see the live probability movement."
          />
          <Step n="3" title="Combined odds calculated automatically"
            desc="All individual probabilities multiply together. Example: 65¢ × 72¢ × 55¢ = 25.7¢ combined. The lower the combined odds, the bigger your potential payout."
          />
          <Step n="4" title="Stake and confirm in wallet"
            desc="Enter your USDC stake. Potential payout shown in real time. Click CALL IT — your wallet asks for signature confirmation. Funds deducted only after you confirm."
            note="You can browse markets and calculate potential payouts without connecting a wallet. Connect only when ready to bet."
          />
          <Step n="5" title="Win or lose"
            desc="Your multi bet wins only if ALL selections are correct. One wrong pick and the entire bet loses. That's what makes the multiplier so high."
          />
        </Section>

        {/* Resolution types */}
        <Section title="⚡ Resolution Types">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {[
              {
                badge: '⚡ AUTO', color: '#60a5fa', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.18)',
                title: 'Chainlink Oracle',
                points: ['Used for crypto price markets', 'Resolves automatically at expiry time', 'No human needed', 'Cannot be manipulated', 'Instant payout after resolution'],
              },
              {
                badge: '🛡 MANUAL', color: '#fbbf24', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.18)',
                title: 'Admin Resolution',
                points: ['Used for sports, politics, economy', 'Admin verifies from official sources', 'Resolved within 24h of expiry', 'Result visible in admin panel', 'Funds released after verification'],
              },
            ].map(card => (
              <div key={card.badge} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '99px', background: card.bg, border: `1px solid ${card.border}`, marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: card.color }}>{card.badge}</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', marginBottom: '10px' }}>{card.title}</div>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {card.points.map((p, i) => (
                    <li key={i} style={{ fontSize: '12px', color: '#777', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <span style={{ color: card.color, flexShrink: 0 }}>·</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* ── TEMPO SECTION ── */}
        <Section title="⚡ Tempo — Instant Settlement (Coming Soon)">
          <div style={{
            background: 'linear-gradient(135deg, rgba(232,184,75,0.06) 0%, rgba(96,165,250,0.06) 100%)',
            border: '1px solid rgba(232,184,75,0.2)',
            borderRadius: '16px', padding: '24px', marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(232,184,75,0.12)', border: '1px solid rgba(232,184,75,0.25)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 800, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ⚡ TEMPO MAINNET — LIVE
              </div>
              <div style={{ fontSize: '12px', color: '#555' }}>Built by Paradigm + Stripe</div>
            </div>
            <p style={{ fontSize: '14px', color: '#999', lineHeight: 1.7, marginBottom: '0' }}>
              Tempo is a payment-optimized blockchain designed for instant settlement, predictable low fees, and AI agent support via the Machine Payments Protocol (MPP). Callit is upgrading to Tempo so every market settles automatically — no human cashier, no delay.
            </p>
          </div>

          {/* How it works today vs with Tempo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Today (Base)</div>
              {[
                'Chelsea game ends',
                'Someone manually triggers settlement',
                'Winner claims their money',
                'Done — humans involved at every step',
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#555', fontWeight: 800, flexShrink: 0, fontSize: '13px' }}>{i + 1}.</span>
                  <span style={{ fontSize: '13px', color: '#777', lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(232,184,75,0.04)', border: '1px solid rgba(232,184,75,0.18)', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>With Tempo + MPP</div>
              {[
                'Chelsea game ends',
                'AI agent reads result in real time',
                'Agent triggers settlement instantly',
                'Winner already has money in wallet',
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 800, flexShrink: 0, fontSize: '13px' }}>{i + 1}.</span>
                  <span style={{ fontSize: '13px', color: '#CCC', lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Agent flow */}
          <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#CCC', marginBottom: '14px' }}>The full automated flow</div>
            {[
              { icon: '🤖', label: 'AI Agent watches results', desc: 'Sports API (API-Football) feeds live match data. Chainlink handles crypto prices. UMA Protocol handles politics and economy outcomes.' },
              { icon: '✅', label: 'Result confirmed', desc: 'The moment Chelsea wins is confirmed by the oracle, the agent immediately calls resolveMarket() on the smart contract.' },
              { icon: '⚡', label: 'Tempo settles everything', desc: 'Tempo settles all 500 active markets simultaneously. No gas spikes. Predictable cost. Instant payout to every winner.' },
              { icon: '💰', label: 'Money in your wallet', desc: 'You don\'t click anything. You don\'t wait. You just check your wallet and the money is already there.' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: '14px', marginBottom: i < 3 ? '16px' : 0, paddingBottom: i < 3 ? '16px' : 0, borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ fontSize: '22px', flexShrink: 0, width: 36, textAlign: 'center' }}>{row.icon}</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>{row.label}</div>
                  <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>{row.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Settlement stack */}
          <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#CCC', marginBottom: '14px' }}>Resolution sources per market type</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              {[
                { type: 'Crypto', source: 'Chainlink Oracle', icon: '⛓', color: 'var(--gold)' },
                { type: 'Sports', source: 'API-Football / BallDontLie', icon: '⚽', color: 'var(--yes-color)' },
                { type: 'Politics', source: 'UMA Protocol Oracle', icon: '🏛', color: '#60a5fa' },
                { type: 'Social Media', source: 'AI Agent + API', icon: '📱', color: '#a78bfa' },
              ].map(item => (
                <div key={item.type} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '18px', marginBottom: '8px' }}>{item.icon}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: item.color, marginBottom: '4px' }}>{item.type}</div>
                  <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.4 }}>{item.source}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Fee structure */}
        <Section title="💰 Fee Structure">
          <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
            {[
              { label: 'Platform fee', value: '2%', note: 'Deducted from winner\'s payout only' },
              { label: 'Loser pays', value: '0%', note: 'Losing stake goes entirely to the winner' },
              { label: 'Gas fees', value: 'Base gas', note: 'Standard Base network fee, usually below $0.01' },
              { label: 'With Tempo (coming)', value: 'Fixed + stable', note: 'No gas spikes — predictable fee every time' },
            ].map((row, i, arr) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#DDD' }}>{row.label}</div>
                  <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>{row.note}</div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{row.value}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '32px', background: 'rgba(232,184,75,0.04)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '10px' }}>Ready to make your call?</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>Connect your wallet and start betting on Base.</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/p2p" className="btn btn-gold btn-lg">+ Create P2P Market</Link>
            <Link to="/multi" className="btn btn-outline btn-lg">Browse Multi Markets</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
