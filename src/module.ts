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
import { createBackendModule } from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha';
import { createSendWebhooksMessageAction } from './actions';

/**
 * Webex Scaffolder backend module
 *
 * Registers custom scaffolder actions for sending messages to Webex Incoming
 * Webhooks. This module is intended to be added to a Backstage backend init
 * pipeline so the scaffolder backend will expose the `webex:webhooks:sendMessage`
 * action to templates.
 *
 * Usage (in your backend module registration):
 *
 * ```ts
 * backend.add(import('@coderrob/backstage-plugin-scaffolder-backend-module-webex'));
 * ```
 *
 * @public
 */
export const webexScaffolderModule = createBackendModule({
  moduleId: 'webex',
  pluginId: 'scaffolder',
  register({ registerInit }) {
    registerInit({
      deps: { scaffolder: scaffolderActionsExtensionPoint },
      async init({ scaffolder }) {
        scaffolder.addActions(createSendWebhooksMessageAction());
      },
    });
  },
});
