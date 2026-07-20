# Webex Scaffolder Backend Module for Backstage

[![npm version](https://img.shields.io/npm/v/@coderrob/backstage-plugin-scaffolder-backend-module-webex.svg)](https://www.npmjs.com/package/@coderrob/backstage-plugin-scaffolder-backend-module-webex)
[![CI](https://github.com/Coderrob/backstage-plugin-scaffolder-backend-module-webex/actions/workflows/ci.yaml/badge.svg)](https://github.com/Coderrob/backstage-plugin-scaffolder-backend-module-webex/actions/workflows/ci.yaml)
[![npm downloads](https://img.shields.io/npm/dm/@coderrob/backstage-plugin-scaffolder-backend-module-webex.svg)](https://www.npmjs.com/package/@coderrob/backstage-plugin-scaffolder-backend-module-webex)
[![Node.js](https://img.shields.io/node/v/@coderrob/backstage-plugin-scaffolder-backend-module-webex.svg)](https://nodejs.org/)
[![coverage: 100%](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](#development)
[![license](https://img.shields.io/npm/l/@coderrob/backstage-plugin-scaffolder-backend-module-webex.svg)](https://www.apache.org/licenses/LICENSE-2.0)

A Backstage backend module that adds the `webex:webhooks:sendMessage`
Scaffolder action. The action sends text or Markdown messages to one or more
[Webex incoming webhooks](https://apphub.webex.com/applications/incoming-webhooks-cisco-systems-38054-23307-75252).

## Features

- Supports Webex `text` and `markdown` message formats.
- Sends one message to multiple incoming webhooks.
- Continues processing when an individual webhook fails.
- Reports delivery failures through the `failedMessages` action output.
- Integrates with the Backstage new backend system as a Scaffolder module.

## Requirements

- Backstage release line 1.52 or a compatible set of `@backstage` packages.
- Node.js 22.22.2, 24.15.0, or a newer supported even-numbered release.
- At least one Webex incoming-webhook URL.

Treat webhook URLs as secrets. Do not commit real URLs to templates or source
control.

## Installation

Install the module in the Backstage backend package:

```bash
yarn --cwd packages/backend add @coderrob/backstage-plugin-scaffolder-backend-module-webex
```

## Registration

Add the module to `packages/backend/src/index.ts` alongside the Scaffolder
backend plugin:

```typescript
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@coderrob/backstage-plugin-scaffolder-backend-module-webex'));
```

The package's default export is the `webex` Scaffolder backend module.

## Configuration

Configure default destinations and the request timeout in `app-config.yaml`:

```yaml
webex:
  webhooks:
    urls:
      - ${WEBEX_INCOMING_WEBHOOK_URL}
    timeout:
      seconds: 15
```

| Configuration key        | Type            | Required | Default           | Description                            |
| ------------------------ | --------------- | -------- | ----------------- | -------------------------------------- |
| `webex.webhooks.urls`    | `string[]`      | No       | None              | Default incoming-webhook destinations. |
| `webex.webhooks.timeout` | `HumanDuration` | No       | `{ seconds: 10 }` | Timeout for each HTTP request.         |

The timeout uses Backstage's human-duration object. It accepts one or more of
`years`, `months`, `weeks`, `days`, `hours`, `minutes`, `seconds`, and
`milliseconds`:

```yaml
webex:
  webhooks:
    timeout:
      minutes: 1
      seconds: 30
```

`webex.webhooks.urls` is marked as secret in the package's Backstage
configuration schema. Use environment-variable substitution or another secret
configuration source; do not store real webhook URLs in source control.

Every configured URL must use the format issued by the
[Webex Incoming Webhooks integration](https://apphub.webex.com/applications/incoming-webhooks-cisco-systems-38054-23307-75252):

```text
https://webexapis.com/v1/webhooks/incoming/<webhook-token>
```

The module rejects configured URLs with another scheme, host, path, query
string, or fragment. Validation errors do not include the secret URL.

### Destination precedence

The action selects destinations in this order:

1. A non-empty `webhooks` array supplied by the Software Template step.
2. The default `webex.webhooks.urls` array from Backstage configuration.

When no configured defaults exist, `webhooks` is required in the action input.
When defaults exist, `webhooks` is optional and overrides the entire configured
array when supplied.

## Usage

### Use configured destinations

When `webex.webhooks.urls` is configured, a template only needs to supply the
message format and content:

```yaml
- id: send-webex-message
  name: Send Webex message
  action: webex:webhooks:sendMessage
  input:
    format: markdown
    message: Deployment `${{ parameters.version }}` completed.
```

### Override destinations for one step

Supply `webhooks` to replace the configured defaults for one action invocation:

```yaml
- id: send-webex-message
  name: Send Webex message
  action: webex:webhooks:sendMessage
  input:
    format: text
    message: Build completed.
    webhooks:
      - ${{ secrets.WEBEX_INCOMING_WEBHOOK_URL }}
```

Pass webhook URLs through Backstage secrets rather than ordinary template
parameters, because the URL contains a credential.

### Input

| Name       | Type                    | Required    | Description                                     |
| ---------- | ----------------------- | ----------- | ----------------------------------------------- |
| `format`   | `text` \| `markdown`    | Yes         | Selects the Webex JSON payload field.           |
| `message`  | `string`                | Yes         | Non-empty plain-text or Markdown message.       |
| `webhooks` | non-empty array of URLs | Conditional | Replaces configured destinations when supplied. |

`webhooks` is required only when `webex.webhooks.urls` is not configured. Each
input URL must match the Webex Incoming Webhooks URL format shown above.

### Output

| Name             | Type             | Description                                                   |
| ---------------- | ---------------- | ------------------------------------------------------------- |
| `failedMessages` | array of strings | Delivery failures; empty when every webhook returns HTTP 200. |

### Delivery behavior

Webhook requests are processed sequentially using the configured timeout. An
HTTP 200 response is considered successful. Other HTTP responses and request
errors are added to `failedMessages`; a failure does not prevent the remaining
destinations from being attempted.

## Development

Install dependencies and run the quality checks:

```bash
yarn install
yarn lint
yarn tsc:full
yarn test:coverage
yarn build
```

The test suite enforces at least 95% coverage for statements, branches,
functions, and lines.

## Contributing

Issues and pull requests are welcome. Please include tests for behavioral
changes and ensure all development checks pass before opening a pull request.

## License

Licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

## Support the project

[![Buy Me a Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-white.png)](https://www.buymeacoffee.com/coderrob)
