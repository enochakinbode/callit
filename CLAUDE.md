# Callit — P2P Prediction Market on Base

## Project Overview
Callit is a P2P prediction market dApp built on Base mainnet.
Users create markets, stake USDC, and take opposite sides of predictions.
Everything is settled on-chain via smart contract.

## Stack
- **Frontend**: React 18 + Vite + RainbowKit + Wagmi v2 + Viem
- **Styling**: Inline styles + CSS variables (index.css)
- **Blockchain**: Base mainnet (chain ID 8453)
- **Token**: USDC (6 decimals)
- **Contract**: CallitFactory at `0x4efc17c30391D5be0FA8B8C736b5222CC59F7818`
- **Deployment**: Vercel (callit-rho.vercel.app)

## Key Addresses
- Factory contract: `0x4efc17c30391D5be0FA8B8C736b5222CC59F7818`
- Dev/Admin wallet: `0x3dc5b334EA7a6a33da61F950bBEfaC615cF1A55b`
- USDC on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- ETH/USD Chainlink: `0x71041dddad3595F9CEd3dCCFBe3D1F4b0a16Bb70`
- BTC/USD Chainlink: `0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F`

## Design System
- Background: `#000000` (pure black)
- Cards: `#0D0D0D`
- Gold accent: `#E8B84B`
- YES color: `#26A17B` (green)
- NO color: `#E85D5D` (red)
- Font: Sora (display) + JetBrains Mono (numbers)
- Pricing: ¢ cent notation (50¢ = 50% probability)

## Project Structure
```
src/
├── App.jsx                    # Routes
├── main.jsx                   # Providers (Wagmi, RainbowKit, Theme, Toast)
├── index.css                  # All CSS variables + responsive
├── components/
│   ├── Navbar.jsx             # Navigation + wallet connect
│   ├── BetCard.jsx            # P2P market card (minimal, matches screenshot)
│   ├── AcceptBetModal.jsx     # CALL IT flow (statements + chart + chat + confirm)
│   ├── CreateBetModal.jsx     # Create P2P market
│   ├── MarketDetailModal.jsx  # Full chart + order book + comments + activity
│   └── Logo.jsx
├── pages/
│   ├── Home.jsx               # Landing + trending cards
│   ├── Markets.jsx            # All markets browser
│   ├── P2PMarket.jsx          # P2P markets list
│   ├── MultiMarket.jsx        # Multi/accumulator markets
│   ├── HowItWorks.jsx         # Education page
│   ├── Admin.jsx              # Admin panel (wallet-auth only)
│   └── StakeHistory.jsx       # User bet history
├── context/
│   ├── ToastContext.jsx        # Global toast notifications
│   └── ThemeContext.jsx        # Dark/light mode
├── data/
│   └── markets.js             # All market data (36 P2P + 23 Multi)
├── lib/
│   ├── config.js              # Chain config, ABIs, helpers
│   └── wagmi.js               # Wagmi + RainbowKit config
└── contracts/
    └── CallitFactory.sol      # Smart contract
```

## Core Rules
1. NEVER use `dangerouslySetInnerHTML`
2. NEVER store private keys anywhere in frontend
3. ALWAYS use `parseAbi()` from viem for contract calls (not raw strings)
4. ALWAYS validate inputs before contract interactions
5. Admin panel auth = wallet address only, NOT password
6. BigInt literals must use `BigInt(n)` not `n` (Vite ES2020 compat)
7. All setInterval must have clearInterval cleanup in useEffect return
8. No fake/mock data shown to end users — empty states only

## P2P Market Logic
- Creator stakes YES side → acceptor MUST take NO side (and vice versa)
- Card shows: creator statement + YES/NO ¢ prices + green/red bar + CALL IT
- CALL IT opens AcceptBetModal with: counter-statement + chart + stake summary + staker chat + confirm
- Stakes are always equal (50/50 pool)
- Fee: 2% from winner, 98% payout

## Multi Market Logic  
- Admin creates markets with YES% probability
- Users select YES or NO on 1-10 markets
- Combined odds multiply together
- All selections must win for payout
- Bet slip in sidebar on desktop, inline on mobile

## Environment Variables
```
VITE_WALLETCONNECT_PROJECT_ID=919f0cd77b142e5b4caa6b75479026e6
```
No other env vars needed. Admin auth is wallet-based.

## GitHub
Repository: https://github.com/heywole/callit
Branch: main
Auto-deploys to Vercel on every push.

## Tempo Integration (Planned)
- Tempo mainnet launched March 2026
- Will enable instant AI agent settlement via MPP
- Sports: API-Football, Politics: UMA Protocol, Crypto: Chainlink
- Chain config ready in config.js, contract deployment pending mainnet chain ID
