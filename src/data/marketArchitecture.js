export const GENLAYER_DISPUTE_WINDOW_HOURS = 1
export const MARKET_QUALITY_BOND_USDC = 25
export const PLATFORM_FEE_PERCENT = 2
export const CHALLENGE_BOND_RULE = '5% of pool · $50 min · $500 max'

export const CATEGORY_TEMPLATES = {
  Crypto: [
    {
      id: 'crypto-threshold',
      label: 'Threshold Outcome',
      summary: 'Resolves from frozen market data sources at a fixed time.',
      resolutionRule: 'Resolve from approved crypto market data sources only. At least two approved primary sources must agree on whether the threshold condition was met by the cutoff rule.',
    },
    {
      id: 'crypto-metric',
      label: 'Onchain Metric',
      summary: 'Resolves from a named metric and frozen source set.',
      resolutionRule: 'Resolve from approved protocol or analytics sources only. At least two approved primary sources must agree on the metric at the cutoff rule.',
    },
  ],
  Sports: [
    {
      id: 'sports-match',
      label: 'Match Result',
      summary: 'Resolves from official post-match reporting.',
      resolutionRule: 'Resolve only from official post-event or event-final sources. At least two approved primary sources must agree before the market can settle.',
    },
    {
      id: 'sports-season',
      label: 'Season Or Tournament',
      summary: 'Resolves from official league or tournament outcome sources.',
      resolutionRule: 'Resolve from final published standings or official tournament results using at least two approved primary sources.',
    },
  ],
  Politics: [
    {
      id: 'politics-official-action',
      label: 'Official Action',
      summary: 'Resolves from a named government or regulator action.',
      resolutionRule: 'Resolve from the official issuing body and a second approved primary source confirming the action or publication.',
    },
  ],
  Economy: [
    {
      id: 'economy-release',
      label: 'Official Release',
      summary: 'Resolves from a named release or institutional decision.',
      resolutionRule: 'Resolve from the named release or institution and a second approved primary source that confirms the published result.',
    },
  ],
}

export const SOURCE_REGISTRY = {
  Crypto: [
    { id: 'coingecko', name: 'CoinGecko API', role: 'primary', note: 'Primary source for crypto price and market data confirmation.' },
    { id: 'defillama', name: 'DefiLlama', role: 'primary', note: 'Primary source for protocol TVL and rankings.' },
  ],
  Sports: [
    { id: 'official-league', name: 'Official League Site', role: 'primary', note: 'Primary source for standings and final match status.' },
    { id: 'official-tournament', name: 'Official Tournament Site', role: 'primary', note: 'Primary source for bracket and winner data.' },
    { id: 'bbc-sport', name: 'BBC Sport', role: 'primary', note: 'Independent primary source used to confirm official reporting.' },
  ],
  Politics: [
    { id: 'official-gov', name: 'Official Government Source', role: 'primary', note: 'Primary source for signed or published official actions.' },
    { id: 'official-regulator', name: 'Official Regulator Source', role: 'primary', note: 'Primary source for approvals, denials, and releases.' },
    { id: 'reuters', name: 'Reuters', role: 'primary', note: 'Independent confirmation source.' },
  ],
  Economy: [
    { id: 'official-release', name: 'Official Statistical Release', role: 'primary', note: 'Primary source for scheduled data releases.' },
    { id: 'central-bank', name: 'Central Bank Source', role: 'primary', note: 'Primary source for named policy decisions.' },
    { id: 'reuters', name: 'Reuters', role: 'primary', note: 'Independent confirmation source.' },
  ],
}

export const getTemplatesForCategory = (category) => CATEGORY_TEMPLATES[category] || []

export const getPrimarySources = (category) => (SOURCE_REGISTRY[category] || []).filter(source => source.role === 'primary')

export const getPrimarySourceDetails = (category, sourceIds) => {
  const sourceMap = new Map(getPrimarySources(category).map(source => [source.id, source]))
  return sourceIds.map(sourceId => sourceMap.get(sourceId)).filter(Boolean)
}

const includesAny = (value, patterns) => patterns.some(pattern => value.includes(pattern))

export const inferGenLayerDraftDecision = (statement = '') => {
  const normalized = statement.toLowerCase()

  let category = 'Politics'
  if (includesAny(normalized, ['btc', 'bitcoin', 'eth', 'ethereum', 'sol', 'base', 'defi', 'tvl', 'market cap', 'dex', 'protocol'])) {
    category = 'Crypto'
  } else if (includesAny(normalized, ['premier league', 'champions league', 'fifa', 'nba', 'world cup', 'la liga', 'match', 'season', 'tournament', 'wins'])) {
    category = 'Sports'
  } else if (includesAny(normalized, ['inflation', 'interest rate', 'rates', 'federal reserve', 'fed', 'central bank', 'gdp', 'cpi', 'economy'])) {
    category = 'Economy'
  }

  let templateId = 'politics-official-action'
  let settlementMode = 'PRIMARY_SOURCE_CONSENSUS'
  let primarySourceIds = ['official-gov', 'reuters']

  if (category === 'Crypto') {
    const isPriceStyle = includesAny(normalized, ['$', 'price', 'above', 'below', 'reach', 'settle'])
    templateId = isPriceStyle ? 'crypto-threshold' : 'crypto-metric'
    primarySourceIds = ['defillama', 'coingecko']
  } else if (category === 'Sports') {
    const isSeasonStyle = includesAny(normalized, ['season', 'title', 'world cup', 'champions league', 'league', 'tournament'])
    templateId = isSeasonStyle ? 'sports-season' : 'sports-match'
    primarySourceIds = isSeasonStyle ? ['official-tournament', 'bbc-sport'] : ['official-league', 'bbc-sport']
  } else if (category === 'Economy') {
    templateId = 'economy-release'
    primarySourceIds = includesAny(normalized, ['rate', 'rates', 'central bank', 'fed'])
      ? ['central-bank', 'reuters']
      : ['official-release', 'reuters']
  }

  const template = getTemplatesForCategory(category).find(item => item.id === templateId) || getTemplatesForCategory(category)[0]
  const primarySourceDetails = getPrimarySourceDetails(category, primarySourceIds)

  return {
    category,
    templateId,
    template,
    settlementMode,
    primarySourceIds,
    primarySourceDetails,
  }
}

export const getResolutionProfile = (market) => {
  const primary = getPrimarySources(market.category).slice(0, 2).map(source => source.name)
  return {
    badge: 'GENLAYER',
    tone: 'review',
    primarySources: primary,
    summary: 'GenLayer resolves from frozen primary sources, then opens a 1 hour dispute window before Base settlement.',
  }
}
