import { describe, it, expect } from 'vitest'
import { TFunction } from 'src/modules/translation/TFunction'
import { createDecimalNumberSchema, createIntegerNumberSchema } from '../validation'

// Mock translation function
const mockT = ((key: string) => {
  const translations: Record<string, string> = {
    'validation.required': 'required',
    'validation.must-be-number': 'Must be a number',
    'validation.must-be-integer': 'Must be an integer',
    'validation.must-be-positive': 'Value must be positive',
  }
  return translations[key] || key
}) as TFunction

describe('validation utils', () => {
  describe('createDecimalNumberSchema', () => {
    describe('default options (required: true, positive: false)', () => {
      it('should accept valid decimal numbers', async () => {
        const schema = createDecimalNumberSchema(mockT)

        expect(await schema.safeParseAsync('123')).toMatchObject({
          success: true,
          data: 123,
        })
        expect(await schema.safeParseAsync('123.45')).toMatchObject({
          success: true,
          data: 123.45,
        })
        expect(await schema.safeParseAsync('0.5')).toMatchObject({
          success: true,
          data: 0.5,
        })
        expect(await schema.safeParseAsync('.5')).toMatchObject({
          success: true,
          data: 0.5,
        })
        expect(await schema.safeParseAsync('123.')).toMatchObject({
          success: true,
          data: 123,
        })
      })

      it('should accept negative numbers', async () => {
        const schema = createDecimalNumberSchema(mockT)

        expect(await schema.safeParseAsync('-123')).toMatchObject({
          success: true,
          data: -123,
        })
        expect(await schema.safeParseAsync('-123.45')).toMatchObject({
          success: true,
          data: -123.45,
        })
        expect(await schema.safeParseAsync('-0.5')).toMatchObject({
          success: true,
          data: -0.5,
        })
      })

      it('should normalize comma to dot', async () => {
        const schema = createDecimalNumberSchema(mockT)

        expect(await schema.safeParseAsync('123,45')).toMatchObject({
          success: true,
          data: 123.45,
        })
        expect(await schema.safeParseAsync('0,5')).toMatchObject({
          success: true,
          data: 0.5,
        })
      })

      it('should trim whitespace', async () => {
        const schema = createDecimalNumberSchema(mockT)

        expect(await schema.safeParseAsync('  123.45  ')).toMatchObject({
          success: true,
          data: 123.45,
        })
        expect(await schema.safeParseAsync('  123  ')).toMatchObject({
          success: true,
          data: 123,
        })
      })

      it('should reject empty strings', async () => {
        const schema = createDecimalNumberSchema(mockT)

        const result = await schema.safeParseAsync('')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('required')
        }
      })

      it('should reject whitespace-only strings', async () => {
        const schema = createDecimalNumberSchema(mockT)

        const result = await schema.safeParseAsync('   ')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('required')
        }
      })

      it('should reject invalid number formats', async () => {
        const schema = createDecimalNumberSchema(mockT)

        const invalidInputs = ['abc', '12.34.56', '12abc', 'abc123', '1.2.3', '..5']

        for (const input of invalidInputs) {
          const result = await schema.safeParseAsync(input)
          expect(result.success).toBe(false)
          if (!result.success) {
            expect(result.error.issues[0].message).toBe('Must be a number')
          }
        }
      })
    })

    describe('with required: false', () => {
      it('should accept empty strings and transform to 0', async () => {
        const schema = createDecimalNumberSchema(mockT, { required: false })

        expect(await schema.safeParseAsync('')).toMatchObject({
          success: true,
          data: 0,
        })
        expect(await schema.safeParseAsync('   ')).toMatchObject({
          success: true,
          data: 0,
        })
      })

      it('should still accept valid numbers', async () => {
        const schema = createDecimalNumberSchema(mockT, { required: false })

        expect(await schema.safeParseAsync('123.45')).toMatchObject({
          success: true,
          data: 123.45,
        })
      })
    })

    describe('with positive: true', () => {
      it('should accept positive numbers', async () => {
        const schema = createDecimalNumberSchema(mockT, { positive: true })

        expect(await schema.safeParseAsync('123')).toMatchObject({
          success: true,
          data: 123,
        })
        expect(await schema.safeParseAsync('123.45')).toMatchObject({
          success: true,
          data: 123.45,
        })
        expect(await schema.safeParseAsync('0.1')).toMatchObject({
          success: true,
          data: 0.1,
        })
      })

      it('should reject zero', async () => {
        const schema = createDecimalNumberSchema(mockT, { positive: true })

        const result = await schema.safeParseAsync('0')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Value must be positive')
        }
      })

      it('should reject negative numbers', async () => {
        const schema = createDecimalNumberSchema(mockT, { positive: true })

        const negativeInputs = ['-123', '-123.45', '-0.1']

        for (const input of negativeInputs) {
          const result = await schema.safeParseAsync(input)
          expect(result.success).toBe(false)
          if (!result.success) {
            expect(result.error.issues[0].message).toBe('Value must be positive')
          }
        }
      })
    })

    describe('with both required: false and positive: true', () => {
      it('should accept empty strings and transform to 0 (positive check skipped for empty)', async () => {
        const schema = createDecimalNumberSchema(mockT, { required: false, positive: true })

        // Note: Empty strings with required=false skip the positive check in superRefine
        // because they return early, then transform to 0
        expect(await schema.safeParseAsync('')).toMatchObject({
          success: true,
          data: 0,
        })
      })

      it('should accept positive numbers', async () => {
        const schema = createDecimalNumberSchema(mockT, { required: false, positive: true })

        expect(await schema.safeParseAsync('123.45')).toMatchObject({
          success: true,
          data: 123.45,
        })
      })
    })
  })

  describe('createIntegerNumberSchema', () => {
    describe('default options (required: true, positive: false)', () => {
      it('should accept valid integers', async () => {
        const schema = createIntegerNumberSchema(mockT)

        expect(await schema.safeParseAsync('123')).toMatchObject({
          success: true,
          data: 123,
        })
        expect(await schema.safeParseAsync('0')).toMatchObject({
          success: true,
          data: 0,
        })
        expect(await schema.safeParseAsync('-123')).toMatchObject({
          success: true,
          data: -123,
        })
      })

      it('should trim whitespace', async () => {
        const schema = createIntegerNumberSchema(mockT)

        expect(await schema.safeParseAsync('  123  ')).toMatchObject({
          success: true,
          data: 123,
        })
      })

      it('should reject empty strings', async () => {
        const schema = createIntegerNumberSchema(mockT)

        const result = await schema.safeParseAsync('')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('required')
        }
      })

      it('should reject whitespace-only strings', async () => {
        const schema = createIntegerNumberSchema(mockT)

        const result = await schema.safeParseAsync('   ')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('required')
        }
      })

      it('should reject decimal numbers', async () => {
        const schema = createIntegerNumberSchema(mockT)

        const decimalInputs = ['123.45', '0.5', '.5', '123.']

        for (const input of decimalInputs) {
          const result = await schema.safeParseAsync(input)
          expect(result.success).toBe(false)
          if (!result.success) {
            expect(result.error.issues[0].message).toBe('Must be an integer')
          }
        }
      })

      it('should reject invalid formats', async () => {
        const schema = createIntegerNumberSchema(mockT)

        const invalidInputs = ['abc', '12abc', 'abc123', '12.34.56']

        for (const input of invalidInputs) {
          const result = await schema.safeParseAsync(input)
          expect(result.success).toBe(false)
          if (!result.success) {
            expect(result.error.issues[0].message).toBe('Must be an integer')
          }
        }
      })
    })

    describe('with required: false', () => {
      it('should accept empty strings and transform to 0', async () => {
        const schema = createIntegerNumberSchema(mockT, { required: false })

        expect(await schema.safeParseAsync('')).toMatchObject({
          success: true,
          data: 0,
        })
        expect(await schema.safeParseAsync('   ')).toMatchObject({
          success: true,
          data: 0,
        })
      })

      it('should still accept valid integers', async () => {
        const schema = createIntegerNumberSchema(mockT, { required: false })

        expect(await schema.safeParseAsync('123')).toMatchObject({
          success: true,
          data: 123,
        })
      })
    })

    describe('with positive: true', () => {
      it('should accept positive integers', async () => {
        const schema = createIntegerNumberSchema(mockT, { positive: true })

        expect(await schema.safeParseAsync('123')).toMatchObject({
          success: true,
          data: 123,
        })
        expect(await schema.safeParseAsync('1')).toMatchObject({
          success: true,
          data: 1,
        })
      })

      it('should reject zero', async () => {
        const schema = createIntegerNumberSchema(mockT, { positive: true })

        const result = await schema.safeParseAsync('0')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Value must be positive')
        }
      })

      it('should reject negative integers', async () => {
        const schema = createIntegerNumberSchema(mockT, { positive: true })

        const result = await schema.safeParseAsync('-123')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Value must be positive')
        }
      })
    })

    describe('with both required: false and positive: true', () => {
      it('should accept empty strings and transform to 0 (positive check skipped for empty)', async () => {
        const schema = createIntegerNumberSchema(mockT, { required: false, positive: true })

        // Note: Empty strings with required=false skip the positive check in superRefine
        // because they return early, then transform to 0
        expect(await schema.safeParseAsync('')).toMatchObject({
          success: true,
          data: 0,
        })
      })

      it('should accept positive integers', async () => {
        const schema = createIntegerNumberSchema(mockT, { required: false, positive: true })

        expect(await schema.safeParseAsync('123')).toMatchObject({
          success: true,
          data: 123,
        })
      })
    })
  })
})
