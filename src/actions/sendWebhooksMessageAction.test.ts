import axios, { HttpStatusCode } from 'axios';
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils';
import { createSendWebhooksMessageAction } from './sendWebhooksMessageAction';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);
const action = createSendWebhooksMessageAction();
const WEBHOOK_1 = 'https://webexapis.com/v1/webhooks/incoming/test-1';
const WEBHOOK_2 = 'https://webexapis.com/v1/webhooks/incoming/test-2';

type SendMessageInput = Parameters<typeof action.handler>[0]['input'];

/**
 * Creates an isolated action context for handler tests.
 *
 * @param input - Valid action input.
 * @returns A mock context with a Jest output writer.
 */
function createContext(input: SendMessageInput) {
  return createMockActionContext<SendMessageInput>({
    input,
    output: jest.fn(),
    workspacePath: 'mock-workspace',
  });
}

describe('createSendWebhooksMessageAction', () => {
  beforeEach(jest.clearAllMocks);

  test('should send messages to all webhooks successfully', async () => {
    const context = createContext({
      format: 'text',
      message: 'Test message',
      webhooks: [WEBHOOK_1, WEBHOOK_2],
    });
    mockedAxios.post.mockResolvedValue({ status: HttpStatusCode.Ok });

    await action.handler(context);

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      1,
      WEBHOOK_1,
      { text: 'Test message' },
      { timeout: 10_000 },
    );
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      2,
      WEBHOOK_2,
      { text: 'Test message' },
      { timeout: 10_000 },
    );
    expect(context.output).toHaveBeenCalledWith('failedMessages', []);
  });

  test('should send markdown message to all webhooks successfully', async () => {
    const context = createContext({
      format: 'markdown',
      message: '# Test message',
      webhooks: [WEBHOOK_1],
    });
    mockedAxios.post.mockResolvedValue({ status: HttpStatusCode.Ok });

    await action.handler(context);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      1,
      WEBHOOK_1,
      { markdown: '# Test message' },
      { timeout: 10_000 },
    );
    expect(context.output).toHaveBeenCalledWith('failedMessages', []);
  });

  test('should use the configured webhook timeout', async () => {
    const configuredAction = createSendWebhooksMessageAction({
      timeout: { seconds: 2, milliseconds: 500 },
    });
    const context = createContext({
      format: 'text',
      message: 'Test message',
      webhooks: [WEBHOOK_1],
    });
    mockedAxios.post.mockResolvedValue({ status: HttpStatusCode.Ok });

    await configuredAction.handler(context);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      WEBHOOK_1,
      { text: 'Test message' },
      { timeout: 2_500 },
    );
  });

  test('should use configured webhooks when input omits them', async () => {
    const configuredAction = createSendWebhooksMessageAction({
      webhookUrls: [WEBHOOK_2],
    });
    const context = createContext({
      format: 'text',
      message: 'Configured destination',
    });
    mockedAxios.post.mockResolvedValue({ status: HttpStatusCode.Ok });

    await configuredAction.handler(context);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      WEBHOOK_2,
      { text: 'Configured destination' },
      { timeout: 10_000 },
    );
  });

  test('should prefer action webhooks over configured defaults', async () => {
    const configuredAction = createSendWebhooksMessageAction({
      webhookUrls: [WEBHOOK_2],
    });
    const context = createContext({
      format: 'text',
      message: 'Explicit destination',
      webhooks: [WEBHOOK_1],
    });
    mockedAxios.post.mockResolvedValue({ status: HttpStatusCode.Ok });

    await configuredAction.handler(context);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      WEBHOOK_1,
      { text: 'Explicit destination' },
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
      format: 'text',
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
      format: 'text',
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
      format: 'text',
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
      format: 'text',
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
