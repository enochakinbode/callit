# Base Sepolia Deployment With Foundry

## What this deploys

- [contracts/CallitVault.sol](/Users/enochlee/Desktop/callit/contracts/CallitVault.sol)

## Prerequisites

- `forge` installed
- Base Sepolia ETH in the deployer wallet
- Base Sepolia RPC URL
- Base Sepolia USDC address
- Treasury address
- Approval-operator address
- Settlement-relayer address

## Environment

Copy [.env.example](/Users/enochlee/Desktop/callit/.env.example) to `.env` and fill:

- `BASE_SEPOLIA_RPC_URL`
- `PRIVATE_KEY`
- `BASE_SEPOLIA_USDC`
- `CALLIT_TREASURY`
- `CALLIT_APPROVAL_OPERATOR`
- `CALLIT_SETTLEMENT_RELAYER`
- `BASESCAN_API_KEY`

## Commands

Build:

```bash
forge build
```

Run tests:

```bash
forge test
```

Deploy:

```bash
source .env
forge script script/DeployCallitVault.s.sol:DeployCallitVault \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast
```

Deploy and verify:

```bash
source .env
forge script script/DeployCallitVault.s.sol:DeployCallitVault \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

## After deploy

- Save the deployed vault address into [src/lib/config.js](/Users/enochlee/Desktop/callit/src/lib/config.js)
- Save the same address into the relayer config
- Export `GENLAYER_RPC_URL` for your GenLayer target
- Run `bash genlayer/script/deploy_and_setup.sh`
- Do not point the app back to Base mainnet while testing

## GenLayer setup

The GenLayer script now only deploys the market manager.

It does not write Base vault addresses, Base network metadata, or relayer addresses into the GenLayer contract anymore.

For Base Sepolia testing, keep those chain-specific values in the relayer and frontend config, and use only:

- `GENLAYER_RPC_URL`

The script writes a deployment record under `genlayer/deployments/` with the deployed contract address.
