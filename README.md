# Callit

Prediction markets with:

- GenLayer as the market admission, resolution, and appeal layer
- Base as the shared USDC vault and payout layer
- React + Vite on the front end
- Foundry for Base vault testing and deployment

## Vercel deployment

This project is ready to run on Vercel as:

- a Vite frontend
- API functions from [`api`](/Users/enochlee/Desktop/callit/api)
- a Vercel cron hitting `/api/sync` every 10 minutes

### Project settings

- Framework preset: `Vite`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

### Environment variables

Frontend:

- `VITE_WALLETCONNECT_PROJECT_ID`
- `VITE_RELAYER_API_URL=/api`
- `VITE_GENLAYER_NETWORK=testnet-asimov`
- `VITE_GENLAYER_STUDIO_URL=https://studio.genlayer.com/contracts?import-contract=0xC0e1cDF15dA2AD5880e8D73C14FF84C510eF293f`
- `VITE_BASE_SEPOLIA_VAULT_ADDRESS`

Database:

- `DATABASE_URL` or `POSTGRES_URL`

Cron protection:

- `CRON_SECRET`

GenLayer relayer:

- `RELAYER_GENLAYER_NETWORK=testnet-asimov`
- `RELAYER_GENLAYER_RPC_URL`
- `RELAYER_GENLAYER_CONTRACT_ADDRESS`
- `RELAYER_GENLAYER_PRIVATE_KEY`

Base relayer:

- `RELAYER_BASE_RPC_URL`
- `RELAYER_BASE_CHAIN_ID=84532`
- `RELAYER_BASE_VAULT_ADDRESS`
- `RELAYER_BASE_APPROVAL_PRIVATE_KEY`
- `RELAYER_BASE_SETTLEMENT_PRIVATE_KEY`

### Notes

- The Vercel functions should use Postgres, not the local JSON state file.
- [vercel.json](/Users/enochlee/Desktop/callit/vercel.json) already includes the SPA rewrite and the sync cron.
- `.vercelignore` removes heavy local contract and test folders from the deployment upload so Vercel only gets what it needs to build and run.
