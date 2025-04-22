import {
  CoreAssistantMessage,
  CoreUserMessage,
  FilePart,
  ImagePart,
  TextPart,
} from 'ai';

import { PromptMessage } from './types';

type ChatMessage = CoreUserMessage | CoreAssistantMessage;

const SIMPLE_IMAGE_URL_REGEX = /^(https?:\/\/|data:image\/)/;
const FORMAT_INFER_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  mp3: 'audio/mpeg',
  opus: 'audio/opus',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
  m4a: 'audio/aac',
  flac: 'audio/flac',
  ogv: 'video/ogg',
  wav: 'audio/wav',
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  txt: 'text/plain',
  md: 'text/plain',
  mov: 'video/mov',
  mpeg: 'video/mpeg',
  mp4: 'video/mp4',
  avi: 'video/avi',
  wmv: 'video/wmv',
  flv: 'video/flv',
};

async function inferMimeType(url: string) {
  if (url.startsWith('data:')) {
    return url.split(';')[0].split(':')[1];
  }
  const pathname = new URL(url).pathname;
  const extension = pathname.split('.').pop();
  if (extension) {
    const ext = FORMAT_INFER_MAP[extension];
    if (ext) {
      return ext;
    }
    const mimeType = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
    }).then(res => res.headers.get('Content-Type'));
    if (mimeType) {
      return mimeType;
    }
  }
  return 'application/octet-stream';
}

export async function chatToGPTMessage(
  messages: PromptMessage[]
): Promise<[string | undefined, ChatMessage[], any]> {
  const system = messages[0]?.role === 'system' ? messages.shift() : undefined;
  const schema = system?.params?.schema;

  // filter redundant fields
  const msgs: ChatMessage[] = [];
  for (let { role, content, attachments, params } of messages.filter(
    m => m.role !== 'system'
  )) {
    content = content.trim();
    role = role as 'user' | 'assistant';
    const mimetype = params?.mimetype;
    if (Array.isArray(attachments)) {
      const contents: (TextPart | ImagePart | FilePart)[] = [];
      if (content.length) {
        contents.push({ type: 'text', text: content });
      }

      for (let attachment of attachments) {
        let mimeType: string;
        if (typeof attachment === 'string') {
          mimeType =
            typeof mimetype === 'string'
              ? mimetype
              : await inferMimeType(attachment);
        } else {
          ({ attachment, mimeType } = attachment);
        }
        if (SIMPLE_IMAGE_URL_REGEX.test(attachment)) {
          if (mimeType.startsWith('image/')) {
            contents.push({ type: 'image', image: attachment, mimeType });
          } else {
            const data = attachment.startsWith('data:')
              ? await fetch(attachment).then(r => r.arrayBuffer())
              : new URL(attachment);
            contents.push({ type: 'file' as const, data, mimeType });
          }
        }
      }

      msgs.push({ role, content: contents } as ChatMessage);
    } else {
      msgs.push({ role, content });
    }
  }

  return [system?.content, msgs, schema];
}

// pattern types the callback will receive
type Pattern =
  | { kind: 'index'; value: number } // [123]
  | { kind: 'link'; text: string; url: string } // [text](url)
  | { kind: 'wrappedLink'; text: string; url: string }; // ([text](url))

type NeedMore = { kind: 'needMore' };
type Failed = { kind: 'fail'; nextPos: number };
type Finished =
  | { kind: 'ok'; endPos: number; text: string; url: string }
  | { kind: 'index'; endPos: number; value: number };
type ParseStatus = Finished | NeedMore | Failed;

type PatternCallback = (m: Pattern) => string;

export class StreamPatternParser {
  #buffer = '';

  constructor(private readonly callback: PatternCallback) {}

  write(chunk: string): string {
    this.#buffer += chunk;
    const output: string[] = [];
    let i = 0;

    while (i < this.#buffer.length) {
      const ch = this.#buffer[i];

      //  [[[number]]] or [text](url) or ([text](url))
      if (ch === '[' || (ch === '(' && this.peek(i + 1) === '[')) {
        const isWrapped = ch === '(';
        const startPos = isWrapped ? i + 1 : i;
        const res = this.tryParse(startPos);
        if (res.kind === 'needMore') break;
        const { output: out, nextPos } = this.handlePattern(
          res,
          isWrapped,
          startPos,
          i
        );
        output.push(out);
        i = nextPos;
        continue;
      }
      output.push(ch);
      i += 1;
    }

    this.#buffer = this.#buffer.slice(i);
    return output.join('');
  }

  end(): string {
    const rest = this.#buffer;
    this.#buffer = '';
    return rest;
  }

  // =========== helpers ===========

  private peek(pos: number): string | undefined {
    return pos < this.#buffer.length ? this.#buffer[pos] : undefined;
  }

