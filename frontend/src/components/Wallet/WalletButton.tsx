import { useCallback } from 'react'
import { Button, Typography } from '@mui/material'
import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useWallet } from 'src/modules/wallet/useWallet'
import { checkLegalAndRiskDisclaimerConsent } from 'src/utils/legalAndRiskDisclaimer'
import { getTestId } from 'src/utils/testing'
import { Iconify } from '../Iconify'

export type WalletButtonProps = {
  minimise?: boolean
}

export function WalletButton({ minimise = false }: WalletButtonProps) {
  const { t } = useTranslation()
  const { open: openLegalAndRiskDisclaimerModal } = useModals(Modals.LegalAndRiskDisclaimer)
  const { isWalletAvailable } = useWallet()
  const { setShowAuthFlow } = useDynamicContext()

  const handleConnectClick = useCallback(() => {
    const hasConsent = checkLegalAndRiskDisclaimerConsent()
    if (hasConsent === true) {
      setShowAuthFlow(true)
    } else {
      openLegalAndRiskDisclaimerModal({ onProceed: () => setShowAuthFlow(true) })
    }
  }, [openLegalAndRiskDisclaimerModal, setShowAuthFlow])
  return (
    !isWalletAvailable
      ? (
        <Button
          onClick={handleConnectClick}
          sx={theme => ({
            border: `1px solid ${theme.palette.text.primary}`,
            borderRadius: 'var(--dynamic-border-radius)',
            height: '40px',
            background: 'none',
            '& p': {
              fontSize: '12px',
              fontWeight: 400,
            },
          })}
          {...getTestId('nav.connectWallet')}
        >
          {minimise
            ? <MinimisedButton />
            : <Typography variant='body2'>{t('dynamic.connect-wallet')}</Typography>}
        </Button>
      )
      : (
        <DynamicWidget
          {...getTestId('nav.connectWallet')}
          innerButtonComponent={minimise
            ? <MinimisedButton />
            : <p>{t('dynamic.connect-wallet')}</p>
          }
        />
      )
  )
}

function MinimisedButton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Iconify icon='ph:plugs-light' width={20}/>
      <Iconify icon='ph:dots-three-outline-vertical-fill' width={15} />
    </div>
  )
}
