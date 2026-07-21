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
import {
  createTemplateAction,
  type TemplateAction,
} from '@backstage/plugin-scaffolder-node';
import { durationToMilliseconds, type HumanDuration } from '@backstage/types';
import { sendWebhookMessage } from '../webex/sendWebhookMessage';
import {
  resolveWebhookUrls,
  validateActionWebhooks,
  validateConfiguredWebhooks,
} from '../webex/incomingWebhook';
import {
  type SendWebhooksMessageActionInput,
  type SendWebhooksMessageActionOptions,
  type SendWebhooksMessageActionOutput,
} from './contracts';
import { MessageFormat } from '../types/contracts';

const DEFAULT_WEBHOOK_REQUEST_TIMEOUT: HumanDuration = { seconds: 10 };

/**
 * Creates a `webex:webhooks:sendMessage` Scaffolder action.
 *
 * @param options - Default webhook URLs and request timeout.
 * @returns A Scaffolder template action that sends the supplied message to each
 * configured Webex webhook and outputs all delivery failures.
 *
 * @remarks
 * Creating the action has no side effects. Network requests occur only when its
 * handler runs. Individual delivery failures are captured in `failedMessages`
 * and do not stop delivery to subsequent webhooks.
 *
 * @public
 */
export function createSendWebhooksMessageAction(
  options: SendWebhooksMessageActionOptions = {},
): TemplateAction<
  SendWebhooksMessageActionInput,
  SendWebhooksMessageActionOutput
> {
  const timeoutMs = durationToMilliseconds(
    options.timeout ?? DEFAULT_WEBHOOK_REQUEST_TIMEOUT,
  );
  const configuredWebhooks = validateConfiguredWebhooks(options.webhookUrls);

  return createTemplateAction({
    id: 'webex:webhooks:sendMessage',
    description: 'Sends a message using Webex Incoming Webhooks',
    schema: {
      /**
       * Builds the validated action input schema.
       *
       * @param z - Zod implementation supplied by Backstage.
       * @returns The message format, content, and Webex webhook schema.
       */
      input: z => {
        const webhooks = z
          .string({
            required_error: 'Webhook urls are required',
            invalid_type_error: 'Webhook urls must be a string array',
          })
          .url('Webhook must be a valid URL')
          .array()
          .nonempty()
          .describe('The Webex Incoming Webhooks to send a message to');

        return z.object({
          format: z
            .nativeEnum(MessageFormat)
            .describe('The message content format'),
          message: z
            .string({
              required_error: 'Message is required',
              invalid_type_error: 'Message must be a string',
            })
            .min(1, 'Message should not be empty')
            .describe('The message to send via webhook(s)'),
          webhooks:
            configuredWebhooks.length > 0 ? webhooks.optional() : webhooks,
        });
      },
      /**
       * Builds the action output schema.
       *
       * @param z - Zod implementation supplied by Backstage.
       * @returns The collected delivery-failure schema.
       */
      output: z =>
        z.object({
          failedMessages: z
            .array(z.string())
            .describe(
              'Webhook delivery failures, empty when all sends succeed',
            ),
        }),
    },
    /**
     * Sends the message to each webhook and reports delivery failures.
     *
     * @param ctx - Validated input and output writer from the scaffolder.
     * @returns A promise that resolves after all webhooks are attempted.
     */
    async handler(ctx): Promise<void> {
      const failedMessages: string[] = [];
      const webhooks = validateActionWebhooks(
        resolveWebhookUrls(ctx.input.webhooks, configuredWebhooks),
      );
      for (const webhook of webhooks) {
        const failure = await sendWebhookMessage(
          webhook,
          ctx.input.format,
          ctx.input.message,
          timeoutMs,
        );
        if (failure) {
          failedMessages.push(failure);
        }
      }
      ctx.output('failedMessages', failedMessages);
    },
  });
}
