import axios, { HttpStatusCode } from 'axios';
import { sendWebhookMessage } from './sendMessage';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);
const WEBHOOK = 'https://webexapis.com/v1/webhooks/incoming/test-token';

describe('sendWebhookMessage', () => {
  beforeEach(jest.clearAllMocks);

  test.each([
    ['text', { text: 'Hello' }],
    ['markdown', { markdown: 'Hello' }],
  ] as const)(
    'should send a %s payload with the requested timeout',
    async (format, payload) => {
      mockedAxios.post.mockResolvedValueOnce({ status: HttpStatusCode.Ok });

      await expect(
        sendWebhookMessage(WEBHOOK, format, 'Hello', 2_500),
      ).resolves.toBeUndefined();
      expect(mockedAxios.post).toHaveBeenCalledWith(WEBHOOK, payload, {
        timeout: 2_500,
      });
    },
  );

  test('should return a failure for a non-200 response', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      status: HttpStatusCode.NoContent,
    });

    await expect(
      sendWebhookMessage(WEBHOOK, 'text', 'Hello', 10_000),
    ).resolves.toBe(`Failed to send webhook message to ${WEBHOOK} (HTTP 204)`);
  });

  test.each([
    ['a non-Axios error', new Error('network failure'), false, 500],
    [
      'an Axios error without a response status',
      new Error('no response'),
      true,
      500,
    ],
    [
      'an Axios error with a response status',
      new Error('rate limited'),
      true,
      429,
    ],
  ])(
    'should return the expected failure for %s',
    async (_case, error, isAxiosError, expectedStatus) => {
      mockedAxios.post.mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValueOnce(isAxiosError);
      if (isAxiosError && expectedStatus !== 500) {
        Object.assign(error, { status: expectedStatus });
      }

      await expect(
        sendWebhookMessage(WEBHOOK, 'text', 'Hello', 10_000),
      ).resolves.toBe(
        `Failed to send webhook message to ${WEBHOOK} (HTTP ${expectedStatus})`,
      );
    },
  );
});
