import { ValueProvider } from '@nestjs/common';
import { coinbaseadvanced } from 'ccxt';

export type FxRateClient = coinbaseadvanced;

export const FxRateClientProvider: ValueProvider = { provide: 'FxRateProvider', useValue: new coinbaseadvanced() };
