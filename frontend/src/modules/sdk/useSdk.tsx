import { useContext } from 'react'
import { SdkContext } from './SdkProvider'

export const useSdk = () => {
  const { sdk } = useContext(SdkContext)

  // TODO: add checks for full sdk initialization
  // like sdk.provider is not null, etc
  // probably add a promise to wait for sdk to be initialized
  return {
    sdk,
  }
}
