import { Interface, TransactionReceipt } from 'ethers'
import { PanicError } from 'src/errors/PanicError'
import { Address } from 'src/entities/base/Address'

type FindEventLogParams = {
  receipt: TransactionReceipt
  abi: string[]
  eventNames: string[]
  errorContext?: string
}

export function findEventLog({ receipt, abi, eventNames, errorContext }: FindEventLogParams) {
  const iface = new Interface(abi)

  let eventLog = null
  for (const eventName of eventNames) {
    eventLog = receipt.logs.find(log => {
      try {
        const parsed = iface.parseLog(log)
        return parsed?.name === eventName
      } catch (_error) {
        return false
      }
    })
    if (eventLog) break
  }
  if (!eventLog) {
    const context = errorContext
      ? `${errorContext}, `
      : ''
    throw new PanicError({
      message: `${context}no log found for transaction`,
      details: { hash: receipt.hash, eventNames },
    })
  }
  const parsedEvent = iface.parseLog(eventLog)
  if (!parsedEvent) {
    const context = errorContext
      ? `${errorContext}, `
      : ''
    throw new PanicError({
      message: `${context}failed to parse event log`,
      details: { hash: receipt.hash, log: eventLog },
    })
  }
  return { ...parsedEvent, address: eventLog.address as Address }
}
