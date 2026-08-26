import React from 'react'
import { Protocol } from 'src/entities/domain/Protocol'
import ArcadeLogo from 'src/assets/images/svg/arcade-logo.svg'
import BlurLogo from 'src/assets/images/svg/blur-logo.svg'
import GondiLogo from 'src/assets/images/svg/gondi-logo.svg'
import MetastreetLogo from 'src/assets/images/svg/metastreet-logo.svg'
import NFTfiLogo from 'src/assets/images/svg/nftfi-logo.svg'
import X2Y2Logo from 'src/assets/images/svg/x2y2-logo.svg'
import ZhartaLogo from 'src/assets/images/svg/zharta-logo.svg'
import { getGondiLinkFromProjectContractAddress, getGondiLinkFromProjectName } from 'src/utils/gondiCollectionsLinks'
import { Address } from 'src/entities/base/Address'

// Protocol names to be used in the API requests
// and in the application URL query string
export const ProtocolApiKeys: Record<Protocol, string> = {
  [Protocol.Arcade]: 'arcade',
  [Protocol.Blur]: 'blur',
  [Protocol.Gondi]: 'gondi',
  [Protocol.Metastreet]: 'metastreet',
  [Protocol.Nftfi]: 'nftfi',
  [Protocol.X2y2]: 'x2y2',
  [Protocol.Zharta]: 'zharta',
}

// Protocol names to be displayed in the UI
export const ProtocolDisplayNames: Record<Protocol, string> = {
  [Protocol.Arcade]: 'Arcade',
  [Protocol.Blur]: 'Blur',
  [Protocol.Gondi]: 'Gondi',
  [Protocol.Metastreet]: 'Metastreet',
  [Protocol.Nftfi]: 'NFTfi',
  [Protocol.X2y2]: 'X2Fi',
  [Protocol.Zharta]: 'Zharta',
}

export const ProtocolLogos: Record<
  Protocol,
  React.FC<React.SVGProps<SVGSVGElement>>
> = {
  [Protocol.Arcade]: ArcadeLogo,
  [Protocol.Blur]: BlurLogo,
  [Protocol.Gondi]: GondiLogo,
  [Protocol.Metastreet]: MetastreetLogo,
  [Protocol.Nftfi]: NFTfiLogo,
  [Protocol.X2y2]: X2Y2Logo,
  [Protocol.Zharta]: ZhartaLogo,
}

export function getProtocolFromName(name: string): Protocol | null {
  const normalizedName = name.toLowerCase()

  for (const [protocolKey, protocolName] of Object.entries(ProtocolApiKeys)) {
    if (protocolName.toLowerCase() === normalizedName) {
      return protocolKey as Protocol
    }
  }

  return null
}

const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

export function getAssetProtocolLink(params: {
  protocol: Protocol
  nftAddress: Address
  nftId: bigint
  loanId?: string
  loanContractAddress?: string
  nftProjectName?: string
}): string {
  const {
    protocol,
    nftAddress,
    nftId,
    loanId,
    loanContractAddress,
    nftProjectName,
  } = params

  // console.log({ nftProjectName, nftId, nftAddress })

  const protocolString = ProtocolApiKeys[protocol]
  switch (protocol) {
    case Protocol.Nftfi:
      return ''

    case Protocol.X2y2:
      return `https://x2fi.io/discover/due-soon?contractAddress=${nftAddress.toLowerCase()}`

    case Protocol.Blur:
      return `https://blur.io/eth/asset/${nftAddress.toLowerCase()}/${nftId}`

    case Protocol.Metastreet:
      return ``

    case Protocol.Zharta:
      return ``

    case Protocol.Arcade:
      if (loanId && loanContractAddress) {
        return `https://app.arcade.xyz/terms/loan/${loanContractAddress}-${loanId}`
      }
      return `/assets/${nftAddress}/${nftId}?platform=${protocolString.toLowerCase()}${loanId
        ? `&loanId=${loanId}`
        : ''}`

    case Protocol.Gondi:
      return `${getGondiLink(nftProjectName, nftAddress, nftId)}/${nftId}`
  }
}

function getGondiLink(
  projectName?: string,
  projectContractAddress?: Address,
  nftId?: bigint
): string {
  // Priority 1: Get gondi link based on contract address
  const gondiLinkFromContractAddress = getGondiLinkFromProjectContractAddress(
    projectContractAddress,
    nftId
  )
  if (gondiLinkFromContractAddress) {
    return gondiLinkFromContractAddress
  }

  // Priority 2: Get gondi link based on project name
  const gondiLinkFromProjectName = getGondiLinkFromProjectName(projectName)
  if (gondiLinkFromProjectName) {
    return gondiLinkFromProjectName
  }

  // Priority 3: Construct gondi link from project name slug
  return `https://gondi.xyz/collections/${createSlug(projectName || '')}`
}
