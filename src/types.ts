/**
 * The supported message formats for Webex Incoming Webhooks.
 *
 * - `TEXT` sends a plain text payload using the `text` field.
 * - `MARKDOWN` sends a markdown payload using the `markdown` field.
 *
 * The enum values are the exact strings expected by the Webex webhook API.
 */
export enum MessageFormat {
  TEXT = 'text',
  MARKDOWN = 'markdown',
}

/**
 * The input fields accepted by the `webex:webhooks:sendMessage` action.
 */
export enum InputField {
  FORMAT = 'format',
  MESSAGE = 'message',
  WEBHOOKS = 'webhooks',
}

/**
 * The output fields produced by the `webex:webhooks:sendMessage` action.
 */
export enum OutputField {
  FAILED_MESSAGES = 'failedMessages',
}
