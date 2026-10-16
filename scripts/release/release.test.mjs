import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const scripts = dirname(fileURLToPath(import.meta.url));
const notes =
  '# Package\n\n## [Unreleased]\n\n### Patch Changes\n\n- New feature.\n\n## 1.1.0\n\n- Previous release.\n';

function fixture(t, changelog = notes) {
  const directory = mkdtempSync(join(tmpdir(), 'webex-release-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(
    join(directory, 'package.json'),
    JSON.stringify({ version: '1.1.1' }),
  );
  writeFileSync(join(directory, 'CHANGELOG.md'), changelog);
  return {
    read: () => readFileSync(join(directory, 'CHANGELOG.md'), 'utf8'),
    run: (script, argument, date = '2026-10-15') =>
      spawnSync(process.execPath, [join(scripts, script), argument], {
        cwd: directory,
        encoding: 'utf8',
        env: { ...process.env, RELEASE_DATE: date },
      }),
  };
}

test('prepares CRLF release notes, retains history and an empty Unreleased section, and validates the tag', t => {
  const project = fixture(t, notes.replaceAll('\n', '\r\n'));
  const prepared = project.run('update-release-changelog.mjs', '1.1.1');
  assert.equal(prepared.status, 0, prepared.stderr);
  assert.equal(
    project.read(),
    notes.replace(
      '## [Unreleased]',
      '## [Unreleased]\n\n## 1.1.1 - 2026-10-15',
    ),
  );
  const checked = project.run('check-release-tag.mjs', 'v1.1.1');
  assert.equal(checked.status, 0, checked.stderr);
});

for (const version of [
  '',
  '01.1.1',
  '1.1.1-beta.1',
  '1.1.1\n',
  '1.1.1;echo nope',
]) {
  test(`rejects an invalid preparation version: ${JSON.stringify(
    version,
  )}`, t => {
    const project = fixture(t);
    assert.notEqual(
      project.run('update-release-changelog.mjs', version).status,
      0,
    );
    assert.equal(project.read(), notes);
  });
}

for (const [name, changelog] of [
  ['missing Unreleased', notes.replace('## [Unreleased]', '## Upcoming')],
  ['duplicate Unreleased', notes.replace('## 1.1.0', '## [Unreleased]')],
  ['empty Unreleased', notes.replace('- New feature.', '')],
  ['no release history', notes.slice(0, notes.indexOf('## 1.1.0'))],
  ['duplicate undated release', notes.replace('## 1.1.0', '## 1.1.1')],
  [
    'duplicate dated release',
    notes.replace('## 1.1.0', '## 1.1.1 - 2026-10-01'),
  ],
  [
    'duplicate bracketed release',
    notes.replace('## 1.1.0', '## [1.1.1] - 2026-10-01'),
  ],
]) {
  test(`rejects ${name} without changing the changelog`, t => {
    const project = fixture(t, changelog);
    assert.notEqual(
      project.run('update-release-changelog.mjs', '1.1.1').status,
      0,
    );
    assert.equal(project.read(), changelog);
  });
}

for (const date of ['not-a-date', '2026-02-30']) {
  test(`rejects invalid release date ${date}`, t => {
    const project = fixture(t);
    assert.notEqual(
      project.run('update-release-changelog.mjs', '1.1.1', date).status,
      0,
    );
    assert.equal(project.read(), notes);
  });
}

for (const tag of [
  '',
  'main',
  '1.1.1',
  'v1.1.2',
  'v01.1.1',
  'v1.1.1-beta.1',
  'v1.1.1\n',
]) {
  test(`rejects an invalid or mismatched release tag: ${JSON.stringify(
    tag,
  )}`, t => {
    const project = fixture(
      t,
      '# Package\n\n## 1.1.1 - 2026-10-15\n\n- Notes.\n',
    );
    assert.notEqual(project.run('check-release-tag.mjs', tag).status, 0);
  });
}

for (const [name, changelog] of [
  ['undated release', '# Package\n\n## 1.1.1\n\n- Notes.\n'],
  ['invalid calendar date', '# Package\n\n## 1.1.1 - 2026-02-30\n\n- Notes.\n'],
  [
    'empty section followed by older notes',
    '# Package\n\n## 1.1.1 - 2026-10-15\n\n## 1.1.0\n\n- Older notes.\n',
  ],
]) {
  test(`rejects publishing an ${name}`, t => {
    const project = fixture(t, changelog);
    assert.notEqual(project.run('check-release-tag.mjs', 'v1.1.1').status, 0);
  });
}

test('accepts a dated release section at end of file without a trailing newline', t => {
  const project = fixture(t, '# Package\n\n## 1.1.1 - 2026-10-15\n\n- Notes.');
  const checked = project.run('check-release-tag.mjs', 'v1.1.1');
  assert.equal(checked.status, 0, checked.stderr);
});
