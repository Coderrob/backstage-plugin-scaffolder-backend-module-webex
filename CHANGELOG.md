# @coderrob/plugin-scaffolder-backend-module-webex

## 1.1.0

### Patch Changes

- Upgraded Backstage dependencies and the supported Node.js versions.
- Added configurable Webex Incoming Webhook URLs and human-duration request timeouts.
- Validated action and configured webhook destinations against the Webex Incoming Webhook contract without exposing secret URLs in errors.
- Refactored webhook configuration, validation, and delivery into cohesive modules.
- Added pre-commit linting and formatting, clearer documentation, explicit type contracts, and comprehensive positive and negative tests.
- Increased statements, branches, functions, and lines coverage to 100%.

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
