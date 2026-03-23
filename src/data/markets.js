// Real markets sourced from Polymarket / Manifold / Kalshi
// creatorAbove: true = creator says YES → acceptor takes NO
// creatorAbove: false = creator says NO → acceptor takes YES

const ts = (d) => BigInt(Math.floor(new Date(d).getTime()/1000))
const zero = '0x0000000000000000000000000000000000000000'
const w1 = '0x3dc5b334EA7a6a33da61F950bBEfaC615cF1A55b'
const w2 = '0x742d35Cc6634C0532925a3b8D4C9A3456789ABCD'
const w3 = '0xABCDEF1234567890abcdef1234567890ABCDEF12'
const w4 = '0x1234567890ABCDEF1234567890abcdef12345678'
const w5 = '0x9876543210FEDCBA9876543210fedcba98765432'
const w6 = '0xCDEF0123456789ABcdef0123456789abCDEF0123'
const w7 = '0x5678901234abcdef5678901234ABCDEF56789012'
const w8 = '0x89AB0123456789CDEFabcdef0123456789ABCDEF'
const w9 = '0x456789ABCDEF0123456789abcdef0123456789AB'
const w10 = '0xFEDCBA9876543210fedcba9876543210FEDCBA98'
const now = Math.floor(Date.now()/1000)
const usdc = (n) => BigInt(n * 1000000)
const clETH = '0x71041dddad3595F9CEd3dCCFBe3D1F4b0a16Bb70'
const clBTC = '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F'

