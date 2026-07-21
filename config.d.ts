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

import type { HumanDuration } from '@backstage/types';

export interface Config {
  /** Configuration for the Webex scaffolder backend module. */
  webex?: {
    /** Webex Incoming Webhooks delivery settings. */
    webhooks?: {
      /**
       * Default destinations used when an action input omits `webhooks`.
       *
       * Each value must match
       * `https://webexapis.com/v1/webhooks/incoming/<webhook-token>`.
       * An action-level `webhooks` array replaces these defaults.
       *
       * @deepVisibility secret
       */
      urls?: string[];

      /** Timeout for each webhook request. Defaults to `{ seconds: 10 }`. */
      timeout?: HumanDuration;
    };
  };
}
