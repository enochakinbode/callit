# Callit API

This service is the server layer between the frontend, GenLayer, and the Base vault.

It now supports two run modes:

- local long-running Node server
- Vercel Functions backed by Postgres

It provides:

- `POST /markets` to submit a market draft to GenLayer
- `GET /markets` to return the live relayer market list the frontend already expects
- `GET /markets?address=0x...` to return all markets related to one wallet
- `GET /user-markets?address=0x...` as an explicit wallet lookup endpoint
- `POST /sync` to run one sync pass manually
- `GET /health` to inspect configuration and relayer readiness

## What it does

1. Accepts a market draft from the frontend.
2. Submits it to the GenLayer market manager with the relayer's GenLayer signer.
3. If the Base approval operator is configured, registers the approved market in the Base vault.
4. Polls for matched markets that reach cutoff.
5. Resolves them on GenLayer, mirrors provisional outcomes to Base, and later settles or refunds on Base when final.

## Environment

Copy the root [.env.example](/Users/enochlee/Desktop/callit/.env.example) to `.env` and fill the relayer variables.

Prerequisite:

- the `genlayer` CLI must be installed globally on the machine, because the relayer loads the GenLayer SDK from that installation
- for Vercel deployment, attach a Postgres database and expose `DATABASE_URL` or `POSTGRES_URL`

Required for GenLayer submission:

- `RELAYER_GENLAYER_RPC_URL`
- `RELAYER_GENLAYER_CONTRACT_ADDRESS`
- `RELAYER_GENLAYER_PRIVATE_KEY`

Required for Base registration:

- `RELAYER_BASE_RPC_URL`
- `RELAYER_BASE_VAULT_ADDRESS`
- `RELAYER_BASE_APPROVAL_PRIVATE_KEY`

Required for Base settlement and refunds:

- `RELAYER_BASE_SETTLEMENT_PRIVATE_KEY`

Optional for Vercel cron protection:

- `CRON_SECRET`

If you want the frontend to talk to the relayer locally, also set:

- `VITE_RELAYER_API_URL=http://127.0.0.1:8787`

If you deploy the frontend and relayer together on Vercel, set:

- `VITE_RELAYER_API_URL=/api`

## Run

```bash
npm run relayer
```

The local API server stores its local state in `api/data/state.json`.

## Vercel

For Vercel, do not run `npm run relayer`.

Use the provided functions instead:

- `/api/markets`
- `/api/user-markets`
- `/api/sync`
- `/api/health`

The Vercel cron in [vercel.json](/Users/enochlee/Desktop/callit/vercel.json) calls `/api/sync` every 10 minutes.

The Vercel path should use Postgres, not the local state file.

## Notes

- The GenLayer market manager currently records the submitting address as the market creator on GenLayer. The relayer preserves the actual frontend creator address locally and uses that address when registering the Base vault market.
- The Base market ID is derived deterministically from the GenLayer market ID, but the relayer only returns it to the frontend after the Base registration actually succeeds.