export const P2P_MARKETS = [
  // CRYPTO
  { id:0,  category:'Crypto',       description:'ETH will enter $4,000 by April 30, 2026 at 11:59 PM UTC',                              creatorAbove:true,  resType:1, status:0, creatorStake:usdc(65),  acceptorStake:BigInt(0), totalPool:usdc(65),  resolutionTime:ts('2026-04-30T23:59:00Z'), creator:w1, acceptor:zero, oracle:clETH, targetPrice:BigInt(4000)*BigInt(100000000), outcome:0, token:0, createdAt:BigInt(now-3600)  },
  { id:1,  category:'Crypto',       description:'BTC will reach $100,000 before June 30, 2026 at 11:59 PM UTC',                        creatorAbove:true,  resType:1, status:0, creatorStake:usdc(100), acceptorStake:BigInt(0), totalPool:usdc(100), resolutionTime:ts('2026-06-30T23:59:00Z'), creator:w2, acceptor:zero, oracle:clBTC, targetPrice:BigInt(100000)*BigInt(100000000), outcome:0, token:0, createdAt:BigInt(now-7200)  },
  { id:2,  category:'Crypto',       description:'SOL will be above $300 by June 30, 2026 at 11:59 PM UTC',                             creatorAbove:true,  resType:0, status:0, creatorStake:usdc(50),  acceptorStake:BigInt(0), totalPool:usdc(50),  resolutionTime:ts('2026-06-30T23:59:00Z'), creator:w3, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-1800)  },
  { id:3,  category:'Crypto',       description:'Base TVL will exceed $10 Billion by June 30, 2026 at 11:59 PM UTC',                   creatorAbove:true,  resType:0, status:0, creatorStake:usdc(75),  acceptorStake:BigInt(0), totalPool:usdc(75),  resolutionTime:ts('2026-06-30T23:59:00Z'), creator:w4, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-900)   },
  { id:4,  category:'Crypto',       description:'Ethereum will NOT flip Bitcoin in market cap before Dec 31, 2026',                    creatorAbove:false, resType:0, status:0, creatorStake:usdc(80),  acceptorStake:BigInt(0), totalPool:usdc(80),  resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w5, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-5400)  },
  { id:5,  category:'Crypto',       description:'Solana will NOT surpass Ethereum in daily active addresses by Sep 30, 2026',          creatorAbove:false, resType:0, status:0, creatorStake:usdc(90),  acceptorStake:BigInt(0), totalPool:usdc(90),  resolutionTime:ts('2026-09-30T23:59:00Z'), creator:w6, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-7200)  },
  { id:6,  category:'Crypto',       description:'BTC will NOT drop below $60,000 before June 30, 2026 at 11:59 PM UTC',               creatorAbove:false, resType:1, status:1, creatorStake:usdc(120), acceptorStake:usdc(120), totalPool:usdc(240), resolutionTime:ts('2026-06-30T23:59:00Z'), creator:w8, acceptor:w10, oracle:clBTC, targetPrice:BigInt(60000)*BigInt(100000000), outcome:0, token:0, createdAt:BigInt(now-86400) },
  { id:7,  category:'Crypto',       description:'Virtuals Protocol market cap will NOT exceed $5 Billion by Dec 31, 2026',             creatorAbove:false, resType:0, status:0, creatorStake:usdc(110), acceptorStake:BigInt(0), totalPool:usdc(110), resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w7, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-3600)  },
  { id:8,  category:'Crypto',       description:'Farcaster total users will exceed 1 million by July 31, 2026 at 11:59 PM UTC',        creatorAbove:true,  resType:0, status:0, creatorStake:usdc(60),  acceptorStake:BigInt(0), totalPool:usdc(60),  resolutionTime:ts('2026-07-31T23:59:00Z'), creator:w9, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-10800) },
  { id:9,  category:'Crypto',       description:'Aerodrome Finance will remain #1 DEX on Base by volume through Q2 2026',             creatorAbove:true,  resType:0, status:0, creatorStake:usdc(70),  acceptorStake:BigInt(0), totalPool:usdc(70),  resolutionTime:ts('2026-06-30T23:59:00Z'), creator:w1, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-14400) },
  // SPORTS
  { id:10, category:'Sports',       description:'Chelsea will win the Premier League title in the 2025/26 season',                     creatorAbove:true,  resType:0, status:0, creatorStake:usdc(80),  acceptorStake:BigInt(0), totalPool:usdc(80),  resolutionTime:ts('2026-05-25T22:00:00Z'), creator:w2, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-3600)  },
  { id:11, category:'Sports',       description:'Nigeria Super Eagles will qualify for the 2026 FIFA World Cup',                       creatorAbove:true,  resType:0, status:0, creatorStake:usdc(50),  acceptorStake:BigInt(0), totalPool:usdc(50),  resolutionTime:ts('2026-05-01T20:00:00Z'), creator:w4, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-1800)  },
  { id:12, category:'Sports',       description:'Real Madrid will win the UEFA Champions League 2025/26',                              creatorAbove:true,  resType:0, status:0, creatorStake:usdc(90),  acceptorStake:BigInt(0), totalPool:usdc(90),  resolutionTime:ts('2026-05-30T20:00:00Z'), creator:w3, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-5400)  },
  { id:13, category:'Sports',       description:'Manchester City will NOT finish in the Premier League top 4 in 2025/26',              creatorAbove:false, resType:0, status:0, creatorStake:usdc(60),  acceptorStake:BigInt(0), totalPool:usdc(60),  resolutionTime:ts('2026-05-25T22:00:00Z'), creator:w5, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-7200)  },
  { id:14, category:'Sports',       description:'Argentina will win the 2026 FIFA World Cup',                                          creatorAbove:true,  resType:0, status:0, creatorStake:usdc(100), acceptorStake:BigInt(0), totalPool:usdc(100), resolutionTime:ts('2026-07-19T20:00:00Z'), creator:w7, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-3600)  },
  { id:15, category:'Sports',       description:'Brazil will NOT make it past the quarterfinals of the 2026 FIFA World Cup',           creatorAbove:false, resType:0, status:0, creatorStake:usdc(85),  acceptorStake:BigInt(0), totalPool:usdc(85),  resolutionTime:ts('2026-07-10T20:00:00Z'), creator:w8, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-14400) },
  { id:16, category:'Sports',       description:'LeBron James will NOT retire from the NBA before the end of 2026',                    creatorAbove:false, resType:0, status:1, creatorStake:usdc(55),  acceptorStake:usdc(55), totalPool:usdc(110), resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w9, acceptor:w10, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-86400) },
  { id:17, category:'Sports',       description:'Golden State Warriors will win the NBA Championship 2025/26',                         creatorAbove:true,  resType:0, status:0, creatorStake:usdc(75),  acceptorStake:BigInt(0), totalPool:usdc(75),  resolutionTime:ts('2026-06-20T23:00:00Z'), creator:w6, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-3600)  },
  { id:18, category:'Sports',       description:'Barcelona will win La Liga in the 2025/26 season',                                    creatorAbove:true,  resType:0, status:0, creatorStake:usdc(65),  acceptorStake:BigInt(0), totalPool:usdc(65),  resolutionTime:ts('2026-05-31T22:00:00Z'), creator:w1, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-7200)  },
  { id:19, category:'Sports',       description:'Tyson Fury will NOT fight again professionally before Dec 31, 2026',                  creatorAbove:false, resType:0, status:0, creatorStake:usdc(45),  acceptorStake:BigInt(0), totalPool:usdc(45),  resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w2, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-10800) },
  // POLITICS
  { id:20, category:'Politics',     description:'Binance will receive full US regulatory approval by Dec 31, 2026',                    creatorAbove:true,  resType:0, status:0, creatorStake:usdc(200), acceptorStake:BigInt(0), totalPool:usdc(200), resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w1, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-3600)  },
  { id:21, category:'Politics',     description:'Donald Trump will sign a US crypto strategic reserve bill before Dec 31, 2026',       creatorAbove:true,  resType:0, status:0, creatorStake:usdc(150), acceptorStake:BigInt(0), totalPool:usdc(150), resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w3, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-7200)  },
  { id:22, category:'Politics',     description:'The US will NOT pass comprehensive AI regulation before Dec 31, 2026',                creatorAbove:false, resType:0, status:0, creatorStake:usdc(120), acceptorStake:BigInt(0), totalPool:usdc(120), resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w5, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-1800)  },
  { id:23, category:'Politics',     description:'SEC will approve a Solana spot ETF before Dec 31, 2026',                             creatorAbove:true,  resType:0, status:0, creatorStake:usdc(130), acceptorStake:BigInt(0), totalPool:usdc(130), resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w6, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-7200)  },
  { id:24, category:'Politics',     description:'UK Labour Party will still be in government on Dec 31, 2026',                         creatorAbove:true,  resType:0, status:0, creatorStake:usdc(90),  acceptorStake:BigInt(0), totalPool:usdc(90),  resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w4, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-5400)  },
  // ECONOMY
  { id:25, category:'Economy',      description:'US Federal Reserve will cut interest rates at least twice by Dec 31, 2026',           creatorAbove:true,  resType:0, status:0, creatorStake:usdc(160), acceptorStake:BigInt(0), totalPool:usdc(160), resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w7, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-3600)  },
  { id:26, category:'Economy',      description:'Nigeria Naira will NOT stabilize below 1,500 to the dollar by Dec 31, 2026',          creatorAbove:false, resType:0, status:0, creatorStake:usdc(60),  acceptorStake:BigInt(0), totalPool:usdc(60),  resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w8, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-10800) },
  { id:27, category:'Economy',      description:'US inflation will drop below 2.5% annual rate by Dec 31, 2026',                       creatorAbove:true,  resType:0, status:0, creatorStake:usdc(95),  acceptorStake:BigInt(0), totalPool:usdc(95),  resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w9, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-14400) },
  { id:28, category:'Economy',      description:'Gold will NOT reach $4,000 per ounce before Dec 31, 2026',                            creatorAbove:false, resType:0, status:0, creatorStake:usdc(85),  acceptorStake:BigInt(0), totalPool:usdc(85),  resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w10,acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-3600)  },
  // SOCIAL MEDIA
  { id:29, category:'Social Media', description:'X (Twitter) will reach 1 billion monthly active users by Dec 31, 2026',               creatorAbove:true,  resType:0, status:0, creatorStake:usdc(95),  acceptorStake:BigInt(0), totalPool:usdc(95),  resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w1, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-3600)  },
  { id:30, category:'Social Media', description:'Farcaster will NOT hit 500k daily active users by July 31, 2026',                     creatorAbove:false, resType:0, status:0, creatorStake:usdc(70),  acceptorStake:BigInt(0), totalPool:usdc(70),  resolutionTime:ts('2026-07-31T23:59:00Z'), creator:w2, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-7200)  },
  { id:31, category:'Social Media', description:'TikTok will remain operational in the US through Dec 31, 2026',                       creatorAbove:true,  resType:0, status:0, creatorStake:usdc(120), acceptorStake:BigInt(0), totalPool:usdc(120), resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w3, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-1800)  },
  { id:32, category:'Social Media', description:'Meta AI will NOT surpass ChatGPT in monthly active users by Dec 31, 2026',             creatorAbove:false, resType:0, status:0, creatorStake:usdc(80),  acceptorStake:BigInt(0), totalPool:usdc(80),  resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w4, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-5400)  },
  // TECH / AI
  { id:33, category:'Tech',         description:'OpenAI will release GPT-5 as a publicly available model before June 30, 2026',        creatorAbove:true,  resType:0, status:0, creatorStake:usdc(110), acceptorStake:BigInt(0), totalPool:usdc(110), resolutionTime:ts('2026-06-30T23:59:00Z'), creator:w5, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-3600)  },
  { id:34, category:'Tech',         description:'Apple will NOT launch a foldable iPhone by Dec 31, 2026',                             creatorAbove:false, resType:0, status:0, creatorStake:usdc(90),  acceptorStake:BigInt(0), totalPool:usdc(90),  resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w6, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-7200)  },
  { id:35, category:'Tech',         description:'Anthropic will raise a Series F funding round before Dec 31, 2026',                   creatorAbove:true,  resType:0, status:0, creatorStake:usdc(75),  acceptorStake:BigInt(0), totalPool:usdc(75),  resolutionTime:ts('2026-12-31T23:59:00Z'), creator:w7, acceptor:zero, oracle:zero, targetPrice:BigInt(0), outcome:0, token:0, createdAt:BigInt(now-10800) },
]

