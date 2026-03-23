# Callit Contracts Skill

## Deployed Contract
- **CallitFactory** on Base mainnet
- Address: `0x4efc17c30391D5be0FA8B8C736b5222CC59F7818`
- Owner: `0x3dc5b334EA7a6a33da61F950bBEfaC615cF1A55b`
- Source: `src/contracts/CallitFactory.sol`

## Security Features Already Implemented
- ReentrancyGuard on all write functions
- CEI pattern (Checks → Effects → Interactions)
- Pausable (owner can pause in emergency)
- onlyOwner on resolveManualBet and resolveMultiBet
- Input validation: MIN_STAKE=1 USDC, MAX_STAKE=100,000 USDC
- Oracle bounds check: price between $0.00000001 and $1B
- emergencyWithdraw only when paused

## ABI Usage — CRITICAL
Always use parseAbi() from viem. NEVER pass raw strings to useWriteContract:

```js
// CORRECT
import { parseAbi } from 'viem'
const ABI = parseAbi(['function acceptBet(uint256 betId, uint256 acceptorStake)'])
writeContract({ abi: ABI, ... })

// WRONG — crashes with "Cannot use 'in' operator" error
writeContract({ abi: ["function acceptBet(uint256,uint256)"], ... })
```

## Transaction Flow for Accepting a Bet
1. `approve(factory, stakeAmount)` on USDC contract
2. Wait for approval tx to confirm (useWaitForTransactionReceipt)
3. `acceptBet(betId, stakeAmount)` on factory
4. Wait for bet tx to confirm
5. Show success

## BigInt Rules
- NEVER use `65n` or `0n` literals — Vite doesn't support them without explicit config
- Always use `BigInt(65)` or `BigInt(0)`
- parseUSDC helper: `BigInt(Math.floor(amount * 1e6))`

## Key Functions
```solidity
createBet(stake, resolutionTime, resType, token, oracle, targetPrice, creatorAbove, description)
acceptBet(betId, acceptorStake)
cancelBet(betId)                    // creator only, open bets only
resolveChainlinkBet(betId)          // anyone can call after expiry
resolveManualBet(betId, outcome)    // onlyOwner
createMultiBet(legIds, stake, token, resolutionTime)
acceptMultiBet(multiBetId, acceptorStake)
resolveMultiBet(multiBetId)
pause() / unpause()                 // onlyOwner
emergencyWithdraw(token, amount)    // onlyOwner + paused
```

## Planned: Tempo Integration
When Tempo mainnet chain ID is confirmed:
1. Add Tempo chain to wagmi.js chains array
2. Deploy new CallitFactory to Tempo
3. Update ACTIVE_CHAIN in config.js
4. Wire MPP for agent-based auto-settlement
5. Integrate API-Football for sports, UMA for politics
