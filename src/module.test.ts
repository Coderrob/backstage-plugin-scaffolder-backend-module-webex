import {
  BackendModuleRegistrationPoints,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node';
import { createSendWebhooksMessageAction } from './actions';
import { readWebexActionOptions } from './config/readWebexActionOptions';
import { webexScaffolderModule } from './module';

jest.mock('@backstage/backend-plugin-api', () => ({
  coreServices: { rootConfig: Symbol('rootConfig') },
  createBackendModule: jest.fn(options => options),
}));
jest.mock('@backstage/plugin-scaffolder-node', () => ({
  scaffolderActionsExtensionPoint: Symbol('scaffolderActionsExtensionPoint'),
}));
jest.mock('./actions', () => ({
  createSendWebhooksMessageAction: jest.fn(() => 'sendMessageAction'),
}));
jest.mock('./config/readWebexActionOptions', () => ({
  readWebexActionOptions: jest.fn(() => ({
    timeout: { seconds: 2, milliseconds: 500 },
    webhookUrls: ['configured-webhook'],
  })),
}));

describe('webexScaffolderModule', () => {
  test('should register the Webex action with the scaffolder extension point', async () => {
    const registerInit = jest.fn();
    const addActions = jest.fn();
    const config = {};
    const registrationPoints: BackendModuleRegistrationPoints = {
      registerExtensionPoint: jest.fn(),
      registerInit,
    };
    const [moduleOptions] = jest.mocked(createBackendModule).mock.calls[0];

    expect(webexScaffolderModule).toBe(moduleOptions);
    moduleOptions.register(registrationPoints);

    expect(createBackendModule).toHaveBeenCalledWith(
      expect.objectContaining({ moduleId: 'webex', pluginId: 'scaffolder' }),
    );
    expect(registerInit).toHaveBeenCalledWith(
      expect.objectContaining({
        deps: {
          config: expect.any(Symbol),
          scaffolder: scaffolderActionsExtensionPoint,
        },
      }),
    );

    const [{ init }] = registerInit.mock.calls[0];
    await init({ config, scaffolder: { addActions } });

    expect(createSendWebhooksMessageAction).toHaveBeenCalledTimes(1);
    expect(readWebexActionOptions).toHaveBeenCalledWith(config);
    expect(createSendWebhooksMessageAction).toHaveBeenCalledWith({
      timeout: { seconds: 2, milliseconds: 500 },
      webhookUrls: ['configured-webhook'],
    });
    expect(addActions).toHaveBeenCalledWith('sendMessageAction');
  });
});
