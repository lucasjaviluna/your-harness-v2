import type { AIConnector } from '../core/ai/connector.js';
import { createAIConnector } from '../core/ai/connector.js';
import type { ProviderConfig, ProviderType, ValidatedConfig } from '../core/config.js';
import type { AIProvider } from '../core/ai/types.js';

import { createCopilotProvider } from './copilot.js';
import { createClaudeProvider } from './claude.js';
import { createOpenAIProvider } from './openai.js';
import { createLocalProvider } from './local.js';
import { createCustomProvider } from './custom.js';

export interface ConnectorFactory {
  create(type: ProviderType, config: ProviderConfig): AIConnector;
  createAll(config: ValidatedConfig): AIConnector[];
  createEnabled(config: ValidatedConfig): AIConnector[];
}

const providerCreators: Record<ProviderType, (config: ProviderConfig) => AIProvider> = {
  copilot: (c) => createCopilotProvider({ apiKey: c.apiKey, endpoint: c.endpoint, model: c.model }),
  claude: (c) => createClaudeProvider({ apiKey: c.apiKey, endpoint: c.endpoint, model: c.model }),
  openai: (c) => createOpenAIProvider({ apiKey: c.apiKey, endpoint: c.endpoint, model: c.model }),
  local: (c) => createLocalProvider({ endpoint: c.endpoint, model: c.model }),
  custom: (c) => createCustomProvider({ apiKey: c.apiKey, endpoint: c.endpoint, model: c.model }),
};

const defaultModels: Record<ProviderType, string> = {
  copilot: 'copilot-gpt-4',
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  local: 'llama3',
  custom: 'custom-model',
};

export const createConnectorFactory = (): ConnectorFactory => {
  return {
    create(type, config) {
      const creator = providerCreators[type];
      if (!creator) {
        throw new Error(`Unknown provider type: ${type}`);
      }

      const provider = creator(config);
      
      return createAIConnector(
        {
          name: type,
          version: '1.0.0',
          description: `${type} provider (${config.model ?? defaultModels[type]})`,
        },
        provider,
        {
          supportsStream: true,
          listModels: provider.listModels,
        }
      );
    },

    createAll(config) {
      const providers = Object.entries(config.providers) as [ProviderType, ProviderConfig][];
      
      return providers.map(([type, providerConfig]) => {
        return this.create(type, providerConfig);
      });
    },

    createEnabled(config) {
      const providers = Object.entries(config.providers) as [ProviderType, ProviderConfig][];
      
      return providers
        .filter(([, providerConfig]) => providerConfig.enabled)
        .map(([type, providerConfig]) => {
          return this.create(type, providerConfig);
        });
    },
  };
};