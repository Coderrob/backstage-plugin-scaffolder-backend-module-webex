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
  coreServices,
  createBackendModule,
  type BackendFeature,
} from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node';
import { createSendWebhooksMessageAction } from './actions';
import { readWebexActionOptions } from './webex/config';

/**
 * @public
 * The Webex Module for the Scaffolder Backend
 */
export const webexScaffolderModule: BackendFeature = createBackendModule({
  moduleId: 'webex',
  pluginId: 'scaffolder',
  /**
   * Registers the module's Backstage service dependencies.
   *
   * @param registration - Backend module registration API.
   * @returns Nothing.
   */
  register({ registerInit }): void {
    registerInit({
      deps: {
        config: coreServices.rootConfig,
        scaffolder: scaffolderActionsExtensionPoint,
      },
      /**
       * Creates and registers the configured Webex scaffolder action.
       *
       * @param dependencies - Root config and scaffolder extension point.
       * @returns A promise that resolves after registration.
       */
      async init({ config, scaffolder }): Promise<void> {
        scaffolder.addActions(
          createSendWebhooksMessageAction(readWebexActionOptions(config)),
        );
      },
    });
  },
});
