import { Button, Stack, Typography, useTheme, RadioGroup, Radio, FormControlLabel, Box } from '@mui/material'
import { useWallet } from 'src/modules/wallet/useWallet'
import { Iconify } from 'src/components/Iconify'
import { JazzIconAvatar } from 'src/components/JazzIconAvatar'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { useAccount } from 'src/services/hooks/account/useAccount'
import {
  Account,
  AccountCommsFrequency,
  AccountCommsOpportunity,
} from 'src/entities/domain/Account'
import { LoginPanel } from 'src/components/ConnectWallet/LoginPanel'
import { useAuth } from 'src/modules/auth/useAuth'
import { useUpdateAccountCommunications } from 'src/services/hooks/account/useUpdateAccountCommunications'
import { Panel } from 'src/components/Panel'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'

export function AccountSettings() {
  const theme = useTheme()
  const { isLaptopOrDesktopView } = useBreakpoints()
  const { t } = useTranslation()
  const { walletAddress } = useWallet()
  const { isAuthenticated } = useAuth()
  const { data: userProfile } = useAccount()
  const { send: updateAccountCommunications } = useUpdateAccountCommunications()
  const { open: openEditProfileModal } = useModals(Modals.EditProfile)

  const {
    username,
    email,
    discordUsername,
    communications: comms,
  } = userProfile || {}

  let maturityFrequency = AccountCommsOpportunity.Never
  if (comms?.maturity?.frequency == AccountCommsFrequency.Daily) {
    maturityFrequency = AccountCommsOpportunity.MyLoans
  } else if (comms?.refi?.frequency == AccountCommsFrequency.Daily) {
    maturityFrequency = AccountCommsOpportunity.AllLoans
  }

  const handleSetMaturityCommunications = ({
    target: { value },
  }: React.ChangeEvent<HTMLInputElement>) => {
    const payload: Partial<Account['communications']> = {
      maturity: { frequency: AccountCommsFrequency.Never },
      refi: { frequency: AccountCommsFrequency.Never },
    }
    if (value === AccountCommsOpportunity.MyLoans) {
      payload.maturity = { frequency: AccountCommsFrequency.Daily }
    } else if (value === AccountCommsOpportunity.AllLoans) {
      payload.refi = { frequency: AccountCommsFrequency.Daily }
    }
    updateAccountCommunications(payload)
  }
  const handleSetLiquidityCommunications = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    updateAccountCommunications({
      liquidity: { frequency: e.target.value as AccountCommsFrequency },
    })
  }

  if (!isAuthenticated)
    return <LoginPanel message={t('user-details-page.login-warning')} />

  return (
    <>
      <Panel fullWidth>
        <Stack
          direction='column'
          gap={3}
          justifyContent='space-between'
          flex={1}
        >
          <Stack
            direction={isLaptopOrDesktopView
              ? 'row'
              : 'column'}
            gap={2}
            justifyContent='space-between'
            flex={1}
          >
            <Stack direction='row' gap={2} alignItems='flex-start' minWidth={0} flex={1}>
              <Box>
                {walletAddress && <JazzIconAvatar address={walletAddress} diameter={64} />}
              </Box>
              <Typography variant='h3' sx={{ wordBreak: 'break-all' }} fontSize={{ sm: '1.5rem', xl: '2rem' }}>
                {username || walletAddress}
              </Typography>
            </Stack>
            <Button
              onClick={() => {
                if (!userProfile) return
                openEditProfileModal({ account: userProfile })
              }}
              variant='outlined'
              startIcon={<Iconify icon='ph:pencil' />}
              size='medium'
            >
              {t('user-details-page.edit-details')}
            </Button>
          </Stack>
          <Stack
            gap={3}
            justifyContent='space-between'
            borderTop={`1px dashed ${theme.palette.divider}`}
            paddingTop={2}
          >
            <Stack gap={1}>
              <ItemLabel title={t('user-details-page.discord')} />
              <Typography variant='subtitle1'>{discordUsername}</Typography>
            </Stack>
            <Stack gap={1}>
              <ItemLabel title={t('user-details-page.email')} />
              <Typography variant='subtitle1'>{email}</Typography>
            </Stack>
          </Stack>
        </Stack>
      </Panel>

      <Panel fullWidth>
        <Stack gap={3}>
          <Typography variant='h4'>
            {t('user-details-page.manage-email-notifications')}
          </Typography>
          <RadioGroupContainer
            title={t('user-details-page.liquidity-summary-for-borrowers')}
            description={t('user-details-page.liquidity-summary-description')}
          >
            <RadioGroup
              value={comms?.liquidity?.frequency || ''}
              onChange={handleSetLiquidityCommunications}
              sx={{ flex: 3 }}
            >
              <RadioOptionsContainer>
                <RadioOption
                  value={AccountCommsFrequency.Daily}
                  label={t('user-details-page.option-daily')}
                />
                <RadioOption
                  value={AccountCommsFrequency.Weekly}
                  label={t('user-details-page.option-weekly')}
                />
                <RadioOption
                  value={AccountCommsFrequency.Never}
                  label={t('user-details-page.option-never')}
                />
              </RadioOptionsContainer>
            </RadioGroup>
          </RadioGroupContainer>

          <RadioGroupContainer
            title={t('user-details-page.refinance-possibilities-Lenders')}
            description={t(
              'user-details-page.refinance-possibilities-description'
            )}
          >
            <RadioGroup
              value={maturityFrequency}
              onChange={handleSetMaturityCommunications}
              sx={{ flex: 3 }}
            >
              <RadioOptionsContainer>
                <RadioOption
                  value={AccountCommsOpportunity.MyLoans}
                  label={t('user-details-page.option-my-loans-only')}
                />
                <RadioOption
                  value={AccountCommsOpportunity.AllLoans}
                  label={t('user-details-page.option-all-loans')}
                />
                <RadioOption
                  value={AccountCommsOpportunity.Never}
                  label={t('user-details-page.option-never')}
                />
              </RadioOptionsContainer>
            </RadioGroup>
          </RadioGroupContainer>
        </Stack>
      </Panel>
    </>
  )
}

