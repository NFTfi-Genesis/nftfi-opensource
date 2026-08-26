import { CURRENT_LOCK, LEGACY_LOCK } from './constants';
import { ActionRow, UnstakingReport } from './types';

/** Etherscan *Write Contract* page for a lock; the link's visible text is the address itself. */
const buildEtherscanWriteUrl = (lockAddress: string): string =>
  `https://etherscan.io/address/${lockAddress}#writeContract`;

/** Escapes the characters that would break a GitHub-flavored Markdown table cell. */
const escapeCell = (value: string): string => value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ');

const renderParameters = (row: ActionRow): string =>
  row.parameters.map(parameter => `\`${parameter.name} = ${parameter.value}\``).join('<br>');

const renderRow = (row: ActionRow): string => {
  const etherscan = `[${row.lockAddress}](${buildEtherscanWriteUrl(row.lockAddress)})`;
  return `| \`${row.wallet}\` | ${escapeCell(row.amountHuman)} | ${etherscan} | \`${
    row.functionName
  }\` | ${renderParameters(row)} |`;
};

const OVERVIEW = [
  '# How to Unstake NFTFI Tokens',
  '',
  'This guide is for NFTFI token holders with tokens locked in Foundation staking contracts.',
  '',
  'The NFTfi Foundation unstaking portal is no longer available, but locked NFTFI can still be ' +
    'withdrawn directly from the token lock contracts through Etherscan.',
  ''
].join('\n');

const HOW_TO_UNSTAKE = [
  '## How to unstake',
  '',
  '1. Use browser search (`ctrl + f` / `cmd + f`) and search for your wallet address.',
  '2. In your row, click the Etherscan link.',
  '3. On Etherscan, click `Connect to Web3` and connect the same wallet shown in the row.',
  '4. Open the function listed in your row.',
  '5. Etherscan shows one input box per parameter. Copy each value from your row into the',
  '   box with the matching name (e.g. `_amount` into the `_amount` field). Do not paste',
  '   them all into one box.',
  '6. Click `Write` and confirm the transaction in your wallet.',
  '7. If your wallet has multiple rows, repeat once for each row.',
  ''
].join('\n');

const TROUBLESHOOTING = [
  '## Troubleshooting',
  '',
  '- **I cannot find my wallet:** you may already have withdrawn, may be using the wrong wallet,',
  '  or may not have locked NFTFI in these contracts.',
  '- **Connect to Web3 does not show my wallet:** connect the same wallet shown in the row.',
  '- **My wallet is a Safe / multisig:** the values in your row are correct; execute the same call',
  '  from your Safe instead of Etherscan’s personal-wallet connect flow.',
  '- **Enter the amount exactly as shown:** paste the raw integer value from `Parameter values` into',
  '  Etherscan as-is. Do not add a decimal point, and do not use Etherscan’s "×10^18" multiplier',
  '  helper — the value already includes the 18 decimals.',
  '- **`withdraw amount > total`:** the copied amount does not match the current locked balance.',
  '- **`no request`:** the copied legacy request parameters do not match an active request.',
  '- **`cooldown not up`:** the request is not ready yet; this should normally be caught by the generator.',
  ''
].join('\n');

const renderAppendix = (report: UnstakingReport): string =>
  [
    '## Technical Appendix',
    '',
    `- Generated: ${report.summary.generatedAt.toISOString()}`,
    `- Ethereum block: ${report.summary.block}`,
    `- Contracts included: ${CURRENT_LOCK.address}, ${LEGACY_LOCK.address}`,
    `- Wallets listed: ${report.summary.totalWallets}`,
    `- Total NFTFI listed: ${report.summary.totalHumanListed}`,
    ''
  ].join('\n');

/** Renders the public, jargon-free unstaking lookup document. Rows are pre-sorted by wallet. */
export const renderPublicGuide = (report: UnstakingReport): string => {
  const generated = `> Generated ${report.summary.generatedAt.toISOString()}.`;
  const header = [OVERVIEW, generated, '', HOW_TO_UNSTAKE, '## Unstaking Lookup Table', ''].join('\n');

  if (report.rows.length === 0) {
    return [header, 'No unstakable NFTFI balances were found.', '', TROUBLESHOOTING, renderAppendix(report)].join('\n');
  }

  const table = [
    '| Wallet | Amount | Open Etherscan | Function | Parameter values |',
    '| --- | --- | --- | --- | --- |',
    ...report.rows.map(renderRow),
    ''
  ].join('\n');

  return [header, table, TROUBLESHOOTING, renderAppendix(report)].join('\n');
};
