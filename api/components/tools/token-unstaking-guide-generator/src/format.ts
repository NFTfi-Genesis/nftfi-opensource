import { BigNumberish } from '@ethersproject/bignumber';
import { formatUnits } from '@ethersproject/units';
import { NFTFI_DECIMALS } from './constants';

/**
 * Formats a raw wei NFTFI amount (18 decimals) for the human-readable `Amount` column.
 *
 * `formatUnits` always emits at least one decimal place, so whole-token amounts come back as `21328.0`.
 * We trim that single trailing `.0` to declutter the (overwhelmingly whole-token) table — a lossless,
 * display-only change. Fractional amounts keep every digit exactly: rounding a fund-movement doc would
 * invite doubt against the wallet's own figure, and dust like `0.006474557340648027` must not collapse
 * to `0.00`. The transaction itself always uses the raw `_amount` in wei.
 */
export const toHumanNftfi = (amountRaw: BigNumberish): string => {
  const formatted = formatUnits(amountRaw, NFTFI_DECIMALS);
  return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted;
};
