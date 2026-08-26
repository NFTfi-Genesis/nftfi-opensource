import { encodeBytes32String, getBytes, solidityPackedKeccak256 } from 'ethers'
import { OfferType, Offer, AssetOffer, CollectionOffer, ContractOffer } from 'src/entities/domain/Offer'
import { Nft } from 'src/entities/domain/Nft'
import { PanicError } from 'src/errors/PanicError'
import { config } from 'src/config/config'
import { Address } from 'src/entities/base/Address'
import { Percentage } from 'src/entities/base/Percentage'
import { Wei } from 'src/entities/base/Wei'
import { getCurrencyAddress } from './currencies'
import { isNft, isCollection } from './entities'
import { convertWeiToUsd } from './amounts'

export function isAssetOffer(offer: Offer): offer is AssetOffer {
  return offer.type === OfferType.Asset && isNft(offer.nft)
}

export function isCollectionOffer(offer: Offer): offer is CollectionOffer {
  // ContractOffer also carries `collection` (display metadata) but is identified
  // by the presence of `contract`. A real CollectionOffer never has `contract`.
  return offer.type === OfferType.Collection
    && 'collection' in offer
    && !('contract' in offer)
    && isCollection(offer.collection)
}

export function isContractOffer(offer: Offer): offer is ContractOffer {
  return offer.type === OfferType.Collection && 'contract' in offer && typeof offer.contract === 'string'
}

export function getOfferCollectionAddress(offer: Offer): Address | null {
  // TODO: Discuss here about throwing a panic error instead of returning null. Currently returning null because this function is only used to derive collectionAvgApr stat which isn't critical data, plus there is no graceful error handling. But since this is a util that can be used in other places, we should decide on the best approach.If we decide to throw a panic error, we should add a check in the fn caller to handle the error gracefully, and not let it bubble up to the main error boundary.
  if (isAssetOffer(offer)) {
    return offer.nft.address
  }
  if (isCollectionOffer(offer)) {
    return offer.collection.address
  }
  if (isContractOffer(offer)) {
    return offer.contract
  }
  return null
}

export function isHighEffectiveApr(offer: Offer, collectionAvgApr?: Percentage | null): boolean {
  if (!collectionAvgApr) {
    return false
  }
  const effectiveApr = offer.terms.effectiveApr || offer.terms.apr
  if (!effectiveApr) {
    return false
  }
  return effectiveApr > (2 * collectionAvgApr)
}

export function getOfferTypeBytes(type: OfferType): string {
  if (type === OfferType.Asset) {
    return encodeBytes32String('ASSET_OFFER_LOAN')
  }
  else if (type === OfferType.Collection) {
    return encodeBytes32String('COLLECTION_OFFER_LOAN')
  }
  else {
    throw new PanicError({ message: `Invalid offer type: ${type}` })
  }
}

export function getAssetOfferMessageToSign(offer: Omit<AssetOffer, 'signature' | 'id' | 'dateOffered' | 'terms' | 'isDeleted'> & {
  terms: Omit<AssetOffer['terms'], 'apr' | 'effectiveApr'>
}): Uint8Array {
  return getBytes(solidityPackedKeccak256(
    [
      'address',
      'uint256',
      'uint256',
      'address',
      'uint256',
      'uint32',
      'bool',
      'uint256',
      'address',
      'uint256',
      'uint256',
      'bytes32',
      'uint256'
    ],
    [
      getCurrencyAddress(offer.terms.currency),
      offer.terms.principal,
      offer.terms.repayment,
      offer.nft.address,
      offer.nft.id,
      offer.terms.duration,
      offer.terms.isProRated,
      offer.terms.origination,
      offer.lender,
      offer.nonce,
      offer.expiry,
      getOfferTypeBytes(offer.type),
      config.ethereum.chainId
    ]
  ))
}

export function getCollectionOfferMessageToSign(offer: Omit<CollectionOffer, 'signature' | 'id' | 'dateOffered' | 'isDeleted'>): Uint8Array {
  return getBytes(solidityPackedKeccak256(
    [
      'address',
      'uint256',
      'uint256',
      'address',
      'uint256',
      'uint32',
      'bool',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'uint256',
      'uint256',
      'bytes32',
      'uint256'
    ],
    [
      getCurrencyAddress(offer.terms.currency),
      offer.terms.principal,
      offer.terms.repayment,
      offer.collection.address,
      0,
      offer.terms.duration,
      offer.terms.isProRated,
      offer.terms.origination,
      offer.tokenRange.from,
      offer.tokenRange.to,
      offer.lender,
      offer.nonce,
      offer.expiry,
      getOfferTypeBytes(offer.type),
      config.ethereum.chainId
    ]
  ))
}

export function getOfferTupleForTx(offer: Offer, nft: Nft) {
  let nftCollateralContract: Address
  let nftCollateralId: bigint
  if (isAssetOffer(offer)) {
    nftCollateralContract = offer.nft.address
    nftCollateralId = offer.nft.id
  } else if (isCollectionOffer(offer)) {
    nftCollateralContract = offer.collection.address
    nftCollateralId = nft.id
  } else if (isContractOffer(offer)) {
    nftCollateralContract = offer.contract
    nftCollateralId = nft.id
  } else {
    throw new PanicError({ message: 'Unknown offer type when constructing offer tuple for tx', details: { offer } })
  }

  // Map Offer fields to contract function arguments (for refinanceLoan and startLoan)
  return {
    loanPrincipalAmount: offer.terms.principal,
    maximumRepaymentAmount: offer.terms.repayment,
    nftCollateralId: nftCollateralId.toString(),
    nftCollateralContract: nftCollateralContract,
    loanDuration: Number(offer.terms.duration),
    loanERC20Denomination: getCurrencyAddress(offer.terms.currency),
    isProRata: offer.terms.isProRated,
    originationFee: offer.terms.origination,
  }
}

export function getOffersMinMax(field: 'principal' | 'repayment' | 'origination' | 'apr', offers: Offer[], fxRate: number) {
  let min = Number.MAX_SAFE_INTEGER
  let max = Number.MIN_SAFE_INTEGER

  if (field === 'apr') {
    if (offers.length === 0) {
      min = 0
      max = 100
    } else {
      const aprValues = offers.map(offer => offer.terms.apr)
      min = Math.floor(Math.min(...aprValues))
      max = Math.ceil(Math.max(...aprValues))
    }
  } else {
    offers.forEach(offer => {
      const amount = convertWeiToUsd(offer.terms.currency, offer.terms[field], fxRate)
      min = Math.min(min, amount)
      max = Math.max(max, amount)
    })
  }

  return {
    min,
    max,
  }
}

// A terrible workaround to avoid precision mismatch between FE and L-Api when creating offers.
// Otherwise, the offer does not pass the signature validation in SDK.
// SDK is converting the number value of repayment to string using toLocaleString('fullwide', { useGrouping: false }),
// which itself is causing precision mismatch.
// But also precision mismatch happens when BigInt value is converted to number.
// This function ensures that all the precision loss is happening in the same way as it happens in SDK & L-Api.
// TODO: Fix BE to store and use wei values as bigints/strings instead of numbers.
export function getCompatibleRepaymentAmount(repayment: Wei): Wei {
  return BigInt(Number(repayment).toLocaleString('fullwide', { useGrouping: false })) as Wei
}
