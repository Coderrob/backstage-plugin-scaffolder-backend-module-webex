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

import type { RootConfigService } from '@backstage/backend-plugin-api';
import { readDurationFromConfig } from '@backstage/config';
import type { HumanDuration } from '@backstage/types';

const TIMEOUT_KEY = 'webex.webhooks.timeout';

/** Configuration values consumed by the Webex scaffolder action. */
interface WebexActionOptions {
  timeout: HumanDuration | undefined;
  webhookUrls: string[] | undefined;
}

/**
 * Reads Webex action defaults from Backstage configuration.
 *
 * @param config - Backstage root configuration service.
 * @returns Optional webhook destinations and a parsed human-duration timeout.
 *
 * @remarks Reading configuration has no external side effects. Invalid values
 * are rejected by the Backstage configuration API.
 */
export function readWebexActionOptions(
  config: RootConfigService,
): WebexActionOptions {
  return {
    timeout: config.has(TIMEOUT_KEY)
      ? readDurationFromConfig(config, { key: TIMEOUT_KEY })
      : undefined,
    webhookUrls: config.getOptionalStringArray('webex.webhooks.urls'),
  };
}
