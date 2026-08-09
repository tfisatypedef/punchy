# Punch — Change Log

## Player & Real Streaming (point 1)

### `package.json`
- Added `hls.js` dependency for real HLS streaming in the browser (Safari uses native HLS).

### `server.ts` — real Kick channel proxy
- `/api/v1/channels/:slug` and `/api/v1/ingest` now proxy the reverse-engineered
  `kick.com/api/v2/channels/:slug` endpoint via `fetchKickChannel()`.
- Returns real live-stream data when live: signed HLS `playback_url` (as
  `streamUrl`), title, viewer count, category, thumbnail, avatar, follower count, bio.
- Transport: shells out to `curl` with a browser profile (`User-Agent`,
  `x-app-platform: web`, `Referer: https://kick.com`). Node's `fetch()` is blocked
  by Cloudflare TLS fingerprinting (403), so `curl` is required.
- Responses carry `source: 'kick' | 'mock'`. Falls back to seeded mock data when the
  upstream call fails. Real offline channels return `isLive: false` with no `streamUrl`.
- Results cached in memory for ~30s.

### `src/components/StreamPlayerModal.tsx` — unified player + accurate seek
- Single `<video>` element with hls.js (`liveDurationInfinity: true`,
  `liveSyncDurationCount: 3`, DVR back-buffer); native HLS on Safari; plain `<video>` for `.mp4`.
- Seek bar now reads real media state (`video.currentTime`, `video.seekable.start/end`)
  via `timeupdate`/`progress`/`durationchange`. Removed the fake 1s timer and the
  hardcoded 480s start position.
- DVR window mapping: bar spans `[liveEdge − window, liveEdge]` per the
  `10m`/`30m`/`1h`/`3h`/`6h` selector; scrubbing sets `video.currentTime`.
- Quick seeks (±30s/±10s), hover time tooltip, draggable scrub handle.
- LIVE/DVR badge derived from proximity to the live edge; "Jump to Live" seeks to
  `hls.liveSyncPosition` (or the seekable edge).
- Quality selector wired to real hls.js ABR levels (Auto + detected renditions).
- Autoplay-safe: starts muted with a "tap to unmute" pill.
- Kick iframe was kept only as a labeled external fallback for non-media URLs (no fake
  seek bar over it); real offline channels show an "Offline" state. (The iframe
  fallback was removed entirely in the CORS-fix pass below.)
- Removed the multi-mode switcher and the embed→direct forced switch.

### `src/App.tsx` — ingest resolves real streams
- Typing a `kick.com/<handle>` URL in search now calls `/api/v1/ingest` (instant
  client-side fallback first, then the real stream with its HLS `streamUrl` swaps in).

## YouTube-Style Player & CORS Fix

### `server.ts` — curl-free HLS relay
- Added `GET /api/v1/hls/proxy.m3u8?url=<encoded>`.
- Root cause of playback failure: Kick's playback CDN (`*.live-video.net`,
  CloudFront) serves manifest + segments with `Access-Control-Allow-Origin`
  restricted to kick.com origins, so the browser blocked `localhost:3000`.
- Node's native `fetch()` (undici) is NOT blocked by that CDN (only the kick.com
  API does Cloudflare TLS fingerprinting), so the relay uses `fetch` — no `curl`.
- Playlist responses (`application/vnd.apple.mpegurl`) are read, every child URI
  (`URI="..."` attrs in EXT-X-MEDIA/MAP/KEY + bare URL lines) is rewritten to
  `/api/v1/hls/proxy.m3u8?url=<encoded>`, cached ~2.5s, served with `ACAO: *`.
- Binary responses (TS segments, keys, init segments) stream through unchanged via
  `Readable.fromWeb(upstream.body).pipe(res)` — no buffering.
- Verified: master → 5 rewritten variants → 14 rewritten segments → 1.8 MB TS
  segment streams with correct sync bytes.

### `src/components/StreamPlayerModal.tsx` — load via relay
- Added `hlsLoadUrl`: any `.m3u8`/`.mp4` media URL is loaded as
  `/api/v1/hls/proxy.m3u8?url=<encoded>` (suffix keeps `mediaMode` detection intact).
- `hls.loadSource()`, Safari native `video.src`, and mp4 `video.src` now use it.
- Removed the Kick iframe fallback entirely — every stream plays through the unified
  hls.js player, so seeking always works.
- Auto-resolves `player.kick.com/<slug>` mock-card URLs to the real HLS URL via
  `/api/v1/channels/:slug` when the player opens ("Connecting to live stream…").
- YouTube-style polish: white buffered indicator on the seek bar, controls auto-hide
  after 3s idle, `Space`/`←`/`→`/`M`/`F` shortcuts (ignored while typing in chat),
  click-video toggles play/pause.

## Verification
- `npx tsc --noEmit` clean.
- `npm run dev` serves on `http://localhost:3000`.
- Ingesting a live channel (e.g. `kick.com/destiny`) returns `source: kick` with a real
  `.m3u8` playback URL that is fetchable cross-origin (HTTP 200, `application/vnd.apple.mpegurl`).
- HLS relay verified end-to-end: rewritten master + variant playlists and streamed
  binary segments, all same-origin (no CORS errors in the browser).
