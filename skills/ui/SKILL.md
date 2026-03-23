# Callit UI Skill

## Card Design Rules
Every P2P BetCard must follow this exact layout (matches approved screenshot):
1. Badges row: category + P2P + AUTO/MANUAL + YOU (if creator)
2. Market description — large, bold, white
3. YES Xc / NO Xc — large prices in green/red
4. Green/red probability bar (thick, 7px)
5. POOL box + EXPIRES box (2-column grid)
6. Status + ▲▼ live movement indicator
7. CALL IT button (full width, YES=green, NO=red)

## AcceptBetModal Flow
When user clicks CALL IT:
1. Creator says (neutral box)
2. YOUR POSITION (red=NO / green=YES counter-statement)
3. Suspicious Transaction warning (yellow box)
4. Live Probability Chart (Polymarket blue, 1H/4H/1D/1W/1M/ALL)
5. Stake Summary (you stake / creator staked / total pool / you win if)
6. Manual resolution warning (if applicable)
7. Staker Discussion chat (private between creator + acceptor only)
8. Approve USDC → Confirm Bet progress steps
9. Confirm Stake button

## Multi Market Card
- YES/NO buttons directly on card (no expand needed for selection)
- "📊 View Chart & Details" button opens MarketDetailModal
- Bet slip accumulates on the right (desktop) / below (mobile)
- Min 1 market, max 10 markets

## Light Mode
- Always use CSS variables: var(--bg), var(--text), var(--border) etc.
- Never hardcode #000000 or #0D0D0D — use var(--bg-card)
- Never hardcode #FFFFFF text — use var(--text)
- SVG charts: axis labels use var(--text-muted) not hardcoded #555

## Mobile Rules
- Modal = bottom sheet (slides up) on mobile, centered card on desktop
- All buttons: whiteSpace: normal, lineHeight: 1.3 to prevent text cutoff
- Pill tabs: overflow-x: auto, flex-wrap: nowrap, -webkit-overflow-scrolling: touch
- Multi layout: single column on screens < 900px (bet slip moves below)
- Admin tables: horizontal scroll with minWidth

## Forbidden Patterns
- DO NOT nest function components inside JSX returns
- DO NOT use [style*=] attribute selectors for responsive (use CSS classes)
- DO NOT show fake comments, activity, or history to connected wallets
- DO NOT use emoji as the only indicator (always add text label too)
