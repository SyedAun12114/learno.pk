import { config } from '../../config';
import { AnthropicProvider } from './AnthropicProvider';
import type { AIProvider } from './types';

let _provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!_provider) {
    switch (config.ai.provider) {
      case 'anthropic':
        _provider = new AnthropicProvider();
        break;
      default:
        throw new Error('Unknown AI provider: ' + config.ai.provider);
    }
  }
  return _provider;
}

export type { AIProvider, AIMessage, ChatOptions } from './types';
