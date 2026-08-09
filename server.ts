import express from 'express';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Readable } from 'stream';
import { createServer as createViteServer } from 'vite';
import { INITIAL_CATEGORIES as CATEGORIES, INITIAL_STREAMS as STREAMS } from './src/data/mockData';
import { KickStream } from './src/types';

const execFileAsync = promisify(execFile);

// ---- Real Kick channel proxy (reverse-engineered v2 endpoint) ----
// GET https://kick.com/api/v2/channels/:slug returns a signed HLS playback_url
// when the channel is live. Cached briefly so repeated loads don't hammer Kick.
const KICK_CHANNEL_CACHE = new Map<string, { data: KickStream; expires: number }>();
const KICK_CACHE_TTL_MS = 30_000;

const KICK_BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'x-app-platform': 'web',
  Referer: 'https://kick.com',
  Accept: 'application/json, text/plain, */*',
};

const AVATAR_FALLBACK =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
const THUMB_FALLBACK =
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80';

// Kick blocks Node's fetch() via Cloudflare TLS fingerprinting but allows curl,
// so we shell out to curl with a realistic browser profile (same trick as the
// original Dart server's CurlFetcher).
async function fetchKickChannel(slug: string): Promise<KickStream | null> {
  const cached = KICK_CHANNEL_CACHE.get(slug);
  if (cached && cached.expires > Date.now()) return cached.data;
  if (cached) KICK_CHANNEL_CACHE.delete(slug);

  try {
    const { stdout } = await execFileAsync('curl', [
      '-sS',
      '-m',
      '10',
      '-A',
      KICK_BROWSER_HEADERS['User-Agent'],
      '-H',
      'x-app-platform: web',
      '-H',
      'Referer: https://kick.com',
      '-H',
      'Accept: application/json, text/plain, */*',
      '--compressed',
      `https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`,
    ]);
    const raw = JSON.parse(stdout);
    if (!raw || typeof raw !== 'object' || !raw.slug) return null;

    const ls = raw.livestream ?? {};
    const isLive = ls.is_live === true;
    const category = Array.isArray(ls.categories) ? ls.categories[0]?.name : undefined;
    const tags = Array.isArray(ls.tags)
      ? ls.tags.map((t: any) => (typeof t === 'string' ? t : t?.name)).filter(Boolean)
      : [];

    const stream: KickStream = {
      id: String(raw.slug ?? slug).toLowerCase(),
      streamer: raw.slug ?? slug,
      title: ls.session_title ?? `${raw.slug ?? slug} Live Stream`,
      avatarUrl: raw.user?.profile_pic ?? raw.user?.image ?? AVATAR_FALLBACK,
      category: category ?? 'Just Chatting',
      viewers: Number(ls.viewer_count) || 0,
      thumbnailUrl: ls.thumbnail?.url ?? raw.banner_image?.url ?? THUMB_FALLBACK,
      accent: '#53fc18',
      isLive,
      tags,
      streamUrl: isLive && raw.playback_url ? raw.playback_url : undefined,
      bio: raw.user?.bio ?? undefined,
      followersCount: Number(raw.followers_count) || undefined,
      startedAt: ls.start_time
        ? new Date(String(ls.start_time).replace(' ', 'T') + 'Z').toLocaleString()
        : 'Live now',
    };

    KICK_CHANNEL_CACHE.set(slug, { data: stream, expires: Date.now() + KICK_CACHE_TTL_MS });
    return stream;
  } catch (err) {
    console.error(`[Punch] Kick fetch failed for "${slug}":`, (err as Error).message);
    return null;
  }
}

// ---- HLS relay (curl-free) ----
// Kick's playback CDN (live-video.net / CloudFront) locks CORS to kick.com
// origins, so the browser cannot read the manifest or segments directly.
// Node's native fetch() has no CORS restrictions and the CDN does not do the
// TLS fingerprinting that blocks the kick.com API, so we relay everything
// through this same-origin endpoint: rewrite playlist child URIs, stream
// binary segments through untouched.
const HLS_HEADERS = {
  'User-Agent': KICK_BROWSER_HEADERS['User-Agent'],
  Referer: 'https://kick.com',
  Accept: '*/*',
};
const HLS_PLAYLIST_CACHE = new Map<string, { body: string; baseUrl: string; expires: number }>();
const HLS_PLAYLIST_TTL_MS = 2_500;

function proxyPlaylistUrl(absUrl: string): string {
  return `/api/v1/hls/proxy.m3u8?url=${encodeURIComponent(absUrl)}`;
}

function rewritePlaylist(body: string, baseUrl: string): string {
  return body
    .split('\n')
    .map((line) => {
      // Rewrite URI="..." attributes (EXT-X-MEDIA, EXT-X-MAP, EXT-X-KEY)
      const attrMatch = /URI="([^"]+)"/.exec(line);
      if (attrMatch) {
        const abs = new URL(attrMatch[1], baseUrl).toString();
        return line.replace(attrMatch[1], proxyPlaylistUrl(abs));
      }
      // Rewrite bare URI lines (variant playlists and segments)
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        return proxyPlaylistUrl(new URL(trimmed, baseUrl).toString());
      }
      return line;
    })
    .join('\n');
}

