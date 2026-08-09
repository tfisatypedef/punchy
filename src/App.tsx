import React, { useState, useMemo, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { HomeScreen } from './components/HomeScreen';
import { BrowseScreen } from './components/BrowseScreen';
import { FollowingScreen } from './components/FollowingScreen';
import { StreamPlayerModal } from './components/StreamPlayerModal';
import { LiveCard } from './components/LiveCard';
import { INITIAL_STREAMS, INITIAL_CATEGORIES } from './data/mockData';
import { KickStream, TabType } from './types';
import { Home, Grid, Heart, Play, Sparkles } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStream, setSelectedStream] = useState<KickStream | null>(null);
  const [followedStreamIds, setFollowedStreamIds] = useState<Set<string>>(
    new Set(['adrienbroner', '1', '2', '5'])
  );
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Direct kick.com URL entered into search resolves to a real stream via the server
  // (server proxies Kick's v2 channel endpoint and returns a real HLS playback URL).
  const [ingestedStream, setIngestedStream] = useState<KickStream | null>(null);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query.includes('kick.com/') && !query.startsWith('http')) {
      setIngestedStream(null);
      return;
    }

    const cleanHandle = query
      .replace(/^https?:\/\//i, '')
      .replace(/^kick\.com\//i, '')
      .replace(/^player\.kick\.com\//i, '')
      .split('/')[0]
      .split('?')[0];
    if (!cleanHandle) {
      setIngestedStream(null);
      return;
    }

    // Instant client-side fallback so the UI responds immediately
    const existing = INITIAL_STREAMS.find(
      (s) =>
        s.streamer.toLowerCase() === cleanHandle.toLowerCase() ||
        s.id === cleanHandle.toLowerCase()
    );

    const fallback: KickStream =
      existing ??
      ({
        id: cleanHandle.toLowerCase(),
        title: `${cleanHandle} Live Stream Ingest`,
        streamer: cleanHandle,
        avatarUrl:
          'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=150&q=80',
        category: 'Just Chatting',
        viewers: 24500,
        accent: '#53fc18',
        isLive: true,
        thumbnailUrl:
          'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=800&q=80',
        tags: ['Live Ingest', 'Kick Proxy'],
        streamUrl: `https://player.kick.com/${cleanHandle}`,
        bio: `Ingested Kick Stream channel for ${cleanHandle}`,
        followersCount: 150000,
        startedAt: 'Just now',
      } as KickStream);
    setIngestedStream(fallback);

    let cancelled = false;
    fetch('/api/v1/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: query }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (!cancelled && res?.data) setIngestedStream(res.data);
      })
      .catch(() => {
        /* keep the client-side fallback */
      });

    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  // Search filter across streams
  const searchFilteredStreams = useMemo(() => {
    if (!searchQuery.trim()) return INITIAL_STREAMS;
    const q = searchQuery.toLowerCase();
    return INITIAL_STREAMS.filter(
      (s) =>
        s.streamer.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const handleToggleFollow = (streamId: string) => {
    setFollowedStreamIds((prev) => {
      const next = new Set(prev);
      if (next.has(streamId)) next.delete(streamId);
      else next.add(streamId);
      return next;
    });
  };

  const handleSelectCategory = (catName: string) => {
    setCategoryFilter(catName);
    setCurrentTab('browse');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e14] text-[#e1e7ef]">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'browse') setCategoryFilter(null);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          streams={INITIAL_STREAMS}
          categories={INITIAL_CATEGORIES}
          followedIds={followedStreamIds}
          onSelectStream={setSelectedStream}
          onSelectCategory={handleSelectCategory}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          {searchQuery ? (
            /* Search Results & Direct Kick Ingest View */
            <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  Search & Ingest Results for "{searchQuery}"
                </h2>
                <span className="text-xs text-[#53fc18] font-mono bg-[#53fc18]/10 px-2.5 py-1 rounded border border-[#53fc18]/20">
                  Kick Live Ingest Ready
                </span>
              </div>

              {/* Direct Kick URL Ingest Banner */}
              {ingestedStream && (
                <div className="bg-[#161c2a] border-2 border-[#53fc18] rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_24px_rgba(83,252,24,0.25)]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#53fc18] flex items-center justify-center text-[#0b0e14] font-black text-xl">
                      🥊
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-[#53fc18] text-[#0b0e14] text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                          Detected Channel Ingest
                        </span>
                        <h3 className="text-lg font-extrabold text-white">
                          kick.com/{ingestedStream.streamer}
                        </h3>
                      </div>
                      <p className="text-xs text-[#94a3b8] mt-1">
                        {ingestedStream.title}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedStream(ingestedStream)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#53fc18] hover:bg-[#45d413] text-[#0b0e14] font-extrabold px-6 py-3 rounded-xl shadow-[0_0_16px_rgba(83,252,24,0.4)] transition-all cursor-pointer shrink-0"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Launch Kick Live Stream Video</span>
                  </button>
                </div>
              )}

              {searchFilteredStreams.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                  {searchFilteredStreams.map((s) => (
                    <LiveCard
                      key={s.id}
                      stream={s}
                      onSelect={setSelectedStream}
                    />
                  ))}
                </div>
              ) : !ingestedStream ? (
                <p className="text-[#64748b]">No channels or streams matched your search query.</p>
              ) : null}
            </div>
          ) : currentTab === 'home' ? (
            <HomeScreen
              streams={INITIAL_STREAMS}
              categories={INITIAL_CATEGORIES}
              onSelectStream={setSelectedStream}
              onSelectCategory={handleSelectCategory}
              onNavigateBrowse={() => setCurrentTab('browse')}
            />
          ) : currentTab === 'browse' ? (
            <BrowseScreen
              streams={INITIAL_STREAMS}
              categories={INITIAL_CATEGORIES}
              onSelectStream={setSelectedStream}
              selectedCategoryFilter={categoryFilter}
              onSelectCategoryFilter={setCategoryFilter}
            />
          ) : (
            <FollowingScreen
              streams={INITIAL_STREAMS}
              followedIds={followedStreamIds}
              onSelectStream={setSelectedStream}
              onToggleFollow={handleToggleFollow}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden sticky bottom-0 z-30 bg-[#0b0e14]/95 backdrop-blur-md border-t border-[#1e2638] flex items-center justify-around p-2">
        <button
          onClick={() => {
            setCurrentTab('home');
            setCategoryFilter(null);
          }}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            currentTab === 'home' ? 'text-[#53fc18]' : 'text-[#94a3b8]'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setCurrentTab('browse')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            currentTab === 'browse' ? 'text-[#53fc18]' : 'text-[#94a3b8]'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span>Browse</span>
        </button>

        <button
          onClick={() => setCurrentTab('following')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            currentTab === 'following' ? 'text-[#53fc18]' : 'text-[#94a3b8]'
          }`}
        >
          <Heart className="w-5 h-5" />
          <span>Following</span>
        </button>
      </div>

      {/* Interactive Stream Player Modal */}
      {selectedStream && (
        <StreamPlayerModal
          stream={selectedStream}
          onClose={() => setSelectedStream(null)}
          isFollowed={followedStreamIds.has(selectedStream.id)}
          onToggleFollow={handleToggleFollow}
        />
      )}
    </div>
  );
}

export default App;
