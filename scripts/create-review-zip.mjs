import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, basename, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const allowDirty = args.includes('--allow-dirty');
const helpRequested = args.includes('--help') || args.includes('-h');
const excludedPaths = ['archive'];

function printHelp() {
  console.log(`Usage: npm run zip:review [-- --allow-dirty]

Creates a code review ZIP from the current Git commit.

By default the archive is written to the parent folder:
  ../<repo-name>-review-<short-sha>.zip

Excluded paths:
${excludedPaths.map((path) => `  ${path}/`).join('\n')}

Options:
  --allow-dirty  Archive HEAD even when the working tree has uncommitted changes.
`);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd,
    encoding: 'utf8',
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) {
    throw new Error(`Failed to run ${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    const detail = stderr || stdout || `exit code ${result.status}`;
    throw new Error(`${command} ${commandArgs.join(' ')} failed: ${detail}`);
  }

  return result.stdout?.trim() ?? '';
}

function removeOldReviewZips(parentDir, repoName, currentOutputPath) {
  const currentOutputName = basename(currentOutputPath);
  const reviewZipPrefix = `${repoName}-review-`;

  const removedFiles = readdirSync(parentDir)
    .filter((fileName) => {
      return (
        fileName !== currentOutputName &&
        fileName.startsWith(reviewZipPrefix) &&
        fileName.endsWith('.zip')
      );
    })
    .filter((fileName) => statSync(resolve(parentDir, fileName)).isFile());

  for (const fileName of removedFiles) {
    unlinkSync(resolve(parentDir, fileName));
  }

  return removedFiles;
}

function main() {
  if (helpRequested) {
    printHelp();
    return;
  }

  const repoRoot = run('git', ['rev-parse', '--show-toplevel']);
  const repoName = basename(repoRoot);
  const parentDir = dirname(repoRoot);
  const shortSha = run('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: repoRoot });
  const dirtyStatus = run('git', ['status', '--porcelain'], { cwd: repoRoot });

  if (dirtyStatus && !allowDirty) {
    throw new Error(
      'Working tree has uncommitted changes. Commit them before building a review ZIP, or pass --allow-dirty to archive HEAD anyway.',
    );
  }

  if (dirtyStatus && allowDirty) {
    console.warn('Working tree is dirty; archiving HEAD only. Uncommitted changes will not be included.');
  }

  const outputPath = resolve(parentDir, `${repoName}-review-${shortSha}.zip`);
  const archivePrefix = `${repoName}-${shortSha}/`;

  run(
    'git',
    [
      'archive',
      '--format=zip',
      `--prefix=${archivePrefix}`,
      '-o',
      outputPath,
      'HEAD',
      '--',
      '.',
      ...excludedPaths.map((path) => `:(exclude)${path}`),
    ],
    { cwd: repoRoot },
  );

  run('zip', ['-T', outputPath], { cwd: repoRoot, stdio: 'inherit' });

  const removedFiles = removeOldReviewZips(parentDir, repoName, outputPath);

  for (const fileName of removedFiles) {
    console.log(`Removed old review ZIP: ${resolve(parentDir, fileName)}`);
  }

  console.log(`Created review ZIP: ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
