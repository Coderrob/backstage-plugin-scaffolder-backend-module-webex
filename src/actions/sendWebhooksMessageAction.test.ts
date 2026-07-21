import axios, { HttpStatusCode } from 'axios';
import { z } from 'zod';
import type {
  BackstageCredentials,
  LoggerService,
} from '@backstage/backend-plugin-api';
import type { ActionContext } from '@backstage/plugin-scaffolder-node';
import { createSendWebhooksMessageAction } from './sendWebhooksMessageAction';
import { isFunction } from '../utils/guards';
import {
  MessageFormat,
  type SendWebhooksMessageActionInput,
  type SendWebhooksMessageActionOutput,
} from '../contracts';

jest.mock('axios');
jest.mock('@backstage/plugin-scaffolder-node', () => ({
  createTemplateAction: (options: unknown) => options,
}));
const mockedAxios = jest.mocked(axios);
const action = createSendWebhooksMessageAction();
const WEBHOOK_1 = 'https://webexapis.com/v1/webhooks/incoming/test-1';
const WEBHOOK_2 = 'https://webexapis.com/v1/webhooks/incoming/test-2';

type SchemaBuilder = (zImpl: unknown) => z.ZodType;

/**
 * Builds a runtime schema exposed by a Scaffolder action.
 *
 * @param schema - Candidate schema builder from the action definition.
 * @returns The schema produced with the test's Zod implementation.
 */
function buildSchema(schema: unknown): z.ZodType {
  if (!isSchemaBuilder(schema)) {
    throw new Error('Expected a Scaffolder schema builder');
  }
  return schema(z);
}

/** Determines whether an action schema is a callable schema builder. */
function isSchemaBuilder(schema: unknown): schema is SchemaBuilder {
  return isFunction(schema);
}

/**
 * Creates an isolated action context for handler tests.
 *
 * @param input - Valid action input.
 * @returns A mock context with a Jest output writer.
 */
function createContext(
  input: SendWebhooksMessageActionInput,
): ActionContext<
  SendWebhooksMessageActionInput,
  SendWebhooksMessageActionOutput
> {
  const logger: LoggerService = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(() => logger),
  };
  const credentials: BackstageCredentials = {
    $$type: '@backstage/BackstageCredentials',
    principal: { type: 'none' },
  };

  return {
    logger,
    workspacePath: 'mock-workspace',
    input,
    checkpoint: async ({ fn }) => fn(),
    output: jest.fn(),
    createTemporaryDirectory: jest.fn(async () => 'mock-temp'),
    getInitiatorCredentials: jest.fn(async () => credentials),
    task: { id: 'mock-task-id' },
  };
}

