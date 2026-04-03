# Callit

Prediction markets with:

- GenLayer as the market admission, resolution, and appeal layer
- Base as the shared USDC vault and payout layer
- React + Vite on the front end
- Foundry for Base vault testing and deployment

## Vercel deployment

This project is ready to run on Vercel as a Vite frontend.

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

### Notes

- [vercel.json](/Users/enochlee/Desktop/callit/vercel.json) includes the SPA rewrite for the frontend deployment.
- `.vercelignore` removes heavy local contract and test folders from the deployment upload so Vercel only gets what it needs to build and run.
