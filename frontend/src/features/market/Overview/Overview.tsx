import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLoansOverviewInfo } from 'src/services/hooks/overview/useLoansOverviewInfo'
import { useLoansCurrencyBreakdown } from 'src/services/hooks/overview/useLoansCurrencyBreakdown'
import { useLoansProtocolBreakdown } from 'src/services/hooks/overview/useLoansProtocolBreakdown'
import { useCollectionLoansStats } from 'src/services/hooks/overview/useCollectionLoansStats'
import { MarketFilters, useMarketFilters } from 'src/features/market/tables/useMarketFilters'
import { formatAmountCompact } from 'src/utils/amounts'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { formatAvg, formatPercentage } from 'src/utils/numbers'
import { Amount } from 'src/entities/base/Amount'
import { Percentage } from 'src/entities/base/Percentage'
import { useDueDateLoansStats } from 'src/services/hooks/overview/useDueDateLoansStats'
import {
  areStatsEmpty,
  formatLoansCurrencyBreakdown,
  formatLoansProtocolBreakdown,
  formatLoanStatsByCollection,
  getChartMode,
  isManyDueDateLoanStatsEmpty,
} from './utils'
import { DataCard } from './DataCard'
import { TooltipOverviewMaturing } from './TooltipOverviewMaturing'
import { BarChartSplit } from './BarChartSplit'
import { BarChartPercentage } from './BarChartPercentage'
import { LoansDueChart } from './LoansDueChart/LoansDueChart'

