import { Panel } from '../Panel'
import { LoginWarning } from './LoginWarning'

export function LoginPanel({ message }: { message?: string }) {
  return (
    <Panel fullWidth fullHeight>
      <LoginWarning message={message} />
    </Panel>
  )
}
