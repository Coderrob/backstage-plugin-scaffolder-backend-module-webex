import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const publintScriptPath = resolve(
  __dirname,
  '../../scripts/package/publint.mjs',
);

describe('npm package contents', () => {
  test('should publish only explicitly allowed build artifacts', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(__dirname, '../../package.json'), 'utf8'),
    ) as { files: string[]; scripts: Record<string, string> };

    expect(packageJson.scripts.prepack).toBe(
      'node scripts/package/prepack.mjs',
    );
    expect(packageJson.files).not.toContain('dist');
    expect(packageJson.files).not.toContainEqual(
      expect.stringMatching(/\.map$/),
    );
    expect(packageJson.files.filter(file => file.startsWith('dist/'))).toEqual([
      'dist/index.cjs.js',
      'dist/index.d.ts',
      'dist/module.cjs.js',
      'dist/actions/sendWebhooksMessageAction.cjs.js',
      'dist/contracts.cjs.js',
      'dist/config/readWebexActionOptions.cjs.js',
      'dist/webex/incomingWebhook.cjs.js',
      'dist/webex/sendWebhookMessage.cjs.js',
    ]);
  });

  test('should keep Publint functions within 25 non-comment lines', () => {
    const sourceText = readFileSync(publintScriptPath, 'utf8');
    const sourceFile = ts.createSourceFile(
      publintScriptPath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    const functions = sourceFile.statements.filter(ts.isFunctionDeclaration);

    for (const declaration of functions) {
      const body = declaration.body?.getText(sourceFile) ?? '';
      const lines = body
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'));
      expect(lines.length).toBeLessThanOrEqual(25);
    }
  });

  test('should document every Publint function with JSDoc', () => {
    const sourceText = readFileSync(publintScriptPath, 'utf8');
    const sourceFile = ts.createSourceFile(
      publintScriptPath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    const functions = sourceFile.statements.filter(ts.isFunctionDeclaration);

    for (const declaration of functions) {
      expect(ts.getJSDocCommentsAndTags(declaration)).not.toHaveLength(0);
    }
  });
});
