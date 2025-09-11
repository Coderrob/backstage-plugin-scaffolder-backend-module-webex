import axios, { HttpStatusCode } from 'axios';
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils';
import { createSendWebhooksMessageAction } from './sendWebhooksMessageAction';
import { MessageFormat, OutputField } from '../types';

jest.mock('axios');

describe('createSendWebhooksMessageAction', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const action = createSendWebhooksMessageAction();
  function makeContext(input: any) {
    return createMockActionContext({
      input,
      isDryRun: false,
      output: jest.fn(),
    });
  }

  const successCases = [
    {
      name: 'text - single webhook',
      input: {
        format: MessageFormat.TEXT,
        message: 'Test message',
        webhooks: ['https://webhook.url/1'],
      },
      expectedCalls: [['https://webhook.url/1', { text: 'Test message' }]],
    },
    {
      name: 'text - multiple webhooks',
      input: {
        format: MessageFormat.TEXT,
        message: 'Test message',
        webhooks: ['https://webhook.url/1', 'https://webhook.url/2'],
      },
      expectedCalls: [
        ['https://webhook.url/1', { text: 'Test message' }],
        ['https://webhook.url/2', { text: 'Test message' }],
      ],
    },
    {
      name: 'markdown - single webhook',
      input: {
        format: MessageFormat.MARKDOWN,
        message: '# Test message',
        webhooks: ['https://webhook.url/1'],
      },
      expectedCalls: [
        ['https://webhook.url/1', { markdown: '# Test message' }],
      ],
    },
  ];

  afterEach(() => jest.clearAllMocks());

  test.each(successCases)(
    'should send messages: $name',
    async ({ input, expectedCalls }) => {
      // Setup
      mockedAxios.post.mockResolvedValue({ status: HttpStatusCode.Ok });

      const ctx = makeContext(input);

      // Execute
      await action.handler(ctx);

      // Verify axios calls
      expect(mockedAxios.post).toHaveBeenCalledTimes(expectedCalls.length);
      expectedCalls.forEach((call: any[], idx: number) => {
        expect(mockedAxios.post).toHaveBeenNthCalledWith(
          idx + 1,
          call[0],
          call[1]
        );
      });

      // Verify output is an empty failures array
      expect(ctx.output).toHaveBeenCalledWith(OutputField.FAILED_MESSAGES, []);
    }
  );

  test('should handle non-200 responses from webhooks', async () => {
    // Setup
    mockedAxios.post.mockImplementation(() =>
      Promise.resolve({
        status: HttpStatusCode.BadRequest,
      })
    );

    const ctx = makeContext({
      format: MessageFormat.TEXT,
      message: 'Test message',
      webhooks: ['https://webhook.url/1'],
    });

    // Execute
    await action.handler(ctx);

    // Debug: ensure axios.post was invoked
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    // Verify output contains at least one failure message
    expect(ctx.output).toHaveBeenCalled();
    const args = (ctx.output as jest.Mock).mock.calls[0];
    expect(args[0]).toBe(OutputField.FAILED_MESSAGES);
    expect(args[1]).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /Failed to send webhook message to .* \(HTTP \d+\)/
        ),
      ])
    );
  });

  test('should handle exceptions thrown during the request', async () => {
    // Setup
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
    mockedAxios.post.mockImplementation(() =>
      Promise.resolve({
        status: HttpStatusCode.Ok,
      })
    );

    const ctx = makeContext({
      format: MessageFormat.TEXT,
      message: 'Test message',
      webhooks: ['https://webhook.url/1'],
    });

    // Execute
    await action.handler(ctx);

    // Verify axios was invoked and output contains at least one failure message
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(ctx.output).toHaveBeenCalledTimes(1);
    const args = (ctx.output as jest.Mock).mock.calls[0];
    expect(args[0]).toBe(OutputField.FAILED_MESSAGES);
    expect(args[1]).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /Failed to send webhook message to .* \(HTTP \d+\)/
        ),
      ])
    );
  });

  test('should handle empty webhooks array', async () => {
    const ctx = makeContext({
      format: MessageFormat.TEXT,
      message: 'Test message',
      webhooks: [] as const,
    });

    // Execute
    await action.handler(ctx);

    // Verify
    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(ctx.output).toHaveBeenCalledWith(OutputField.FAILED_MESSAGES, []);
  });
});
