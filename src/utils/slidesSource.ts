// Hosted on a force-pushed `slides-assets` orphan branch in the same repo.
// raw.githubusercontent.com sets `Access-Control-Allow-Origin: *`, which
// release-download URLs do not (their redirects to release-assets.githubusercontent.com
// are blocked by browser CORS). See scripts/update-slides.sh for the push workflow.
export const SLIDES_ALIASES: Record<string, string> = {
  current: 'https://raw.githubusercontent.com/cbozic/service_display/slides-assets/slides.gif',
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
