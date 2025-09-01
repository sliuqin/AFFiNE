import { Injectable } from '@nestjs/common';
import { AISDKError } from 'ai';

import {
  CopilotProviderSideError,
  metrics,
  UserFriendlyError,
} from '../../../../base';
import { CopilotProvider } from '../provider';
import type {
  CopilotChatOptions,
  ModelConditions,
  PromptMessage,
  StreamObject,
} from '../types';
import { CopilotProviderType, ModelInputType, ModelOutputType } from '../types';
import { StreamObjectParser } from '../utils';

export type QwenConfig = {
  apiKey: string;
  baseURL?: string;
};

@Injectable()
export class QwenProvider extends CopilotProvider<QwenConfig> {
  readonly type = CopilotProviderType.Qwen;

  readonly models = [
    // Qwen Max - 最强模型
    {
      id: 'qwen-max',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text, ModelOutputType.Object],
        },
      ],
    },
    // Qwen Plus - 平衡性能和成本
    {
      id: 'qwen-plus',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text, ModelOutputType.Object],
        },
      ],
    },
    // Qwen Turbo - 快速响应
    {
      id: 'qwen-turbo',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text, ModelOutputType.Object],
        },
      ],
    },
    // Qwen Long - 长文本处理
    {
      id: 'qwen-long',
      capabilities: [
        {
          input: [ModelInputType.Text],
          output: [ModelOutputType.Text, ModelOutputType.Object],
        },
      ],
    },
  ];

  override configured(): boolean {
    return !!this.config.apiKey;
  }

  private get baseUrl(): string {
    const url =
      this.config.baseURL ||
      'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.logger.debug('Qwen BaseURL Config:', {
      configBaseURL: this.config.baseURL,
      finalUrl: url,
      fullConfig: this.config,
    });
    return url;
  }

  private handleError(e: any, model: string, options: CopilotChatOptions = {}) {
    this.logger.error('Qwen Provider Error:', {
      error: e,
      message: e?.message,
      name: e?.name,
      model: model,
      baseURL: this.baseUrl,
    });

    if (e instanceof UserFriendlyError) {
      return e;
    } else if (e instanceof AISDKError) {
      if (e.message.includes('safety') || e.message.includes('risk')) {
        metrics.ai
          .counter('chat_text_risk_errors')
          .add(1, { model, user: options.user || undefined });
      }

      return new CopilotProviderSideError({
        provider: this.type,
        kind: e.name || 'unknown',
        message: e.message,
      });
    } else {
      return new CopilotProviderSideError({
        provider: this.type,
        kind: 'unexpected_response',
        message: e?.message || 'Unexpected qwen response',
      });
    }
  }

  private async callQwenAPI(
    model: string,
    messages: any[],
    options: {
      stream?: boolean;
      temperature?: number;
      maxTokens?: number;
      signal?: AbortSignal;
    } = {}
  ) {
    const requestBody: any = {
      model,
      messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 4096,
      stream: options.stream || false,
    };

    const url = `${this.baseUrl}/chat/completions`;

    this.logger.debug('Qwen API Request:', {
      url,
      baseUrl: this.baseUrl,
      model,
      requestBody: {
        ...requestBody,
        messages: requestBody.messages?.length + ' messages',
      },
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Qwen API error ${response.status}: ${errorText}`);
    }

    return response;
  }

  private convertMessagesToQwen(messages: PromptMessage[]): any[] {
    return messages.map(msg => {
      const qwenMsg: any = {
        role: msg.role,
        content: msg.content,
      };

      // 处理图像附件
      if (msg.attachments && msg.attachments.length > 0) {
        const content: any[] = [{ text: msg.content }];

        for (const attachment of msg.attachments) {
          if (typeof attachment === 'string') {
            // URL 格式
            content.push({
              image: attachment,
            });
          } else if (attachment.mimeType?.startsWith('image/')) {
            // Base64 格式
            content.push({
              image: attachment.attachment,
            });
          }
        }

        qwenMsg.content = content;
      }

      return qwenMsg;
    });
  }

  async text(
    cond: ModelConditions,
    messages: PromptMessage[],
    options: CopilotChatOptions = {}
  ): Promise<string> {
    const fullCond = {
      ...cond,
      outputType: ModelOutputType.Text,
    };
    await this.checkParams({ messages, cond: fullCond, options });
    const model = this.selectModel(fullCond);

    try {
      metrics.ai.counter('chat_text_calls').add(1, { model: model.id });

      const qwenMessages = this.convertMessagesToQwen(messages);

      const response = await this.callQwenAPI(model.id, qwenMessages, {
        temperature: options.temperature ?? undefined,
        maxTokens: options.maxTokens ?? undefined,
        signal: options.signal,
      });

      const result: any = await response.json();

      if (result.choices?.[0]?.message?.content) {
        return result.choices[0].message.content.trim();
      } else if (result.error) {
        throw new Error(
          `Qwen API error: ${result.error.message || 'Unknown error'}`
        );
      } else {
        throw new Error('Invalid response from Qwen API');
      }
    } catch (e: any) {
      metrics.ai.counter('chat_text_errors').add(1, { model: model.id });
      throw this.handleError(e, model.id, options);
    }
  }

  async *streamText(
    cond: ModelConditions,
    messages: PromptMessage[],
    options: CopilotChatOptions = {}
  ): AsyncIterable<string> {
    const fullCond = {
      ...cond,
      outputType: ModelOutputType.Text,
    };
    await this.checkParams({ messages, cond: fullCond, options });
    const model = this.selectModel(fullCond);

    try {
      metrics.ai.counter('chat_text_stream_calls').add(1, { model: model.id });

      const qwenMessages = this.convertMessagesToQwen(messages);

      const response = await this.callQwenAPI(model.id, qwenMessages, {
        stream: true,
        temperature: options.temperature ?? undefined,
        maxTokens: options.maxTokens ?? undefined,
        signal: options.signal,
      });

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          if (options.signal?.aborted) {
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  yield parsed.choices[0].delta.content;
                }
              } catch (parseError) {
                // 忽略解析错误，继续处理下一行
                console.log(parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (e: any) {
      metrics.ai.counter('chat_text_stream_errors').add(1, { model: model.id });
      throw this.handleError(e, model.id, options);
    }
  }

  override async *streamObject(
    cond: ModelConditions,
    messages: PromptMessage[],
    options: CopilotChatOptions = {}
  ): AsyncIterable<StreamObject> {
    const fullCond = { ...cond, outputType: ModelOutputType.Object };
    await this.checkParams({ cond: fullCond, messages, options });
    const model = this.selectModel(fullCond);

    try {
      metrics.ai
        .counter('chat_object_stream_calls')
        .add(1, { model: model.id });

      // 对于对象流，我们使用标准的流文本输出，然后解析
      const textStream = this.streamText(cond, messages, options);
      const parser = new StreamObjectParser();

      for await (const chunk of textStream) {
        const result = parser.parse({ type: 'text-delta', text: chunk } as any);
        if (result) {
          yield result;
        }
        if (options.signal?.aborted) {
          break;
        }
      }
    } catch (e: any) {
      metrics.ai
        .counter('chat_object_stream_errors')
        .add(1, { model: model.id });
      throw this.handleError(e, model.id, options);
    }
  }

  // Qwen 模型不支持结构化输出，抛出不支持错误
  override structure(
    _cond: ModelConditions,
    _messages: PromptMessage[],
    _options?: any
  ): Promise<string> {
    throw new CopilotProviderSideError({
      provider: this.type,
      kind: 'not_supported',
      message: 'Qwen models do not support structured output',
    });
  }

  // Qwen 模型不支持 embedding，抛出不支持错误
  override embedding(
    _model: ModelConditions,
    _text: string | string[],
    _options?: any
  ): Promise<number[][]> {
    throw new CopilotProviderSideError({
      provider: this.type,
      kind: 'not_supported',
      message: 'Qwen models do not support embedding',
    });
  }

  // Qwen 模型不支持图像生成，抛出不支持错误
  override streamImages(
    _model: ModelConditions,
    _messages: PromptMessage[],
    _options?: any
  ): AsyncIterable<string> {
    throw new CopilotProviderSideError({
      provider: this.type,
      kind: 'not_supported',
      message: 'Qwen models do not support image generation',
    });
  }

  // Qwen 模型不支持重排序，抛出不支持错误
  override async rerank(
    _model: ModelConditions,
    _messages: PromptMessage[][],
    _options?: CopilotChatOptions
  ): Promise<number[]> {
    throw new CopilotProviderSideError({
      provider: this.type,
      kind: 'not_supported',
      message: 'Qwen models do not support rerank',
    });
  }
}