export function Overview() {
  const { t } = useTranslation()
  const theme = useTheme()
  const [overviewExpanded] = useLocalStorage(LocalStorageKeys.DashboardUserPreferences.OverviewExpanded)
  const location = useLocation()
  const { pickFilters } = useMarketFilters()
  const filterKeys = useMemo((): (keyof MarketFilters)[] => {
    const baseFilters: (keyof MarketFilters)[] = ['protocol', 'collectionIds', 'currency', 'dueWithin']

    if (location.pathname === '/market/lenders') {
      return [...baseFilters, 'lender']
    } else if (location.pathname === '/market/borrowers') {
      return [...baseFilters, 'borrower']
    } else if (location.pathname === '/market/active-loans' || location.pathname === '/') {
      return [...baseFilters, 'wallets']
    }

    return [...baseFilters]
  }, [location.pathname])

  // Data fetching
  const filters = useMemo(() => pickFilters(filterKeys), [pickFilters, filterKeys])

  const {
    data: loanStatsByDueDate,
    error: loanStatsByDueDateError,
    isLoading: loanStatsByDueDateLoading,
  } = useDueDateLoansStats({
    filters,
  })
  const {
    data: loansOverviewInfo,
    error: loansOverviewInfoError,
    isLoading: loansOverviewInfoLoading,
  } = useLoansOverviewInfo({
    filters,
  })
  const {
    data: loansCurrencyBreakdown,
    error: loansCurrencyBreakdownError,
    isLoading: loansCurrencyBreakdownLoading,
  } = useLoansCurrencyBreakdown({
    filters,
  })
  const {
    data: loansProtocolBreakdown,
    error: loansProtocolBreakdownError,
    isLoading: loansProtocolBreakdownLoading,
  } = useLoansProtocolBreakdown({
    filters,
  })
  const {
    data: loanStatsByCollection,
    error: loanStatsByCollectionError,
    isLoading: loanStatsByCollectionLoading,
  } = useCollectionLoansStats({
    filters,
  })

  const loansCardTitle = useMemo(() => {
    if (filters.lender) {
      return t('dashboard.overview.cards.loans.title-loaned')
    } else if (filters.borrower) {
      return t('dashboard.overview.cards.loans.title-borrowed')
    }

    return t('dashboard.overview.cards.loans.title')
  }, [filters.lender, filters.borrower, t])

  return (
    <Stack direction='column' spacing={4}>
      <Section title={t('dashboard.overview.loans-maturing')} hide={isManyDueDateLoanStatsEmpty(loanStatsByDueDate || [])}>
        <LoansDueChart
          data={loanStatsByDueDate || []}
          chartMode={getChartMode(filters)}
          loading={loanStatsByDueDateLoading}
          error={Boolean(loanStatsByDueDateError) && !loanStatsByDueDateLoading}
        />
      </Section>

      <Section title={t('dashboard.overview.overview')} hide={areStatsEmpty(loansOverviewInfo, loansOverviewInfoLoading, loansOverviewInfoError)}>
        <Stack spacing={2}>
          <Stack direction={overviewExpanded
            ? 'row'
            : 'column'} spacing={2}>
            <TooltipOverviewMaturing data={loansOverviewInfo}>
              <DataCard
                cardTitle={t('dashboard.overview.cards.maturing.title')}
                value={`$${formatAmountCompact(loansOverviewInfo?.totalUsdValue || (0 as Amount))}`}
                subtext={t('dashboard.overview.cards.maturing.subtext', {
                  eth: formatAmountCompact(loansOverviewInfo?.totalValueOfEthTokens || (0 as Amount)),
                  usd: formatAmountCompact(loansOverviewInfo?.totalValueOfUsdTokens || (0 as Amount)),
                })}
                loading={loansOverviewInfoLoading}
                error={Boolean(loansOverviewInfoError) && !loansOverviewInfoLoading}
                dataRawValue={{
                  total: loansOverviewInfo?.totalUsdValue,
                  eth: loansOverviewInfo?.totalValueOfEthTokens,
                  usd: loansOverviewInfo?.totalValueOfUsdTokens,
                }}
              />
            </TooltipOverviewMaturing>
            <DataCard
              cardTitle={loansCardTitle}
              value={`${loansOverviewInfo?.loanCount || 0}`}
              subtext={t('dashboard.overview.cards.loans.subtext', {
                lenders: loansOverviewInfo?.lendedLoansCount || 0,
                borrowers: loansOverviewInfo?.borrowedLoansCount || 0,
              })}
              showSubtext={Boolean(filters.wallets && filters.wallets.length === 1)}
              loading={loansOverviewInfoLoading}
              error={Boolean(loansOverviewInfoError) && !loansOverviewInfoLoading}
              dataRawValue={{
                'loan-count': loansOverviewInfo?.loanCount,
                lenders: loansOverviewInfo?.lendedLoansCount,
                borrowers: loansOverviewInfo?.borrowedLoansCount,
              }}
            />
          </Stack>
          <Stack direction={overviewExpanded
            ? 'row'
            : 'column'} spacing={2}>
            <DataCard
              cardTitle={t('dashboard.overview.cards.apr.title')}
              value={`${formatPercentage(loansOverviewInfo?.weightedAvgApr || (0 as Percentage))}%`}
              subtext={t('dashboard.overview.cards.apr.subtext')}
              loading={loansOverviewInfoLoading}
              error={Boolean(loansOverviewInfoError) && !loansOverviewInfoLoading}
              dataRawValue={{ apr: loansOverviewInfo?.weightedAvgApr }}
            />
            <DataCard
              cardTitle={t('dashboard.overview.cards.duration.title')}
              value={`${formatAvg(loansOverviewInfo?.weightedAvgDuration || 0)} days`}
              subtext={t('dashboard.overview.cards.duration.subtext')}
              loading={loansOverviewInfoLoading}
              error={Boolean(loansOverviewInfoError) && !loansOverviewInfoLoading}
              dataRawValue={{
                duration: loansOverviewInfo?.weightedAvgDuration,
              }}
            />
          </Stack>
        </Stack>
      </Section>

      <Section
        title={t('dashboard.overview.currency-split')}
        hide={areStatsEmpty(loansCurrencyBreakdown, loansCurrencyBreakdownLoading, loansCurrencyBreakdownError)}
      >
        <BarChartSplit
          data={loansCurrencyBreakdown
            ? formatLoansCurrencyBreakdown(loansCurrencyBreakdown, theme)
            : []}
          showLegend={overviewExpanded}
          loading={loansCurrencyBreakdownLoading}
          error={Boolean(loansCurrencyBreakdownError) && !loansCurrencyBreakdownLoading}
          type='currency'
        />
      </Section>

      <Section
        title={t('dashboard.overview.protocol-split')}
        hide={areStatsEmpty(loansProtocolBreakdown, loansProtocolBreakdownLoading, loansProtocolBreakdownError)}
      >
        <BarChartSplit
          data={loansProtocolBreakdown
            ? formatLoansProtocolBreakdown(loansProtocolBreakdown, theme)
            : []}
          showLegend={overviewExpanded}
          loading={loansProtocolBreakdownLoading}
          error={Boolean(loansProtocolBreakdownError) && !loansProtocolBreakdownLoading}
          type='protocol'
        />
      </Section>

      <Section
        title={t('dashboard.overview.top-collections')}
        hide={areStatsEmpty(loanStatsByCollection, loanStatsByCollectionLoading, loanStatsByCollectionError)}
      >
        <BarChartPercentage
          data={loanStatsByCollection
            ? formatLoanStatsByCollection(loanStatsByCollection)
            : []}
          loading={loanStatsByCollectionLoading}
          error={Boolean(loanStatsByCollectionError) && !loanStatsByCollectionLoading}
        />
      </Section>
    </Stack>
  )
}

function Section({ title, children, hide = false }: { title: string, children: React.ReactNode, hide?: boolean }) {
  if (hide) {
    return null
  }

  return (
    <Stack direction='column' spacing={2}>
      <Typography variant='subtitle2'>{title}</Typography>
      {children}
    </Stack>
  )
}