export const MULTI_ADMIN_MARKETS = [
  { id:0,  category:'Crypto',       description:'ETH above $4,000 by Apr 30, 2026 at 11:59 PM UTC',                yesProb:65, noProb:35, endDate:'Apr 30, 2026', endTime:'11:59 PM UTC',  volume:'$24,500', bettors:142 },
  { id:1,  category:'Crypto',       description:'BTC above $100,000 by Jun 30, 2026 at 11:59 PM UTC',              yesProb:72, noProb:28, endDate:'Jun 30, 2026', endTime:'11:59 PM UTC',  volume:'$41,200', bettors:289 },
  { id:2,  category:'Crypto',       description:'Base TVL exceeds $10B by Jun 30, 2026 at 11:59 PM UTC',           yesProb:55, noProb:45, endDate:'Jun 30, 2026', endTime:'11:59 PM UTC',  volume:'$12,700', bettors:94  },
  { id:3,  category:'Crypto',       description:'SOL above $300 by Jun 30, 2026 at 11:59 PM UTC',                  yesProb:58, noProb:42, endDate:'Jun 30, 2026', endTime:'11:59 PM UTC',  volume:'$18,300', bettors:167 },
  { id:4,  category:'Crypto',       description:'ETH above $5,000 by Dec 31, 2026 at 11:59 PM UTC',                yesProb:44, noProb:56, endDate:'Dec 31, 2026', endTime:'11:59 PM UTC',  volume:'$31,800', bettors:201 },
  { id:5,  category:'Crypto',       description:'BTC above $150,000 by Dec 31, 2026 at 11:59 PM UTC',              yesProb:51, noProb:49, endDate:'Dec 31, 2026', endTime:'11:59 PM UTC',  volume:'$55,400', bettors:412 },
  { id:6,  category:'Crypto',       description:'Aerodrome remains #1 DEX on Base through Q2 2026',                yesProb:78, noProb:22, endDate:'Jun 30, 2026', endTime:'11:59 PM UTC',  volume:'$9,800',  bettors:87  },
  { id:7,  category:'Sports',       description:'Nigeria Super Eagles qualify for the 2026 FIFA World Cup',         yesProb:48, noProb:52, endDate:'May 1, 2026',  endTime:'08:00 PM WAT',  volume:'$8,900',  bettors:201 },
  { id:8,  category:'Sports',       description:'Real Madrid wins Champions League 2025/26',                        yesProb:62, noProb:38, endDate:'May 30, 2026', endTime:'08:00 PM UTC',  volume:'$22,100', bettors:318 },
  { id:9,  category:'Sports',       description:'Argentina wins the 2026 FIFA World Cup',                           yesProb:28, noProb:72, endDate:'Jul 19, 2026', endTime:'08:00 PM UTC',  volume:'$38,700', bettors:521 },
  { id:10, category:'Sports',       description:'Man City finishes Premier League top 4 in 2025/26',               yesProb:74, noProb:26, endDate:'May 25, 2026', endTime:'05:00 PM UTC',  volume:'$15,600', bettors:189 },
  { id:11, category:'Sports',       description:'Chelsea wins Premier League 2025/26',                              yesProb:35, noProb:65, endDate:'May 25, 2026', endTime:'05:00 PM UTC',  volume:'$19,200', bettors:247 },
  { id:12, category:'Sports',       description:'Brazil reaches the 2026 FIFA World Cup semifinals',                yesProb:55, noProb:45, endDate:'Jul 14, 2026', endTime:'08:00 PM UTC',  volume:'$29,400', bettors:387 },
  { id:13, category:'Sports',       description:'Golden State Warriors win the NBA Championship 2025/26',           yesProb:18, noProb:82, endDate:'Jun 20, 2026', endTime:'11:00 PM UTC',  volume:'$11,200', bettors:143 },
  { id:14, category:'Sports',       description:'Barcelona wins La Liga 2025/26',                                   yesProb:52, noProb:48, endDate:'May 31, 2026', endTime:'05:00 PM UTC',  volume:'$17,400', bettors:221 },
  { id:15, category:'Politics',     description:'Donald Trump signs a US crypto strategic reserve bill by Dec 2026',yesProb:62, noProb:38, endDate:'Dec 31, 2026', endTime:'11:59 PM EST',  volume:'$33,100', bettors:415 },
  { id:16, category:'Politics',     description:'SEC approves a Solana spot ETF before Dec 31, 2026',              yesProb:55, noProb:45, endDate:'Dec 31, 2026', endTime:'11:59 PM EST',  volume:'$28,900', bettors:372 },
  { id:17, category:'Politics',     description:'Binance receives full US regulatory approval by Dec 2026',         yesProb:40, noProb:60, endDate:'Dec 31, 2026', endTime:'11:59 PM EST',  volume:'$18,900', bettors:174 },
  { id:18, category:'Economy',      description:'US Federal Reserve cuts rates at least twice by Dec 2026',         yesProb:68, noProb:32, endDate:'Dec 31, 2026', endTime:'11:59 PM EST',  volume:'$28,400', bettors:327 },
  { id:19, category:'Economy',      description:'US inflation drops below 2.5% by Dec 31, 2026',                   yesProb:52, noProb:48, endDate:'Dec 31, 2026', endTime:'11:59 PM EST',  volume:'$19,700', bettors:241 },
  { id:20, category:'Social Media', description:'TikTok remains operational in the US through Dec 31, 2026',       yesProb:71, noProb:29, endDate:'Dec 31, 2026', endTime:'11:59 PM EST',  volume:'$22,300', bettors:298 },
  { id:21, category:'Tech',         description:'OpenAI releases GPT-5 publicly before Jun 30, 2026',              yesProb:67, noProb:33, endDate:'Jun 30, 2026', endTime:'11:59 PM UTC',  volume:'$31,500', bettors:445 },
  { id:22, category:'Tech',         description:'Apple launches a foldable iPhone by Dec 31, 2026',                yesProb:22, noProb:78, endDate:'Dec 31, 2026', endTime:'11:59 PM PST',  volume:'$14,800', bettors:192, frequency:'One-time', isNew:false },
]

