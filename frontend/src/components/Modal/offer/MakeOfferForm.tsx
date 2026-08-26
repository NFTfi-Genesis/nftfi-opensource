import { useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TextField, Box, InputAdornment, Typography, IconButton } from '@mui/material'
import { BalanceCheck } from 'src/components/Modal/checks/BalanceCheck'
import { Currency } from 'src/entities/domain/Currency'
import { FormProvider } from 'src/modules/forms/FormProvider'
import { ToggleGroupInput } from 'src/components/Forms/ToggleGroupInput'
import { ToggleGroupWithCustomIntegerInput } from 'src/components/Forms/ToggleGroupWithCustomIntegerInput'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Amount } from 'src/entities/base/Amount'
import { Wei } from 'src/entities/base/Wei'
import { amountToWei } from 'src/utils/amounts'
import { getCurrencyTicker } from 'src/utils/currencies'
import { config } from 'src/config/config'
import { ChecksContainer } from 'src/components/Modal/common/ChecksContainer'
import { ChecksProvider } from 'src/components/Modal/checks/ChecksProvider'
import { AllowanceCheck } from 'src/components/Modal/checks/AllowanceCheck'
import { FloorPriceWarningCheck } from 'src/components/Modal/checks/FloorPriceWarningCheck'
import { Iconify } from 'src/components/Iconify'
import { Modals } from 'src/modules/modals/Modals'
import { Collection } from 'src/entities/domain/Collection'
import { AprInterestDisplay } from './AprInterestDisplay'
import { createMakeOfferSchema } from './schemaValidation'
import { MakeOfferModalAction } from './MakeOfferModalAction'

export type FormData = {
  currency: Currency.USDC | Currency.WETH
  isFlexible: boolean
  duration: number
  apr: number
  principal: number
  offerExpiry: number
  originationFee: number
}

type MakeOfferModalProps = {
  modal: Modals.MakeAssetOffer | Modals.MakeCollectionOffer
  handleSubmit: (data: FormData) => Promise<void>
  isMutating: boolean
  collection: Collection
}

