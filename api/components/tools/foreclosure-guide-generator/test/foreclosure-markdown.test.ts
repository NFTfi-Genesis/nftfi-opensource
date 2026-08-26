import { ForeclosureSection, renderForeclosureGuide } from '../src/foreclosure-markdown';

const v1Section: ForeclosureSection = {
  title: 'V1',
  liquidateFunction: 'liquidateOverdueLoan',
  loanIdType: 'uint256',
  contract: '0x88341d1a8F672D2780C8dC725902AAe72F143B0c',
  loans: [
    {
      loanId: '42',
      lender: '0xlender1',
      contract: '0x88341d1a8F672D2780C8dC725902AAe72F143B0c',
      etherscanAnchor: 'F5',
      collectionName: 'CryptoPunks',
      assetName: 'CryptoPunks #1234',
      nftContract: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
      nftTokenId: '1234'
    }
  ]
};

describe(renderForeclosureGuide.name, () => {
  it('renders the legacy headings, a summary, and a section table per version with loans', () => {
    const markdown = renderForeclosureGuide({
      generatedAt: new Date('2026-06-02T00:00:00.000Z'),
      sections: [v1Section]
    });

    expect(markdown).toContain('# How to Foreclose Defaulted NFTfi Loans');
    expect(markdown).toContain('This guide is for lenders with defaulted NFTfi loans.');
    expect(markdown).toContain('> Generated 2026-06-02T00:00:00.000Z.');
    expect(markdown).toContain('## How To Foreclose');
    expect(markdown).toContain('## List of Defaulted Loans');
    expect(markdown).toContain('**1** outstanding loans are listed:');
    expect(markdown).toContain('- V1: 1');
    expect(markdown).toContain('### V1');
    expect(markdown).toContain(
      'Foreclose on `0x88341d1a8F672D2780C8dC725902AAe72F143B0c` by calling `liquidateOverdueLoan(uint256 _loanId)`.'
    );
    expect(markdown).toContain('| Lender Address | Collateral | Loan ID | Foreclose |');
    expect(markdown).toContain(
      '| `0xlender1` | [CryptoPunks - CryptoPunks #1234](https://opensea.io/item/ethereum/0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb/1234) | 42 | [Foreclose](https://etherscan.io/address/0x88341d1a8F672D2780C8dC725902AAe72F143B0c#writeContract#F5) |'
    );
  });

  it('omits sections that have no loans', () => {
    const markdown = renderForeclosureGuide({
      generatedAt: new Date('2026-06-02T00:00:00.000Z'),
      sections: [
        v1Section,
        { title: 'V2', liquidateFunction: 'liquidateOverdueLoan', loanIdType: 'uint32', contract: '0xv2', loans: [] }
      ]
    });

    expect(markdown).not.toContain('### V2');
    expect(markdown).not.toContain('- V2: 0');
  });

  it('falls back to a token-id label when the asset name is empty', () => {
    const markdown = renderForeclosureGuide({
      generatedAt: new Date('2026-06-02T00:00:00.000Z'),
      sections: [
        {
          title: 'V1',
          liquidateFunction: 'liquidateOverdueLoan',
          loanIdType: 'uint256',
          contract: '0xcontract',
          loans: [
            {
              loanId: '1',
              lender: '0xlender',
              contract: '0xcontract',
              etherscanAnchor: 'F5',
              collectionName: 'Mystery',
              assetName: '',
              nftContract: '0xnft',
              nftTokenId: '9'
            }
          ]
        }
      ]
    });

    expect(markdown).toContain('[Mystery #9]');
  });

  it('renders generic instructions for unmapped contracts', () => {
    const markdown = renderForeclosureGuide({
      generatedAt: new Date('2026-06-02T00:00:00.000Z'),
      sections: [
        {
          title: 'Unmapped contracts',
          liquidateFunction: null,
          loanIdType: null,
          contract: null,
          loans: [
            {
              loanId: '5',
              lender: '0xlender2',
              contract: '0xunknown',
              etherscanAnchor: null,
              collectionName: 'Mystery',
              assetName: 'Mystery #9',
              nftContract: '0xnft',
              nftTokenId: '9'
            }
          ]
        }
      ]
    });

    expect(markdown).toContain('### Unmapped contracts');
    expect(markdown).toContain("contract's overdue-loan liquidation function");
    expect(markdown).toContain('[Foreclose](https://etherscan.io/address/0xunknown#writeContract)');
  });

  it('escapes pipe characters in collection names', () => {
    const markdown = renderForeclosureGuide({
      generatedAt: new Date('2026-06-02T00:00:00.000Z'),
      sections: [
        {
          title: 'V1',
          liquidateFunction: 'liquidateOverdueLoan',
          loanIdType: 'uint256',
          contract: '0xcontract',
          loans: [
            {
              loanId: '1',
              lender: '0xlender',
              contract: '0xcontract',
              etherscanAnchor: 'F5',
              collectionName: 'A | B',
              assetName: '',
              nftContract: '0xnft',
              nftTokenId: '7'
            }
          ]
        }
      ]
    });

    expect(markdown).toContain('[A \\| B #7]');
  });

  it('renders an empty-state message when there are no loans at all', () => {
    const markdown = renderForeclosureGuide({
      generatedAt: new Date('2026-06-02T00:00:00.000Z'),
      sections: [
        { title: 'V1', liquidateFunction: 'liquidateOverdueLoan', loanIdType: 'uint256', contract: '0xc', loans: [] }
      ]
    });

    expect(markdown).toContain('No outstanding NFTfi loans were found.');
    expect(markdown).not.toContain('| Lender Address |');
  });
});
