import React from 'react';
import { ArrowRight, Compass, Flame, Gamepad2, TrendingUp } from 'lucide-react';
import { KickStream, KickCategory } from '../types';
import { FeaturedHero } from './FeaturedHero';
import { LiveCard } from './LiveCard';

interface HomeScreenProps {
  streams: KickStream[];
  categories: KickCategory[];
  onSelectStream: (stream: KickStream) => void;
  onSelectCategory: (catName: string) => void;
  onNavigateBrowse: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  streams,
  categories,
  onSelectStream,
  onSelectCategory,
  onNavigateBrowse,
}) => {
  const liveStreams = streams.filter((s) => s.isLive);
  const topStreams = [...liveStreams].sort((a, b) => b.viewers - a.viewers);
  const topCategories = [...categories].sort((a, b) => b.viewers - a.viewers).slice(0, 8);

  const formatCount = (count: number) =>
    count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString();

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-8">
      {/* Featured Hero Carousel */}
      <FeaturedHero streams={topStreams} onWatch={onSelectStream} />

      {/* Quick Stats Row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 bg-[#161c2a] border border-[#1e2638] px-3 py-1.5 rounded-full text-xs font-bold text-[#94a3b8]">
          <Flame className="w-4 h-4 text-[#e11d48]" />
          <span className="text-white">{liveStreams.length}</span> live now
        </div>
        <div className="flex items-center gap-2 bg-[#161c2a] border border-[#1e2638] px-3 py-1.5 rounded-full text-xs font-bold text-[#94a3b8]">
          <TrendingUp className="w-4 h-4 text-[#53fc18]" />
          <span className="text-white">
            {formatCount(liveStreams.reduce((sum, s) => sum + s.viewers, 0))}
          </span> total viewers
        </div>
      </div>

      {/* Category Pills */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#53fc18]" />
            <h2 className="text-lg md:text-xl font-extrabold text-white">Browse Categories</h2>
          </div>
          <button
            onClick={onNavigateBrowse}
            className="flex items-center gap-1 text-sm font-bold text-[#53fc18] hover:text-[#45d413] transition-colors cursor-pointer"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {topCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.name)}
              className="group text-left rounded-xl p-3 border border-[#1e2638] bg-[#161c2a] hover:border-[#53fc18]/50 hover:bg-[#1e2638] transition-all cursor-pointer space-y-2"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
              >
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white truncate group-hover:text-[#53fc18] transition-colors">
                  {cat.name}
                </p>
                <p className="text-[11px] font-semibold text-[#94a3b8]">
                  {formatCount(cat.viewers)} viewers
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Top Live Streams */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#53fc18]" />
            <h2 className="text-lg md:text-xl font-extrabold text-white">Top Live Channels</h2>
          </div>
          <button
            onClick={onNavigateBrowse}
            className="flex items-center gap-1 text-sm font-bold text-[#53fc18] hover:text-[#45d413] transition-colors cursor-pointer"
          >
            Browse all streams
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {topStreams.slice(0, 10).map((stream) => (
            <LiveCard key={stream.id} stream={stream} onSelect={onSelectStream} />
          ))}
        </div>
      </section>
    </div>
  );
};
