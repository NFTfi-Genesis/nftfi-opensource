import { z } from 'zod'
import { Currency } from 'src/entities/domain/Currency'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { createDecimalNumberSchema, createIntegerNumberSchema } from 'src/utils/validation'

export const MIN_EXPIRY_DAYS = 0
export const MAX_EXPIRY_DAYS = 30
export const MIN_DURATION_DAYS = 1
export const MAX_DURATION_DAYS = 1825

export function createMakeOfferSchema(t: ReturnType<typeof useTranslation>['t']) {
  const principalSchema = createDecimalNumberSchema(t, { required: true, positive: true })
  const originationFeeSchema = createDecimalNumberSchema(t, { required: false, positive: true })
  const aprSchema = createIntegerNumberSchema(t, { required: true, positive: true })

  return z.object({
    currency: z.union([z.literal(Currency.WETH), z.literal(Currency.USDC)]),
    isFlexible: z.boolean(),
    offerExpiry: z.number()
      .min(MIN_EXPIRY_DAYS, t('lend.errors.expiration-too-short'))
      .max(MAX_EXPIRY_DAYS, t('lend.errors.expiration-too-long')),
    duration: z.number()
      .min(MIN_DURATION_DAYS, t('lend.errors.duration-too-short'))
      .max(MAX_DURATION_DAYS, t('lend.errors.duration-too-long')),
    principal: principalSchema,
    apr: aprSchema,
    originationFee: originationFeeSchema,
  }).refine(
    data => {
      if (data.originationFee === 0) return true
      return data.originationFee < data.principal
    },
    {
      message: t('lend.errors.origination-fee-too-high' as Parameters<ReturnType<typeof useTranslation>['t']>[0]),
      path: ['originationFee'],
    }
  )
}