export function MakeOfferForm ({ modal, handleSubmit, isMutating, collection }: MakeOfferModalProps) {
  const { t } = useTranslation()
  const makeOfferSchema = createMakeOfferSchema(t)
  type MakeOfferFormValues = z.input<typeof makeOfferSchema>
  type MakeOfferFormOutput = z.infer<typeof makeOfferSchema>

  const formMethods = useForm<MakeOfferFormValues>({
    resolver: zodResolver(makeOfferSchema),
    mode: 'onChange',
    defaultValues: {
      currency: Currency.WETH,
      isFlexible: true,
      offerExpiry: 0.5,
      duration: 7,
      principal: '',
      apr: '',
      originationFee: '',
    },
  })

  const { register, formState, watch, control } = formMethods
  const principalValue = watch('principal')
  const isFlexibleValue = watch('isFlexible')
  const currencyValue = watch('currency')
  const aprValue = watch('apr')
  const durationValue = watch('duration')
  const originationFeeValue = watch('originationFee')

  const principalNum = principalValue && typeof principalValue === 'string' && principalValue.trim() !== ''
    ? Number.parseFloat(principalValue.trim().replace(',', '.'))
    : 0
  const principalWei = principalNum > 0 && Number.isFinite(principalNum)
    ? amountToWei(principalNum as Amount, currencyValue)
    : (0n as Wei)

  const handleAction = useCallback(async () => {
    const isValid = await formMethods.trigger()
    if (isValid) {
      const data = formMethods.getValues()
      const validated = makeOfferSchema.parse(data) as MakeOfferFormOutput
      await handleSubmit(validated)
    }
  }, [formMethods, handleSubmit, makeOfferSchema])

  return (
    <FormProvider formMethods={formMethods} onSubmit={handleAction}>
      <ChecksProvider>
        <Box display='grid' gridTemplateColumns='1fr 1fr' gap={2}>
          <Controller
            name='currency'
            control={control}
            render={({ field }) => (
              <ToggleGroupInput
                name='currency'
                value={field.value}
                onChange={field.onChange}
                options={ [Currency.WETH, Currency.USDC]}
                formatOption={option => getCurrencyTicker(option)}
              />
            )}
          />
          <TextField
            {...register('principal')}
            label={t('lend.principal')}
            error={!!formState.errors.principal}
            helperText={formState.errors.principal?.message}
            fullWidth
            slotProps={{
              input: {
                sx: { height: 48 },
                startAdornment: <InputAdornment position='start'><Typography variant='caption'>{getCurrencyTicker(currencyValue)}</Typography></InputAdornment>,
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton
                      onClick={() => formMethods.setValue('principal', '')}
                      edge='end'
                    >
                      <Iconify icon='ph:x-circle' width={24} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Controller
            name='isFlexible'
            control={control}
            render={({ field }) => (
              <ToggleGroupInput
                name='loan-type'
                value={field.value}
                onChange={field.onChange}
                options={[true, false]}
                formatOption={option =>
                  option
                    ? t('lend.flexible')
                    : t('lend.fixed')}
              />
            )}
          />
          <TextField
            {...register('apr')}
            label={t('lend.apr')}
            error={!!formState.errors.apr}
            helperText={formState.errors.apr?.message}
            fullWidth
            slotProps={{
              input: {
                sx: { height: 48 },
                startAdornment: <InputAdornment position='start'><Typography variant='caption'>%</Typography></InputAdornment>,
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton
                      onClick={() => formMethods.setValue('apr', '')}
                      edge='end'
                    >
                      <Iconify icon='ph:x-circle' width={24} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            {...register('originationFee')}
            label={t('lend.origination-fee')}
            error={!!formState.errors.originationFee}
            helperText={formState.errors.originationFee?.message}
            fullWidth
            sx={{ gridColumn: 'span 2' }}
            slotProps={{
              input: {
                sx: { height: 48 },
                startAdornment: <InputAdornment position='start'><Typography variant='caption'>{getCurrencyTicker(currencyValue)}</Typography></InputAdornment>,
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton
                      onClick={() => formMethods.setValue('originationFee', '')}
                      edge='end'
                    >
                      <Iconify icon='ph:x-circle' width={24} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Box gridColumn='span 2'>
            <Controller
              name='duration'
              control={control}
              render={({ field }) => (
                <ToggleGroupWithCustomIntegerInput
                  label={t('lend.duration')}
                  name='duration'
                  value={field.value}
                  onChange={field.onChange}
                  options={[7, 14, 30, 60, 90, 365]}
                />
              )}
            />
          </Box>

          <Box gridColumn='span 2'>
            <Controller
              name='offerExpiry'
              control={control}
              render={({ field }) => (
                <ToggleGroupWithCustomIntegerInput
                  label={t('lend.offer-expiry')}
                  name='offer-expiry'
                  value={field.value}
                  onChange={field.onChange}
                  options={[0.5, 1, 2, 3, 7]}
                />
              )}
            />
          </Box>
          <AprInterestDisplay
            principal={principalValue}
            apr={aprValue}
            duration={durationValue}
            originationFee={originationFeeValue}
            currency={currencyValue}
            isFlexible={isFlexibleValue}
          />
        </Box>
        <ChecksContainer title={t('lend.offer-checks')}>
          <BalanceCheck optional={true} currency={currencyValue} amount={principalWei} />
          <AllowanceCheck
            key={`${currencyValue}-${principalWei.toString()}`}
            currency={currencyValue}
            spender={config.ethereum.contracts.nftfi.v3.erc20Manager.address}
            amount={principalWei}
            max={true}
          />
          {principalNum > 0 && (
            <FloorPriceWarningCheck
              collection={collection}
              principal={principalNum as Amount}
              currency={currencyValue}
            />
          )}
        </ChecksContainer>
        <MakeOfferModalAction modal={modal} isMutating={isMutating} />
      </ChecksProvider>
    </FormProvider>
  )
}
