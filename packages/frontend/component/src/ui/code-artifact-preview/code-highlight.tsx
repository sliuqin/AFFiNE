import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';
import {
  bundledLanguagesInfo,
  createHighlighterCore,
  createOnigurumaEngine,
  type HighlighterCore,
  type ThemedToken,
} from 'shiki';
import getWasm from 'shiki/wasm';

import * as styles from './code-highlight.css';

// Default themes
const LIGHT_THEME = 'light-plus';
const DARK_THEME = 'dark-plus';

// Singleton highlighter service
class HighlighterService {
  private highlighter: HighlighterCore | null = null;
  private initPromise: Promise<HighlighterCore> | null = null;
  private isInitialized = false;

  async getHighlighter(): Promise<HighlighterCore> {
    if (this.highlighter && this.isInitialized) {
      return this.highlighter;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeHighlighter();
    return this.initPromise;
  }

  private async initializeHighlighter(): Promise<HighlighterCore> {
    try {
      const core = await createHighlighterCore({
        engine: createOnigurumaEngine(() => getWasm),
      });

      // Load themes
      await core.loadTheme(
        import('shiki/themes/light-plus.mjs'),
        import('shiki/themes/dark-plus.mjs')
      );

      this.highlighter = core;
      this.isInitialized = true;
      return core;
    } catch (error) {
      console.error('Failed to initialize highlighter:', error);
      throw error;
    }
  }

  dispose() {
    if (this.highlighter) {
      this.highlighter.dispose();
      this.highlighter = null;
      this.isInitialized = false;
      this.initPromise = null;
    }
  }
}

// Singleton instance
const highlighterService = new HighlighterService();

async function highlightCode(
  code: string,
  language: string,
  theme: string = LIGHT_THEME
) {
  try {
    const highlighter = await highlighterService.getHighlighter();
    const loadedLanguages = highlighter.getLoadedLanguages();

    // Load language if not already loaded
    if (!loadedLanguages.includes(language)) {
      // Find the language info from bundled languages
      const matchedInfo = bundledLanguagesInfo.find(
        info =>
          info.id === language ||
          info.name === language ||
          info.aliases?.includes(language)
      );

      if (matchedInfo) {
        const langImport = matchedInfo.import;
        await highlighter.loadLanguage(langImport);
      } else {
        console.warn(`Language not supported: ${language}`);
        return [];
      }
    }

    const tokens = highlighter.codeToTokensBase(code, {
      lang: language,
      theme,
    });
    return tokens;
  } catch (error) {
    console.error('Error highlighting code:', error);
    return [];
  }
}

interface CodeHighlightProps {
  code: string;
  language?: string;
  theme?: 'light' | 'dark';
  className?: string;
  streaming?: boolean;
  showLineNumbers?: boolean;
}

export const CodeHighlight = ({
  code,
  language = 'javascript',
  theme = 'light',
  className = '',
  streaming = false,
  showLineNumbers = true,
}: CodeHighlightProps) => {
  const [tokens, setTokens] = useState<ThemedToken[][]>([]);

  const selectedTheme = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

  // Highlight code when code, language, or theme changes
  useEffect(() => {
    let cancel = false;
    if (!code.trim()) {
      setTokens([]);
      return;
    }

    const loadLanguageAndHighlight = async () => {
      try {
        const highlightedTokens = await highlightCode(
          code,
          language,
          selectedTheme
        );
        if (!cancel) {
          setTokens(highlightedTokens);
        }
      } catch (error) {
        console.error('Error in loadLanguageAndHighlight:', error);
        // Don't clear tokens on error, keep showing previous highlighting
      }
    };

    loadLanguageAndHighlight().catch(console.error);

    return () => {
      cancel = true;
    };
  }, [code, language, selectedTheme]);

  const renderedTokens = useMemo(() => {
    if (tokens.length === 0) {
      return code;
    }

    return tokens.map((lineTokens, lineIndex) => (
      /* oxlint-disable-next-line eslint-plugin-react/no-array-index-key */
      <React.Fragment key={lineIndex}>
        {lineTokens.map((token, tokenIndex) => (
          <span
            /* oxlint-disable-next-line eslint-plugin-react/no-array-index-key */
            key={tokenIndex}
            className={styles.codeToken}
            style={{
              color: token.color || undefined,
              fontStyle: token.fontStyle === 1 ? 'italic' : undefined,
              fontWeight: token.fontStyle === 2 ? 'bold' : undefined,
              textDecoration: token.fontStyle === 4 ? 'underline' : undefined,
            }}
          >
            {token.content}
          </span>
        ))}
        {lineIndex < tokens.length - 1 && '\n'}
      </React.Fragment>
    ));
  }, [tokens, code]);

  const lineCount = useMemo(() => {
    if (tokens.length > 0) {
      return tokens.length;
    }
    return code.split('\n').length;
  }, [tokens, code]);

  const lineNumbers = useMemo(() => {
    if (!showLineNumbers) return null;

    return Array.from({ length: lineCount }, (_, index) => (
      <span key={index + 1} className={styles.lineNumber}>
        {index + 1}
      </span>
    ));
  }, [lineCount, showLineNumbers]);

  return (
    <pre
      className={clsx(
        className,
        styles.container,
        streaming && styles.streaming
      )}
    >
      {showLineNumbers && (
        <div className={styles.lineNumbers}>{lineNumbers}</div>
      )}
      <div className={styles.codeContainer}>
        <code>{renderedTokens}</code>
      </div>
    </pre>
  );
};

export default CodeHighlight;
