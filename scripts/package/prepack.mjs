import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Normalize Backstage's generated package exports before npm publication.

const packagePath = resolve('package.json');
const backstageCli = resolve('node_modules/@backstage/cli/bin/backstage-cli');
const backstagePrepack = spawnSync(
  process.execPath,
  [backstageCli, 'package', 'prepack'],
  { stdio: 'inherit' },
);

if (backstagePrepack.status !== 0) {
  process.exitCode = backstagePrepack.status ?? 1;
} else {
  try {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    const entry = packageJson.exports['.'];

    packageJson.exports['.'] = {
      types: entry.types,
      backstage: entry.backstage,
      require: {
        types: entry.types,
        default: entry.require,
      },
      default: entry.default,
    };

    writeFileSync(
      packagePath,
      `${JSON.stringify(packageJson, undefined, 2)}\n`,
    );
  } catch (error) {
    spawnSync(process.execPath, [backstageCli, 'package', 'postpack'], {
      stdio: 'inherit',
    });
    throw error;
  }
}
