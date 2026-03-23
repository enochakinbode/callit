# Callit Markets Skill

## Market Data Structure
All markets live in `src/data/markets.js`

### P2P Market Fields
```js
{
  id: 0,                        // unique number
  category: 'Crypto',           // Crypto | Sports | Politics | Economy | Social Media | Tech
  description: 'ETH will...',   // creator's statement (max 280 chars)
  creatorAbove: true,           // true = creator says YES, false = creator says NO
  resType: 1,                   // 0 = Manual, 1 = Chainlink auto
  status: 0,                    // 0=Open, 1=Matched, 2=Resolved, 3=Cancelled
  creatorStake: BigInt(65000000), // in USDC units (6 decimals)
  acceptorStake: BigInt(0),
  totalPool: BigInt(65000000),
  resolutionTime: BigInt(timestamp),
  creator: '0x...',
  acceptor: '0x000...000',      // zero address if unmatched
  oracle: '0x...',              // Chainlink feed or zero address
  targetPrice: BigInt(0),
  outcome: 0,                   // 0=Unresolved, 1=CreatorWins, 2=AcceptorWins
  token: 0,                     // 0=USDC, 1=USDT
}
```

### Multi Market Fields (Admin-created)
```js
{
  id: 0,
  category: 'Crypto',
  description: 'ETH above $4,000 by Apr 30, 2026 at 11:59 PM UTC',
  yesProb: 65,                  // current YES probability percentage
  noProb: 35,                   // 100 - yesProb
  endDate: 'Apr 30, 2026',
  endTime: '11:59 PM UTC',
  volume: '$24,500',
  bettors: 142,
}
```

## Acceptor Logic — CRITICAL
The acceptor ALWAYS takes the OPPOSITE side of the creator:
- `creatorAbove: true` (creator says YES) → acceptor takes NO
- `creatorAbove: false` (creator says NO) → acceptor takes YES

Counter-statement generation:
```js
const getCounterStatement = (description, creatorAbove) => {
  if (!creatorAbove) {
    // Creator said NO → acceptor says YES (remove NOT)
    return description.replace(/\bwill not\b/gi, 'will').replace(/\bNOT\b/g, '').replace(/\s{2,}/g, ' ').trim()
  }
  // Creator said YES → acceptor says NO (add NOT)
  return description.replace(/ will /i, ' will NOT ')
}
```

## Pricing Model (Polymarket-style ¢ notation)
- 50¢ = 50% probability = $0.50 per $1 potential payout
- P2P always starts 50¢/50¢ (equal stakes)
- Multi combines: 65¢ × 72¢ × 55¢ = 25.7¢ combined
- All prices shown in cents (¢) not percentages

## Adding New Markets
1. Add to `P2P_MARKETS` array in `src/data/markets.js`
2. Use `BigInt()` wrappers for all numeric fields
3. Use `ts()` helper for timestamps: `ts('2026-04-30T23:59:00Z')`
4. Use `usdc()` helper for amounts: `usdc(65)` = 65 USDC

## Admin: Resolving Markets
Manual resolution via Admin panel (`/admin`):
- Connect with `0x3dc5b334...` wallet
- Go to Pending tab
- Verify result from official sources shown in sourceHint
- Click YES Wins or NO Wins
- This calls `resolveManualBet(betId, outcome)` on-chain
- Only the admin wallet can sign this transaction

## Polymarket Import (Admin Feature)
In Admin panel → "📥 Import Polymarket" tab:
1. Search keywords
2. Results from `gamma-api.polymarket.com/markets`
3. Click Import → auto-fills Create Market form
4. Review and adjust probability + end date
5. Publish to Callit

## Resolution Sources by Category
- Crypto: Chainlink oracle (automatic)
- Sports: premierleague.com / FIFA / ESPN / BBC Sport
- Politics: reuters.com / whitehouse.gov / SEC.gov
- Economy: federalreserve.gov / bloomberg.com
- Social Media: platform official announcements
