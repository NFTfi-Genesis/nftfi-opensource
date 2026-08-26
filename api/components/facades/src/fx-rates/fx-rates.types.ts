export const ServiceToken = `FxRatesFacadeToken`;
export const QueueChannel = 'fx-rates';

export enum FxRatesQueueTopic {
  GetLatest = `${QueueChannel}_get-latest`,
  GetAtDate = `${QueueChannel}_get-at-date`
}

export enum FxSymbol {
  ETH_USDT = 'ETH/USDT'
}
