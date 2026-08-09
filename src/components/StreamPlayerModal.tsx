import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import {
  X,
  Eye,
  Heart,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Maximize,
  Radio,
  Send,
  CheckCircle2,
  MessageSquare,
  Users,
  RotateCcw,
  RotateCw,
  SkipForward,
  Loader2,
  AlertTriangle,
  Volume1,
} from 'lucide-react';
import { KickStream, ChatMessage } from '../types';
import { MOCK_CHAT_MESSAGES, SAMPLE_CHAT_POOL } from '../data/mockData';

type DvrOption = '10m' | '30m' | '1h' | '3h' | '6h';
type MediaMode = 'hls' | 'native' | 'none';

const DVR_WINDOW_SECONDS: Record<DvrOption, number> = {
  '10m': 600,
  '30m': 1800,
  '1h': 3600,
  '3h': 10800,
  '6h': 21600,
};
const LIVE_EDGE_TOLERANCE_SEC = 10;

interface StreamPlayerModalProps {
  stream: KickStream | null;
  onClose: () => void;
  isFollowed: boolean;
  onToggleFollow: (streamerId: string) => void;
}

export const StreamPlayerModal: React.FC<StreamPlayerModalProps> = ({
  stream,
  onClose,
  isFollowed,
  onToggleFollow,
}) => {
  if (!stream) return null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const isSeekingRef = useRef(false);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimerRef = useRef<number | null>(null);
  const togglePlayRef = useRef<() => void>(() => {});
  const seekRelativeRef = useRef<(n: number) => void>(() => {});

  // ---- Media source resolution ----
  // Mock cards ship `https://player.kick.com/<slug>` page URLs (not media). We
  // auto-resolve those against the server's Kick proxy so the unified hls.js
  // player always gets a real, seekable HLS playback URL.
  const [resolvedStreamUrl, setResolvedStreamUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const mediaUrl = resolvedStreamUrl || stream.streamUrl || '';
  const mediaMode: MediaMode = (() => {
    if (!mediaUrl) return 'none';
    if (/\.m3u8($|\?)/i.test(mediaUrl)) return 'hls';
    if (/\.(mp4|webm|ogg|mov)($|\?)/i.test(mediaUrl)) return 'native';
    return 'none';
  })();

  // Load through the server's HLS relay so the browser can read Kick's
  // CORS-locked playback CDN. Playlists and segments are rewritten/streamed
  // same-origin by the server, so hls.js seeking keeps working.
  const hlsLoadUrl =
    mediaMode === 'hls' || mediaMode === 'native'
      ? `/api/v1/hls/proxy.m3u8?url=${encodeURIComponent(mediaUrl)}`
      : mediaUrl;

  useEffect(() => {
    let cancelled = false;
    const raw = stream.streamUrl || '';
    const isDirectMedia = /\.(m3u8|mp4|webm|ogg|mov)($|\?)/i.test(raw);

    setResolvedStreamUrl(null);
    setResolving(!isDirectMedia);

    if (isDirectMedia || !raw) {
      setResolving(false);
      return;
    }

    const slugMatch = raw.match(/kick\.com\/([^/?#]+)/i);
    const slug = slugMatch ? slugMatch[1].toLowerCase() : stream.streamer.toLowerCase();
    if (!slug) {
      setResolving(false);
      return;
    }

    fetch(`/api/v1/channels/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        const real = res?.data;
        if (real?.isLive && real.streamUrl && /\.(m3u8|mp4|webm|ogg|mov)($|\?)/i.test(real.streamUrl)) {
          setResolvedStreamUrl(real.streamUrl);
        }
        setResolving(false);
      })
      .catch(() => {
        if (!cancelled) setResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stream.streamUrl, stream.streamer]);

  // ---- Playback state ----
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(80);
  const [buffering, setBuffering] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [levels, setLevels] = useState<{ index: number; label: string }[]>([]);
  const [qualityIndex, setQualityIndex] = useState(-1);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Auto-hide the controls overlay after a few seconds of inactivity (YouTube-style)
  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current) window.clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  useEffect(() => {
    showControlsTemporarily();
    return () => {
      if (hideControlsTimerRef.current) window.clearTimeout(hideControlsTimerRef.current);
    };
  }, [stream.id, showControlsTemporarily]);

  // YouTube-style keyboard shortcuts (Space, ←/→, M, F) — ignored while typing in chat
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayRef.current();
        showControlsTemporarily();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekRelativeRef.current(-10);
        showControlsTemporarily();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekRelativeRef.current(10);
        showControlsTemporarily();
      } else if (e.key.toLowerCase() === 'm') {
        setIsMuted((m) => !m);
        showControlsTemporarily();
      } else if (e.key.toLowerCase() === 'f') {
        const el = document.documentElement;
        if (!document.fullscreenElement) el.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Seek bar state (single source of truth = the <video> element) ----
  const [currentTime, setCurrentTime] = useState(0);
  const [seekRange, setSeekRange] = useState({ start: 0, end: 0 });
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [isLive, setIsLive] = useState(stream.isLive ?? false);
  const [dvrWindowOption, setDvrWindowOption] = useState<DvrOption>('1h');
  const [isSeeking, setIsSeeking] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const [viewerCount, setViewerCount] = useState(stream.viewers);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    MOCK_CHAT_MESSAGES[stream.id] ||
      MOCK_CHAT_MESSAGES[stream.streamer.toLowerCase()] ||
      MOCK_CHAT_MESSAGES['1']
  );
  const [inputMessage, setInputMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ---- Sync UI state from the live video element ----
  const syncState = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    setIsPlaying(!v.paused);

    const sb = v.seekable;
    let start = 0;
    let end = 0;
    if (sb.length > 0) {
      const s = sb.start(sb.length - 1);
      const e = sb.end(sb.length - 1);
      if (Number.isFinite(s) && Number.isFinite(e) && e >= s) {
        start = s;
        end = e;
      }
    }
    if (end === 0 && Number.isFinite(v.duration) && v.duration > 0) {
      end = v.duration;
    }
    setSeekRange({ start, end });

    // Buffered range (YouTube-style white buffer on the seek bar)
    let bufEnd = end;
    const bf = v.buffered;
    if (bf.length > 0) {
      const b = bf.end(bf.length - 1);
      if (Number.isFinite(b) && b > 0) bufEnd = b;
    }
    setBufferedEnd(bufEnd);

    // duration === Infinity is the hls.js/native marker for a live stream
    if (v.duration === Infinity) setIsLive(true);
    else if (Number.isFinite(v.duration)) setIsLive(false);
  }, []);

  // ---- hls.js / native media setup ----
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (mediaMode !== 'hls' && mediaMode !== 'native') return;

    setMediaError(false);
    setBuffering(true);
    setLevels([]);
    setQualityIndex(-1);

    if (mediaMode === 'hls' && Hls.isSupported()) {
      const hls = new Hls({
        liveDurationInfinity: true,
        liveSyncDurationCount: 3,
        backBufferLength: 120,
        maxBufferLength: 30,
        enableWorker: true,
        capLevelToPlayerSize: true,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (_evt, data) => {
        const lv = data.levels.map((l, i) => ({
          index: i,
          label: l.height ? `${l.height}p` : l.name ? String(l.name) : `${Math.round((l.bitrate || 0) / 1000)}k`,
        }));
        setLevels(lv);
        setBuffering(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setMediaError(true);
          }
        }
      });

      hls.loadSource(hlsLoadUrl);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (mediaMode === 'hls' && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / native HLS
      video.src = hlsLoadUrl;
      const onCanPlay = () => {
        setBuffering(false);
        video.play().catch(() => {});
      };
      video.addEventListener('canplay', onCanPlay);
      return () => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeAttribute('src');
        video.load();
      };
    } else if (mediaMode === 'native') {
      video.src = hlsLoadUrl;
      const onCanPlay = () => {
        setBuffering(false);
        video.play().catch(() => {});
      };
      video.addEventListener('canplay', onCanPlay);
      return () => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeAttribute('src');
        video.load();
      };
    } else {
      setMediaError(true);
      setBuffering(false);
    }
  }, [mediaUrl, mediaMode, reloadKey]);

  // Reset the playhead / range when the stream changes
  useEffect(() => {
    setCurrentTime(0);
    setSeekRange({ start: 0, end: 0 });
    setIsLive(stream.isLive ?? false);
  }, [stream.id]);

  // Sync volume/mute to the element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume / 100;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Simulated viewer fluctuation and incoming chat messages
  useEffect(() => {
    const viewerInterval = setInterval(() => {
      const delta = Math.floor(Math.random() * 41) - 20;
      setViewerCount((prev) => Math.max(1, prev + delta));
    }, 4000);

    const chatInterval = setInterval(() => {
      const randomMsg = SAMPLE_CHAT_POOL[Math.floor(Math.random() * SAMPLE_CHAT_POOL.length)];
      const newChat: ChatMessage = {
        id: 'msg-' + Date.now(),
        user: randomMsg.user,
        color: randomMsg.color,
        message: randomMsg.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev.slice(-40), newChat]);
    }, 3000);

    return () => {
      clearInterval(viewerInterval);
      clearInterval(chatInterval);
    };
  }, [stream.id]);

  // Auto scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ---- Derived seek bar values ----
  const dvrSeconds = DVR_WINDOW_SECONDS[dvrWindowOption];
  let displayStart = 0;
  const displayEnd = seekRange.end;
  if (isLive && seekRange.end > 0) {
    displayStart = Math.max(seekRange.start, seekRange.end - dvrSeconds);
  }
  const windowLen = displayEnd - displayStart;
  const clampedTime = Math.min(displayEnd, Math.max(displayStart, currentTime));
  const progressPct = windowLen > 0 ? ((clampedTime - displayStart) / windowLen) * 100 : 0;
  const bufferedPct =
    windowLen > 0 ? Math.max(0, Math.min(100, ((bufferedEnd - displayStart) / windowLen) * 100)) : 0;
  const secondsFromLive = isLive && seekRange.end > 0 ? seekRange.end - currentTime : 0;
  const atLiveEdge = isLive && secondsFromLive <= LIVE_EDGE_TOLERANCE_SEC;

  // ---- Actions ----
  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    let target = t;
    if (isLive) {
      target = Math.min(seekRange.end - 0.5, Math.max(displayStart, t));
    } else {
      const dur = seekRange.end || v.duration || 0;
      target = Math.max(0, Math.min(dur > 0 ? dur - 0.1 : t, t));
    }
    setCurrentTime(target);
    try {
      v.currentTime = target;
    } catch {
      /* ignore out-of-range seek */
    }
  };

  const seekRelative = (offsetSeconds: number) => seekTo(currentTime + offsetSeconds);
  seekRelativeRef.current = seekRelative;

  const jumpToLive = () => {
    const v = videoRef.current;
    const hls = hlsRef.current;
    if (!v) return;
    let target: number;
    if (hls && hls.liveSyncPosition && Number.isFinite(hls.liveSyncPosition)) {
      target = hls.liveSyncPosition;
    } else if (seekRange.end > 0) {
      target = seekRange.end - 0.5;
    } else {
      return;
    }
    setCurrentTime(target);
    try {
      v.currentTime = target;
    } catch {
      /* ignore */
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };
  togglePlayRef.current = togglePlay;

  const handleQualityChange = (idx: number) => {
    setQualityIndex(idx);
    const hls = hlsRef.current;
    if (hls) {
      hls.currentLevel = idx;
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg: ChatMessage = {
      id: 'msg-user-' + Date.now(),
      user: 'You (Viewer)',
      color: '#53fc18',
      message: inputMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSubscriber: true,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
  };

  const formatViewers = (count: number) =>
    count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString();

  const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isHlsMode = mediaMode === 'hls' || mediaMode === 'native';

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="md:hidden flex items-center justify-between p-3 bg-[#0b0e14] border-b border-[#1e2638]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#e11d48] animate-ping" />
          <span className="font-bold text-xs text-white uppercase">{stream.streamer} LIVE</span>
        </div>
        <button onClick={onClose} className="p-1 text-[#94a3b8] hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Stream Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-[#0b0e14] p-3 md:p-6 space-y-4">
        {/* Video Player Container */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-[#1e2638] shadow-2xl group">
          {mediaMode === 'none' ? (
            /* No playback URL (real channel is offline or still resolving) — show static preview */
            <img
              src={stream.thumbnailUrl}
              alt={stream.title}
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            /* Single unified video element (hls.js / native HLS / mp4) */
            <video
              ref={videoRef}
              className="w-full h-full object-contain bg-black"
              poster={stream.thumbnailUrl}
              autoPlay
              playsInline
              muted={isMuted}
              onTimeUpdate={() => {
                if (!isSeekingRef.current) syncState();
              }}
              onLoadedMetadata={syncState}
              onDurationChange={syncState}
              onSeeked={() => {
                isSeekingRef.current = false;
                setIsSeeking(false);
                syncState();
              }}
              onProgress={syncState}
              onPlay={() => {
                setIsPlaying(true);
                syncState();
              }}
              onPause={() => {
                setIsPlaying(false);
                syncState();
              }}
              onWaiting={() => setBuffering(true)}
              onPlaying={() => {
                setBuffering(false);
                syncState();
              }}
              onError={() => setMediaError(true)}
            />
          )}

          {/* Resolving state (mock card URL being proxied to a real HLS URL) */}
          {resolving && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 p-6 text-center">
              <Loader2 className="w-10 h-10 text-[#53fc18] animate-spin" />
              <p className="text-sm font-bold text-white">Connecting to live stream…</p>
              <p className="text-xs text-[#94a3b8] max-w-xs">
                Resolving the real playback URL for {stream.streamer}.
              </p>
            </div>
          )}

          {/* Offline state (real channel with no playback URL) */}
          {!resolving && mediaMode === 'none' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 p-6 text-center">
              <span className="flex items-center gap-2 bg-[#1e2638] text-[#94a3b8] text-[10px] font-extrabold px-3 py-1 rounded tracking-wider uppercase">
                <Radio className="w-3 h-3" />
                Offline
              </span>
              <p className="text-sm font-bold text-white">This channel is currently offline</p>
              <p className="text-xs text-[#94a3b8] max-w-xs">
                Live playback is available when the streamer goes live.
              </p>
            </div>
          )}

          {/* Animated Stream Visualizer Overlay (playing indicator) */}
          {isHlsMode && isPlaying && !buffering && !mediaError && (
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 pointer-events-none">
              <span className="w-1.5 h-4 bg-[#53fc18] animate-[bounce_1s_infinite_100ms]" />
              <span className="w-1.5 h-6 bg-[#53fc18] animate-[bounce_1s_infinite_300ms]" />
              <span className="w-1.5 h-3 bg-[#53fc18] animate-[bounce_1s_infinite_200ms]" />
              <span className="text-xs font-bold text-white ml-1.5">
                {isLive ? 'LIVE' : 'PLAYING'}
              </span>
            </div>
          )}

          {/* Buffering spinner */}
          {isHlsMode && buffering && !mediaError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-30">
              <Loader2 className="w-12 h-12 text-[#53fc18] animate-spin" />
            </div>
          )}

          {/* Media error overlay */}
          {isHlsMode && mediaError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center z-30">
              <AlertTriangle className="w-10 h-10 text-[#e11d48]" />
              <p className="text-sm font-bold text-white">Stream unavailable right now</p>
              <p className="text-xs text-[#94a3b8] max-w-xs">
                The stream could not be loaded. The channel may be offline or blocked.
              </p>
              <button
                onClick={() => {
                  setMediaError(false);
                  setReloadKey((k) => k + 1);
                }}
                className="mt-1 flex items-center gap-2 bg-[#53fc18] hover:bg-[#45d413] text-[#0b0e14] font-extrabold text-sm px-5 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Retry
              </button>
            </div>
          )}

          {/* Unmute affordance (autoplay policy forces muted start) */}
          {isHlsMode && isMuted && !mediaError && !buffering && (
            <button
              onClick={() => setIsMuted(false)}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur-md hover:bg-[#161c2a] text-white text-xs font-bold px-4 py-2 rounded-full border border-white/20 transition-all cursor-pointer z-20"
            >
              <Volume1 className="w-4 h-4 text-[#53fc18]" />
              Sound off — tap to unmute
            </button>
          )}

          {/* Custom Controls Overlay (only when we control the media) */}
          {isHlsMode && (
            <div
              className={`absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/40 transition-opacity duration-300 p-4 flex flex-col justify-between z-10 ${
                controlsVisible || !isPlaying || isSeeking ? 'opacity-100' : 'opacity-0'
              }`}
              onMouseMove={showControlsTemporarily}
              onMouseEnter={showControlsTemporarily}
              onClick={(e) => {
                const t = e.target as HTMLElement;
                if (t.closest('button, input, select, label')) return;
                togglePlay();
                showControlsTemporarily();
              }}
            >
              {/* Top Bar inside player */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1 text-white text-[10px] font-extrabold px-2 py-0.5 rounded tracking-wider ${
                      isLive && atLiveEdge ? 'bg-[#e11d48]' : 'bg-[#161c2a] border border-[#232b3e]'
                    }`}
                  >
                    <Radio className="w-3 h-3 animate-pulse" />
                    {isLive && atLiveEdge ? 'LIVE' : isLive ? 'DVR' : 'PLAYING'}
                  </span>
                  <span className="bg-black/70 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1.5 border border-white/10">
                    <Eye className="w-3.5 h-3.5 text-[#53fc18]" />
                    {formatViewers(viewerCount)}
                  </span>
                </div>

                <div className="hidden md:block">
                  <button
                    onClick={onClose}
                    className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full border border-white/20 transition-all cursor-pointer"
                    title="Close stream viewer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Bottom Controls Area inside player */}
              <div className="space-y-3 w-full bg-black/70 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-2xl">
                {/* Seek Bar & DVR Controls Row */}
                <div className="space-y-2 w-full">
                  {/* Time Info & DVR Jump Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono font-bold text-[#94a3b8]">
                    <div className="flex items-center gap-2.5">
                      {/* Live / DVR Edge Button */}
                      {isLive ? (
                        <button
                          onClick={jumpToLive}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-extrabold tracking-wider uppercase transition-all cursor-pointer ${
                            atLiveEdge
                              ? 'bg-[#e11d48] text-white shadow-[0_0_10px_rgba(225,29,72,0.4)]'
                              : 'bg-[#161c2a] hover:bg-[#1e2638] text-[#53fc18] border border-[#53fc18]/40 shadow-[0_0_8px_rgba(83,252,24,0.2)]'
                          }`}
                          title={
                            atLiveEdge ? 'You are at the live edge' : 'Click to jump to the live edge'
                          }
                        >
                          {atLiveEdge ? (
                            <>
                              <Radio className="w-3 h-3 animate-pulse" />
                              LIVE
                            </>
                          ) : (
                            <>
                              <SkipForward className="w-3 h-3" />
                              <span>DVR (-{formatTime(Math.max(0, secondsFromLive))}) · JUMP TO LIVE</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="flex items-center gap-1.5 bg-[#161c2a] text-[#94a3b8] px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider">
                          <Play className="w-3 h-3" />
                          {stream.category}
                        </span>
                      )}

                      <span className="text-white text-xs">
                        {formatTime(clampedTime)}{' '}
                        <span className="text-[#64748b]">/</span>{' '}
                        {formatTime(isLive ? seekRange.end : seekRange.end)}
                      </span>
                    </div>

                    {/* DVR Stream Buffer Selector & Quick Seek Shortcut Buttons */}
                    <div className="flex items-center gap-2">
                      {isLive && (
                        <div className="flex items-center gap-1 bg-black/80 px-2 py-0.5 rounded border border-white/10 text-[10px]">
                          <span className="text-[#64748b] font-sans">DVR Window:</span>
                          {(['10m', '30m', '1h', '3h', '6h'] as const).map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setDvrWindowOption(opt)}
                              className={`px-1.5 py-0.5 rounded font-extrabold transition-all cursor-pointer ${
                                dvrWindowOption === opt
                                  ? 'bg-[#53fc18] text-[#0b0e14]'
                                  : 'text-[#94a3b8] hover:text-white'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => seekRelative(-30)}
                          className="px-1.5 py-0.5 rounded bg-black/70 hover:bg-black text-[#e1e7ef] hover:text-[#53fc18] border border-white/10 text-[10px] transition-colors cursor-pointer"
                          title="Rewind 30 seconds"
                        >
                          -30s
                        </button>
                        <button
                          onClick={() => seekRelative(-10)}
                          className="px-1.5 py-0.5 rounded bg-black/70 hover:bg-black text-[#e1e7ef] hover:text-[#53fc18] border border-white/10 flex items-center gap-0.5 text-[10px] transition-colors cursor-pointer"
                          title="Rewind 10 seconds"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>-10s</span>
                        </button>
                        <button
                          onClick={() => seekRelative(10)}
                          className="px-1.5 py-0.5 rounded bg-black/70 hover:bg-black text-[#e1e7ef] hover:text-[#53fc18] border border-white/10 flex items-center gap-0.5 text-[10px] transition-colors cursor-pointer"
                          title="Forward 10 seconds"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>+10s</span>
                        </button>
                        <button
                          onClick={() => seekRelative(30)}
                          className="px-1.5 py-0.5 rounded bg-black/70 hover:bg-black text-[#e1e7ef] hover:text-[#53fc18] border border-white/10 text-[10px] transition-colors cursor-pointer"
                          title="Forward 30 seconds"
                        >
                          +30s
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Seek Bar Slider Track with Hover Tooltip */}
                  <div
                    ref={seekBarRef}
                    onMouseMove={(e) => {
                      if (!seekBarRef.current) return;
                      const rect = seekBarRef.current.getBoundingClientRect();
                      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      setHoverTime(displayStart + pos * windowLen);
                      setHoverX(e.clientX - rect.left);
                    }}
                    onMouseLeave={() => {
                      setHoverTime(null);
                      setHoverX(null);
                    }}
                    className="relative group/seek h-4 flex items-center cursor-pointer select-none"
                  >
                    {/* Hover Timestamp Tooltip */}
                    {hoverTime !== null && hoverX !== null && (
                      <div
                        className="absolute -top-9 -translate-x-1/2 bg-[#0b0e14]/95 text-[#53fc18] text-[11px] font-mono font-extrabold px-2.5 py-1 rounded border border-[#53fc18]/40 shadow-2xl pointer-events-none z-30"
                        style={{ left: `${hoverX}px` }}
                      >
                        Seek: {formatTime(hoverTime)}
                      </div>
                    )}

                    {/* Track Background Rail */}
                    <div className="w-full h-2 bg-[#1e2638] group-hover/seek:h-3 rounded-full overflow-hidden transition-all relative">
                      {/* Buffered Fill (YouTube-style white) */}
                      {bufferedPct > progressPct && (
                        <div
                          className="absolute left-0 top-0 h-full bg-white/20"
                          style={{ width: `${Math.max(0, Math.min(100, bufferedPct))}%` }}
                        />
                      )}
                      {/* Played Fill Bar */}
                      <div
                        className="h-full bg-[#53fc18] rounded-full shadow-[0_0_12px_rgba(83,252,24,0.6)] relative transition-[width] duration-75"
                        style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
                      />
                      {/* DVR window start marker (live only) */}
                      {isLive && windowLen > 0 && displayStart > seekRange.start && (
                        <div
                          className="absolute top-0 h-full w-0.5 bg-white/50"
                          style={{ left: `${((displayStart - seekRange.start) / Math.max(1, seekRange.end - seekRange.start)) * 100}%` }}
                        />
                      )}
                    </div>

                    {/* Scrub Handle Knob */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-[#53fc18] rounded-full shadow-lg opacity-0 group-hover/seek:opacity-100 transition-opacity pointer-events-none z-20"
                      style={{ left: `${Math.max(0, Math.min(100, progressPct))}%` }}
                    />

                    {/* Native Range Input for Mouse Drag & Touch Scrubbing */}
                    <input
                      type="range"
                      min={displayStart}
                      max={Math.max(displayStart + 0.01, displayEnd)}
                      step="0.5"
                      value={clampedTime}
                      onPointerDown={() => {
                        isSeekingRef.current = true;
                        setIsSeeking(true);
                      }}
                      onPointerUp={() => {
                        isSeekingRef.current = false;
                        setIsSeeking(false);
                      }}
                      onTouchStart={() => {
                        isSeekingRef.current = true;
                        setIsSeeking(true);
                      }}
                      onTouchEnd={() => {
                        isSeekingRef.current = false;
                        setIsSeeking(false);
                      }}
                      onMouseDown={() => {
                        isSeekingRef.current = true;
                        setIsSeeking(true);
                      }}
                      onMouseUp={() => {
                        isSeekingRef.current = false;
                        setIsSeeking(false);
                      }}
                      onChange={(e) => seekTo(parseFloat(e.target.value))}
                      onInput={(e) => seekTo(parseFloat((e.target as HTMLInputElement).value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="p-1.5 text-white hover:text-[#53fc18] transition-colors cursor-pointer"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 fill-current" />
                      )}
                    </button>

                    <div className="flex items-center gap-2 group/vol">
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-1.5 text-white hover:text-[#53fc18] transition-colors cursor-pointer"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-5 h-5" />
                        ) : (
                          <Volume2 className="w-5 h-5" />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          setVolume(Number(e.target.value));
                          setIsMuted(false);
                        }}
                        className="w-16 accent-[#53fc18] cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={qualityIndex}
                      onChange={(e) => handleQualityChange(Number(e.target.value))}
                      disabled={levels.length === 0}
                      className="bg-black/70 text-white text-xs font-bold px-2 py-1 rounded border border-white/20 focus:outline-none disabled:opacity-50"
                      title={levels.length === 0 ? 'Quality auto-selected by the player' : 'Quality'}
                    >
                      <option value={-1}>Auto</option>
                      {levels.map((l) => (
                        <option key={l.index} value={l.index}>
                          {l.label}
                        </option>
                      ))}
                      {levels.length === 0 && <option value={-1}>1080p60 (Source)</option>}
                    </select>

                    <button
                      onClick={() => {
                        const el = document.documentElement;
                        if (!document.fullscreenElement) el.requestFullscreen?.();
                        else document.exitFullscreen?.();
                      }}
                      className="p-1.5 text-white hover:text-[#53fc18] transition-colors cursor-pointer"
                      title="Fullscreen"
                    >
                      <Maximize className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stream & Channel Details */}
        <div className="bg-[#161c2a] border border-[#1e2638] rounded-2xl p-4 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <img
                src={stream.avatarUrl}
                alt={stream.streamer}
                className="w-14 h-14 rounded-full object-cover border-2 border-[#53fc18] shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-white">{stream.streamer}</h1>
                  <CheckCircle2 className="w-5 h-5 text-[#53fc18] fill-[#53fc18]/20" />
                </div>
                <h2 className="text-base font-bold text-[#e1e7ef] mt-0.5">{stream.title}</h2>
                <div className="flex items-center gap-3 text-xs text-[#94a3b8] mt-1.5 flex-wrap">
                  <span className="text-[#53fc18] font-bold">{stream.category}</span>
                  <span>•</span>
                  <span>{(stream.followersCount || 1200000).toLocaleString()} Followers</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-white">
                    <Users className="w-3.5 h-3.5 text-[#53fc18]" />
                    {formatViewers(viewerCount)} watching now
                  </span>
                  {stream.startedAt && (
                    <>
                      <span>•</span>
                      <span>{stream.startedAt}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onToggleFollow(stream.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all cursor-pointer shadow-lg ${
                  isFollowed
                    ? 'bg-[#1e2638] text-white hover:bg-[#28334b] border border-[#3b4764]'
                    : 'bg-[#53fc18] text-[#0b0e14] hover:bg-[#45d413] shadow-[0_0_16px_rgba(83,252,24,0.4)]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFollowed ? 'fill-current text-[#ec4899]' : ''}`} />
                <span>{isFollowed ? 'Following' : 'Follow'}</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard?.writeText?.(window.location.href);
                  alert('Stream link copied to clipboard!');
                }}
                className="p-2.5 text-[#cbd5e1] hover:text-white bg-[#0b0e14] hover:bg-[#1f293d] border border-[#232b3e] rounded-xl transition-colors cursor-pointer"
                title="Share stream"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bio & Tags */}
          {stream.bio && (
            <p className="text-sm text-[#94a3b8] pt-2 border-t border-[#232b3e] leading-relaxed">
              {stream.bio}
            </p>
          )}

          {stream.tags && stream.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {stream.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs font-semibold text-[#a0aec0] bg-[#0b0e14] px-3 py-1 rounded-full border border-[#232b3e]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Live Chat Window */}
      <div className="w-full md:w-80 lg:w-96 bg-[#0b0e14] border-t md:border-t-0 md:border-l border-[#1e2638] flex flex-col h-80 md:h-auto shrink-0">
        {/* Chat Header */}
        <div className="p-3 border-b border-[#1e2638] flex items-center justify-between bg-[#161c2a]">
          <div className="flex items-center gap-2 text-white font-extrabold text-sm">
            <MessageSquare className="w-4 h-4 text-[#53fc18]" />
            <span>STREAM CHAT</span>
          </div>
          <span className="text-xs font-semibold text-[#53fc18] bg-[#53fc18]/10 px-2 py-0.5 rounded border border-[#53fc18]/20">
            Slow Mode (2s)
          </span>
        </div>

        {/* Chat Messages Feed */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs font-sans">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className="leading-relaxed break-words hover:bg-[#161c2a]/60 p-1 rounded transition-colors"
            >
              <span className="text-[#64748b] mr-2 text-[10px] font-mono">{msg.timestamp}</span>

              {msg.isSubscriber && (
                <span
                  className="inline-block bg-[#53fc18] text-[#0b0e14] font-black text-[9px] px-1 rounded mr-1"
                  title="Subscriber"
                >
                  SUB
                </span>
              )}
              {msg.isMod && (
                <span
                  className="inline-block bg-[#06b6d4] text-black font-black text-[9px] px-1 rounded mr-1"
                  title="Moderator"
                >
                  MOD
                </span>
              )}
              {msg.isVIP && (
                <span
                  className="inline-block bg-[#f59e0b] text-black font-black text-[9px] px-1 rounded mr-1"
                  title="VIP"
                >
                  VIP
                </span>
              )}

              <span className="font-bold mr-1.5" style={{ color: msg.color }}>
                {msg.user}:
              </span>
              <span className="text-[#e2e8f0] font-medium">{msg.message}</span>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {/* Chat Input Form */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-[#1e2638] bg-[#161c2a]">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Send a message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="w-full bg-[#0b0e14] text-xs text-white placeholder-[#64748b] pl-3 pr-10 py-2.5 rounded-lg border border-[#232b3e] focus:outline-none focus:border-[#53fc18] transition-all"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="absolute right-2 p-1 text-[#53fc18] disabled:text-[#475569] hover:scale-110 transition-transform cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
