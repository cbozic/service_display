import { describe, it, expect } from 'vitest';
import { resolveSlidesParam, toShareParam, SLIDES_ALIASES } from './slidesSource';

describe('resolveSlidesParam', () => {
  it('returns null for null input', () => {
    expect(resolveSlidesParam(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(resolveSlidesParam('')).toBeNull();
  });

  it('resolves a known alias to its URL', () => {
    const result = resolveSlidesParam('current');
    expect(result).toEqual({ kind: 'alias', alias: 'current', url: SLIDES_ALIASES.current });
  });

  it('returns null for an unknown alias (not a URL)', () => {
    expect(resolveSlidesParam('not-a-real-alias')).toBeNull();
  });

  it('treats an https URL as a remote source', () => {
    expect(resolveSlidesParam('https://example.com/foo.gif')).toEqual({
      kind: 'remote',
      url: 'https://example.com/foo.gif',
    });
  });

  it('treats an http URL as a remote source', () => {
    expect(resolveSlidesParam('http://example.com/foo.gif')).toEqual({
      kind: 'remote',
      url: 'http://example.com/foo.gif',
    });
  });
});

describe('toShareParam', () => {
  it('returns the alias name for alias sources', () => {
    expect(toShareParam({ kind: 'alias', alias: 'current', url: 'https://x' })).toBe('current');
  });

  it('returns the URL for remote sources', () => {
    expect(toShareParam({ kind: 'remote', url: 'https://example.com/foo.gif' })).toBe(
      'https://example.com/foo.gif'
    );
  });

  it('returns null for bundled sources (no share param needed)', () => {
    expect(toShareParam({ kind: 'bundled' })).toBeNull();
  });

  it('returns null for upload sources (data URLs are not shareable)', () => {
    expect(toShareParam({ kind: 'upload' })).toBeNull();
  });
});
