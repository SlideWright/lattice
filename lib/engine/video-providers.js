/**
 * video-providers.js — pure, dependency-free URL → provider resolution for the
 * `video` component. No `fs`, no network: this only PARSES a URL (identify the
 * provider, extract the id, build a canonical watch URL + the oEmbed endpoint).
 * The actual oEmbed fetch lives in the build tool (tools/fetch-video-oembed.js),
 * never here and never at render — render stays offline/deterministic.
 *
 * Supported: YouTube, Vimeo, TikTok, Instagram. Instagram's public oEmbed is
 * gated behind a Facebook app token, so it resolves for the label + link but
 * carries `oembed: null` (auto-thumbnail unavailable — author a `poster`).
 * See engineering/decisions/2026-07-02-video-component.md.
 */

// Ordered matchers — first hit wins. Each returns the bare id from the URL.
const PROVIDERS = [
  {
    key: 'youtube',
    label: 'YouTube',
    test: /(?:youtube\.com|youtu\.be)/i,
    id: (u) =>
      (u.match(/[?&]v=([\w-]{6,})/) ||
        u.match(/youtu\.be\/([\w-]{6,})/i) ||
        u.match(/youtube\.com\/(?:embed|shorts|live)\/([\w-]{6,})/i) ||
        [])[1] || '',
    watch: (id) => `https://www.youtube.com/watch?v=${id}`,
    oembed: (watch) => `https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`,
  },
  {
    key: 'vimeo',
    label: 'Vimeo',
    test: /vimeo\.com/i,
    id: (u) => (u.match(/vimeo\.com\/(?:video\/)?(\d{5,})/i) || [])[1] || '',
    watch: (id) => `https://vimeo.com/${id}`,
    oembed: (watch) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(watch)}`,
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    test: /tiktok\.com/i,
    id: (u) => (u.match(/\/video\/(\d{6,})/) || [])[1] || '',
    // TikTok's canonical URL needs the author handle, which we don't always
    // have — so the author's own URL is the watch/QR target verbatim.
    watch: (_id, original) => original,
    oembed: (watch) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(watch)}`,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    test: /instagram\.com/i,
    id: (u) => (u.match(/instagram\.com\/(?:p|reel|tv)\/([\w-]+)/i) || [])[1] || '',
    watch: (_id, original) => original,
    oembed: null, // public oEmbed retired — needs a Facebook app token
  },
];

/**
 * Resolve a URL string to a provider descriptor, or null if it isn't a
 * recognized video URL. Never throws.
 *   { key, label, id, url (canonical watch/QR target), oembedUrl|null }
 */
function detectProvider(raw) {
  const url = String(raw || '').trim();
  if (!url) return null;
  for (const p of PROVIDERS) {
    if (!p.test.test(url)) continue;
    const id = p.id(url);
    const watch = p.watch(id, url);
    return {
      key: p.key,
      label: p.label,
      id,
      url: watch,
      oembedUrl: p.oembed ? p.oembed(watch) : null,
    };
  }
  return null;
}

module.exports = { detectProvider, PROVIDERS };
