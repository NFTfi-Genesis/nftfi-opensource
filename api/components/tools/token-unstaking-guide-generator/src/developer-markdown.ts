import { ReconciliationCheck, ReportError, ReportFlag, UnstakingReport } from './types';

const escapeCell = (value: string): string => value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ');

const renderError = (error: ReportError): string => {
  const request = error.request ? `amount ${error.request.amountRaw}, ts ${error.request.requestTimestamp}` : '—';
  return `| \`${error.wallet}\` | \`${error.lockAddress}\` | ${error.amountHuman} | ${error.amountRaw} | ${escapeCell(
    request
  )} | ${escapeCell(error.reason)} |`;
};

const renderFlag = (flag: ReportFlag): string =>
  `| \`${flag.wallet}\` | \`${flag.lockAddress}\` | ${flag.amountHuman} | ${flag.amountRaw} | ${escapeCell(
    flag.reason
  )} |`;

const renderCheck = (check: ReconciliationCheck): string =>
  `| ${check.passed ? '✅' : '❌'} | ${escapeCell(check.name)} | ${escapeCell(check.detail)} |`;

const renderErrors = (errors: readonly ReportError[]): string => {
  if (errors.length === 0) return ['## Errors (block publishing)', '', 'None — no errors.', ''].join('\n');
  return [
    '## Errors (block publishing)',
    '',
    'Each entry below means the public file cannot be trusted until a human resolves it.',
    '',
    '| Wallet | Contract | Amount | Amount (raw) | Request tuple | Reason |',
    '| --- | --- | --- | --- | --- | --- |',
    ...errors.map(renderError),
    ''
  ].join('\n');
};

const renderFlags = (flags: readonly ReportFlag[]): string => {
  if (flags.length === 0) return ['## Flags (informational, do not block publishing)', '', 'None.', ''].join('\n');
  return [
    '## Flags (informational, do not block publishing)',
    '',
    '| Wallet | Contract | Amount | Amount (raw) | Reason |',
    '| --- | --- | --- | --- | --- |',
    ...flags.map(renderFlag),
    ''
  ].join('\n');
};

/**
 * Renders the trust checks for a human reviewer. Global checks always show; per-wallet checks are
 * collapsed to a `N/N reconciled` summary line with only failures listed, so a real per-wallet
 * mismatch is not buried under hundreds of passing self-assertions.
 */
const renderReconciliation = (checks: readonly ReconciliationCheck[]): string => {
  const global = checks.filter(check => !check.perWallet);
  const perWallet = checks.filter(check => check.perWallet);
  const perWalletFailing = perWallet.filter(check => !check.passed);

  const lines = [
    '## Reconciliation & Trust Checks',
    '',
    '| Status | Check | Detail |',
    '| --- | --- | --- |',
    ...global.map(renderCheck),
    ...perWalletFailing.map(renderCheck),
    ''
  ];

  if (perWallet.length > 0) {
    const passed = perWallet.length - perWalletFailing.length;
    lines.push(`Per-wallet legacy: ${passed}/${perWallet.length} reconciled.`, '');
  }

  return lines.join('\n');
};

/** Renders the internal developer report (`unstake-manual-review.md`) — never published. */
export const renderDeveloperReport = (report: UnstakingReport): string => {
  const failedChecks = report.reconciliation.filter(check => !check.passed).length;
  const publishable = report.errors.length === 0 && failedChecks === 0;

  const summary = [
    '# NFTFI Token Unstaking — Developer Review',
    '',
    '> Internal run report. Not for publication.',
    '',
    '## Run Summary',
    '',
    `- Generated: ${report.summary.generatedAt.toISOString()}`,
    `- Ethereum block: ${report.summary.block}`,
    `- Public action rows: ${report.summary.totalRowCount}`,
    `- Wallets listed (rows + errors): ${report.summary.totalWallets}`,
    `- Total NFTFI listed: ${report.summary.totalHumanListed} (${report.summary.totalRawListed} wei)`,
    `- Errors: ${report.summary.errorCount}`,
    `- Flags: ${report.summary.flagCount}`,
    `- Failed reconciliation checks: ${failedChecks}`,
    `- Publish gate: ${publishable ? 'PASS — public file written' : 'BLOCKED — public file withheld'}`,
    ''
  ].join('\n');

  return [
    summary,
    renderErrors(report.errors),
    renderFlags(report.flags),
    renderReconciliation(report.reconciliation)
  ].join('\n');
};
