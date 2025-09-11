/*
 * Copyright 2025 @Coderrob
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
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { InputField, MessageFormat, OutputField } from '../types';
import { isEmptyString, isError, isString, sendToWebhook } from '../utils';

/**
 * Creates a `webex:webhooks:sendMessage` Scaffolder action.
 *
 * The action accepts the following input:
 * - `format`: one of 'text' or 'markdown'
 * - `message`: the message body to send
 * - `webhooks`: an optional array of Webex Incoming Webhook URLs
 *
 * The action writes one output property:
 * - `failedMessages`: string[] - a list of human-readable failure messages
 *   for the webhooks that failed. If all deliveries succeeded this will be an
 *   empty array.
 *
 * The action supports dry-run mode; when dry-run is enabled it will not
 * perform network requests and will return an empty `failedMessages` array.
 *
 * @public
 */
export function createSendWebhooksMessageAction() {
  return createTemplateAction({
    id: 'webex:webhooks:sendMessage',
    description: 'Sends a message using Webex Incoming Webhooks',
    schema: {
      input: {
        [InputField.FORMAT]: z =>
          z.nativeEnum(MessageFormat).describe('The message content format'),
        [InputField.MESSAGE]: z =>
          z
            .string({
              required_error: 'Message is required',
              invalid_type_error: 'Message must be a string',
            })
            .min(1, 'Message cannot be empty')
            .describe('The message to send via webhook(s)'),
        [InputField.WEBHOOKS]: z =>
          z
            .string({
              required_error: 'Webhook URLs are required',
              invalid_type_error: 'Webhook URLs must be an array of strings',
            })
            .array()
            .optional()
            .describe('The Webex Incoming Webhooks to send a message to'),
      },
      output: {
        [OutputField.FAILED_MESSAGES]: z =>
          z.array(z.string()).describe('Failed webhook messages'),
      },
    },
    supportsDryRun: true,
    async handler(ctx) {
      const { isDryRun, logger } = ctx;

      if (isDryRun) {
        logger.info(`Dry run is enabled, no messages will be sent`);
        ctx.output(OutputField.FAILED_MESSAGES, []);
        return;
      }

      try {
        const { format, message, webhooks = [] } = ctx.input;

        const payload = { [format]: message };
        const failedMessages = await Promise.all(
          webhooks.map((webhook: string) => sendToWebhook(webhook, payload)),
        );

        ctx.output(
          OutputField.FAILED_MESSAGES,
          failedMessages.filter(
            (msg): msg is string => isString(msg) && !isEmptyString(msg),
          ),
        );
      } catch (error) {
        logger.error(
          `Unexpected error sending webhook messages: ${error}`,
          isError(error) ? error : {},
        );
        ctx.output(OutputField.FAILED_MESSAGES, [
          'Unexpected error sending webhook messages',
        ]);
      }
    },
  });
}
