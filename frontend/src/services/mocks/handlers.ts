import { http, HttpResponse } from 'msw'
import { ApiResponseLoansCurrencyBreakdown } from '../fetchers/overview/getLoansCurrencyBreakdown'
import { ApiResponseLoansOverviewInfo } from '../fetchers/overview/getLoansOverviewInfo'
import { ApiResponseLoansProtocolBreakdown } from '../fetchers/overview/getLoansProtocolBreakdown'
import { ApiResponseDueDateLoansStats } from '../fetchers/overview/getDueDateLoansStats'
import { ApiResponseCollectionLoansStats } from '../fetchers/overview/getCollectionLoansStats'

const mockLoansCurrencyBreakdown: ApiResponseLoansCurrencyBreakdown[] = [
  {
    currency: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    totalUsd: 1000000,
    totalNative: 950000,
  },
  {
    currency: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    totalUsd: 5000000,
    totalNative: 4800000,
  },
  {
    currency: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    totalUsd: 8000000,
    totalNative: 7500000,
  },
  {
    currency: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    totalUsd: 1000000,
    totalNative: 950000,
  },
]

const mockLoansOverviewInfo: ApiResponseLoansOverviewInfo = {
  avgApr: 12.5,
  avgUsdValue: 25000,
  loanCount: 150,
  totalRepaymentUsd: 3750000,
  totalUsdValue: 3750000,
  weightedAvgApr: 13.2,
  weightedAvgDuration: 30,
  lendedLoansCount: 45,
  borrowedLoansCount: 75,
  totalEthValueOfEthLoans: 2000000,
  totalUsdValueOfUsdLoans: 1750000,
  totalInterestEthOfEthLoans: 1000000,
  totalInterestUsdOfUsdLoans: 800000,
  totalPrincipalEthOfEthLoans: 1500000,
  totalPrincipalUsdOfUsdLoans: 1200000,
}

const mockLoansProtocolBreakdown: ApiResponseLoansProtocolBreakdown[] = [
  { protocol: 'arcade', total: 1000000 },
  { protocol: 'blur', total: 2000000 },
  { protocol: 'gondi', total: 1500000 },
  { protocol: 'metastreet', total: 2500000 },
  { protocol: 'nftfi', total: 3000000 },
  { protocol: 'x2y2', total: 1000000 },
  { protocol: 'zharta', total: 500000 },
]

const mockLoanStatsByDueDate: ApiResponseDueDateLoansStats[] = [
  {
    avgApr: 12.5,
    avgUsdValue: 25000,
    dueDay: '2024-03-15',
    loanCount: 10,
    totalUsdValue: 250000,
  },
  {
    avgApr: 13.2,
    avgUsdValue: 30000,
    dueDay: '2024-03-16',
    loanCount: 15,
    totalUsdValue: 450000,
  },
  {
    avgApr: 11.8,
    avgUsdValue: 20000,
    dueDay: '2024-03-17',
    loanCount: 8,
    totalUsdValue: 160000,
  },
  {
    avgApr: 14.5,
    avgUsdValue: 35000,
    dueDay: '2024-03-18',
    loanCount: 12,
    totalUsdValue: 420000,
  },
  {
    avgApr: 10.2,
    avgUsdValue: 18000,
    dueDay: '2024-03-19',
    loanCount: 6,
    totalUsdValue: 108000,
  },
  {
    avgApr: 15.8,
    avgUsdValue: 40000,
    dueDay: '2024-03-20',
    loanCount: 18,
    totalUsdValue: 720000,
  },
  {
    avgApr: 12.9,
    avgUsdValue: 28000,
    dueDay: '2024-03-21',
    loanCount: 14,
    totalUsdValue: 392000,
  },
  {
    avgApr: 11.5,
    avgUsdValue: 22000,
    dueDay: '2024-03-22',
    loanCount: 9,
    totalUsdValue: 198000,
  },
  {
    avgApr: 13.7,
    avgUsdValue: 32000,
    dueDay: '2024-03-23',
    loanCount: 16,
    totalUsdValue: 512000,
  },
  {
    avgApr: 14.2,
    avgUsdValue: 38000,
    dueDay: '2024-03-24',
    loanCount: 20,
    totalUsdValue: 760000,
  },
  {
    avgApr: 12.1,
    avgUsdValue: 27000,
    dueDay: '2024-03-25',
    loanCount: 13,
    totalUsdValue: 351000,
  },
  {
    avgApr: 13.5,
    avgUsdValue: 31000,
    dueDay: '2024-03-26',
    loanCount: 17,
    totalUsdValue: 527000,
  },
  {
    avgApr: 11.2,
    avgUsdValue: 21000,
    dueDay: '2024-03-27',
    loanCount: 11,
    totalUsdValue: 231000,
  },
  {
    avgApr: 15.1,
    avgUsdValue: 42000,
    dueDay: '2024-03-28',
    loanCount: 19,
    totalUsdValue: 798000,
  },
  {
    avgApr: 10.8,
    avgUsdValue: 19000,
    dueDay: '2024-03-29',
    loanCount: 7,
    totalUsdValue: 133000,
  },
  {
    avgApr: 14.8,
    avgUsdValue: 36000,
    dueDay: '2024-03-30',
    loanCount: 22,
    totalUsdValue: 792000,
  },
  {
    avgApr: 13,
    avgUsdValue: 29000,
    dueDay: '2024-03-31',
    loanCount: 15,
    totalUsdValue: 435000,
  },
  {
    avgApr: 12.7,
    avgUsdValue: 26000,
    dueDay: '2024-04-01',
    loanCount: 14,
    totalUsdValue: 364000,
  },
  {
    avgApr: 14,
    avgUsdValue: 33000,
    dueDay: '2024-04-02',
    loanCount: 18,
    totalUsdValue: 594000,
  },
  {
    avgApr: 11.9,
    avgUsdValue: 24000,
    dueDay: '2024-04-03',
    loanCount: 12,
    totalUsdValue: 288000,
  },
]

