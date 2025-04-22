import { describe, expect, it } from 'vitest';

import { footnoteUrlPreprocessor } from '../../adapters/markdown/preprocessor';

describe('footnoteUrlPreprocessor', () => {
  it('should encode unencoded URLs in footnote definitions', () => {
    const input =
      '[^ref]: {"type":"url","url":"https://example.com?param=value"}';
    const expected =
      '[^ref]: {"type":"url","url":"https%3A%2F%2Fexample.com%3Fparam%3Dvalue"}';
    expect(footnoteUrlPreprocessor(input)).toBe(expected);
  });

  it('should not encode already encoded URLs', () => {
    const input = '[^ref]: {"type":"url","url":"https%3A%2F%2Fexample.com"}';
    expect(footnoteUrlPreprocessor(input)).toBe(input);
  });

  it('should handle invalid JSON content', () => {
    const input = '[^ref]: {"invalid json"}';
    expect(footnoteUrlPreprocessor(input)).toBe(input);
  });

  it('should handle non-object footnote data', () => {
    const input = '[^ref]: "not an object"';
    expect(footnoteUrlPreprocessor(input)).toBe(input);
  });

  it('should handle footnote data without url property', () => {
    const input = '[^ref]: {"type":"url"}';
    expect(footnoteUrlPreprocessor(input)).toBe(input);
  });

  it('should handle multiple footnote definitions', () => {
    const input = `
[^ref1]: {"type":"url","url":"https://example1.com"}
[^ref2]: {"type":"url","url":"https://example2.com"}
    `.trim();
    const expected = `
[^ref1]: {"type":"url","url":"https%3A%2F%2Fexample1.com"}
[^ref2]: {"type":"url","url":"https%3A%2F%2Fexample2.com"}
    `.trim();
    expect(footnoteUrlPreprocessor(input)).toBe(expected);
  });

  it('should handle special characters in URLs', () => {
    const input =
      '[^ref]: {"type":"url","url":"https://example.com/path with spaces?param=value&another=param"}';
    const expected =
      '[^ref]: {"type":"url","url":"https%3A%2F%2Fexample.com%2Fpath%20with%20spaces%3Fparam%3Dvalue%26another%3Dparam"}';
    expect(footnoteUrlPreprocessor(input)).toBe(expected);
  });
});
