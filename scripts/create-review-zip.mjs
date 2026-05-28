import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync } from 'node:fs';
import { dirname, basename, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const allowDirty = args.includes('--allow-dirty');
const helpRequested = args.includes('--help') || args.includes('-h');
const excludedPaths = ['archive', 'docs/evidence', 'docs/contracts/p1', 'docs/contracts/p1.5', 'docs/contracts/p2'];
const filesystemFallbackExcludedRoots = [
  '.git',
  'node_modules',
  'dist',
  'dist-cli',
  'coverage',
  '.vite',
  '.vitest'
];
const filesystemFallbackExcludedFiles = new Set(['.DS_Store']);
const filesystemFallbackAllowedRoots = new Set(['.github', 'docs', 'scripts', 'src', 'tests', 'tests-integration']);
const filesystemFallbackAllowedExtensions = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.patch',
  '.svg',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml'
]);
const filesystemFallbackAllowedFiles = new Set([
  '.gitattributes',
  '.gitignore',
  'AGENTS.md',
  'index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'vite.cli.config.ts',
  'vitest.config.ts',
  'vitest.integration.config.ts'
]);
const filesystemFallbackSecretPathSegments = new Set(['private', 'secret', 'secrets']);
const filesystemFallbackSecretFileNames = new Set([
  'credentials.json',
  'local.settings.json',
  'service-account.json'
]);
const filesystemFallbackSecretExtensions = new Set([
  '.cer',
  '.crt',
  '.key',
  '.p12',
  '.pem',
  '.pfx'
]);
const contractFolderNames = ['p1', 'p1.5', 'p2'];
const nestedRepoArchivePatterns = [
  /(?:^|\/)docs\/contracts\/.+\/(?:src|tests|\.github)\//,
  /(?:^|\/)docs\/contracts\/.+\/package\.json$/
];

