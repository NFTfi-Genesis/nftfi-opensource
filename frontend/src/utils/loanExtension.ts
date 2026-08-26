import { getBytes, solidityPackedKeccak256 } from 'ethers'
import { Address } from 'src/entities/base/Address'
import { Seconds } from 'src/entities/base/Seconds'

export type V3LoanExtensionMessageInputs = {
  loanId: number
  newLoanDuration: Seconds
  isProRata: boolean
  newMaxRepayment: bigint
  extensionFee: bigint
  lender: Address
  lenderNonce: bigint
  expiry: Seconds
  contractAddress: Address
  chainId: number
}

export function getV3LoanExtensionMessageToSign(inputs: V3LoanExtensionMessageInputs): Uint8Array {
  return getBytes(solidityPackedKeccak256(
    [
      'uint256',
      'uint32',
      'bool',
      'uint256',
      'uint256',
      'address',
      'uint256',
      'uint256',
      'address',
      'uint256',
    ],
    [
      inputs.loanId,
      inputs.newLoanDuration,
      inputs.isProRata,
      inputs.newMaxRepayment,
      inputs.extensionFee,
      inputs.lender,
      inputs.lenderNonce,
      inputs.expiry,
      inputs.contractAddress,
      inputs.chainId,
    ],
  ))
}
