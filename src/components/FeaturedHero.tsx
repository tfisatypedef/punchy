import React, { useEffect, useState } from 'react';
import { Play, ChevronLeft, ChevronRight, Radio, Eye } from 'lucide-react';
import { KickStream } from '../types';

interface FeaturedHeroProps {
  streams: KickStream[];
  onWatch: (stream: KickStream) => void;
}

const formatViewers = (count: number) =>
  count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString();

export const FeaturedHero: React.FC<FeaturedHeroProps> = ({ streams, onWatch }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const featured = streams.filter((s) => s.isLive);

  useEffect(() => {
    if (featured.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featured.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [featured.length]);

  if (featured.length === 0) return null;

  const stream = featured[activeIndex % featured.length];

  return (
    <section
      className="relative rounded-3xl overflow-hidden border border-[#1e2638] group"
      style={{ background: `linear-gradient(135deg, ${stream.accent}22 0%, #0b0e14 55%)` }}
    >
      {/* Dynamic Backdrop */}
      <div className="absolute inset-0">
        <img
          src={stream.thumbnailUrl}
          alt=""
          className="w-full h-full object-cover opacity-30 blur-[2px] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e14] via-[#0b0e14]/80 to-[#0b0e14]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] to-transparent" />
      </div>

      {/* Content */}
      <div className="relative p-6 md:p-10 lg:p-14 flex flex-col gap-5 min-h-[280px] md:min-h-[340px] lg:min-h-[400px]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 bg-[#e11d48] text-white text-[10px] font-extrabold px-2.5 py-1 rounded tracking-wider uppercase shadow-[0_0_16px_rgba(225,29,72,0.5)]">
            <Radio className="w-3 h-3 animate-pulse" />
            Featured Live
          </span>
          <span className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded border border-white/10">
            <Eye className="w-3.5 h-3.5 text-[#53fc18]" />
            {formatViewers(stream.viewers)} watching
          </span>
        </div>

        <div className="flex items-center gap-3 max-w-2xl">
          <img
            src={stream.avatarUrl}
            alt={stream.streamer}
            className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-[#53fc18] shadow-[0_0_20px_rgba(83,252,24,0.35)] shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-white leading-tight truncate">
              {stream.streamer}
            </h2>
            <p className="text-sm md:text-base text-[#cbd5e1] font-semibold truncate">
              {stream.category}
            </p>
          </div>
        </div>

        <h1 className="text-lg md:text-2xl font-bold text-[#e1e7ef] max-w-2xl line-clamp-2">
          {stream.title}
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          {stream.tags.slice(0, 4).map((tag, idx) => (
            <span
              key={idx}
              className="text-xs font-semibold text-[#a0aec0] bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#232b3e]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-auto">
          <button
            onClick={() => onWatch(stream)}
            className="flex items-center gap-2 bg-[#53fc18] hover:bg-[#45d413] text-[#0b0e14] font-extrabold px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(83,252,24,0.4)] transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            Watch Live
          </button>

          <button
            onClick={() => onWatch(stream)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold px-5 py-3 rounded-xl border border-white/20 transition-all cursor-pointer"
          >
            Stream Page
          </button>
        </div>
      </div>

      {/* Carousel Controls */}
      {featured.length > 1 && (
        <>
          <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
            {featured.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === activeIndex % featured.length
                    ? 'w-6 bg-[#53fc18]'
                    : 'w-3 bg-white/30 hover:bg-white/50'
                }`}
                title={`Featured ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() =>
              setActiveIndex((prev) => (prev - 1 + featured.length) % featured.length)
            }
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-[#53fc18] hover:text-[#0b0e14] text-white border border-white/10 transition-all cursor-pointer"
            title="Previous featured stream"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveIndex((prev) => (prev + 1) % featured.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-[#53fc18] hover:text-[#0b0e14] text-white border border-white/10 transition-all cursor-pointer"
            title="Next featured stream"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </section>
  );
};
