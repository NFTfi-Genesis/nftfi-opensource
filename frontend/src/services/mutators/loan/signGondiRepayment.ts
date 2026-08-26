import { AbiCoder, toUtf8String } from 'ethers'
import { config } from 'src/config/config'
import { PanicError } from 'src/errors/PanicError'
import { Address } from 'src/entities/base/Address'
import { Wei } from 'src/entities/base/Wei'
import { findEventLog } from 'src/utils/ethereum'
import { createOnChainFetcher, OnChainFetcherDependencies } from 'src/services/factories/onChain/createOnChainFetcher'
import { OnChainMutatorDependencies } from 'src/services/factories/onChain/createOnChainMutator'

const chainId = config.ethereum.chainId
const gondiAdapterContractAddress = config.ethereum.contracts.nftfi.v3.adapters.gondi.address
type GetGondiRepaymentSignatureDependencies = OnChainFetcherDependencies & OnChainMutatorDependencies

const abi = [
  'function name() view returns (string)',
  'function VERSION() view returns (bytes)',
  'event LoanEmitted(uint256 loanId, uint256[] offerId, tuple(address borrower, uint256 nftCollateralTokenId, address nftCollateralAddress, address principalAddress, uint256 principalAmount, uint256 startTime, uint256 duration, tuple(uint256 loanId, uint256 floor, uint256 principalAmount, address lender, uint256 accruedInterest, uint256 startTime, uint256 aprBps)[] tranche, uint256 protocolFee) loan, uint256 fee)',
  'event LoanRefinanced(uint256 renegotiationId, uint256 oldLoanId, uint256 newLoanId, tuple(address borrower, uint256 nftCollateralTokenId, address nftCollateralAddress, address principalAddress, uint256 principalAmount, uint256 startTime, uint256 duration, tuple(uint256 loanId, uint256 floor, uint256 principalAmount, address lender, uint256 accruedInterest, uint256 startTime, uint256 aprBps)[] tranche, uint256 protocolFee) loan, uint256 fee)',
  'event LoanRefinancedFromNewOffers(uint256 loanId, uint256 newLoanId, tuple(address borrower, uint256 nftCollateralTokenId, address nftCollateralAddress, address principalAddress, uint256 principalAmount, uint256 startTime, uint256 duration, tuple(uint256 loanId, uint256 floor, uint256 principalAmount, address lender, uint256 accruedInterest, uint256 startTime, uint256 aprBps)[] tranche, uint256 protocolFee) loan, uint256[] offerIds, uint256 totalFee)',
]

const gondiRefinancingAbi = [
  'tuple(tuple(uint256 loanId, bytes callbackData, bool shouldDelegate) data, tuple(address borrower, uint256 nftCollateralTokenId, address nftCollateralAddress, address principalAddress, uint256 principalAmount, uint256 startTime, uint256 duration, tuple(uint256 loanId, uint256 floor, uint256 principalAmount, address lender, uint256 accruedInterest, uint256 startTime, uint256 aprBps)[] tranche, uint256 protocolFee) loan, bytes borrowerSignature)',
]

const nftfiGondiAdaptorAbi = [
  'function getPayoffDetails(address, uint256, bytes _extraData) view returns (address, uint256)',
]

const versionFetcher = createOnChainFetcher<string>({
  abi,
  method: 'VERSION',
})

const nameFetcher = createOnChainFetcher<string>({
  abi,
  method: 'name',
})

const nftfiGondiAdaptorFetcher = createOnChainFetcher<string>({
  abi: nftfiGondiAdaptorAbi,
  method: 'getPayoffDetails',
})

export async function signGondiRepayment(hash: string, deps: GetGondiRepaymentSignatureDependencies) {

  const provider = await deps.getProvider()
  const receipt = await provider.getTransactionReceipt(hash)
  if (!receipt) {
    throw new PanicError({ message: 'Gondi refi transaction receipt not found', details: { hash } })
  }
  const event = findEventLog({
    receipt,
    abi,
    eventNames: ['LoanRefinancedFromNewOffers', 'LoanRefinanced', 'LoanEmitted'],
    errorContext: 'Gondi sign repayment',
  })
  const gondiLoanContractAddress = event.address
  const version = await versionFetcher(
    {
      contractAddress: gondiLoanContractAddress,
      args: [],
    },
    deps
  )
  const versionUtf8 = toUtf8String(version)
  const name = await nameFetcher(
    {
      contractAddress: gondiLoanContractAddress,
      args: [],
    },
    deps
  )
  const domain = {
    name: name,
    version: versionUtf8,
    chainId: chainId,
    verifyingContract: gondiLoanContractAddress,
  }
  const types = {
    SignableRepaymentData: [
      { name: 'loanId', type: 'uint256' },
      { name: 'callbackData', type: 'bytes' },
      { name: 'shouldDelegate', type: 'bool' },
    ],
  }
  let loanId
  if (event.name === 'LoanRefinanced' || event.name === 'LoanRefinancedFromNewOffers') {
    loanId = event.args.newLoanId.toString()
  } else {
    loanId = event.args.loanId.toString()
  }
  const repaymentValue = {
    loanId: loanId,
    callbackData: '0x',
    shouldDelegate: false,
  }
  const signer = await deps.getSigner()
  if (!signer) {
    throw new PanicError({ message: 'Gondi sign repayment, signer is not available', details: { hash } })
  }
  const signature = await signer.signTypedData(domain, types, repaymentValue)
  const loanRepaymentData = { data: repaymentValue, loan: event.args.loan, borrowerSignature: signature }
  const abiCoder = new AbiCoder()
  const encodedRepaymentData = abiCoder.encode(gondiRefinancingAbi, [loanRepaymentData])
  const payoffDetails = await nftfiGondiAdaptorFetcher(
    {
      contractAddress: gondiAdapterContractAddress,
      args: [gondiLoanContractAddress, loanId, encodedRepaymentData],
    },
    deps
  )

  return {
    encodedRepaymentData,
    repayment: BigInt(payoffDetails[1]) as Wei,
    loanContractAddress: gondiLoanContractAddress as Address,
  }
}
