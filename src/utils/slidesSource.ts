export const SLIDES_ALIASES: Record<string, string> = {
  current: 'https://github.com/cbozic/service_display/releases/download/slides-current/BGGSlides.gif',
};

export const DEFAULT_REMOTE_ALIAS = 'current';

export type SlidesSource =
  | { kind: 'bundled' }
  | { kind: 'alias'; alias: string; url: string }
  | { kind: 'remote'; url: string }
  | { kind: 'upload' };

export function resolveSlidesParam(raw: string | null): SlidesSource | null {
  if (!raw) return null;
  if (SLIDES_ALIASES[raw]) return { kind: 'alias', alias: raw, url: SLIDES_ALIASES[raw] };
  if (/^https?:\/\//i.test(raw)) return { kind: 'remote', url: raw };
  return null;
}

export function toShareParam(source: SlidesSource): string | null {
  if (source.kind === 'alias') return source.alias;
  if (source.kind === 'remote') return source.url;
  return null;
}
