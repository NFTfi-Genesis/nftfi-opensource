import { renderDeveloperReport } from '../src/developer-markdown';
import { UnstakingReport } from '../src/types';

const reportWith = (overrides: Partial<UnstakingReport>): UnstakingReport => ({
  rows: [],
  errors: [],
  flags: [],
  reconciliation: [{ name: 'Totals tie out', passed: true, detail: '1000 == 1000' }],
  summary: {
    generatedAt: new Date('2026-06-25T00:00:00.000Z'),
    block: 25345421,
    totalWallets: 0,
    totalRowCount: 0,
    totalRawListed: '0',
    totalHumanListed: '0.0',
    errorCount: 0,
    flagCount: 0
  },
  ...overrides
});

describe('renderDeveloperReport', () => {
  it('reports a passing publish gate when there are no errors and all checks pass', () => {
    const md = renderDeveloperReport(reportWith({}));
    expect(md).toContain('- Publish gate: PASS — public file written');
    expect(md).toContain('None — no errors.');
  });

  it('renders an error row with the contract, raw amount, request tuple and reason', () => {
    const md = renderDeveloperReport(
      reportWith({
        errors: [
          {
            wallet: '0x2222222222222222222222222222222222222222',
            lockAddress: '0xe53FfaCaDbc4744bE405BAD4AbE9852348eBeC02',
            amountRaw: '500',
            amountHuman: '0.0000000000000005',
            request: { amountRaw: '500', requestTimestamp: 1700000000 },
            reason: 'Cooldown not up yet'
          }
        ],
        summary: {
          generatedAt: new Date('2026-06-25T00:00:00.000Z'),
          block: 25345421,
          totalWallets: 1,
          totalRowCount: 0,
          totalRawListed: '500',
          totalHumanListed: '0.0000000000000005',
          errorCount: 1,
          flagCount: 0
        }
      })
    );
    expect(md).toContain(
      '| `0x2222222222222222222222222222222222222222` | `0xe53FfaCaDbc4744bE405BAD4AbE9852348eBeC02` | 0.0000000000000005 | 500 | amount 500, ts 1700000000 | Cooldown not up yet |'
    );
    expect(md).toContain('- Publish gate: BLOCKED — public file withheld');
  });

  it('renders an error without a request tuple using an em dash placeholder', () => {
    const md = renderDeveloperReport(
      reportWith({
        errors: [
          {
            wallet: '0x4444444444444444444444444444444444444444',
            lockAddress: '0x8a63B7D2B66FB054705731Cc7964b05e7Ad095cF',
            amountRaw: '1000000000000000000',
            amountHuman: '1.0',
            reason: 'withdraw amount > total'
          }
        ]
      })
    );
    expect(md).toContain(
      '| `0x4444444444444444444444444444444444444444` | `0x8a63B7D2B66FB054705731Cc7964b05e7Ad095cF` | 1.0 | 1000000000000000000 | — | withdraw amount > total |'
    );
  });

  it('renders a contract-wallet flag without blocking the publish gate', () => {
    const md = renderDeveloperReport(
      reportWith({
        flags: [
          {
            wallet: '0x3333333333333333333333333333333333333333',
            lockAddress: '0x8a63B7D2B66FB054705731Cc7964b05e7Ad095cF',
            amountRaw: '1000000000000000000',
            amountHuman: '1.0',
            reason:
              'Contract wallet (Safe / multisig) — action row is valid but must be executed via the Safe, not Etherscan Connect to Web3'
          }
        ]
      })
    );
    expect(md).toContain(
      '| `0x3333333333333333333333333333333333333333` | `0x8a63B7D2B66FB054705731Cc7964b05e7Ad095cF` | 1.0 | 1000000000000000000 |'
    );
    expect(md).toContain('- Publish gate: PASS — public file written');
  });

  it('marks a failed reconciliation check and blocks the publish gate', () => {
    const md = renderDeveloperReport(
      reportWith({ reconciliation: [{ name: 'Totals tie out', passed: false, detail: '1000 == 999' }] })
    );
    expect(md).toContain('| ❌ | Totals tie out | 1000 == 999 |');
    expect(md).toContain('- Publish gate: BLOCKED — public file withheld');
  });

  it('collapses passing per-wallet checks into a summary line and lists only failures', () => {
    const md = renderDeveloperReport(
      reportWith({
        reconciliation: [
          { name: 'Aggregate current: Σ lockedTokens == TokenLock balance', passed: true, detail: '1 == 1' },
          { name: 'Per-wallet legacy 0xaaa', passed: true, detail: '5 == 5 == 5', perWallet: true },
          { name: 'Per-wallet legacy 0xbbb', passed: true, detail: '7 == 7 == 7', perWallet: true },
          { name: 'Per-wallet legacy 0xccc', passed: false, detail: '9 == 8 == 9', perWallet: true }
        ]
      })
    );
    expect(md).toContain('| ✅ | Aggregate current: Σ lockedTokens == TokenLock balance | 1 == 1 |');
    expect(md).toContain('| ❌ | Per-wallet legacy 0xccc | 9 == 8 == 9 |');
    expect(md).not.toContain('0xaaa');
    expect(md).not.toContain('0xbbb');
    expect(md).toContain('Per-wallet legacy: 2/3 reconciled.');
  });
});
