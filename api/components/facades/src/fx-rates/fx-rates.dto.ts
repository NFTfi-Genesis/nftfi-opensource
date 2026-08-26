import { Expose } from 'class-transformer';
import { FxSymbol } from './fx-rates.types';

export class FxRateDto {
  @Expose()
  symbol: FxSymbol;

  @Expose()
  rate: number;

  @Expose()
  createdAt: Date;
}

export type GetLatestFxRateParamsDto = Pick<FxRateDto, 'symbol'>;
export type GetToDateFxRateParamsDto = Pick<FxRateDto, 'symbol'> & { date: Date };
