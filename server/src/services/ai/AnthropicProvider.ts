import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import type { AIProvider, AIMessage, ChatOptions } from './types';

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({ apiKey: config.ai.anthropicKey });
    this.model = config.ai.anthropicModel;
  }

  isAvailable(): boolean {
    return Boolean(config.ai.anthropicKey && config.ai.anthropicKey.startsWith('sk-'));
  }

  async chat(messages: AIMessage[], options: ChatOptions = {}): Promise<string> {
    const { systemPrompt, maxTokens = config.ai.maxTokens } = options;
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      });
      const content = response.content[0];
      if (content.type !== 'text') throw new Error('Unexpected response type');
      return content.text;
    } catch (err: unknown) {
      logger.error('Anthropic error:', err);
      throw err;
    }
  }
}
