/*
 * Copyright 2024 @Coderrob
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const WEBEX_API_ORIGIN = 'https://webexapis.com';
const WEBEX_INCOMING_PATH = '/v1/webhooks/incoming/';

/**
 * Parses a candidate webhook URL without throwing.
 *
 * @param value - Candidate URL string.
 * @returns A parsed URL, or `undefined` when parsing fails.
 */
function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

/**
 * Checks whether a URL targets the documented Webex incoming endpoint.
 *
 * @param webhook - Candidate webhook URL.
 * @returns `true` for a credential-free Webex incoming URL with one token.
 */
export function isWebexIncomingWebhookUrl(webhook: string): boolean {
  const url = parseUrl(webhook);
  if (!url) {
    return false;
  }

  const token = url.pathname.slice(WEBEX_INCOMING_PATH.length);
  return [
    url.origin === WEBEX_API_ORIGIN,
    url.pathname.startsWith(WEBEX_INCOMING_PATH),
    token.length > 0,
    !token.includes('/'),
    url.search === '',
    url.hash === '',
    url.username === '',
    url.password === '',
  ].every(Boolean);
}

/**
 * Checks whether every URL is a Webex incoming webhook.
 *
 * @param webhooks - Candidate webhook URLs.
 * @returns `true` when every URL passes Webex endpoint validation.
 */
export function areWebexIncomingWebhookUrls(
  webhooks: readonly string[],
): boolean {
  return webhooks.every(isWebexIncomingWebhookUrl);
}

/**
 * Validates webhook URLs while keeping their secret values out of errors.
 *
 * @param webhooks - Webhook URLs to validate.
 * @param errorMessage - Safe error message to throw after validation fails.
 * @returns The original URL collection after successful validation.
 * @throws An error containing only `errorMessage` when a URL is invalid.
 */
function validateWebhooks(
  webhooks: readonly string[],
  errorMessage: string,
): readonly string[] {
  if (!areWebexIncomingWebhookUrls(webhooks)) {
    throw new Error(errorMessage);
  }
  return webhooks;
}

/**
 * Validates webhook URLs loaded from Backstage configuration.
 *
 * @param webhooks - Configured defaults, or `undefined` when absent.
 * @returns The configured URLs, defaulting to an empty collection.
 * @throws A configuration error that does not include secret URL values.
 */
export function validateConfiguredWebhooks(
  webhooks: readonly string[] = [],
): readonly string[] {
  return validateWebhooks(
    webhooks,
    'Invalid URL in webex.webhooks.urls configuration',
  );
}

/**
 * Validates webhook URLs supplied to a scaffolder action.
 *
 * @param webhooks - Action-level or resolved default webhook URLs.
 * @returns The original URLs after successful validation.
 * @throws An input error that does not include secret URL values.
 */
export function validateActionWebhooks(
  webhooks: readonly string[],
): readonly string[] {
  return validateWebhooks(
    webhooks,
    'Invalid Webex Incoming Webhook URL in action input',
  );
}

/**
 * Selects action-level webhook URLs before configured defaults.
 *
 * @param input - Optional URLs supplied by the scaffolder action.
 * @param configured - Default URLs loaded from Backstage configuration.
 * @returns Action URLs when supplied, otherwise the configured defaults.
 */
export function resolveWebhookUrls(
  input: readonly string[] | undefined,
  configured: readonly string[],
): readonly string[] {
  return input ?? configured;
}
