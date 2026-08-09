import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Radio, Users, Play } from 'lucide-react';
import { KickStream, KickCategory } from '../types';

interface SidebarProps {
  streams: KickStream[];
  categories: KickCategory[];
  followedIds: Set<string>;
  onSelectStream: (stream: KickStream) => void;
  onSelectCategory: (catName: string) => void;
}

const formatViewers = (count: number) =>
  count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString();

export const Sidebar: React.FC<SidebarProps> = ({
  streams,
  categories,
  followedIds,
  onSelectStream,
  onSelectCategory,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const liveStreams = streams.filter((s) => s.isLive);
  const followedChannels = liveStreams.filter((s) => followedIds.has(s.id));
  const recommended = [...liveStreams].sort((a, b) => b.viewers - a.viewers).slice(0, 5);
  const topCategories = [...categories].sort((a, b) => b.viewers - a.viewers).slice(0, 7);

  const labelClass = 'text-[11px] font-extrabold uppercase tracking-wider text-[#64748b] px-3';

  if (collapsed) {
    return (
      <aside className="hidden lg:flex w-12 shrink-0 flex-col items-center py-4 border-r border-[#1e2638] bg-[#0b0e14]">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#161c2a] transition-colors cursor-pointer"
          title="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="mt-4 flex flex-col items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#e11d48]" title="Live channels" />
          <span className="w-2 h-2 rounded-full bg-[#53fc18]" title="Followed channels" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-[#1e2638] bg-[#0b0e14] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0b0e14] flex items-center justify-between px-3 py-3 border-b border-[#1e2638]">
        <span className="text-sm font-extrabold text-white">Explore</span>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#161c2a] transition-colors cursor-pointer"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-5 py-4">
        {/* Followed Channels */}
        <section className="space-y-1">
          <p className={`${labelClass} flex items-center gap-1.5`}>
            <Heart className="w-3 h-3 text-[#ec4899]" />
            Following
          </p>
          {followedChannels.length === 0 ? (
            <p className="text-xs text-[#64748b] px-3">No followed channels live right now.</p>
          ) : (
            followedChannels.slice(0, 6).map((stream) => (
              <button
                key={stream.id}
                onClick={() => onSelectStream(stream)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#161c2a] transition-colors cursor-pointer text-left"
              >
                <span className="relative">
                  <img
                    src={stream.avatarUrl}
                    alt={stream.streamer}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#53fc18] border-2 border-[#0b0e14]" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-[#e1e7ef] truncate">
                    {stream.streamer}
                  </span>
                  <span className="block text-[11px] text-[#94a3b8] truncate">
                    {stream.category}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#53fc18] shrink-0">
                  <Users className="w-3 h-3" />
                  {formatViewers(stream.viewers)}
                </span>
              </button>
            ))
          )}
        </section>

        {/* Recommended Live Streams */}
        <section className="space-y-1">
          <p className={`${labelClass} flex items-center gap-1.5`}>
            <Radio className="w-3 h-3 text-[#e11d48]" />
            Recommended Live
          </p>
          {recommended.slice(0, 5).map((stream) => (
            <button
              key={stream.id}
              onClick={() => onSelectStream(stream)}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#161c2a] transition-colors cursor-pointer text-left"
            >
              <span className="relative shrink-0">
                <img
                  src={stream.avatarUrl}
                  alt={stream.streamer}
                  className="w-8 h-8 rounded-lg object-cover"
                />
                <span className="absolute bottom-0 right-0 flex items-center justify-center w-4 h-4 rounded-full bg-[#e11d48]">
                  <Play className="w-2.5 h-2.5 text-white fill-current" />
                </span>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-[#e1e7ef] truncate">
                  {stream.streamer}
                </span>
                <span className="block text-[11px] text-[#94a3b8] truncate">
                  {stream.title}
                </span>
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#e1e7ef] shrink-0">
                <Users className="w-3 h-3 text-[#53fc18]" />
                {formatViewers(stream.viewers)}
              </span>
            </button>
          ))}
        </section>

        {/* Top Categories */}
        <section className="space-y-1">
          <p className={labelClass}>Top Categories</p>
          {topCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.name)}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#161c2a] transition-colors cursor-pointer text-left"
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
              >
                {cat.name.charAt(0)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-[#e1e7ef] truncate">
                  {cat.name}
                </span>
              </span>
              <span className="text-[11px] font-semibold text-[#94a3b8] shrink-0">
                {formatViewers(cat.viewers)}
              </span>
            </button>
          ))}
        </section>
      </div>
    </aside>
  );
};
