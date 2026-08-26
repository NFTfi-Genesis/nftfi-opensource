import { useTranslation } from 'src/modules/translation/useTranslation'
import { Wei } from 'src/entities/base/Wei'
import { GondiRefinanceData } from 'src/services/types/GondiRefinanceData'
import { Check } from './Check'

export type GondiRepaymentData = {
  encodedRepaymentData: GondiRefinanceData['encodedRepaymentData']
  repayment: Wei
}

export type GondiRepaymentSignatureCheckProps = {
  hash?: string
  onSign: (hash?: string) => void
  signatureData: GondiRepaymentData | null
}

export function GondiRepaymentSignatureCheck({ hash, onSign, signatureData }: GondiRepaymentSignatureCheckProps) {
  const { t } = useTranslation()

  const handleClick = () => {
    onSign(hash)
  }

  return (
    <Check
      isConditionMet={signatureData !== null}
      text={t('borrow.allow-gondi-loan-repayment')}
      onClick={handleClick}
      isLoading={false}
    />
  )
}
