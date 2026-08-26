import { Panel } from 'src/components/Panel'
import { ConnectWalletWarning } from './ConnectWalletWarning'

export function ConnectWalletPanel() {
  return (
    <Panel fullWidth fullHeight>
      <ConnectWalletWarning />
    </Panel>
  )
}
