import React, { useMemo, useState } from 'react';
import { Grid, Tv, SlidersHorizontal } from 'lucide-react';
import { KickStream, KickCategory, BrowseSubTab } from '../types';
import { LiveCard } from './LiveCard';

interface BrowseScreenProps {
  streams: KickStream[];
  categories: KickCategory[];
  onSelectStream: (stream: KickStream) => void;
  selectedCategoryFilter: string | null;
  onSelectCategoryFilter: (catName: string | null) => void;
}

type SortOption = 'viewers_desc' | 'viewers_asc';

const formatCount = (count: number) =>
  count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString();

export const BrowseScreen: React.FC<BrowseScreenProps> = ({
  streams,
  categories,
  onSelectStream,
  selectedCategoryFilter,
  onSelectCategoryFilter,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<BrowseSubTab>('livestreams');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('viewers_desc');

  const liveStreams = useMemo(() => streams.filter((s) => s.isLive), [streams]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    liveStreams.forEach((s) => s.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [liveStreams]);

  const filteredStreams = useMemo(() => {
    let list = liveStreams;
    if (selectedCategoryFilter) {
      list = list.filter(
        (s) => s.category.toLowerCase() === selectedCategoryFilter.toLowerCase()
      );
    }
    if (tagFilter) {
      list = list.filter((s) => s.tags.includes(tagFilter));
    }
    return [...list].sort((a, b) =>
      sort === 'viewers_asc' ? a.viewers - b.viewers : b.viewers - a.viewers
    );
  }, [liveStreams, selectedCategoryFilter, tagFilter, sort]);

  const categoriesWithCounts = useMemo(
    () =>
      categories.map((cat) => ({
        ...cat,
        liveCount: liveStreams.filter(
          (s) => s.category.toLowerCase() === cat.name.toLowerCase()
        ).length,
      })),
    [categories, liveStreams]
  );

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Sub Tab Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-[#161c2a] border border-[#1e2638] rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveSubTab('livestreams')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-extrabold transition-all cursor-pointer ${
              activeSubTab === 'livestreams'
                ? 'bg-[#53fc18] text-[#0b0e14] shadow-[0_0_12px_rgba(83,252,24,0.3)]'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" />
            Live Streams
          </button>
          <button
            onClick={() => setActiveSubTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-extrabold transition-all cursor-pointer ${
              activeSubTab === 'categories'
                ? 'bg-[#53fc18] text-[#0b0e14] shadow-[0_0_12px_rgba(83,252,24,0.3)]'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Grid className="w-4 h-4" />
            Categories
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'categories' && (
            <button
              onClick={() => {
                onSelectCategoryFilter(null);
                setTagFilter(null);
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-[#53fc18] hover:text-[#45d413] transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          )}

          {activeSubTab === 'livestreams' && (
            <label className="flex items-center gap-2 text-xs font-bold text-[#94a3b8]">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="bg-[#161c2a] border border-[#232b3e] text-white text-xs font-bold px-3 py-2 rounded-lg focus:outline-none focus:border-[#53fc18] cursor-pointer"
              >
                <option value="viewers_desc">Most viewers</option>
                <option value="viewers_asc">Least viewers</option>
              </select>
            </label>
          )}
        </div>
      </div>

      {/* Category Pill Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onSelectCategoryFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all cursor-pointer ${
            !selectedCategoryFilter
              ? 'bg-[#53fc18] text-[#0b0e14] border-[#53fc18]'
              : 'bg-[#161c2a] text-[#94a3b8] border-[#232b3e] hover:border-[#53fc18]/50 hover:text-white'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() =>
              onSelectCategoryFilter(
                selectedCategoryFilter === cat.name ? null : cat.name
              )
            }
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all cursor-pointer ${
              selectedCategoryFilter === cat.name
                ? 'bg-[#53fc18] text-[#0b0e14] border-[#53fc18]'
                : 'bg-[#161c2a] text-[#94a3b8] border-[#232b3e] hover:border-[#53fc18]/50 hover:text-white'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Body */}
      {activeSubTab === 'livestreams' ? (
        <section className="space-y-4">
          <h2 className="text-lg font-extrabold text-white">
            Live Streams{' '}
            <span className="text-[#94a3b8] text-sm font-semibold">
              ({filteredStreams.length})
            </span>
          </h2>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#64748b]">Tags:</span>
              <button
                onClick={() => setTagFilter(null)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                  !tagFilter
                    ? 'bg-[#53fc18]/15 text-[#53fc18] border-[#53fc18]/40'
                    : 'bg-[#161c2a] text-[#94a3b8] border-[#232b3e] hover:text-white'
                }`}
              >
                All
              </button>
              {allTags.slice(0, 12).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                    tagFilter === tag
                      ? 'bg-[#53fc18]/15 text-[#53fc18] border-[#53fc18]/40'
                      : 'bg-[#161c2a] text-[#94a3b8] border-[#232b3e] hover:text-white'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {filteredStreams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filteredStreams.map((stream) => (
                <LiveCard key={stream.id} stream={stream} onSelect={onSelectStream} />
              ))}
            </div>
          ) : (
            <p className="text-[#64748b]">No live streams match the selected filters.</p>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <h2 className="text-lg font-extrabold text-white">
            All Categories{' '}
            <span className="text-[#94a3b8] text-sm font-semibold">
              ({categoriesWithCounts.length})
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categoriesWithCounts.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategoryFilter(cat.name)}
                className="group text-left rounded-2xl overflow-hidden border border-[#1e2638] bg-[#161c2a] hover:border-[#53fc18]/50 transition-all cursor-pointer"
              >
                {cat.bannerUrl || cat.color ? (
                  <div
                    className="relative h-24 flex items-center justify-center overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${cat.color}33 0%, ${cat.color}11 100%)` }}
                  >
                    <span
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg"
                      style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
                    >
                      {cat.name.charAt(0)}
                    </span>
                    {cat.badge && (
                      <span className="absolute top-2 right-2 text-[10px] font-extrabold px-2 py-0.5 rounded bg-black/60 text-white">
                        {cat.badge}
                      </span>
                    )}
                  </div>
                ) : null}

                <div className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-extrabold text-white truncate group-hover:text-[#53fc18] transition-colors">
                      {cat.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold text-[#94a3b8]">
                    <span className="text-[#53fc18]">{formatCount(cat.viewers)} viewers</span>
                    <span>•</span>
                    <span>{cat.streamers} streamers</span>
                    {cat.liveCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[#e11d48]">
                          <Tv className="w-3 h-3" />
                          {cat.liveCount} live
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
