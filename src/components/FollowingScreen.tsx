import React from 'react';
import { Heart, Radio, Eye, UserX } from 'lucide-react';
import { KickStream } from '../types';

interface FollowingScreenProps {
  streams: KickStream[];
  followedIds: Set<string>;
  onSelectStream: (stream: KickStream) => void;
  onToggleFollow: (streamId: string) => void;
}

const formatViewers = (count: number) =>
  count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString();

export const FollowingScreen: React.FC<FollowingScreenProps> = ({
  streams,
  followedIds,
  onSelectStream,
  onToggleFollow,
}) => {
  const followed = streams.filter((s) => followedIds.has(s.id));
  const liveFollowed = followed.filter((s) => s.isLive);
  const offlineFollowed = followed.filter((s) => !s.isLive);

  if (followed.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[60vh]">
        <span className="w-20 h-20 rounded-full bg-[#161c2a] border border-[#1e2638] flex items-center justify-center">
          <Heart className="w-10 h-10 text-[#94a3b8]" />
        </span>
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-white">No channels followed yet</h2>
          <p className="text-sm text-[#94a3b8]">
            Follow channels to see their live status here. Try browsing top streams to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#ec4899] fill-current" />
            Following
          </h2>
          <p className="text-sm text-[#94a3b8] mt-1">
            {liveFollowed.length} live · {followed.length} total followed
          </p>
        </div>
      </div>

      {/* Live Channels */}
      <section className="space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#53fc18] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#e11d48] animate-pulse" />
          Live Now
        </h3>
        {liveFollowed.length === 0 ? (
          <p className="text-sm text-[#64748b]">None of your followed channels are live right now.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveFollowed.map((stream) => (
              <div
                key={stream.id}
                className="flex items-center gap-4 p-3 rounded-2xl bg-[#161c2a] border border-[#1e2638] hover:border-[#53fc18]/40 transition-all cursor-pointer group"
                onClick={() => onSelectStream(stream)}
              >
                <div className="relative shrink-0">
                  <img
                    src={stream.thumbnailUrl}
                    alt={stream.title}
                    className="w-28 h-20 rounded-xl object-cover"
                  />
                  <span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-[#e11d48] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                    <Radio className="w-2.5 h-2.5 animate-pulse" />
                    LIVE
                  </span>
                  <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    <Eye className="w-3 h-3 text-[#53fc18]" />
                    {formatViewers(stream.viewers)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <img
                      src={stream.avatarUrl}
                      alt={stream.streamer}
                      className="w-7 h-7 rounded-full object-cover border border-[#53fc18]"
                    />
                    <span className="text-sm font-extrabold text-white truncate">
                      {stream.streamer}
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] truncate mt-1.5">{stream.title}</p>
                  <p className="text-xs text-[#53fc18] font-bold mt-0.5">{stream.category}</p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFollow(stream.id);
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold bg-[#1e2638] text-white hover:bg-[#28334b] border border-[#3b4764] transition-all cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 fill-current text-[#ec4899]" />
                  Unfollow
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Offline Channels */}
      <section className="space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#64748b] flex items-center gap-2">
          <UserX className="w-4 h-4" />
          Offline
        </h3>
        {offlineFollowed.length === 0 ? (
          <p className="text-sm text-[#64748b]">No offline channels.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {offlineFollowed.map((stream) => (
              <div
                key={stream.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#161c2a]/60 border border-[#1e2638] opacity-80"
              >
                <img
                  src={stream.avatarUrl}
                  alt={stream.streamer}
                  className="w-10 h-10 rounded-full object-cover grayscale"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#e1e7ef] truncate">{stream.streamer}</p>
                  <p className="text-[11px] text-[#64748b]">{stream.category}</p>
                </div>
                <button
                  onClick={() => onToggleFollow(stream.id)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#1e2638] text-[#94a3b8] hover:bg-[#28334b] hover:text-white transition-all cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5" />
                  Unfollow
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
