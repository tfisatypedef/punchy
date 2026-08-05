import React from 'react';
import { Search, X, User, Bell, Radio } from 'lucide-react';
import { TabType } from '../types';

interface NavbarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenStreamer?: (streamerName: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <header className="sticky top-0 z-30 h-14 bg-[#0b0e14]/95 backdrop-blur-md border-b border-[#1e2638] px-4 flex items-center justify-between gap-4">
      {/* Left: Brand Logo & Navigation */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => onTabChange('home')}
          className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-[#53fc18] flex items-center justify-center font-extrabold text-[#0b0e14] text-xl shadow-[0_0_12px_rgba(83,252,24,0.4)] group-hover:scale-105 transition-transform">
            P
          </div>
          <span className="font-extrabold text-lg tracking-wider text-white group-hover:text-[#53fc18] transition-colors">
            PUNCH
          </span>
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => onTabChange('home')}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
              currentTab === 'home'
                ? 'text-white bg-[#1e2638]'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#161c2a]'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onTabChange('browse')}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
              currentTab === 'browse'
                ? 'text-white bg-[#1e2638]'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#161c2a]'
            }`}
          >
            Browse
          </button>
          <button
            onClick={() => onTabChange('following')}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
              currentTab === 'following'
                ? 'text-white bg-[#1e2638]'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#161c2a]'
            }`}
          >
            Following
          </button>
        </nav>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-lg relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-[#64748b]" />
          <input
            type="text"
            placeholder="Search channels, categories, or streams..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#161c2a] text-sm text-white placeholder-[#64748b] pl-9 pr-9 py-2 rounded-lg border border-[#232b3e] focus:outline-none focus:border-[#53fc18] focus:ring-1 focus:ring-[#53fc18] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 text-[#64748b] hover:text-white p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Adrien Broner Ingest Badge */}
        <button
          onClick={() => onSearchChange('https://kick.com/adrienbroner')}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#53fc18]/15 hover:bg-[#53fc18]/25 text-[#53fc18] border border-[#53fc18]/30 text-xs font-extrabold transition-all cursor-pointer shadow-[0_0_10px_rgba(83,252,24,0.2)]"
          title="Ingest Adrien Broner Stream"
        >
          <Radio className="w-3.5 h-3.5 animate-pulse text-[#53fc18]" />
          <span>Ingest kick.com/adrienbroner</span>
        </button>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#161c2a] text-[#94a3b8] border border-[#232b3e] text-xs font-bold">
          <Radio className="w-3.5 h-3.5 text-[#53fc18] animate-pulse" />
          <span>LIVE PROXY</span>
        </div>

        <button
          className="p-2 text-[#94a3b8] hover:text-white hover:bg-[#161c2a] rounded-lg transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>

        <button className="flex items-center gap-2 bg-[#53fc18] hover:bg-[#45d413] text-[#0b0e14] px-4 py-1.5 rounded-lg font-bold text-sm shadow-[0_0_12px_rgba(83,252,24,0.3)] transition-all cursor-pointer">
          <User className="w-4 h-4" />
          <span>Log In</span>
        </button>
      </div>
    </header>
  );
};
