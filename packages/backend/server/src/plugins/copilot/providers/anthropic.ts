import {
  AnthropicProvider as AnthropicSDKProvider,
  AnthropicProviderOptions,
  createAnthropic,
} from '@ai-sdk/anthropic';
import {
  createVertexAnthropic,
  type GoogleVertexAnthropicProvider,
} from '@ai-sdk/google-vertex/anthropic';
import { AISDKError, generateText, streamText } from 'ai';

import {
  CopilotPromptInvalid,
  CopilotProviderSideError,
  metrics,
  UserFriendlyError,
} from '../../../base';
import { createExaCrawlTool, createExaSearchTool } from '../tools';
import { CopilotProvider } from './provider';
import {
  ChatMessageRole,
  CopilotCapability,
  CopilotChatOptions,
  CopilotProviderType,
  CopilotTextToTextProvider,
  PromptMessage,
  VertexPrivateKey,
  VertexPrivateKeySchema,
} from './types';
import { chatToGPTMessage } from './utils';

export type AnthropicConfig = {
  apiKey: string;
  baseUrl?: string;
  // google vertex ai
  privateKey: string;
};

export class AnthropicProvider
  extends CopilotProvider<AnthropicConfig>
  implements CopilotTextToTextProvider
{
  override readonly type = CopilotProviderType.Anthropic;
  override readonly capabilities = [CopilotCapability.TextToText];
  override readonly models = [
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    // google vertex ai
    'claude-3-7-sonnet@20250219',
    'claude-3-5-sonnet-v2@20241022',
    'claude-3-5-sonnet@20240620',
  ];

  private readonly MAX_STEPS = 20;

  private readonly CALLOUT_PREFIX = '\n> [!]\n> ';

  #anthropic!: AnthropicSDKProvider;

  #vertex!: GoogleVertexAnthropicProvider;

  override configured(): boolean {
    return (
      !!this.config.apiKey && !!this.parsePrivateKey(this.config.privateKey)
    );
  }

  protected override setup() {
    super.setup();
    this.#anthropic = createAnthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
    });

    // can not throw error here
    const {
      type,
      client_email,
      private_key,
      private_key_id,
      project_id,
      client_id,
      universe_domain,
    } = this.parsePrivateKey(this.config.privateKey) || {};

    this.#vertex = createVertexAnthropic({
      project: project_id,
      location: 'us-east5',
      googleAuthOptions: {
        credentials: {
          type,
          client_email,
          private_key,
          private_key_id,
          project_id,
          client_id,
          universe_domain,
        },
      },
    });
  }

  protected async checkParams({
    messages,
    model,
  }: {
    messages?: PromptMessage[];
    model: string;
  }) {
    if (!(await this.isModelAvailable(model))) {
      throw new CopilotPromptInvalid(`Invalid model: ${model}`);
    }
    if (Array.isArray(messages) && messages.length > 0) {
      if (
        messages.some(
          m =>
            // check non-object
            typeof m !== 'object' ||
            !m ||
            // check content
            typeof m.content !== 'string' ||
            // content and attachments must exist at least one
            ((!m.content || !m.content.trim()) &&
              (!Array.isArray(m.attachments) || !m.attachments.length))
        )
      ) {
        throw new CopilotPromptInvalid('Empty message content');
      }
      if (
        messages.some(
          m =>
            typeof m.role !== 'string' ||
            !m.role ||
            !ChatMessageRole.includes(m.role)
        )
      ) {
        throw new CopilotPromptInvalid('Invalid message role');
      }
    }
  }

  private instance(model: string) {
    if (model.includes('@')) {
      return this.#vertex(model);
    }
    return this.#anthropic(model);
  }

  private handleError(e: any) {
    if (e instanceof UserFriendlyError) {
      return e;
    } else if (e instanceof AISDKError) {
      this.logger.error('Throw error from ai sdk:', e);
      return new CopilotProviderSideError({
        provider: this.type,
        kind: e.name || 'unknown',
        message: e.message,
      });
    } else {
      return new CopilotProviderSideError({
        provider: this.type,
        kind: 'unexpected_response',
        message: e?.message || 'Unexpected anthropic response',
      });
    }
  }

  // ====== text to text ======
  async generateText(
    messages: PromptMessage[],
    model: string = 'claude-3-7-sonnet-20250219',
    options: CopilotChatOptions = {}
  ): Promise<string> {
    await this.checkParams({ messages, model });

    try {
      metrics.ai.counter('chat_text_calls').add(1, { model });

      const [system, msgs] = await chatToGPTMessage(messages);

      const modelInstance = this.instance(model);
      const { text, reasoning } = await generateText({
        model: modelInstance,
        system,
        messages: msgs,
        abortSignal: options.signal,
        providerOptions: {
          anthropic: this.getAnthropicOptions(options, model),
        },
        tools: this.getTools(),
        maxSteps: this.MAX_STEPS,
        experimental_continueSteps: true,
      });

      if (!text) throw new Error('Failed to generate text');

      return reasoning ? `${reasoning}\n${text}` : text;
    } catch (e: any) {
      metrics.ai.counter('chat_text_errors').add(1, { model });
      throw this.handleError(e);
    }
  }

  async *generateTextStream(
    messages: PromptMessage[],
    model: string = 'claude-3-7-sonnet-20250219',
    options: CopilotChatOptions = {}
  ): AsyncIterable<string> {
    await this.checkParams({ messages, model });

    try {
      metrics.ai.counter('chat_text_stream_calls').add(1, { model });
      const [system, msgs] = await chatToGPTMessage(messages);
      const { fullStream } = streamText({
        model: this.instance(model),
        system,
        messages: msgs,
        abortSignal: options.signal,
        providerOptions: {
          anthropic: this.getAnthropicOptions(options, model),
        },
        tools: this.getTools(),
        maxSteps: this.MAX_STEPS,
        experimental_continueSteps: true,
      });

      let lastType;
      // reasoning, tool-call, tool-result need to mark as callout
      let prefix: string | null = this.CALLOUT_PREFIX;
      for await (const chunk of fullStream) {
        switch (chunk.type) {
          case 'text-delta': {
            if (!prefix) {
              prefix = this.CALLOUT_PREFIX;
            }
            let result = chunk.textDelta;
            if (lastType !== chunk.type) {
              result = '\n\n' + result;
            }
            yield result;
            break;
          }
          case 'reasoning': {
            if (prefix) {
              yield prefix;
              prefix = null;
            }
            let result = chunk.textDelta;
            if (lastType !== chunk.type) {
              result = '\n\n' + result;
            }
            yield this.markAsCallout(result);
            break;
          }
          case 'tool-call': {
            if (prefix) {
              yield prefix;
              prefix = null;
            }
            if (chunk.toolName === 'web_search_exa') {
              yield this.markAsCallout(
                `\nSearching the web "${chunk.args.query}"\n`
              );
            }
            if (chunk.toolName === 'web_crawl_exa') {
              yield this.markAsCallout(
                `\nCrawling the web "${chunk.args.url}"\n`
              );
            }
            break;
          }
          case 'tool-result': {
            if (
              chunk.toolName === 'web_search_exa' &&
              Array.isArray(chunk.result)
            ) {
              if (prefix) {
                yield prefix;
                prefix = null;
              }
              yield this.markAsCallout(this.getWebSearchLinks(chunk.result));
            }
            break;
          }
          case 'error': {
            const error = chunk.error as { type: string; message: string };
            throw new Error(error.message);
          }
        }
        if (options.signal?.aborted) {
          await fullStream.cancel();
          break;
        }
        lastType = chunk.type;
      }
    } catch (e: any) {
      metrics.ai.counter('chat_text_stream_errors').add(1, { model });
      throw this.handleError(e);
    }
  }

  private getTools() {
    return {
      web_search_exa: createExaSearchTool(this.AFFiNEConfig),
      web_crawl_exa: createExaCrawlTool(this.AFFiNEConfig),
    };
  }

  private getAnthropicOptions(options: CopilotChatOptions, model: string) {
    const result: AnthropicProviderOptions = {};
    if (options?.reasoning && this.isThinkingModel(model)) {
      result.thinking = {
        type: 'enabled',
        budgetTokens: 12000,
      };
    }
    return result;
  }

  private getWebSearchLinks(
    list: {
      title: string | null;
      url: string;
    }[]
  ): string {
    const links = list.reduce((acc, result) => {
      return acc + `\n[${result.title ?? result.url}](${result.url})\n\n`;
    }, '');
    return links;
  }

  private markAsCallout(text: string) {
    return text.replaceAll('\n', '\n> ');
  }

  private isThinkingModel(model: string) {
    return model.startsWith('claude-3-7-sonnet');
  }

  private parsePrivateKey(jsonString: string): VertexPrivateKey | null {
    try {
      return VertexPrivateKeySchema.parse(JSON.parse(jsonString));
    } catch {
      return null;
    }
  }
}
