import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { P2P_MARKETS } from '../data/markets'
import { fetchMarketsFromRelayer, getLocalMarkets, mergeMarkets } from '../lib/relayer'

export function useP2PMarkets() {
  const query = useQuery({
    queryKey: ['p2p-markets'],
    queryFn: fetchMarketsFromRelayer,
    staleTime: 30_000,
    retry: 1,
  })

  const markets = useMemo(() => {
    const localMarkets = getLocalMarkets()
    return mergeMarkets(P2P_MARKETS, localMarkets, query.data || [])
  }, [query.data, query.dataUpdatedAt])

  const liveMarkets = useMemo(
    () => markets.filter(market => market.dataSource === 'relayer'),
    [markets],
  )

  return {
    ...query,
    markets,
    liveMarkets,
    hasRelayerFeed: liveMarkets.length > 0,
    isUsingStaticFallback: liveMarkets.length === 0,
  }
}