describe('createSendWebhooksMessageAction', () => {
  beforeEach(jest.resetAllMocks);

  test('should reject a non-callable schema definition', () => {
    expect(() => buildSchema(undefined)).toThrow(
      'Expected a Scaffolder schema builder',
    );
  });

  test('should require action webhooks when defaults are absent', () => {
    const schema = buildSchema(action.schema?.input);
    const input = {
      format: MessageFormat.Text,
      message: 'Test message',
    };

    expect(schema.safeParse(input).success).toBe(false);
    expect(schema.safeParse({ ...input, webhooks: [WEBHOOK_1] }).success).toBe(
      true,
    );
  });

  test('should make action webhooks optional when defaults exist', () => {
    const configuredAction = createSendWebhooksMessageAction({
      webhookUrls: [WEBHOOK_1],
    });
    const schema = buildSchema(configuredAction.schema?.input);

    expect(
      schema.safeParse({
        format: MessageFormat.Markdown,
        message: 'Test message',
      }).success,
    ).toBe(true);
  });

  test('should expose the delivery failure output schema', () => {
    const schema = buildSchema(action.schema?.output);

    expect(schema.safeParse({ failedMessages: [] }).success).toBe(true);
    expect(schema.safeParse({ failedMessages: 'failure' }).success).toBe(false);
  });

  test('should send messages to all webhooks successfully', async () => {
    const context = createContext({
      format: MessageFormat.Text,
      message: 'Test message',
      webhooks: [WEBHOOK_1, WEBHOOK_2],
    });
    mockedAxios.post.mockResolvedValue({ status: HttpStatusCode.Ok });

    await action.handler(context);

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      1,
      WEBHOOK_1,
      { [MessageFormat.Text]: 'Test message' },
      { timeout: 10_000 },
    );
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      2,
      WEBHOOK_2,
      { [MessageFormat.Text]: 'Test message' },
      { timeout: 10_000 },
    );
    expect(context.output).toHaveBeenCalledWith('failedMessages', []);
  });

  test('should send markdown message to all webhooks successfully', async () => {
    const context = createContext({
      format: MessageFormat.Markdown,
      message: '# Test message',
      webhooks: [WEBHOOK_1],
    });
    mockedAxios.post.mockResolvedValue({ status: HttpStatusCode.Ok });

    await action.handler(context);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      1,
      WEBHOOK_1,
      { [MessageFormat.Markdown]: '# Test message' },
      { timeout: 10_000 },
    );
    expect(context.output).toHaveBeenCalledWith('failedMessages', []);
  });

  test('should use the configured webhook timeout', async () => {
    const configuredAction = createSendWebhooksMessageAction({
      timeout: { seconds: 2, milliseconds: 500 },
    });
    const context = createContext({
      format: MessageFormat.Text,
      message: 'Test message',
      webhooks: [WEBHOOK_1],
    });
    mockedAxios.post.mockResolvedValue({ status: HttpStatusCode.Ok });

    await configuredAction.handler(context);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      WEBHOOK_1,
      { [MessageFormat.Text]: 'Test message' },
      { timeout: 2_500 },
    );
  });

  test('should use configured webhooks when input omits them', async () => {
    const configuredAction = createSendWebhooksMessageAction({
      webhookUrls: [WEBHOOK_2],
    });
    const context = createContext({
      format: MessageFormat.Text,
      message: 'Configured destination',
    });
    mockedAxios.post.mockResolvedValue({ status: HttpStatusCode.Ok });

    await configuredAction.handler(context);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      WEBHOOK_2,
      { [MessageFormat.Text]: 'Configured destination' },
      { timeout: 10_000 },
    );
  });

  test('should prefer action webhooks over configured defaults', async () => {
    const configuredAction = createSendWebhooksMessageAction({
      webhookUrls: [WEBHOOK_2],
    });
    const context = createContext({
      format: MessageFormat.Text,
      message: 'Explicit destination',
      webhooks: [WEBHOOK_1],
    });
    mockedAxios.post.mockResolvedValue({ status: HttpStatusCode.Ok });

    await configuredAction.handler(context);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      WEBHOOK_1,
      { [MessageFormat.Text]: 'Explicit destination' },
      { timeout: 10_000 },
    );
  });

  test('should reject invalid configured webhooks without exposing them', () => {
    expect(() =>
      createSendWebhooksMessageAction({
        webhookUrls: ['https://example.com/private-token'],
      }),
    ).toThrow('Invalid URL in webex.webhooks.urls configuration');
  });

  test('should reject invalid action webhooks before sending', async () => {
    const context = createContext({
      format: MessageFormat.Text,
      message: 'Test message',
      webhooks: ['https://example.com/private-token'],
    });

    await expect(action.handler(context)).rejects.toThrow(
      'Invalid Webex Incoming Webhook URL in action input',
    );
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  test('should handle non-200 responses from webhooks', async () => {
    const context = createContext({
      format: MessageFormat.Text,
      message: 'Test message',
      webhooks: [WEBHOOK_1],
    });
    mockedAxios.post.mockResolvedValueOnce({
      status: HttpStatusCode.BadRequest,
    });

    await action.handler(context);

    expect(context.output).toHaveBeenCalledWith('failedMessages', [
      `Failed to send webhook message to ${WEBHOOK_1} (HTTP 400)`,
    ]);
  });

  test('should continue delivery and collect failures independently', async () => {
    const context = createContext({
      format: MessageFormat.Text,
      message: 'Test message',
      webhooks: [WEBHOOK_1, WEBHOOK_2],
    });
    mockedAxios.post
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ status: HttpStatusCode.Ok });
    mockedAxios.isAxiosError.mockReturnValueOnce(false);

    await action.handler(context);

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(context.output).toHaveBeenCalledWith('failedMessages', [
      `Failed to send webhook message to ${WEBHOOK_1} (HTTP 500)`,
    ]);
  });

  test.each([
    [new Error('Network error'), 500],
    [Object.assign(new Error('No response'), { isAxiosError: true }), 500],
    [
      Object.assign(new Error('Rate limited'), {
        isAxiosError: true,
        status: 429,
      }),
      429,
    ],
  ])('should handle a rejected request', async (error, expectedStatus) => {
    const context = createContext({
      format: MessageFormat.Text,
      message: 'Test message',
      webhooks: [WEBHOOK_1],
    });
    mockedAxios.post.mockRejectedValueOnce(error);
    mockedAxios.isAxiosError.mockReturnValueOnce(
      'isAxiosError' in error && error.isAxiosError === true,
    );

    await action.handler(context);

    expect(context.output).toHaveBeenCalledWith('failedMessages', [
      `Failed to send webhook message to ${WEBHOOK_1} (HTTP ${expectedStatus})`,
    ]);
  });
});
