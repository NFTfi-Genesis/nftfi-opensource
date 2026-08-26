import { Seconds } from 'src/entities/base/Seconds'
import { DataKeys } from '../../keys/keys'
import { getLoansWithNftInfo } from '../../fetchers/loan/getLoansWithNftInfo'
import { useFetcher } from '../base/useFetcher'
import { GetLoansParams } from '../../fetchers/loan/getLoans'

export function useLoans(params: GetLoansParams) {
  const pagination = params?.pagination
  const sort = params?.sort
  const filters = params?.filters

  return useFetcher(
    DataKeys.loans({ filters, pagination, sort }),
    () => getLoansWithNftInfo({ filters, pagination, sort }),
    {
      pollInterval: 60 as Seconds,
    }
  )
}
