import {
  areWebexIncomingWebhookUrls,
  isWebexIncomingWebhookUrl,
  resolveWebhookUrls,
  validateActionWebhooks,
  validateConfiguredWebhooks,
} from './incomingWebhook';

const VALID_WEBHOOK =
  'https://webexapis.com/v1/webhooks/incoming/test_webhook-token';

describe('Webex Incoming Webhook URLs', () => {
  test('should accept the documented URL format', () => {
    expect(isWebexIncomingWebhookUrl(VALID_WEBHOOK)).toBe(true);
    expect(areWebexIncomingWebhookUrls([VALID_WEBHOOK])).toBe(true);
  });

  test.each([
    'not-a-url',
    'http://webexapis.com/v1/webhooks/incoming/token',
    'https://example.com/v1/webhooks/incoming/token',
    'https://webexapis.com/v1/webhooks/incoming/',
    'https://webexapis.com/v1/webhooks/incoming/token/extra',
    'https://webexapis.com/v1/webhooks/incoming/token?query=value',
    'https://webexapis.com/v1/webhooks/incoming/token#fragment',
    'https://user:password@webexapis.com/v1/webhooks/incoming/token',
    'https://webexapis.com:8443/v1/webhooks/incoming/token',
    'https://webexapis.com/V1/webhooks/incoming/token',
  ])('should reject %s', webhook => {
    expect(isWebexIncomingWebhookUrl(webhook)).toBe(false);
    expect(areWebexIncomingWebhookUrls([webhook])).toBe(false);
  });

  test('should reject a collection containing any invalid webhook', () => {
    expect(
      areWebexIncomingWebhookUrls([VALID_WEBHOOK, 'https://example.com/token']),
    ).toBe(false);
  });

  test('should accept an empty webhook collection', () => {
    expect(areWebexIncomingWebhookUrls([])).toBe(true);
    expect(validateConfiguredWebhooks()).toEqual([]);
  });

  test('should return the original collection after validation', () => {
    const webhooks = [VALID_WEBHOOK] as const;

    expect(validateConfiguredWebhooks(webhooks)).toBe(webhooks);
    expect(validateActionWebhooks(webhooks)).toBe(webhooks);
  });

  test('should keep configured webhook secrets out of validation errors', () => {
    const secret = 'https://example.com/private-config-token';

    expect(() => validateConfiguredWebhooks([secret])).toThrow(
      'Invalid URL in webex.webhooks.urls configuration',
    );
    expect(() => validateConfiguredWebhooks([secret])).not.toThrow(secret);
  });

  test('should keep action webhook secrets out of validation errors', () => {
    const secret = 'https://example.com/private-action-token';

    expect(() => validateActionWebhooks([secret])).toThrow(
      'Invalid Webex Incoming Webhook URL in action input',
    );
    expect(() => validateActionWebhooks([secret])).not.toThrow(secret);
  });

  test('should prefer action webhooks when supplied', () => {
    const input = [VALID_WEBHOOK];
    const configured = [
      'https://webexapis.com/v1/webhooks/incoming/configured-token',
    ];

    expect(resolveWebhookUrls(input, configured)).toBe(input);
  });

  test('should fall back to configured webhooks when action input is absent', () => {
    const configured = [VALID_WEBHOOK];

    expect(resolveWebhookUrls(undefined, configured)).toBe(configured);
  });
});
