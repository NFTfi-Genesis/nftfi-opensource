import { Box } from '@mui/material'
import { ActionButtonCell } from 'src/components/Tables/Cells/ActionButtonCell'
import { Loan } from 'src/entities/domain/Loan'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { useLoanExtensionOfferForLoan } from 'src/services/hooks/loanExtension/useLoanExtensionOfferForLoan'
import { getTestId } from 'src/utils/testing'

type LoanExtensionOfferLoan = LoanExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>> & Loan

export function ViewLoanExtensionOfferActionCell({
  loan,
  onClick,
}: {
  loan: LoanExtensionOfferLoan
  onClick: (loan: LoanExtensionOfferLoan) => void
}) {
  const { data: offer } = useLoanExtensionOfferForLoan(loan)

  if (!offer) {
    return null
  }

  return (
    <Box {...getTestId('borrow.history.view-extension')} sx={{ height: '100%' }}>
      <ActionButtonCell
        onClick={onClick as (rowData: unknown) => void}
        rowData={loan}
        buttonCopyTranslationKey='custom-table-columns.view-extension-offer-cta'
      />
    </Box>
  )
}
