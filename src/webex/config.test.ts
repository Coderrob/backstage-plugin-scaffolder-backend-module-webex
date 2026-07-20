import { ConfigReader } from '@backstage/config';
import { readWebexActionOptions } from './config';

describe('readWebexActionOptions', () => {
  test('should return undefined options when configuration is absent', () => {
    expect(readWebexActionOptions(new ConfigReader({}))).toEqual({
      timeout: undefined,
      webhookUrls: undefined,
    });
  });

  test('should read webhook URLs and a Backstage human duration', () => {
    const config = new ConfigReader({
      webex: {
        webhooks: {
          urls: ['https://webexapis.com/v1/webhooks/incoming/test'],
          timeout: { seconds: 2, milliseconds: 500 },
        },
      },
    });

    expect(readWebexActionOptions(config)).toEqual({
      timeout: { seconds: 2, milliseconds: 500 },
      webhookUrls: ['https://webexapis.com/v1/webhooks/incoming/test'],
    });
  });

  test.each([
    ['an unsupported duration property', { minutes: 1, fortnight: 1 }],
    ['a non-numeric duration component', { seconds: 'ten' }],
  ])('should reject %s', (_case, timeout) => {
    const config = new ConfigReader({ webex: { webhooks: { timeout } } });

    expect(() => readWebexActionOptions(config)).toThrow();
  });

  test('should reject a non-array webhook configuration', () => {
    const config = new ConfigReader({
      webex: { webhooks: { urls: 'https://example.com/webhook' } },
    });

    expect(() => readWebexActionOptions(config)).toThrow();
  });
});
