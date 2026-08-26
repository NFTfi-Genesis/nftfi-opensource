import { rename, unlink, writeFile } from 'fs/promises';
import { UnstakingReport } from './types';
import { renderPublicGuide } from './public-markdown';
import { renderDeveloperReport } from './developer-markdown';

export interface PublishPaths {
  readonly publicOutFile: string;
  readonly reviewOutFile: string;
}

export interface PublishResult {
  readonly published: boolean;
  /** True when a blocked run deleted a public guide left over from a previous passing run. */
  readonly staleRemoved: boolean;
}

/** Deletes `path` if present; returns whether anything was removed. Non-`ENOENT` errors propagate. */
const removeIfExists = async (path: string): Promise<boolean> => {
  try {
    await unlink(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
};

/**
 * Writes the run's outputs and enforces the Publish Gate at the filesystem level.
 *
 * The developer report is always written. The public guide is published only when the report is
 * error-free and every reconciliation check passes — and then atomically (temp file + rename) so a
 * crash mid-write can't leave a truncated guide. Critically, a blocked run **removes** any public
 * guide left behind by an earlier passing run: this is a fund-movement document a human uploads from
 * `publicOutFile`, so a stale-but-publishable-looking file surviving a blocked re-run would be worse
 * than no file at all.
 */
export const writeReportOutputs = async (report: UnstakingReport, paths: PublishPaths): Promise<PublishResult> => {
  await writeFile(paths.reviewOutFile, renderDeveloperReport(report), 'utf8');

  const publishable = report.errors.length === 0 && report.reconciliation.every(check => check.passed);

  if (publishable) {
    const tempPath = `${paths.publicOutFile}.tmp`;
    await writeFile(tempPath, renderPublicGuide(report), 'utf8');
    await rename(tempPath, paths.publicOutFile);
    return { published: true, staleRemoved: false };
  }

  const staleRemoved = await removeIfExists(paths.publicOutFile);
  return { published: false, staleRemoved };
};