// Grouped multi-outcome markets (multiple options on one event — like Polymarket)
// Each outcome is independently bettable YES/NO
export const GROUPED_MARKETS = [
  {
    id: 'grp-1',
    title: 'How many tweets will Elon Musk post this week?',
    category: 'Social Media',
    frequency: 'Weekly',
    isNew: true,
    volume: '$185K',
    endDate: 'Mar 30, 2026',
    endTime: '11:59 PM UTC',
    outcomes: [
      { id: 'grp-1-a', label: '115+',    yesProb: 22, noProb: 78 },
      { id: 'grp-1-b', label: '90–114',  yesProb: 30, noProb: 70 },
      { id: 'grp-1-c', label: '65–89',   yesProb: 28, noProb: 72 },
      { id: 'grp-1-d', label: '40–64',   yesProb: 14, noProb: 86 },
      { id: 'grp-1-e', label: 'Under 40', yesProb: 6,  noProb: 94 },
    ],
  },
  {
    id: 'grp-2',
    title: 'Who wins the 2026 NBA Championship?',
    category: 'Sports',
    frequency: 'One-time',
    isNew: false,
    volume: '$920K',
    endDate: 'Jun 20, 2026',
    endTime: '11:00 PM UTC',
    outcomes: [
      { id: 'grp-2-a', label: 'Boston Celtics',  yesProb: 28, noProb: 72 },
      { id: 'grp-2-b', label: 'Oklahoma City',   yesProb: 22, noProb: 78 },
      { id: 'grp-2-c', label: 'Cleveland Cavs',  yesProb: 18, noProb: 82 },
      { id: 'grp-2-d', label: 'Denver Nuggets',  yesProb: 14, noProb: 86 },
      { id: 'grp-2-e', label: 'Other team',      yesProb: 18, noProb: 82 },
    ],
  },
  {
    id: 'grp-3',
    title: 'BTC price range end of April 2026?',
    category: 'Crypto',
    frequency: 'Monthly',
    isNew: true,
    volume: '$340K',
    endDate: 'Apr 30, 2026',
    endTime: '11:59 PM UTC',
    outcomes: [
      { id: 'grp-3-a', label: '$120K+',        yesProb: 15, noProb: 85 },
      { id: 'grp-3-b', label: '$100K–$120K',   yesProb: 32, noProb: 68 },
      { id: 'grp-3-c', label: '$80K–$100K',    yesProb: 38, noProb: 62 },
      { id: 'grp-3-d', label: 'Under $80K',    yesProb: 15, noProb: 85 },
    ],
  },
  {
    id: 'grp-4',
    title: 'Which country wins most gold at 2026 Winter Olympics?',
    category: 'Sports',
    frequency: 'One-time',
    isNew: false,
    volume: '$210K',
    endDate: 'Feb 28, 2026',
    endTime: '11:59 PM UTC',
    outcomes: [
      { id: 'grp-4-a', label: 'Norway',   yesProb: 35, noProb: 65 },
      { id: 'grp-4-b', label: 'USA',      yesProb: 28, noProb: 72 },
      { id: 'grp-4-c', label: 'Germany',  yesProb: 18, noProb: 82 },
      { id: 'grp-4-d', label: 'Other',    yesProb: 19, noProb: 81 },
    ],
  },
]