function ItemLabel({ title }: { title?: string }) {
  return (
    <Typography variant='caption' color='label'>
      {title}
    </Typography>
  )
}

function RadioOption({
  value,
  label,
  description,
}: {
  value: string
  label: string
  description?: string
}) {
  return (
    <FormControlLabel
      value={value}
      control={<Radio />}
      sx={{ alignItems: 'unset', marginLeft: 0, marginRight: 0, flex: 1 }}
      label={
        <Stack mt={0.8}>
          <Typography variant='body2'>{label}</Typography>
          <Typography variant='caption' color='text.secondary'>
            {description}
          </Typography>
        </Stack>
      }
    />
  )
}

function RadioOptionsContainer({ children }: { children: React.ReactNode }) {
  const { isLaptopOrDesktopView } = useBreakpoints()
  return (
    <Stack
      direction={isLaptopOrDesktopView
        ? 'row'
        : 'column'}
      padding={1}
      alignItems={isLaptopOrDesktopView
        ? 'center'
        : 'flex-start'}
      flex={1}
      borderRadius={2}
      bgcolor='background.neutral'
    >
      {children}
    </Stack>
  )
}

function RadioGroupContainer({
  title,
  description,
  children,
}: {
  title?: string
  description?: string
  children: React.ReactNode
}) {
  const theme = useTheme()
  const { isLaptopOrDesktopView } = useBreakpoints()
  return (
    <Stack
      gap={3}
      flex={1}
      direction={isLaptopOrDesktopView
        ? 'row'
        : 'column'}
      pt={2}
      borderTop={`1px dashed ${theme.palette.divider}`}
    >
      <Stack flex={2} gap={0.5}>
        {title && <Typography variant='h5'>{title}</Typography>}
        {description && (
          <Typography variant='caption2' color='label'>
            {description}
          </Typography>
        )}
      </Stack>
      {children}
    </Stack>
  )
}
