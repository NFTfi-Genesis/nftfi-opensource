import { buildEtherscanForeclosureUrl, buildOpenseaAssetUrl } from './links';

/** A single foreclosable loan, flattened to exactly the fields the guide renders. */
export interface ForeclosureLoan {
  readonly loanId: string;
  readonly lender: string;
  /** Loan contract address — the foreclosure target the lender calls on Etherscan. */
  readonly contract: string;
  /** Etherscan write-function anchor for `liquidateOverdueLoan`, or `null` when unknown. */
  readonly etherscanAnchor: string | null;
  readonly collectionName: string;
  /** Asset display name (often already `Collection #id`); falls back to `#tokenId` when empty. */
  readonly assetName: string;
  readonly nftContract: string;
  readonly nftTokenId: string;
}

/** A group of loans sharing one NFTfi contract version (or the catch-all unmapped group). */
export interface ForeclosureSection {
  readonly title: string;
  /** Foreclosure entrypoint to call, or `null` when the contract version is unknown. */
  readonly liquidateFunction: string | null;
  readonly loanIdType: string | null;
  /** The single loan contract every loan in this section is foreclosed on (`null` if mixed). */
  readonly contract: string | null;
  readonly loans: readonly ForeclosureLoan[];
}

export interface ForeclosureGuide {
  readonly generatedAt: Date;
  readonly sections: readonly ForeclosureSection[];
}

/** Escapes the characters that would break a GitHub-flavored Markdown table cell. */
const escapeCell = (value: string): string => value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ');

const renderCollateralCell = (loan: ForeclosureLoan): string => {
  const assetLabel = loan.assetName
    ? `${loan.collectionName} - ${loan.assetName}`
    : `${loan.collectionName} #${loan.nftTokenId}`;
  return `[${escapeCell(assetLabel)}](${buildOpenseaAssetUrl(loan.nftContract, loan.nftTokenId)})`;
};

const renderLoanRow = (loan: ForeclosureLoan): string => {
  const collateral = renderCollateralCell(loan);
  const foreclose = `[Foreclose](${buildEtherscanForeclosureUrl(loan.contract, loan.etherscanAnchor)})`;
  return `| \`${loan.lender}\` | ${collateral} | ${loan.loanId} | ${foreclose} |`;
};

const renderSection = (section: ForeclosureSection): string => {
  const lines: string[] = [`### ${section.title}`, ''];

  if (section.liquidateFunction && section.loanIdType && section.contract) {
    lines.push(
      `Foreclose on \`${section.contract}\` by calling ` +
        `\`${section.liquidateFunction}(${section.loanIdType} _loanId)\`.`,
      ''
    );
  } else {
    lines.push(
      'These loans sit on a contract not recognised by this generator. Open the Etherscan link and ' +
        "call the contract's overdue-loan liquidation function with the Loan ID from that row.",
      ''
    );
  }

  lines.push(
    '| Lender Address | Collateral | Loan ID | Foreclose |',
    '| --- | --- | --- | --- |',
    ...section.loans.map(renderLoanRow),
    ''
  );

  return lines.join('\n');
};

const OVERVIEW = [
  'This guide is for lenders with defaulted NFTfi loans.',
  '',
  "NFTfi's web app is no longer available, but the lending smart contracts remain live on Ethereum mainnet. " +
    'If you are the lender on an overdue loan, you can claim the collateral directly through Etherscan.',
  ''
].join('\n');

const HOW_TO_FORECLOSE = [
  '## How To Foreclose',
  '',
  'To foreclose a defaulted loan, lenders can follow the steps below:',
  '',
  '1. Find the loan you want to foreclose in the **List of Defaulted Loans** below. For easier',
  "   searching, use your browser's find-in-page (`ctrl`/`cmd` + `f`) and search for your lender",
  '   wallet address, collection, or asset id.',
  '2. Copy the **Loan ID** value for the loan you want to foreclose.',
  '3. Click the corresponding **Foreclose** link, which opens the *Write Contract* tab of the',
  '   appropriate Ethereum-mainnet contract on Etherscan.',
  "4. Optionally open the loan's **Collateral** (OpenSea) link in a new tab to confirm the NFT",
  '   transfer once you are done.',
  '5. On Etherscan, click **Connect to Web3** and connect your wallet. The indicator turns from red',
  '   to green on success.',
  '6. Expand the `liquidateOverdueLoan` function.',
  '7. Paste the **Loan ID** you copied into the `_loanId` input.',
  '8. Click **Write** and confirm the transaction in your wallet. Once confirmed, you will shortly',
  '   receive your collateral NFT.',
  '',
  'Foreclosure only succeeds after the loan is overdue, and when called by the lender. Loans listed',
  'here that are not yet overdue can be foreclosed as soon as they pass their due date; repaid or',
  'already-foreclosed loans are not listed.',
  ''
].join('\n');

/** Renders the complete foreclosure guide as a single Markdown document. */
export const renderForeclosureGuide = (guide: ForeclosureGuide): string => {
  const sections = guide.sections.filter(section => section.loans.length > 0);
  const total = sections.reduce((sum, section) => sum + section.loans.length, 0);

  const header = [
    '# How to Foreclose Defaulted NFTfi Loans',
    '',
    OVERVIEW,
    `> Generated ${guide.generatedAt.toISOString()}.`,
    '',
    HOW_TO_FORECLOSE,
    '## List of Defaulted Loans',
    ''
  ].join('\n');

  if (total === 0) {
    return [header, 'No outstanding NFTfi loans were found.', ''].join('\n');
  }

  const summary = [
    `**${total}** outstanding loans are listed:`,
    '',
    ...sections.map(section => `- ${section.title}: ${section.loans.length}`),
    ''
  ].join('\n');

  return [header, summary, ...sections.map(renderSection)].join('\n');
};
