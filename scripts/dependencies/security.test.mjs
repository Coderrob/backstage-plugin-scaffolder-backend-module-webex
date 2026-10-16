import assert from 'node:assert/strict';
import { X509Certificate, createPrivateKey } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createSecureContext } from 'node:tls';
import test from 'node:test';

const require = createRequire(import.meta.url);
const scaffolderRequire = createRequire(
  require.resolve('@backstage/plugin-scaffolder-node'),
);
const globbyRequire = createRequire(scaffolderRequire.resolve('globby'));
const fastGlobRequire = createRequire(globbyRequire.resolve('fast-glob'));
const micromatchRequire = createRequire(fastGlobRequire.resolve('micromatch'));
const cliRequire = createRequire(require.resolve('@backstage/cli'));
const buildRequire = createRequire(
  cliRequire.resolve('@backstage/cli-module-build'),
);
const serverRequire = createRequire(buildRequire.resolve('@rspack/dev-server'));

function temporaryDirectory(t) {
  const directory = mkdtempSync(join(tmpdir(), 'webex-dependency-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('Backstage globbing resolves the pinned braces security fork', () => {
  const manifest = micromatchRequire('braces/package.json');
  assert.equal(manifest.name, '@zklogic/braces');
  assert.equal(manifest.version, '3.0.7');
});

for (const [name, open, close] of [
  ['braces', '{', '}'],
  ['parentheses', '(', ')'],
  ['mixed nesting', '{(', ')}'],
]) {
  test(`deep ${name} cannot exhaust the glob parser stack`, () => {
    const modulePath = micromatchRequire.resolve('braces');
    const repetitions = name === 'mixed nesting' ? 2000 : 4000;
    const script = `
      const braces = require(${JSON.stringify(modulePath)});
      const pattern = ${JSON.stringify(
        open,
      )}.repeat(${repetitions}) + 'a,b' + ${JSON.stringify(
      close,
    )}.repeat(${repetitions});
      for (const operation of [braces, braces.expand, braces.parse]) operation(pattern);
    `;
    const child = spawnSync(process.execPath, ['-e', script], {
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.ifError(child.error);
    assert.equal(child.status, 0, child.stderr);
  });
}

test('Backstage globby preserves nested alternatives and numeric-range matching', async t => {
  const directory = temporaryDirectory(t);
  mkdirSync(join(directory, 'src'));
  for (const name of ['a.js', 'b.js', 'c.js', 'other.ts']) {
    writeFileSync(join(directory, 'src', name), '');
  }
  for (const name of ['file01.txt', 'file02.txt', 'file03.txt', 'file04.txt']) {
    writeFileSync(join(directory, name), '');
  }
  const globby = scaffolderRequire('globby');
  assert.deepEqual(
    (
      await globby(['src/{a,{b,c}}.js', 'file{01..03}.txt'], { cwd: directory })
    ).sort(),
    [
      'file01.txt',
      'file02.txt',
      'file03.txt',
      'src/a.js',
      'src/b.js',
      'src/c.js',
    ],
  );
});

test('Rspack uses selfsigned 5 without node-forge', () => {
  assert.equal(serverRequire('selfsigned/package.json').version, '5.5.0');
  assert.throws(() => serverRequire.resolve('node-forge'), {
    code: 'MODULE_NOT_FOUND',
  });
});

test('Rspack generates and reuses a valid 30-day HTTPS certificate with selfsigned 5', async t => {
  const directory = temporaryDirectory(t);
  const { RspackDevServer } = buildRequire('@rspack/dev-server');
  t.mock.method(RspackDevServer, 'findCacheDir', () => directory);
  const compiler = {
    options: { context: directory, output: {} },
    getInfrastructureLogger: () => ({ info() {}, warn() {}, error() {} }),
  };
  const options = () => ({ server: 'https', static: false, client: false });
  const server = new RspackDevServer(options(), compiler);
  await server.normalizeOptions();
  const tls = server.options.server.options;
  const certificate = new X509Certificate(tls.cert);
  assert.equal(certificate.checkPrivateKey(createPrivateKey(tls.key)), true);
  assert.equal(certificate.checkHost('localhost'), 'localhost');
  assert.equal(certificate.checkIP('127.0.0.1'), '127.0.0.1');
  assert.equal(certificate.verify(certificate.publicKey), true);
  const validity =
    Date.parse(certificate.validTo) - Date.parse(certificate.validFrom);
  assert.ok(Math.abs(validity - 30 * 24 * 60 * 60 * 1000) < 5000);
  assert.doesNotThrow(() => createSecureContext(tls));
  const cached = new RspackDevServer(options(), compiler);
  await cached.normalizeOptions();
  assert.deepEqual(cached.options.server.options.cert, tls.cert);
});
