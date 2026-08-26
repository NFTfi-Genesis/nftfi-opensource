import { access, mkdtemp, mkdir, readFile, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeReportOutputs } from '../src/publish';
import { UnstakingReport } from '../src/types';

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const baseSummary = {
  generatedAt: new Date('2026-06-25T00:00:00.000Z'),
  block: 25345421,
  totalWallets: 1,
  totalRowCount: 1,
  totalRawListed: '1000000000000000000',
  totalHumanListed: '1',
  errorCount: 0,
  flagCount: 0
};

const publishableReport = (): UnstakingReport => ({
  rows: [
    {
      wallet: '0x1111111111111111111111111111111111111111',
      amountRaw: '1000000000000000000',
      amountHuman: '1',
      lockAddress: '0x8a63B7D2B66FB054705731Cc7964b05e7Ad095cF',
      functionName: 'withdrawNoCooldown',
      parameters: [{ name: '_amount', value: '1000000000000000000' }]
    }
  ],
  errors: [],
  flags: [],
  reconciliation: [{ name: 'Totals tie out', passed: true, detail: '1 == 1' }],
  summary: baseSummary
});

const blockedReport = (): UnstakingReport => ({
  ...publishableReport(),
  errors: [
    {
      wallet: '0x2222222222222222222222222222222222222222',
      lockAddress: '0xe53FfaCaDbc4744bE405BAD4AbE9852348eBeC02',
      amountRaw: '500',
      amountHuman: '0.0000000000000005',
      reason: 'no request'
    }
  ],
  summary: { ...baseSummary, errorCount: 1 }
});

describe('writeReportOutputs', () => {
  let dir: string;
  let publicOutFile: string;
  let reviewOutFile: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'unstake-publish-'));
    publicOutFile = join(dir, 'howto-unstake-nftfi-tokens.md');
    reviewOutFile = join(dir, 'unstake-manual-review.md');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('publishes the public guide and writes the developer report on a passing run', async () => {
    const result = await writeReportOutputs(publishableReport(), { publicOutFile, reviewOutFile });

    expect(result).toEqual({ published: true, staleRemoved: false });
    expect(await exists(publicOutFile)).toBe(true);
    expect(await exists(reviewOutFile)).toBe(true);
    expect(await readFile(publicOutFile, 'utf8')).toContain('# How to Unstake NFTFI Tokens');
  });

  it('leaves no temp file behind after an atomic publish', async () => {
    await writeReportOutputs(publishableReport(), { publicOutFile, reviewOutFile });
    const entries = await readdir(dir);
    expect(entries.some(name => name.endsWith('.tmp'))).toBe(false);
  });

  it('removes a stale public guide when a later run is blocked', async () => {
    await writeReportOutputs(publishableReport(), { publicOutFile, reviewOutFile });
    expect(await exists(publicOutFile)).toBe(true);

    const result = await writeReportOutputs(blockedReport(), { publicOutFile, reviewOutFile });

    expect(result).toEqual({ published: false, staleRemoved: true });
    expect(await exists(publicOutFile)).toBe(false);
    expect(await readFile(reviewOutFile, 'utf8')).toContain('no request');
  });

  it('reports nothing removed when a blocked run has no prior public guide', async () => {
    const result = await writeReportOutputs(blockedReport(), { publicOutFile, reviewOutFile });

    expect(result).toEqual({ published: false, staleRemoved: false });
    expect(await exists(publicOutFile)).toBe(false);
    expect(await exists(reviewOutFile)).toBe(true);
  });

  it('propagates a non-ENOENT failure while clearing the public path', async () => {
    await mkdir(publicOutFile);

    await expect(writeReportOutputs(blockedReport(), { publicOutFile, reviewOutFile })).rejects.toBeDefined();
  });
});
