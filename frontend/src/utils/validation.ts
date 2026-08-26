import { z } from 'zod'
import { useTranslation } from 'src/modules/translation/useTranslation'

export const MIN_EXPIRY_DAYS = 0
export const MAX_EXPIRY_DAYS = 30
export const MIN_DURATION_DAYS = 1
export const MAX_DURATION_DAYS = 1825

export function createDecimalNumberSchema(t: ReturnType<typeof useTranslation>['t'], options?: { required?: boolean, positive?: boolean }) {
  const { required = true, positive = false } = options || {}

  return z.string().superRefine((val, ctx) => {
    const trimmed = val.trim()
    if (trimmed === '') {
      if (required) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('validation.required' as Parameters<ReturnType<typeof useTranslation>['t']>[0]),
        })
      }
      return
    }

    const normalized = trimmed.replace(',', '.')
    const numberPattern = /^-?\d+\.?\d*$|^-?\d*\.\d+$/
    const parsed = Number.parseFloat(normalized)
    if (!numberPattern.test(normalized) || Number.isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('validation.must-be-number' as Parameters<ReturnType<typeof useTranslation>['t']>[0]),
      })
      return
    }

    if (positive && parsed <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('validation.must-be-positive' as Parameters<ReturnType<typeof useTranslation>['t']>[0]),
      })
      return
    }
  }).transform(val => {
    const trimmed = val.trim()
    if (trimmed === '') {
      return 0
    }
    const normalized = trimmed.replace(',', '.')
    return Number.parseFloat(normalized)
  })
}

export function createIntegerNumberSchema(t: ReturnType<typeof useTranslation>['t'], options?: { required?: boolean, positive?: boolean }) {
  const { required = true, positive = false } = options || {}

  return z.string().superRefine((val, ctx) => {
    const trimmed = val.trim()
    if (trimmed === '') {
      if (required) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('validation.required' as Parameters<ReturnType<typeof useTranslation>['t']>[0]),
        })
      }
      return
    }

    const integerPattern = /^-?\d+$/
    const parsed = Number.parseInt(trimmed, 10)
    if (!integerPattern.test(trimmed) || Number.isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('validation.must-be-integer' as Parameters<ReturnType<typeof useTranslation>['t']>[0]),
      })
      return
    }

    if (positive && parsed <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('validation.must-be-positive' as Parameters<ReturnType<typeof useTranslation>['t']>[0]),
      })
      return
    }
  }).transform(val => {
    const trimmed = val.trim()
    if (trimmed === '') {
      return 0
    }
    return Number.parseInt(trimmed, 10)
  })
}
