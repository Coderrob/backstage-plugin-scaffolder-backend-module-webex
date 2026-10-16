import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const version = process.argv[2];
const date = process.env.RELEASE_DATE ?? new Date().toISOString().slice(0, 10);
const path = resolve('CHANGELOG.md');

if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version ?? '')) {
  throw new Error('Expected a stable major.minor.patch version.');
}
if (
  !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
  Number.isNaN(Date.parse(date)) ||
  new Date(date).toISOString().slice(0, 10) !== date
) {
  throw new Error('Expected RELEASE_DATE to be a valid YYYY-MM-DD date.');
}

const changelog = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const headings = [...changelog.matchAll(/^## .+$/gm)];
if (
  headings[0]?.[0] !== '## [Unreleased]' ||
  headings.filter(([heading]) => heading === '## [Unreleased]').length !== 1 ||
  !headings[1] ||
  !/^- \S/m.test(
    changelog.slice(
      headings[0].index + headings[0][0].length,
      headings[1].index,
    ),
  )
) {
  throw new Error(
    'Expected one nonempty Unreleased section before existing releases.',
  );
}
if (
  headings.some(([heading]) =>
    new RegExp(`^## \\[?${version.replaceAll('.', '\\.')}\\]?(?: - .*)?$`).test(
      heading,
    ),
  )
) {
  throw new Error(`Changelog already contains version ${version}.`);
}

const start = headings[0].index;
const end = start + headings[0][0].length;
writeFileSync(
  path,
  `${changelog.slice(
    0,
    start,
  )}## [Unreleased]\n\n## ${version} - ${date}${changelog.slice(end)}`,
);
console.log(`Prepared changelog for ${version}.`);
