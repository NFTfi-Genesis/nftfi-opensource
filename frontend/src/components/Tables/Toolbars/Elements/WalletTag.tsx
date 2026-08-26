import { memo } from 'react'
import { useEnsReverseLookup } from 'src/hooks/useEnsReverseLookup'
import { Address } from 'src/entities/base/Address'
import { FilterTag } from './FilterTag'

export const WalletTag = memo(function WalletTag({ wallet, onDelete }: { wallet: Address, onDelete?: () => void }) {
  const ensName = useEnsReverseLookup(wallet)

  return (
    <FilterTag
      label={ensName || wallet.slice(2, 8)}
      onDelete={onDelete}
      sx={{
        maxWidth: {
          xs: '210px',
          md: 'none',
        },
      }}
    />
  )
})
