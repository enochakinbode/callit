# Callit v2

P2P prediction markets on Base. Polymarket-style odds. Fully on-chain.

## Stack

- React + Vite
- RainbowKit + Wagmi + Viem (wallet connect, Base mainnet)
- Ethers v6
- TailwindCSS-style custom CSS (no Tailwind, pure CSS variables)
- Font: Sora + JetBrains Mono

## Pages

| Route | Page |
|---|---|
| `/` | Trending Dashboard |
| `/markets` | All Markets (P2P + Multi, search, filter, bookmark) |
| `/p2p` | P2P Market (create, browse, accept) |
| `/multi` | Multi Market (accumulator bet builder) |
| `/how-it-works` | How It Works |
| `/admin` | Admin Panel (password protected) |

## Setup

```bash
# Install deps
npm install

# Copy env
cp .env.example .env

# Fill in .env
VITE_WALLETCONNECT_PROJECT_ID=your_project_id   # from cloud.walletconnect.com
VITE_ADMIN_PASSWORD=your_secure_password

# Dev server
npm run dev

# Build
npm run build
```

## Config

All chain + contract config is in `src/lib/config.js`:

- `ACTIVE_CHAIN` → Base mainnet
- `DEV_WALLET` → platform fee recipient
- `FACTORY_ABI` → contract ABI
- `ERC20_ABI` → USDC/USDT ABI

## Contract

Deployed on Base: `0x4efc17c30391D5be0FA8B8C736b5222CC59F7818`

Source: `contracts/CallitFactory.sol`

## Notes

- 2% fee on winner payout (auto-sent to `DEV_WALLET`)
- P2P: Manual resolution has 24h delay after market expiry
- Multi: 2–10 legs, all must win, combined odds multiply automatically
- Admin panel at `/admin` — never link this publicly