function printHelp() {
  console.log(`Usage: npm run zip:review [-- --allow-dirty]

Creates a code review ZIP from the current Git commit. If Git metadata is unavailable, archives the current working tree with dependency/build folders excluded.

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


function normalizeArchivePath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
}

export function shouldExcludeFilesystemReviewPath(path) {
  const normalizedPath = normalizeArchivePath(path);

  if (!normalizedPath || normalizedPath === '.') {
    return false;
  }

  const segments = normalizedPath.split('/');
  const fileName = segments[segments.length - 1];
  const lowerFileName = fileName.toLowerCase();
  const lowerSegments = segments.map((segment) => segment.toLowerCase());
  const extensionIndex = lowerFileName.lastIndexOf('.');
  const extension = extensionIndex > 0 ? lowerFileName.slice(extensionIndex) : '';

  if (filesystemFallbackExcludedFiles.has(fileName)) {
    return true;
  }

  if (
    lowerFileName.endsWith('.zip') ||
    lowerFileName.endsWith('.log') ||
    lowerFileName.startsWith('.env') ||
    lowerFileName === '.npmrc' ||
    lowerFileName.includes('token') ||
    lowerFileName.includes('password') ||
    lowerFileName.includes('credential') ||
    filesystemFallbackSecretFileNames.has(lowerFileName) ||
    filesystemFallbackSecretExtensions.has(extension) ||
    lowerSegments.some((segment) => filesystemFallbackSecretPathSegments.has(segment))
  ) {
    return true;
  }

  if (filesystemFallbackExcludedRoots.some((root) => segments.includes(root))) {
    return true;
  }

  return excludedPaths.some((excludedPath) => {
    const normalizedExcludedPath = normalizeArchivePath(excludedPath);
    return normalizedPath === normalizedExcludedPath || normalizedPath.startsWith(`${normalizedExcludedPath}/`);
  });
}

export function shouldIncludeFilesystemReviewPath(path) {
  const normalizedPath = normalizeArchivePath(path);

  if (!normalizedPath || normalizedPath === '.') {
    return true;
  }

  const [rootSegment] = normalizedPath.split('/');
  if (filesystemFallbackAllowedFiles.has(normalizedPath)) {
    return true;
  }

  if (!filesystemFallbackAllowedRoots.has(rootSegment)) {
    return false;
  }

  const fileName = normalizedPath.split('/').at(-1) ?? '';
  const extensionIndex = fileName.lastIndexOf('.');
  if (extensionIndex < 0) {
    return true;
  }

  return filesystemFallbackAllowedExtensions.has(fileName.slice(extensionIndex).toLowerCase());
}

function copyReviewFilesystemTree(sourceRoot, targetRoot, currentRelativePath = '') {
  const sourcePath = currentRelativePath ? resolve(sourceRoot, currentRelativePath) : sourceRoot;
  const entries = readdirSync(sourcePath, { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = currentRelativePath ? `${currentRelativePath}/${entry.name}` : entry.name;

    if (shouldExcludeFilesystemReviewPath(relativePath) || !shouldIncludeFilesystemReviewPath(relativePath)) {
      continue;
    }

    const from = resolve(sourceRoot, relativePath);
    const to = resolve(targetRoot, relativePath);

    if (entry.isDirectory()) {
      mkdirSync(to, { recursive: true });
      copyReviewFilesystemTree(sourceRoot, targetRoot, relativePath);
      continue;
    }

    if (entry.isFile()) {
      mkdirSync(dirname(to), { recursive: true });
      cpSync(from, to);
    }
  }
}

function createFilesystemReviewArchive(repoRoot, outputPath, archivePrefix) {
  const parentDir = dirname(repoRoot);
  const stagingRoot = resolve(parentDir, `.review-zip-staging-${process.pid}-${Date.now()}`);
  const archiveRootName = archivePrefix.replace(/\/$/, '');
  const stagedRepoRoot = resolve(stagingRoot, archiveRootName);

  try {
    mkdirSync(stagedRepoRoot, { recursive: true });
    copyReviewFilesystemTree(repoRoot, stagedRepoRoot);
    if (process.platform === 'win32') {
      run('powershell', [
        '-NoProfile',
        '-Command',
        '& { param($source, $destination) Compress-Archive -LiteralPath $source -DestinationPath $destination -Force }',
        archiveRootName,
        outputPath
      ], { cwd: stagingRoot });
    } else {
      run('zip', ['-q', '-r', outputPath, archiveRootName], { cwd: stagingRoot });
    }
  } finally {
    rmSync(stagingRoot, { recursive: true, force: true });
  }
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

export function listZipEntries(outputPath) {
  const buffer = readFileSync(outputPath);
  const eocdSignature = 0x06054b50;
  const centralDirectorySignature = 0x02014b50;
  const maxCommentLength = 0xffff;
  const searchStart = Math.max(0, buffer.length - maxCommentLength - 22);
  let eocdOffset = -1;

  for (let index = buffer.length - 22; index >= searchStart; index -= 1) {
    if (buffer.readUInt32LE(index) === eocdSignature) {
      eocdOffset = index;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error(`Unable to read ZIP central directory: ${outputPath}`);
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let entryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(entryOffset) !== centralDirectorySignature) {
      throw new Error(`Invalid ZIP central directory entry at offset ${entryOffset}.`);
    }

    const fileNameLength = buffer.readUInt16LE(entryOffset + 28);
    const extraFieldLength = buffer.readUInt16LE(entryOffset + 30);
    const commentLength = buffer.readUInt16LE(entryOffset + 32);
    const fileNameStart = entryOffset + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    entries.push(buffer.toString('utf8', fileNameStart, fileNameEnd));
    entryOffset = fileNameEnd + extraFieldLength + commentLength;
  }

  return entries;
}

function assertNoContractArchives(outputPath) {
  const zipEntries = listZipEntries(outputPath);
  const contractEntries = zipEntries.filter((entry) =>
    contractFolderNames.some((folderName) => entry.includes(`/docs/contracts/${folderName}/`))
  );

  if (contractEntries.length > 0) {
    throw new Error(`Review ZIP contains archived contract folders:\n${contractEntries.join('\n')}`);
  }
}

export function findNestedRepoArchiveEntries(zipEntries) {
  return zipEntries
    .split(/\r?\n/)
    .filter((entry) => nestedRepoArchivePatterns.some((pattern) => pattern.test(entry)));
}

export function assertNoNestedRepoArchiveEntries(outputPath, cwd) {
  const zipEntries = listZipEntries(outputPath).join('\n');
  const nestedEntries = findNestedRepoArchiveEntries(zipEntries);

  if (nestedEntries.length > 0) {
    throw new Error(`Review ZIP contains nested repo-shaped contract archive entries:\n${nestedEntries.join('\n')}`);
  }
}

function main() {
  if (helpRequested) {
    printHelp();
    return;
  }

  let repoRoot = process.cwd();
  let shortSha = 'working-tree';
  let useGitArchive = false;

  try {
    repoRoot = run('git', ['rev-parse', '--show-toplevel']);
    shortSha = run('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: repoRoot });
    useGitArchive = true;
  } catch {
    console.warn('No Git repository metadata found; archiving the current working tree with filesystem fallback.');
  }

  const repoName = basename(repoRoot);
  const parentDir = dirname(repoRoot);

  if (useGitArchive) {
    const dirtyStatus = run('git', ['status', '--porcelain'], { cwd: repoRoot });

    if (dirtyStatus && !allowDirty) {
      throw new Error(
        'Working tree has uncommitted changes. Commit them before building a review ZIP, or pass --allow-dirty to archive HEAD anyway.',
      );
    }

    if (dirtyStatus && allowDirty) {
      console.warn('Working tree is dirty; archiving HEAD only. Uncommitted changes will not be included.');
    }
  }

  const outputPath = resolve(parentDir, `${repoName}-review-${shortSha}.zip`);
  const archivePrefix = `${repoName}-${shortSha}/`;

  if (useGitArchive) {
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
  } else {
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }

    createFilesystemReviewArchive(repoRoot, outputPath, archivePrefix);
  }
  assertNoContractArchives(outputPath);
  assertNoNestedRepoArchiveEntries(outputPath, repoRoot);

  run('zip', ['-T', outputPath], { cwd: repoRoot, stdio: 'inherit' });

  const removedFiles = removeOldReviewZips(parentDir, repoName, outputPath);

  for (const fileName of removedFiles) {
    console.log(`Removed old review ZIP: ${resolve(parentDir, fileName)}`);
  }

  console.log(`Created review ZIP: ${outputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
