import type { HumanDuration, JsonObject } from '@backstage/types';

/**
 * Public message formats supported by Webex Incoming Webhooks.
 *
 * @public
 */
export enum MessageFormat {
  /** Plain-text Webex message. */
  Text = 'text',
  /** Webex-flavored Markdown message. */
  Markdown = 'markdown',
}

/** Options for the Webex send-message scaffolder action. */
export interface SendWebhooksMessageActionOptions {
  /** Maximum time to wait for each request. Defaults to 10 seconds. */
  timeout?: HumanDuration;
  /** Default webhook URLs used when an action input does not provide them. */
  webhookUrls?: readonly string[];
}

/**
 * Input accepted by the Webex send-message scaffolder action.
 *
 * @public
 */
export interface SendWebhooksMessageActionInput extends JsonObject {
  /** Webex payload representation. */
  format: MessageFormat;
  /** Non-empty message sent to each destination. */
  message: string;
  /** Non-empty destinations, or configured defaults when omitted. */
  webhooks?: [string, ...string[]];
}

/**
 * Output produced by the Webex send-message scaffolder action.
 *
 * @public
 */
export interface SendWebhooksMessageActionOutput extends JsonObject {
  /** Human-readable failures; empty when every delivery succeeds. */
  failedMessages: string[];
}
