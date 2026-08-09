export interface KickCategory {
  id: string;
  name: string;
  viewers: number;
  streamers: number;
  color: string;
  badge?: string;
  bannerUrl?: string;
}

export interface KickStream {
  id: string;
  title: string;
  streamer: string;
  avatarUrl: string;
  category: string;
  viewers: number;
  thumbnailUrl: string;
  accent: string;
  isLive: boolean;
  tags: string[];
  streamUrl?: string;
  bio?: string;
  followersCount?: number;
  startedAt?: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  badge?: string;
  badgeColor?: string;
  color: string;
  message: string;
  timestamp: string;
  isMod?: boolean;
  isSubscriber?: boolean;
  isVIP?: boolean;
}

export type TabType = 'home' | 'browse' | 'following';
export type BrowseSubTab = 'livestreams' | 'categories';
