import { Address } from 'src/entities/base/Address'
import { Loan } from 'src/entities/domain/Loan'
import { Protocol } from 'src/entities/domain/Protocol'
import { traversePages } from 'src/utils/fetchers'
import { getLoans } from './getLoans'

export async function getAllLoansByLender(lender: Address, protocols: Protocol[]): Promise<Array<Loan<Protocol>>> {
  const pageSize = 50
  const startPage = 0

  const result = await traversePages(
    async (page: number) => {
      const response = await getLoans({
        filters: { lender, protocols },
        pagination: { page, pageSize },
      })
      return { results: response.data }
    },
    pageSize,
    startPage
  )

  return result.results
}
