import axios, { AxiosError, HttpStatusCode } from 'axios';
import { format } from 'node:util';

const ERROR_MESSAGE_FORMAT = 'Failed to send webhook message to %s (HTTP %d)';
const HTTP_STATUS_SERVER_ERROR = 500;

/**
 * Send a message payload to a single webhook URL.
 *
 * This helper encapsulates the HTTP POST to the webhook and normalizes the
 * error handling so callers receive either `null` for success or a string
 * describing the failure.
 *
 * @param webhook - The full webhook URL to POST to.
 * @param payload - An object containing the message keyed by the chosen format
 *                  (for example { text: 'hi' } or { markdown: '# hi' }).
 * @returns A promise that resolves to `null` on success or an error message
 *          string when the request failed.
 */
export async function sendToWebhook(
  webhook: string,
  payload: Record<string, string>,
): Promise<string | null> {
  try {
    const { status } = await axios.post(webhook, payload);
    if (status !== HttpStatusCode.Ok) {
      return format(ERROR_MESSAGE_FORMAT, webhook, status);
    }
    return null;
  } catch (error) {
    const status = isAxiosError(error)
      ? error.status
      : HTTP_STATUS_SERVER_ERROR;
    return format(ERROR_MESSAGE_FORMAT, webhook, status);
  }
}

/**
 * Checks if a value is a string
 *
 * This accepts both primitive string values and `String` objects.
 *
 * @param value - The value to test
 * @returns true if the value is a string; otherwise false
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string' || value instanceof String;
}

/**
 * Checks if a value is an Error instance
 *
 * @param value - The value to test
 * @returns true if the value extends Error; otherwise false
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Wrapper around axios.isAxiosError to provide a stable exported function
 * for use in our codebase. Kept here to centralize imports and make testing
 * easier.
 *
 * @param error - The value to test
 * @returns true if the value is an AxiosError; otherwise false
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

/**
 * Returns true for HTTP success status codes (2xx range).
 *
 * @param status - The numeric HTTP status code
 * @returns true when the status is between 200 (inclusive) and 300 (exclusive); otherwise false
 */
export function isHttpOkStatus(status: number): boolean {
  return status >= HttpStatusCode.Ok && status < HttpStatusCode.MultipleChoices;
}

/**
 * Checks whether the provided value is a string that is empty when trimmed.
 *
 * This returns `true` only for string values (primitive or `String` object)
 * which, when trimmed, have no characters. Other types return `false`.
 *
 * @param value - The value to test
 * @returns true when `value` is a blank string; otherwise false
 */
export function isEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length <= 0;
}
