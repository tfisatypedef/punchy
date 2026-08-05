import React, { useState, useEffect, useRef } from 'react';
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
  Settings,
  MessageSquare,
  Sparkles,
  Users,
  RotateCcw,
  RotateCw,
  SkipForward
} from 'lucide-react';
import { KickStream, ChatMessage } from '../types';
import { MOCK_CHAT_MESSAGES, SAMPLE_CHAT_POOL } from '../data/mockData';

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

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [quality, setQuality] = useState('1080p60');
  const [playerMode, setPlayerMode] = useState<'embed' | 'direct' | 'preview'>('embed');
  const [customIngestUrl, setCustomIngestUrl] = useState('');
  const [activeStreamUrl, setActiveStreamUrl] = useState(
    stream.streamUrl || `https://player.kick.com/${stream.streamer.toLowerCase()}`
  );

  // Video Seek Bar & DVR State
  const [currentTime, setCurrentTime] = useState(480); // Default 8 minutes into stream DVR buffer
  const [duration, setDuration] = useState(3600); // 1 hour total stream buffer (3600s)
  const [dvrWindowOption, setDvrWindowOption] = useState<'10m' | '30m' | '1h' | '3h' | '6h'>('1h');
  const [isSeeking, setIsSeeking] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const [viewerCount, setViewerCount] = useState(stream.viewers);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    MOCK_CHAT_MESSAGES[stream.id] || MOCK_CHAT_MESSAGES[stream.streamer.toLowerCase()] || MOCK_CHAT_MESSAGES['1']
  );
  const [inputMessage, setInputMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Helper to format seconds to MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Seek bar handlers
  const handleSeekChange = (newTime: number) => {
    const clamped = Math.max(0, Math.min(duration, newTime));
    setCurrentTime(clamped);

    if (videoRef.current) {
      const realDur = videoRef.current.duration;
      if (realDur && !isNaN(realDur) && realDur > 0) {
        // Wrap seek time seamlessly if seeking beyond actual media duration
        const targetMediaTime = clamped % realDur;
        videoRef.current.currentTime = targetMediaTime;
      }
    }
  };

  const handleSeekRelative = (offsetSeconds: number) => {
    handleSeekChange(currentTime + offsetSeconds);
  };

  const handleJumpToLive = () => {
    handleSeekChange(duration);
  };

  const handleDvrWindowChange = (opt: '10m' | '30m' | '1h' | '3h' | '6h') => {
    setDvrWindowOption(opt);
    let newDur = 3600;
    if (opt === '10m') newDur = 600;
    if (opt === '30m') newDur = 1800;
    if (opt === '1h') newDur = 3600;
    if (opt === '3h') newDur = 10800;
    if (opt === '6h') newDur = 21600;
    setDuration(newDur);
    if (currentTime > newDur) {
      setCurrentTime(newDur);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
    setIsPlaying(!isPlaying);
  };

  // Sync volume and mute to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume / 100;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Sync active stream URL when stream prop changes
  useEffect(() => {
    setActiveStreamUrl(
      stream.streamUrl || `https://player.kick.com/${stream.streamer.toLowerCase()}`
    );
  }, [stream]);

  // Simulated timer for preview & embed mode seek bar progression
  useEffect(() => {
    if (playerMode === 'direct') return;
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (!isSeeking) {
        setCurrentTime((prev) => {
          if (prev >= duration) return duration;
          return prev + 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, duration, isSeeking, playerMode]);

  // Simulate viewer fluctuation and incoming chat messages
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

  const formatViewers = (count: number) => {
    return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString();
  };

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
        {/* Player Mode Switcher & Custom Ingest Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161c2a] p-3 rounded-xl border border-[#232b3e]">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setPlayerMode('embed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                playerMode === 'embed'
                  ? 'bg-[#53fc18] text-[#0b0e14] shadow-[0_0_12px_rgba(83,252,24,0.3)]'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#1e2638]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Kick Live Player</span>
            </button>

            <button
              onClick={() => setPlayerMode('direct')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                playerMode === 'direct'
                  ? 'bg-[#53fc18] text-[#0b0e14] shadow-[0_0_12px_rgba(83,252,24,0.3)]'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#1e2638]'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Direct Video Feed</span>
            </button>

            <button
              onClick={() => setPlayerMode('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                playerMode === 'preview'
                  ? 'bg-[#53fc18] text-[#0b0e14] shadow-[0_0_12px_rgba(83,252,24,0.3)]'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#1e2638]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Preview Canvas</span>
            </button>
          </div>

          {/* Quick Kick Ingest URL submit */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!customIngestUrl.trim()) return;
              const clean = customIngestUrl
                .trim()
                .replace(/^https?:\/\//i, '')
                .replace(/^kick\.com\//i, '')
                .replace(/^player\.kick\.com\//i, '')
                .split('/')[0]
                .split('?')[0];

              if (clean) {
                setActiveStreamUrl(`https://player.kick.com/${clean}`);
                setPlayerMode('embed');
                setCustomIngestUrl('');
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ingest Kick URL (e.g. kick.com/adrienbroner)"
              value={customIngestUrl}
              onChange={(e) => setCustomIngestUrl(e.target.value)}
              className="bg-[#0b0e14] text-xs text-white placeholder-[#64748b] px-3 py-1.5 rounded-lg border border-[#232b3e] focus:outline-none focus:border-[#53fc18] w-48 sm:w-64"
            />
            <button
              type="submit"
              className="bg-[#53fc18] hover:bg-[#45d413] text-[#0b0e14] font-extrabold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Ingest
            </button>
          </form>
        </div>

        {/* Video Player Container */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-[#1e2638] shadow-2xl group">
          {playerMode === 'embed' ? (
            /* Kick Live Official Embed Iframe */
            <iframe
              src={`https://player.kick.com/${stream.streamer.toLowerCase()}?autoplay=true&muted=${isMuted ? 'true' : 'false'}`}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
              title={`${stream.streamer} Kick Live Player`}
            />
          ) : playerMode === 'direct' ? (
            /* Direct HTML5 Video Stream */
            <video
              ref={videoRef}
              src={
                activeStreamUrl.endsWith('.m3u8') || activeStreamUrl.endsWith('.mp4')
                  ? activeStreamUrl
                  : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
              }
              autoPlay
              muted={isMuted}
              onTimeUpdate={() => {
                if (videoRef.current && !isSeeking) {
                  // Keep seek position synced to video time modulo current DVR window duration
                  const mediaTime = videoRef.current.currentTime;
                  const realDur = videoRef.current.duration;
                  if (realDur && !isNaN(realDur) && realDur > 0) {
                    // Normalize position within DVR window
                    const normalizedTime = (currentTime - (currentTime % realDur)) + mediaTime;
                    setCurrentTime(Math.min(duration, Math.max(0, normalizedTime)));
                  } else {
                    setCurrentTime(mediaTime);
                  }
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full h-full object-contain"
            />
          ) : (
            /* Simulated Video Feed Image */
            <img
              src={stream.thumbnailUrl}
              alt={stream.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isPlaying ? 'opacity-90' : 'opacity-40'
              }`}
            />
          )}

          {/* Animated Stream Visualizer / Playing Overlay (for preview mode or overlay) */}
          {playerMode === 'preview' && isPlaying && (
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <span className="w-1.5 h-4 bg-[#53fc18] animate-[bounce_1s_infinite_100ms]" />
              <span className="w-1.5 h-6 bg-[#53fc18] animate-[bounce_1s_infinite_300ms]" />
              <span className="w-1.5 h-3 bg-[#53fc18] animate-[bounce_1s_infinite_200ms]" />
              <span className="text-xs font-bold text-white ml-1.5">LIVE 60 FPS</span>
            </div>
          )}

          {/* Video Player Custom Controls Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between z-10">
            {/* Top Bar inside player */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-[#e11d48] text-white text-[10px] font-extrabold px-2 py-0.5 rounded tracking-wider flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  LIVE
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
                    {currentTime >= duration - 3 ? (
                      <button
                        onClick={handleJumpToLive}
                        className="flex items-center gap-1.5 bg-[#e11d48] text-white px-2.5 py-1 rounded text-[10px] font-extrabold tracking-wider uppercase shadow-[0_0_10px_rgba(225,29,72,0.4)] cursor-pointer"
                        title="You are at the live stream edge"
                      >
                        <Radio className="w-3 h-3 animate-pulse" />
                        LIVE
                      </button>
                    ) : (
                      <button
                        onClick={handleJumpToLive}
                        className="flex items-center gap-1.5 bg-[#161c2a] hover:bg-[#1e2638] text-[#53fc18] border border-[#53fc18]/40 px-2.5 py-1 rounded text-[10px] font-extrabold tracking-wider uppercase transition-all cursor-pointer shadow-[0_0_8px_rgba(83,252,24,0.2)]"
                        title="Click to jump to live edge"
                      >
                        <SkipForward className="w-3 h-3 text-[#53fc18]" />
                        <span>DVR (-{formatTime(duration - currentTime)}) · JUMP TO LIVE</span>
                      </button>
                    )}

                    <span className="text-white text-xs">
                      {formatTime(currentTime)}{' '}
                      <span className="text-[#64748b]">/</span> {formatTime(duration)}
                    </span>
                  </div>

                  {/* DVR Stream Buffer Selector & Quick Seek Shortcut Buttons */}
                  <div className="flex items-center gap-2">
                    {/* DVR Window Buffer Selector */}
                    <div className="flex items-center gap-1 bg-black/80 px-2 py-0.5 rounded border border-white/10 text-[10px]">
                      <span className="text-[#64748b] font-sans">DVR Window:</span>
                      {(['10m', '30m', '1h', '3h', '6h'] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleDvrWindowChange(opt)}
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

                    {/* Quick Seek Shortcut Buttons (-30s, -10s, +10s, +30s) */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSeekRelative(-30)}
                        className="px-1.5 py-0.5 rounded bg-black/70 hover:bg-black text-[#e1e7ef] hover:text-[#53fc18] border border-white/10 text-[10px] transition-colors cursor-pointer"
                        title="Rewind 30 seconds"
                      >
                        -30s
                      </button>
                      <button
                        onClick={() => handleSeekRelative(-10)}
                        className="px-1.5 py-0.5 rounded bg-black/70 hover:bg-black text-[#e1e7ef] hover:text-[#53fc18] border border-white/10 flex items-center gap-0.5 text-[10px] transition-colors cursor-pointer"
                        title="Rewind 10 seconds"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>-10s</span>
                      </button>
                      <button
                        onClick={() => handleSeekRelative(10)}
                        className="px-1.5 py-0.5 rounded bg-black/70 hover:bg-black text-[#e1e7ef] hover:text-[#53fc18] border border-white/10 flex items-center gap-0.5 text-[10px] transition-colors cursor-pointer"
                        title="Forward 10 seconds"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>+10s</span>
                      </button>
                      <button
                        onClick={() => handleSeekRelative(30)}
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
                    setHoverTime(pos * duration);
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
                    {/* Live Progress Fill Bar */}
                    <div
                      className="h-full bg-[#53fc18] rounded-full shadow-[0_0_12px_rgba(83,252,24,0.6)] relative transition-[width] duration-75"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>

                  {/* Scrub Handle Knob */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-[#53fc18] rounded-full shadow-lg opacity-0 group-hover/seek:opacity-100 transition-opacity pointer-events-none z-20"
                    style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />

                  {/* Native Range Input for Mouse Drag & Touch Scrubbing */}
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    step="0.5"
                    value={currentTime}
                    onPointerDown={() => {
                      setIsSeeking(true);
                      if (playerMode === 'embed') {
                        setPlayerMode('direct');
                      }
                    }}
                    onPointerUp={() => setIsSeeking(false)}
                    onTouchStart={() => {
                      setIsSeeking(true);
                      if (playerMode === 'embed') {
                        setPlayerMode('direct');
                      }
                    }}
                    onTouchEnd={() => setIsSeeking(false)}
                    onMouseDown={() => {
                      setIsSeeking(true);
                      if (playerMode === 'embed') {
                        setPlayerMode('direct');
                      }
                    }}
                    onMouseUp={() => setIsSeeking(false)}
                    onChange={(e) => handleSeekChange(parseFloat(e.target.value))}
                    onInput={(e) => handleSeekChange(parseFloat((e.target as HTMLInputElement).value))}
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
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
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
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="bg-black/70 text-white text-xs font-bold px-2 py-1 rounded border border-white/20 focus:outline-none"
                  >
                    <option value="1080p60">1080p60 (Source)</option>
                    <option value="720p60">720p60</option>
                    <option value="480p">480p</option>
                    <option value="Auto">Auto</option>
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
            <div key={msg.id} className="leading-relaxed break-words hover:bg-[#161c2a]/60 p-1 rounded transition-colors">
              <span className="text-[#64748b] mr-2 text-[10px] font-mono">{msg.timestamp}</span>

              {msg.isSubscriber && (
                <span className="inline-block bg-[#53fc18] text-[#0b0e14] font-black text-[9px] px-1 rounded mr-1" title="Subscriber">
                  SUB
                </span>
              )}
              {msg.isMod && (
                <span className="inline-block bg-[#06b6d4] text-black font-black text-[9px] px-1 rounded mr-1" title="Moderator">
                  MOD
                </span>
              )}
              {msg.isVIP && (
                <span className="inline-block bg-[#f59e0b] text-black font-black text-[9px] px-1 rounded mr-1" title="VIP">
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
