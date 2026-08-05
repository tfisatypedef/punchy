import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { INITIAL_CATEGORIES as CATEGORIES, INITIAL_STREAMS as STREAMS } from './src/data/mockData';

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

  app.get('/api/v1/channels/:slug', (req, res) => {
    const slug = req.params.slug.toLowerCase();
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

    res.json({ data: stream });
  });

  app.post('/api/v1/ingest', (req, res) => {
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

    const stream = STREAMS.find(
      (s) => s.streamer.toLowerCase() === cleanHandle.toLowerCase() || s.id === cleanHandle.toLowerCase()
    ) || {
      id: cleanHandle.toLowerCase(),
      title: `${cleanHandle} Live Stream Ingest`,
      streamer: cleanHandle,
      avatarUrl: 'https://images.unsplash.com/photo-[#53fc18]?auto=format&fit=crop&w=150&q=80',
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

    res.json({ success: true, handle: cleanHandle, data: stream });
  });

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