  private tryParse(pos: number): ParseStatus {
    const nestedRes = this.tryParseNestedIndex(pos);
    if (nestedRes) return nestedRes;
    return this.tryParseBracketPattern(pos);
  }

  private tryParseNestedIndex(pos: number): ParseStatus | null {
    if (this.peek(pos + 1) !== '[') return null;

    let i = pos;
    let bracketCount = 0;

    while (i < this.#buffer.length && this.#buffer[i] === '[') {
      bracketCount++;
      i++;
    }

    if (bracketCount >= 2) {
      if (i >= this.#buffer.length) {
        return { kind: 'needMore' };
      }

      let content = '';
      while (i < this.#buffer.length && this.#buffer[i] !== ']') {
        content += this.#buffer[i++];
      }

      let rightBracketCount = 0;
      while (i < this.#buffer.length && this.#buffer[i] === ']') {
        rightBracketCount++;
        i++;
      }

      if (i >= this.#buffer.length && rightBracketCount < bracketCount) {
        return { kind: 'needMore' };
      }

      if (
        rightBracketCount === bracketCount &&
        content.length > 0 &&
        this.isNumeric(content)
      ) {
        if (this.peek(i) === '(') {
          return { kind: 'fail', nextPos: i };
        }
        return { kind: 'index', endPos: i, value: Number(content) };
      }
    }

    return null;
  }

  private tryParseBracketPattern(pos: number): ParseStatus {
    let i = pos + 1; // skip '['
    if (i >= this.#buffer.length) {
      return { kind: 'needMore' };
    }

    let content = '';
    while (i < this.#buffer.length && this.#buffer[i] !== ']') {
      const nextChar = this.#buffer[i];
      if (nextChar === '[') {
        return { kind: 'fail', nextPos: i };
      }
      content += nextChar;
      i += 1;
    }

    if (i >= this.#buffer.length) {
      return { kind: 'needMore' };
    }
    const after = i + 1;
    const afterChar = this.peek(after);

    if (content.length > 0 && this.isNumeric(content) && afterChar !== '(') {
      // [number] pattern
      return { kind: 'index', endPos: after, value: Number(content) };
    } else if (afterChar !== '(') {
      // [text](url) pattern
      return { kind: 'fail', nextPos: after };
    }

    i = after + 1; // skip '('
    if (i >= this.#buffer.length) {
      return { kind: 'needMore' };
    }

    let url = '';
    while (i < this.#buffer.length && this.#buffer[i] !== ')') {
      url += this.#buffer[i++];
    }
    if (i >= this.#buffer.length) {
      return { kind: 'needMore' };
    }
    return { kind: 'ok', endPos: i + 1, text: content, url };
  }

  private isNumeric(str: string): boolean {
    return !Number.isNaN(Number(str)) && str.trim() !== '';
  }

  private handlePattern(
    pattern: Finished | Failed,
    isWrapped: boolean,
    start: number,
    current: number
  ): { output: string; nextPos: number } {
    if (pattern.kind === 'fail') {
      return {
        output: this.#buffer.slice(current, pattern.nextPos),
        nextPos: pattern.nextPos,
      };
    }

    if (isWrapped) {
      const afterLinkPos = pattern.endPos;
      if (this.peek(afterLinkPos) !== ')') {
        if (afterLinkPos >= this.#buffer.length) {
          return { output: '', nextPos: current };
        }
        return { output: '(', nextPos: start };
      }

      const out =
        pattern.kind === 'index'
          ? this.callback({ ...pattern, kind: 'index' })
          : this.callback({ ...pattern, kind: 'wrappedLink' });
      return { output: out, nextPos: afterLinkPos + 1 };
    } else {
      const out =
        pattern.kind === 'ok'
          ? this.callback({ ...pattern, kind: 'link' })
          : this.callback({ ...pattern, kind: 'index' });
      return { output: out, nextPos: pattern.endPos };
    }
  }
}

export class CitationParser {
  private readonly citations: string[] = [];

  private readonly parser = new StreamPatternParser(p => {
    switch (p.kind) {
      case 'index': {
        if (p.value <= this.citations.length) {
          return `[^${p.value}]`;
        }
        return `[${p.value}]`;
      }
      case 'wrappedLink': {
        const index = this.citations.indexOf(p.url);
        if (index === -1) {
          this.citations.push(p.url);
          return `[^${this.citations.length}]`;
        }
        return `[^${index + 1}]`;
      }
      case 'link': {
        return `[${p.text}](${p.url})`;
      }
    }
  });

  public push(citation: string) {
    this.citations.push(citation);
  }

  public parse(content: string) {
    return this.parser.write(content);
  }

  public end() {
    return this.parser.end() + '\n' + this.getFootnotes();
  }

  private getFootnotes() {
    const footnotes = this.citations.map((citation, index) => {
      return `[^${index + 1}]: {"type":"url","url":"${encodeURIComponent(
        citation
      )}"}`;
    });
    return footnotes.join('\n');
  }
}
