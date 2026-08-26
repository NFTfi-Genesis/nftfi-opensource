import { mutate } from 'swr'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useAuth } from 'src/modules/auth/useAuth'
import { Nft } from 'src/entities/domain/Nft'
import { DataKeys } from 'src/services/keys/keys'
import { Check } from './Check'

export type LoginCheckProps = {
  nft: Nft
}

export function LoginCheck({ nft }: LoginCheckProps) {
  const { t } = useTranslation()
  const { isAuthenticated, authorize } = useAuth()

  const handleClick = async () => {
    await authorize()
    mutate(DataKeys.offersForNft(nft))
  }

  return (
    <Check
      isConditionMet={isAuthenticated}
      text={t('common.authenticate')}
      onClick={handleClick}
      isLoading={false}
    />
  )
}
