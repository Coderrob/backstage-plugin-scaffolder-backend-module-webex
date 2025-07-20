import axios, { HttpStatusCode } from 'axios';
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils';
import { createSendWebhooksMessageAction } from './sendWebhooksMessageAction';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('createSendWebhooksMessageAction', () => {
  const action = createSendWebhooksMessageAction();
  const contextMock = createMockActionContext({
    input: {
      format: 'text',
      message: 'Test message',
      webhooks: ['https://webhook.url/1'],
    },
    output: jest.fn(),
  });
  const contextMultipleHooksMock = createMockActionContext({
    input: {
      format: 'text',
      message: 'Test message',
      webhooks: ['https://webhook.url/1', 'https://webhook.url/2'],
    },
    output: jest.fn(),
  });
  const contextMarkdownMessage = createMockActionContext({
    input: {
      format: 'markdown',
      message: '# Test message',
      webhooks: ['https://webhook.url/1'],
    },
    output: jest.fn(),
  });
  const contextMissingWebhooks = createMockActionContext({
    input: { format: 'text', message: 'Test message', webhooks: [] },
    output: jest.fn(),
  });

  beforeEach(jest.clearAllMocks);

  test('should send messages to all webhooks successfully', async () => {
    // Setup
    mockedAxios.post.mockResolvedValue({ status: HttpStatusCode.Ok });

    // Execute
    await action.handler(contextMultipleHooksMock as any);

    // Verify
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      1,
      'https://webhook.url/1',
      { text: 'Test message' },
    );
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      2,
      'https://webhook.url/2',
      { text: 'Test message' },
    );
    expect(contextMock.output).toHaveBeenCalledTimes(0);
  });

  test('should send markdown message to all webhooks successfully', async () => {
    // Setup
    mockedAxios.post.mockResolvedValue({ status: HttpStatusCode.Ok });

    // Execute
    await action.handler(contextMarkdownMessage as any);

    // Verify
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      1,
      'https://webhook.url/1',
      { markdown: '# Test message' },
    );
    expect(contextMock.output).toHaveBeenCalledTimes(0);
  });

  test('should handle non-200 responses from webhooks', async () => {
    // Setup
    mockedAxios.post.mockResolvedValueOnce({
      status: HttpStatusCode.BadRequest,
    });

    // Execute
    await action.handler(contextMock as any);

    // Verify
    expect(contextMock.output).toHaveBeenCalledWith('failedMessages', [
      'Failed to send webhook message to https://webhook.url/1 (HTTP 400)',
    ]);
  });

  test('should handle exceptions thrown during the request', async () => {
    // Setup
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
    mockedAxios.post.mockResolvedValueOnce({ status: HttpStatusCode.Ok });

    // Execute
    await action.handler(contextMock as any);

    // Verify
    expect(contextMock.output).toHaveBeenCalledWith('failedMessages', [
      'Failed to send webhook message to https://webhook.url/1 (HTTP 500)',
    ]);
  });

  test('should handle empty webhooks array', async () => {
    // Setup
    /* no-setup */

    // Execute
    await action.handler(contextMissingWebhooks as any);

    // Verify
    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(contextMissingWebhooks.output).toHaveBeenCalledWith(
      'failedMessages',
      [],
    );
  });
});
