import { setupWorker } from 'msw/browser'
import { config } from 'src/config/config'
import { analyticsHandlers, apiHandlers } from './handlers'

const handlers = [...analyticsHandlers, ...apiHandlers]

const worker = setupWorker(...handlers)

export const initializeMsw = () => {
  if (!config.activateMsw) return

  worker
    .start({
      onUnhandledRequest: 'bypass',
    })
    .catch(err => console.error('Failed to start MSW', err))
}
