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

import axios, { HttpStatusCode } from 'axios';
import { format } from 'node:util';
import { MessageFormat } from '../contracts';

const ERROR_MESSAGE_FORMAT = 'Failed to send webhook message to %s (HTTP %d)';

/**
 * Formats a webhook delivery failure for action output.
 *
 * @param webhook - URL whose delivery failed.
 * @param status - HTTP status associated with the failure.
 * @returns A stable, human-readable failure description.
 */
function failedMessage(webhook: string, status: number): string {
  return format(ERROR_MESSAGE_FORMAT, webhook, status);
}

/**
 * Resolves the HTTP status for a rejected request.
 *
 * @param error - Value rejected by Axios.
 * @returns The response status when available, otherwise HTTP 500.
 */
function errorStatus(error: unknown): number {
  return axios.isAxiosError(error)
    ? error.status ?? HttpStatusCode.InternalServerError
    : HttpStatusCode.InternalServerError;
}

/**
 * Delivers one message to a Webex incoming webhook.
 *
 * @param webhook - Webex incoming-webhook URL.
 * @param messageFormat - Payload field used for plain text or Markdown.
 * @param message - Message content.
 * @param timeoutMs - Request timeout in milliseconds.
 * @returns A failure description, or `undefined` after a successful HTTP 200.
 *
 * @remarks Request failures are returned as data so subsequent webhooks can
 * still be attempted.
 */
export async function sendWebhookMessage(
  webhook: string,
  messageFormat: MessageFormat,
  message: string,
  timeoutMs: number,
): Promise<string | undefined> {
  try {
    const { status } = await axios.post(
      webhook,
      { [messageFormat]: message },
      { timeout: timeoutMs },
    );
    return status === HttpStatusCode.Ok
      ? undefined
      : failedMessage(webhook, status);
  } catch (error) {
    return failedMessage(webhook, errorStatus(error));
  }
}
