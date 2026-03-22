import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { base } from 'wagmi/chains'

// Tempo Testnet (Moderato) — custom chain definition
// Switch id to mainnet chain ID once Tempo publishes it
const tempoTestnet = {
  id: 42431,
  name: 'Tempo Testnet',
  nativeCurrency: { name: 'USD', symbol: 'USD', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.moderato.tempo.xyz'] },
    public: { http: ['https://rpc.moderato.tempo.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Tempo Explorer', url: 'https://explore.tempo.xyz' },
  },
  testnet: true,
}

export const wagmiConfig = getDefaultConfig({
  appName: 'Callit',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  // Tempo testnet added — switch to live once mainnet chain ID is confirmed
  chains: [base, tempoTestnet],
  ssr: false,
})