const mockLoanStatsByCollection: ApiResponseCollectionLoansStats[] = [
  {
    avgApr: 12.5,
    avgUsdValue: 100000,
    collectionId: 1,
    collectionImageUrl: 'https://example.com/bayc.png',
    collectionName: 'Bored Ape Yacht Club',
    loanCount: 20,
    percentageOfTotal: 0.44,
    totalUsdValue: 2000000,
  },
  {
    avgApr: 13.8,
    avgUsdValue: 50000,
    collectionId: 2,
    collectionImageUrl: 'https://example.com/punk.png',
    collectionName: 'CryptoPunks',
    loanCount: 30,
    percentageOfTotal: 0.33,
    totalUsdValue: 1500000,
  },
  {
    avgApr: 11.2,
    avgUsdValue: 25000,
    collectionId: 3,
    collectionImageUrl: 'https://example.com/azuki.png',
    collectionName: 'Azuki',
    loanCount: 40,
    percentageOfTotal: 0.23,
    totalUsdValue: 1000000,
  },
]

export const analyticsHandlers = [
  http.get('*/v1/analytics/currency-breakdown', () => {
    return HttpResponse.json(mockLoansCurrencyBreakdown)
  }),

  http.get('*/v1/analytics/summary', () => {
    return HttpResponse.json(mockLoansOverviewInfo)
  }),

  http.get('*/v1/analytics/protocol-breakdown', () => {
    return HttpResponse.json(mockLoansProtocolBreakdown)
  }),

  http.get('*/v1/analytics/stats-by-day', () => {
    return HttpResponse.json(mockLoanStatsByDueDate)
  }),

  http.get('*/v1/analytics/stats-by-collection', () => {
    return HttpResponse.json(mockLoanStatsByCollection)
  }),
]

const mockAssets = {
  results: [
    {
      contract: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e',
      owners: ['0x1111111111111111111111111111111111111111'],
      tokenId: '7332',
      name: 'Doodle #7332',
      imageSmallUrl: '',
      imageMediumUrl: '',
      collection: {
        id: 'f609abfe-bcf0-4a87-8f7c-ae3b8512e45a',
        contract: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e',
        tokenRange: '0:9999',
        tokenSupply: '10000',
        tokenStandard: 'ERC721',
        name: 'Doodles',
        ranking: 9998,
        imageUrl: '',
        whitelisted: true,
        openseaSlug: 'doodles-official',
        floor: null,
        stats: { count: 273, totalUsd: 389259.48909887794, averageUsd: 1425.8589344281243, averageApr: 33.21502443377276, averageDuration: 1747840.6694915255, marketPct: 0.005562317165332661 },
      },
    },
  ],
}

export const apiHandlers = [
  http.get('*/assets?whitelisted=true&wallet=0x2222222222222222222222222222222222222222&page=1&limit=10&projection=collection.stats', () => {
    return HttpResponse.json(mockAssets)
  }),
]