async function handleHlsProxy(req: express.Request, res: express.Response) {
  const target = req.query.url;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  try {
    const upstream = await fetch(target, { headers: HLS_HEADERS });
    if (!upstream.ok || !upstream.body) {
      return res.status(upstream.status || 502).json({ error: `Upstream ${upstream.status}` });
    }

    const contentType = upstream.headers.get('content-type') || '';
    const isPlaylist =
      contentType.includes('mpegurl') || contentType.includes('application/vnd.apple');

    if (isPlaylist) {
      // Playlists are small text — read, rewrite child URIs, cache briefly.
      const cached = HLS_PLAYLIST_CACHE.get(target);
      if (cached && cached.expires > Date.now()) {
        res.type('application/vnd.apple.mpegurl').send(cached.body);
        return;
      }
      const text = await upstream.text();
      const rewritten = rewritePlaylist(text, target);
      HLS_PLAYLIST_CACHE.set(target, {
        body: rewritten,
        baseUrl: target,
        expires: Date.now() + HLS_PLAYLIST_TTL_MS,
      });
      res.type('application/vnd.apple.mpegurl').send(rewritten);
      return;
    }

    // Binary (TS segment, encryption key, init segment): stream through.
    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.type(ct);
    Readable.fromWeb(upstream.body as any).pipe(res);
  } catch (err) {
    console.error('[Punch] HLS relay failed:', (err as Error).message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'HLS relay failed' });
    } else {
      res.end();
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API Routes
  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', service: 'punch-server', uptime: process.uptime() });
  });

  app.get('/api/v1/categories', (req, res) => {
    res.json({ data: CATEGORIES, total: CATEGORIES.length });
  });

  app.get('/api/v1/livestreams', (req, res) => {
    const { category, query, sort } = req.query;
    let list = [...STREAMS];

    if (category) {
      list = list.filter(
        (s) => s.category.toLowerCase() === (category as string).toLowerCase()
      );
    }

    if (query) {
      const q = (query as string).toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.streamer.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
      );
    }

    if (sort === 'viewers_asc') {
      list.sort((a, b) => a.viewers - b.viewers);
    } else {
      list.sort((a, b) => b.viewers - a.viewers);
    }

    res.json({ data: list, total: list.length });
  });

  app.get('/api/v1/channels/:slug', async (req, res) => {
    const slug = req.params.slug.toLowerCase();
    const real = await fetchKickChannel(slug);
    if (real) return res.json({ data: real, source: 'kick' });

    let stream = STREAMS.find(
      (s) => s.streamer.toLowerCase() === slug || s.id === slug
    );

    if (!stream) {
      stream = {
        id: slug,
        title: `${slug} Live Stream Ingest`,
        streamer: slug,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        category: 'Just Chatting',
        viewers: 12400,
        accent: '#53fc18',
        isLive: true,
        thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
        tags: ['Live Ingest', 'Kick Proxy'],
        streamUrl: `https://player.kick.com/${slug}`,
        bio: `Ingested Kick Live Stream Channel for ${slug}`,
        followersCount: 50000,
        startedAt: 'Just now'
      };
    }

    res.json({ data: stream, source: 'mock' });
  });

  app.post('/api/v1/ingest', async (req, res) => {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'URL parameter required' });
    }
    const cleanHandle = url
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^kick\.com\//i, '')
      .replace(/^player\.kick\.com\//i, '')
      .split('/')[0]
      .split('?')[0];

    const real = await fetchKickChannel(cleanHandle);
    if (real) {
      return res.json({ success: true, handle: cleanHandle, source: 'kick', data: real });
    }

    const stream = STREAMS.find(
      (s) => s.streamer.toLowerCase() === cleanHandle.toLowerCase() || s.id === cleanHandle.toLowerCase()
    ) || {
      id: cleanHandle.toLowerCase(),
      title: `${cleanHandle} Live Stream Ingest`,
      streamer: cleanHandle,
      avatarUrl: AVATAR_FALLBACK,
      category: 'Just Chatting',
      viewers: 18500,
      accent: '#53fc18',
      isLive: true,
      thumbnailUrl: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=800&q=80',
      tags: ['Live Ingest', 'Kick Feed'],
      streamUrl: `https://player.kick.com/${cleanHandle}`,
      bio: `Ingested Kick Live Stream for ${cleanHandle}`,
      followersCount: 150000,
      startedAt: 'Just now'
    };

    res.json({ success: true, handle: cleanHandle, source: 'mock', data: stream });
  });

  // HLS relay: same-origin proxy for Kick's CORS-locked playback CDN
  app.get('/api/v1/hls/proxy.m3u8', handleHlsProxy);

  // Vite or static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Punch] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Punch] Server startup error:', err);
  process.exit(1);
});
