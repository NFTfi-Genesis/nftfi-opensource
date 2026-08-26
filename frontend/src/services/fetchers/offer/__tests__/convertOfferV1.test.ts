import { describe, it, expect } from 'vitest'
import { Currency } from 'src/entities/domain/Currency'
import { ApiResponseOfferV1, buildCollectionExtended, convertOfferV1 } from '../convertOfferV1'

function makeApiOffer(overrides: Partial<ApiResponseOfferV1> = {}): ApiResponseOfferV1 {
  return {
    id: 42,
    type: 'asset',
    status: 'active',
    lender: {
      address: '0x1111111111111111111111111111111111111111',
      nonce: '12345678901234567890',
    },
    borrower: { address: '0x2222222222222222222222222222222222222222' },
    collection: {
      id: 218,
      contract: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e',
      tokenRange: '0:9994',
      name: 'Doodles',
      imageUrl: 'https://cdn.example.com/doodles.png',
    },
    asset: {
      id: 40307,
      contract: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e',
      tokenId: '7332',
      name: 'Doodle #7332',
      imageSmallUrl: 'https://cdn.example.com/7332-small.png',
      imageMediumUrl: 'https://cdn.example.com/7332-medium.png',
    },
    tokenRange: { from: '7332', to: '7332' },
    signature: '0xabc',
    createdAt: '2026-05-07T13:21:21.359Z',
    terms: {
      loan: {
        unit: 'mwei',
        duration: 1123200,
        principal: '13000000',
        repayment: '13060192',
        origination: '0',
        currency: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        expiresAt: '2026-05-21T13:21:15.000Z',
        apr: 13.00005,
        eapr: 13.5,
        prorated: true,
      },
    },
    ...overrides,
  }
}

describe('convertOfferV1', () => {
  it('maps all core scalar fields with correct shape and types', () => {
    const result = convertOfferV1(makeApiOffer(), Currency.USDC)

    expect(result.id).toBe('42')
    expect(result.lender).toBe('0x1111111111111111111111111111111111111111')
    expect(result.nonce).toBe('12345678901234567890')
    expect(result.borrower).toBe('0x2222222222222222222222222222222222222222')
    expect(result.signature).toBe('0xabc')
    expect(result.isDeleted).toBe(false)
    expect(result.dateOffered.toISOString()).toBe('2026-05-07T13:21:21.359Z')
  })

  it('coerces wei amount strings to bigints', () => {
    const result = convertOfferV1(makeApiOffer({
      terms: {
        loan: {
          unit: 'mwei',
          duration: 1,
          principal: '13000000',
          repayment: '13060192',
          origination: '500',
          currency: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          expiresAt: '2026-05-21T13:21:15.000Z',
          apr: 1,
          eapr: 1,
          prorated: false,
        },
      },
    }), Currency.USDC)

    expect(result.terms.principal).toBe(13000000n)
    expect(result.terms.repayment).toBe(13060192n)
    expect(result.terms.origination).toBe(500n)
  })

  it('converts expiresAt ISO string to unix seconds', () => {
    const result = convertOfferV1(makeApiOffer({
      terms: {
        loan: {
          unit: 'mwei',
          duration: 1,
          principal: '1',
          repayment: '2',
          origination: '0',
          currency: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          expiresAt: '2026-05-21T13:21:15.000Z',
          apr: 1,
          eapr: 1,
          prorated: false,
        },
      },
    }), Currency.USDC)

    // 2026-05-21T13:21:15Z = 1779369675 unix seconds
    expect(result.expiry).toBe(1779369675)
  })

  it('maps eapr to effectiveApr and apr to apr', () => {
    const result = convertOfferV1(makeApiOffer({
      terms: {
        loan: {
          unit: 'mwei',
          duration: 1,
          principal: '1',
          repayment: '2',
          origination: '0',
          currency: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          expiresAt: '2026-05-21T13:21:15.000Z',
          apr: 4.25,
          eapr: 6.75,
          prorated: true,
        },
      },
    }), Currency.USDC)

    expect(result.terms.apr).toBe(4.25)
    expect(result.terms.effectiveApr).toBe(6.75)
    expect(result.terms.isProRated).toBe(true)
  })

  it('sets isDeleted to true when status is deleted', () => {
    const result = convertOfferV1(makeApiOffer({ status: 'deleted' }), Currency.USDC)
    expect(result.isDeleted).toBe(true)
  })

  it('sets borrower to undefined when borrower is absent', () => {
    const result = convertOfferV1(makeApiOffer({ borrower: undefined }), Currency.USDC)
    expect(result.borrower).toBeUndefined()
  })

  it('passes through null signature', () => {
    const result = convertOfferV1(makeApiOffer({ signature: null }), Currency.USDC)
    expect(result.signature).toBeNull()
  })

  it('uses the currency passed in (not the API contract address)', () => {
    const result = convertOfferV1(makeApiOffer(), Currency.WETH)
    expect(result.terms.currency).toBe('WETH')
  })
})

describe('buildCollectionExtended', () => {
  it('stringifies the numeric collection id', () => {
    const result = buildCollectionExtended(makeApiOffer())
    expect(result.id).toBe('218')
  })

  it('parses tokenRange into start/end bigints', () => {
    const result = buildCollectionExtended(makeApiOffer({
      collection: {
        id: 1,
        contract: '0x1111111111111111111111111111111111111111',
        tokenRange: '0:9994',
        name: 'X',
        imageUrl: '',
      },
    }))
    expect(result.start).toBe(0n)
    expect(result.end).toBe(9994n)
  })

  it('parses sub-range tokenRange correctly', () => {
    const result = buildCollectionExtended(makeApiOffer({
      collection: {
        id: 1,
        contract: '0x1111111111111111111111111111111111111111',
        tokenRange: '78000000:78000999',
        name: 'Fidenza',
        imageUrl: '',
      },
    }))
    expect(result.start).toBe(78000000n)
    expect(result.end).toBe(78000999n)
  })

  it('populates info from name and imageUrl', () => {
    const result = buildCollectionExtended(makeApiOffer())
    expect(result.info.name).toBe('Doodles')
    expect(result.info.imageUri).toBe('https://cdn.example.com/doodles.png')
  })

  it('sets address from the contract field', () => {
    const result = buildCollectionExtended(makeApiOffer())
    expect(result.address).toBe('0x8a90cab2b38dba80c64b7734e58ee1db38b8992e')
  })

  it('throws on malformed tokenRange', () => {
    expect(() => buildCollectionExtended(makeApiOffer({
      collection: {
        id: 1,
        contract: '0x1111111111111111111111111111111111111111',
        tokenRange: 'not-a-range',
        name: 'X',
        imageUrl: '',
      },
    }))).toThrow()
  })

  it('throws when tokenRange has start > end', () => {
    expect(() => buildCollectionExtended(makeApiOffer({
      collection: {
        id: 1,
        contract: '0x1111111111111111111111111111111111111111',
        tokenRange: '100:50',
        name: 'X',
        imageUrl: '',
      },
    }))).toThrow()
  })
})
