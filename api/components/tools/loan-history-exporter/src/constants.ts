/**
 * The NFTfi loan contracts that can hold loan rows in `market_loans`, in the order their loans are
 * written to the export. Each row's `version` column comes straight from the matching entry, and the
 * exporter walks this list in order — V1 loans first, V3 (Collection) last — sorting by loan id
 * within each contract.
 *
 * Refinance contracts (V2.3/V3/V3.1) are intentionally absent: their subscribers never persist loan
 * rows, so refinanced loans live under one of the main loan contracts below.
 *
 * Addresses mirror `components/tools/market-loans-restorer/src/constants.ts` and the foreclosure
 * guide generator's registry; keep them in sync.
 */
export interface NftfiLoanVersion {
  /** Checksummed loan contract address, matched (case-insensitively) against `MarketLoan.contract`. */
  readonly address: string;
  /** Version label written to the CSV `version` column. */
  readonly label: string;
}

export const NFTFI_LOAN_VERSIONS: readonly NftfiLoanVersion[] = [
  { address: '0x88341d1a8F672D2780C8dC725902AAe72F143B0c', label: 'V1' },
  { address: '0xf896527c49b44aAb3Cf22aE356Fa3AF8E331F280', label: 'V2' },
  { address: '0xE52Cec0E90115AbeB3304BaA36bc2655731f7934', label: 'V2 (Collection)' },
  { address: '0x8252Df1d8b29057d1Afe3062bf5a64D503152BC8', label: 'V2.1' },
  { address: '0xd0a40eB7FD94eE97102BA8e9342243A2b2E22207', label: 'V2.3' },
  { address: '0xD0C6e59B50C32530C627107F50Acc71958C4341F', label: 'V2.3 (Collection)' },
  { address: '0x9F10D706D789e4c76A1a6434cd1A9841c875C0A6', label: 'V3 (Asset)' },
  { address: '0xB6adEc2ACc851d30d5fB64f3137234BCDCBBad0D', label: 'V3 (Collection)' }
];
