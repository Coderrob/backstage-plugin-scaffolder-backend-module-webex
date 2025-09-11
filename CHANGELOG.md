# @coderrob/plugin-scaffolder-backend-module-webex

## 1.1.0

### Patch Changes

- Migrated: Bumped Backstage version to 1.42.x and removed dependency on deprecated `createTemplateAction` usage.
- Refactor: Converted `sendWebhooksMessageAction` unit tests to a table-driven style and introduced a `makeContext` helper to remove duplicated test setup and unused cruft.
- Fix: Tightened `failedMessages` filtering in `createSendWebhooksMessageAction` so successful deliveries are excluded and consumers receive an empty array when all sends succeed.
- Test updates: Adjusted assertions to expect the `failedMessages` output to be an empty array on success. Tests were updated to construct fresh contexts per test to avoid shared state.
- Misc: Small typing concession in tests (`makeContext(input: any)`) to keep the test utility usage straightforward.
- Validation: All tests pass locally after these changes.

## 1.0.4

### Patch Changes

- Dependency updates.
- Checked for outdated dependencies using npm outdated.
- Updated package.json with the latest version numbers if necessary.
- Addressed any security vulnerabilities by running npm audit fix.

## 1.0.3

### Patch Changes

- Fix redundant import on axios inside unit test.
- Add NPM deployment configuration files and registry path.

## 1.0.2

### Patch Changes

- Simplified the module and folder structure, making the project more generic and adaptable as a "Webex" module.

## 1.0.1

### Patch Changes

- Set the backend module as the default export for the plugin.

## 1.0.0

### Initial Release

- Introduced initial code contributions.
