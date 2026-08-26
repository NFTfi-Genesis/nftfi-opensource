/**
 * Registry of NFTfi loan contracts that can hold overdue, foreclosable loans, keyed by the
 * on-chain loan contract address stored on each `market_loans` row (`MarketLoan.contract`).
 *
 * Every version exposes the same `liquidateOverdueLoan(_loanId)` foreclosure entrypoint, but the
 * `_loanId` argument widened from `uint256` (V1) to `uint32` (V2 onward) — the guide surfaces the
 * exact parameter type so lenders enter the value Etherscan expects.
 *
 * `etherscanFunctionAnchor` deep-links Etherscan's *Write Contract* tab straight to
 * `liquidateOverdueLoan`. Etherscan numbers write functions `F1..Fn` in ABI order; the values below
 * match the legacy foreclosures page for V1–V2.3 and were derived the same way (position of
 * `liquidateOverdueLoan` among the contract's write functions) for V3.
 *
 * Refinance contracts (V2.3/V3/V3.1 refinance) are intentionally absent: they never persist loan
 * rows (their subscribers are no-ops) and expose no liquidation entrypoint — refinanced loans live
 * under one of the main loan contracts below and are foreclosed there.
 *
 * Addresses mirror `components/tools/market-loans-restorer/src/constants.ts`; keep them in sync.
 */
export interface NftfiLoanVersion {
  /** Checksummed loan contract address, matched (case-insensitively) against `MarketLoan.contract`. */
  readonly address: string;
  /** Human-readable section title used to group loans in the guide. */
  readonly label: string;
  /** On-chain foreclosure entrypoint a lender calls to claim overdue collateral. */
  readonly liquidateFunction: string;
  /** Solidity type of the `_loanId` argument for `liquidateFunction`. */
  readonly loanIdType: 'uint256' | 'uint32';
  /** Etherscan write-function anchor for `liquidateFunction`, e.g. `F9`. */
  readonly etherscanFunctionAnchor: string;
}

export const NFTFI_LOAN_VERSIONS: readonly NftfiLoanVersion[] = [
  {
    address: '0x88341d1a8F672D2780C8dC725902AAe72F143B0c',
    label: 'V1',
    liquidateFunction: 'liquidateOverdueLoan',
    loanIdType: 'uint256',
    etherscanFunctionAnchor: 'F5'
  },
  {
    address: '0xf896527c49b44aAb3Cf22aE356Fa3AF8E331F280',
    label: 'V2',
    liquidateFunction: 'liquidateOverdueLoan',
    loanIdType: 'uint32',
    etherscanFunctionAnchor: 'F6'
  },
  {
    address: '0xE52Cec0E90115AbeB3304BaA36bc2655731f7934',
    label: 'V2 (Collection)',
    liquidateFunction: 'liquidateOverdueLoan',
    loanIdType: 'uint32',
    etherscanFunctionAnchor: 'F6'
  },
  {
    address: '0x8252Df1d8b29057d1Afe3062bf5a64D503152BC8',
    label: 'V2.1',
    liquidateFunction: 'liquidateOverdueLoan',
    loanIdType: 'uint32',
    etherscanFunctionAnchor: 'F6'
  },
  {
    address: '0xd0a40eB7FD94eE97102BA8e9342243A2b2E22207',
    label: 'V2.3',
    liquidateFunction: 'liquidateOverdueLoan',
    loanIdType: 'uint32',
    etherscanFunctionAnchor: 'F9'
  },
  {
    address: '0xD0C6e59B50C32530C627107F50Acc71958C4341F',
    label: 'V2.3 (Collection)',
    liquidateFunction: 'liquidateOverdueLoan',
    loanIdType: 'uint32',
    etherscanFunctionAnchor: 'F11'
  },
  {
    address: '0x9F10D706D789e4c76A1a6434cd1A9841c875C0A6',
    label: 'V3 (Asset)',
    liquidateFunction: 'liquidateOverdueLoan',
    loanIdType: 'uint32',
    etherscanFunctionAnchor: 'F6'
  },
  {
    address: '0xB6adEc2ACc851d30d5fB64f3137234BCDCBBad0D',
    label: 'V3 (Collection)',
    liquidateFunction: 'liquidateOverdueLoan',
    loanIdType: 'uint32',
    etherscanFunctionAnchor: 'F8'
  }
];

/** Lower-cased address → version, for matching against `MarketLoan.contract`. */
export const NFTFI_LOAN_VERSION_BY_ADDRESS: ReadonlyMap<string, NftfiLoanVersion> = new Map(
  NFTFI_LOAN_VERSIONS.map(version => [version.address.toLowerCase(), version])
);
