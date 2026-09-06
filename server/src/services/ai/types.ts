export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  systemPrompt?: string;
  maxTokens?: number;
}

export interface AIProvider {
  chat(messages: AIMessage[], options?: ChatOptions): Promise<string>;
  isAvailable(): boolean;
}
