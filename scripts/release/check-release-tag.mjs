import { readFileSync } from 'node:fs';

const tag = process.argv[2];
const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const changelog = readFileSync('CHANGELOG.md', 'utf8').replace(/\r\n/g, '\n');

if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag ?? '')) {
  throw new Error('Expected a stable vMAJOR.MINOR.PATCH release tag.');
}
if (tag !== `v${manifest.version}`) {
  throw new Error(
    `Tag ${tag} does not match package version v${manifest.version}.`,
  );
}
const escapedVersion = manifest.version.replaceAll('.', '\\.');
const section = new RegExp(
  `^## ${escapedVersion} - (\\d{4}-\\d{2}-\\d{2})\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`,
  'm',
).exec(changelog);
if (
  !section ||
  Number.isNaN(Date.parse(section[1])) ||
  new Date(section[1]).toISOString().slice(0, 10) !== section[1] ||
  !/^- \S/m.test(section[2])
) {
  throw new Error(
    `CHANGELOG.md has no nonempty dated section for ${manifest.version}.`,
  );
}
console.log(`Release tag ${tag} matches package metadata and changelog.`);
