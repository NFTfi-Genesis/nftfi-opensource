import { renderPublicGuide } from '../src/public-markdown';
import { UnstakingReport } from '../src/types';

const baseReport = (overrides: Partial<UnstakingReport> = {}): UnstakingReport => ({
  rows: [
    {
      wallet: '0x1111111111111111111111111111111111111111',
      amountRaw: '1000000000000000000',
      amountHuman: '1.0',
      lockAddress: '0x8a63B7D2B66FB054705731Cc7964b05e7Ad095cF',
      functionName: 'withdrawNoCooldown',
      parameters: [{ name: '_amount', value: '1000000000000000000' }]
    }
  ],
  errors: [],
  flags: [],
  reconciliation: [],
  summary: {
    generatedAt: new Date('2026-06-25T00:00:00.000Z'),
    block: 25345421,
    totalWallets: 1,
    totalRowCount: 1,
    totalRawListed: '1000000000000000000',
    totalHumanListed: '1.0',
    errorCount: 0,
    flagCount: 0
  },
  ...overrides
});

describe('renderPublicGuide', () => {
  it('renders the public title and how-to section', () => {
    const md = renderPublicGuide(baseReport());
    expect(md).toContain('# How to Unstake NFTFI Tokens');
    expect(md).toContain('This guide is for NFTFI token holders with tokens locked in Foundation staking contracts.');
    expect(md).toContain('## How to unstake');
  });

  it('renders the generation timestamp near the top', () => {
    const md = renderPublicGuide(baseReport());
    expect(md).toContain('> Generated 2026-06-25T00:00:00.000Z.');
  });

  it('renders an action row whose Etherscan link text is the contract address', () => {
    const md = renderPublicGuide(baseReport());
    expect(md).toContain(
      '| `0x1111111111111111111111111111111111111111` | 1.0 | [0x8a63B7D2B66FB054705731Cc7964b05e7Ad095cF](https://etherscan.io/address/0x8a63B7D2B66FB054705731Cc7964b05e7Ad095cF#writeContract) | `withdrawNoCooldown` | `_amount = 1000000000000000000` |'
    );
  });

  it('renders one name = value chunk per parameter', () => {
    const md = renderPublicGuide(
      baseReport({
        rows: [
          {
            wallet: '0x2222222222222222222222222222222222222222',
            amountRaw: '500',
            amountHuman: '0.0000000000000005',
            lockAddress: '0xe53FfaCaDbc4744bE405BAD4AbE9852348eBeC02',
            functionName: 'withdraw',
            parameters: [
              { name: '_amount', value: '500' },
              { name: '_requestTimestamp', value: '1700000000' },
              { name: '_protocolSignatureExpiry', value: '0' },
              { name: '_protocolSignature', value: '0x' }
            ]
          }
        ]
      })
    );
    expect(md).toContain(
      '`_amount = 500`<br>`_requestTimestamp = 1700000000`<br>`_protocolSignatureExpiry = 0`<br>`_protocolSignature = 0x`'
    );
  });

  it('contains no contract jargon columns in the table header', () => {
    const md = renderPublicGuide(baseReport());
    expect(md).toContain('| Wallet | Amount | Open Etherscan | Function | Parameter values |');
    expect(md).not.toContain('Contract |');
    expect(md).not.toContain('Status');
    expect(md).not.toContain('Reason');
  });

  it('renders the appendix with block and totals but never the RPC URL', () => {
    const md = renderPublicGuide(baseReport());
    expect(md).toContain('- Ethereum block: 25345421');
    expect(md).toContain('- Total NFTFI listed: 1.0');
    expect(md).not.toContain('alchemy');
    expect(md).not.toContain('rpc');
  });

  it('renders an empty-state message when there are no rows', () => {
    const md = renderPublicGuide(baseReport({ rows: [] }));
    expect(md).toContain('No unstakable NFTFI balances were found.');
  });
});
