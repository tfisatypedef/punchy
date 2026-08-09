import React from 'react';
import { Eye, Play, Radio } from 'lucide-react';
import { KickStream } from '../types';

interface LiveCardProps {
  stream: KickStream;
  onSelect: (stream: KickStream) => void;
}

const formatViewers = (count: number) =>
  count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString();

export const LiveCard: React.FC<LiveCardProps> = ({ stream, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(stream)}
      className="group text-left w-full rounded-2xl overflow-hidden bg-[#161c2a] border border-[#1e2638] hover:border-[#53fc18]/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(83,252,24,0.12)] cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-black">
        <img
          src={stream.thumbnailUrl}
          alt={stream.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Live Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-[#e11d48] text-white text-[10px] font-extrabold px-2 py-0.5 rounded tracking-wider">
          <Radio className="w-3 h-3 animate-pulse" />
          LIVE
        </div>

        {/* Viewer Count */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-md text-white text-xs font-bold px-2 py-0.5 rounded">
          <Eye className="w-3.5 h-3.5 text-[#53fc18]" />
          {formatViewers(stream.viewers)}
        </div>

        {/* Streamer + Started At */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={stream.avatarUrl}
              alt={stream.streamer}
              className="w-7 h-7 rounded-full object-cover border-2 border-[#53fc18] shrink-0"
            />
            <span className="text-white text-sm font-bold truncate drop-shadow">
              {stream.streamer}
            </span>
          </div>
          {stream.startedAt && (
            <span className="text-[10px] font-semibold text-[#cbd5e1] bg-black/60 backdrop-blur-md px-2 py-0.5 rounded shrink-0">
              {stream.startedAt}
            </span>
          )}
        </div>

        {/* Hover Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="w-14 h-14 rounded-full bg-[#53fc18] text-[#0b0e14] flex items-center justify-center shadow-[0_0_30px_rgba(83,252,24,0.6)] group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-current ml-1" />
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <h3 className="text-sm font-bold text-[#e1e7ef] leading-snug line-clamp-2 group-hover:text-white transition-colors">
          {stream.title}
        </h3>

        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-bold truncate"
            style={{ color: stream.accent }}
          >
            {stream.category}
          </span>
        </div>

        {stream.tags && stream.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {stream.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] font-semibold text-[#a0aec0] bg-[#0b0e14] px-2 py-0.5 rounded-full border border-[#232b3e]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};
