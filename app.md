# Punch - Kick.com Alternative & Streaming Platform

## 1. Overview
**Punch** is a high-performance, dark-themed streaming web platform inspired by Kick.com. It provides live stream discovery, real-time simulated live chat, category browsing, channel pages, and interactive stream playback.

---

## 2. Migration Specs & Context

### Original Architecture (Flutter & Dart Server)
- **Client**: Flutter cross-platform mobile & desktop app (`lib/`, `android/`, `ios/`, `linux/`, `windows/`).
- **Server**: Dart backend (`server/`) utilizing `shelf` middleware, backoff logic, and cache layers (`server/lib/src/upstream/kick_re.dart` & `kick_official.dart`) to proxy and reverse-engineer Kick's private/public APIs.
- **Shared**: Shared Dart DTO models (`shared/lib/src/models/`).

### Target Architecture (React + Vite + Express TypeScript)
- The application has been fully migrated to a **Full-Stack Node.js + Express + React SPA** codebase located at the root level (`/`).
- **Framework**: React 18 + Vite + TypeScript.
- **Styling**: Tailwind CSS with custom Kick visual branding (`#0b0e14` background, `#1e2638` borders, `#53fc18` neon green accent).
- **Icons**: `lucide-react`.
- **Backend Entry**: `server.ts` powered by Express, providing REST API proxies and serving the Vite development/production middleware on port `3000`.

---

## 3. Server & API Specification (`server.ts`)

The backend server exposes the following reverse-engineered API endpoints:

| Endpoint | Method | Description | Query Parameters / Route Parameters |
| :--- | :--- | :--- | :--- |
| `/healthz` | `GET` | Health check and server status | N/A |
| `/api/v1/categories` | `GET` | List all top streaming categories | N/A |
| `/api/v1/livestreams` | `GET` | List live streams with filtering and sorting | `category` (string), `query` (string), `sort` (`viewers_desc` \| `viewers_asc`) |
| `/api/v1/channels/:slug` | `GET` | Retrieve specific channel details by streamer name or ID (with fallback for any handle) | `:slug` |
| `/api/v1/ingest` | `POST` | Ingest Kick channel URL (e.g., `https://kick.com/adrienbroner`) and return live stream feed metadata | `body: { url: string }` |

---

## 4. Data Models & TypeScript Interfaces (`/src/types.ts`)

```typescript
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
```

---

## 5. Frontend Component Architecture (`/src/components`)

- **`App.tsx`**: Main application container managing active tab state (`home`, `browse`, `following`), search query filters, followed channel IDs, category filters, and active stream player modal.
- **`Navbar.tsx`**: Header containing Punch logo with Kick live badge, tab navigation buttons, search input with instant clear action, and profile/login modal trigger.
- **`Sidebar.tsx`**: Collapsible left sidebar listing followed channels, recommended live streams, and top categories with live viewer counts.
- **`HomeScreen.tsx`**: Main landing view featuring `FeaturedHero` stream carousel, category pills, top live channels grid, and quick navigation.
- **`FeaturedHero.tsx`**: Large high-impact hero banner displaying the #1 featured streamer with dynamic backdrop, tags, and "Watch Live" action.
- **`LiveCard.tsx`**: Reusable card component for live stream previews, featuring live duration badges, viewer count pills, category tags, avatar, and hover glow effects.
- **`BrowseScreen.tsx`**: Browsing feed supporting toggle between Live Streams view and Categories grid, with tag filtering, category pill selectors, and viewer sorting.
- **`FollowingScreen.tsx`**: Dedicated manager screen for channels followed by the user, showing live/offline status and one-click follow/unfollow buttons.
- **`StreamPlayerModal.tsx`**: Fullscreen stream playback view featuring:
  - Multi-mode player engine (Kick Official Embed, Direct HTML5 Video, Preview Canvas).
  - Interactive DVR Seek Bar with animated neon-green progress track, hover time preview tooltip, and draggable scrub handle.
  - Configurable DVR Window Buffer selector (`10m`, `30m`, `1h`, `3h`, `6h`).
  - Quick Seek Shortcut buttons (`-30s`, `-10s`, `+10s`, `+30s`) for precise frame navigation.
  - Live Edge indicator badge with one-click "Jump to Live" DVR sync toggle.
  - Seamless time normalization across looped video streams.
  - Interactive live chat widget with mock auto-scroll, badged chatter roles, and real-time message posting.
- **`LoginModal.tsx`**: Authentication dialog for user sign-in/sign-up simulation.
- **`TopBar.tsx`**: Header bar component used across feeds.

---

## 6. Build & Execution Commands

- **Development**:
  ```bash
  npm run dev
  ```
  Runs `tsx server.ts` on `0.0.0.0:3000`.
- **Production Build**:
  ```bash
  npm run build
  ```
  Executes `vite build` followed by `esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`.
- **Production Start**:
  ```bash
  npm run start
  ```
  Launches compiled server via `node dist/server.cjs`.

---

## 7. Guidelines for Future Agent Interactions
1. **Server Routes**: Any new reverse-engineered or proxied Kick endpoints should be placed in `server.ts` under `/api/v1/*`.
2. **UI Styling**: Maintain the dark Kick aesthetic using Tailwind utilities and `#53fc18` for primary actions/highlights.
3. **No Unrequested Dependencies**: Do not re-introduce Flutter or Dart build artifacts; keep the project lean and centered on Node.js + Express + Vite + React.
