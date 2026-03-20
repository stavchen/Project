# OnlyFans Creator Recruiter Tool - Implementation Plan

## Overview

Internal agency tool that aggregates OnlyFans creator profiles via onlyfansapi.com, with infinite scroll, smart filtering, and recruitment tracking — solving the limitations of onlyfindersearch.com.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 (App Router) + TypeScript | Fast SSR, great DX, easy deployment |
| UI | Tailwind CSS + shadcn/ui | Polished look with minimal effort |
| State | React Query (TanStack Query) | Handles infinite scroll pagination, caching, background refetch |
| Backend API | Next.js API Routes | Single deployable, no separate server needed |
| Database | SQLite via Drizzle ORM | Zero-config, local-first, perfect for internal tool |
| Auth | Simple env-based password (internal tool) | No need for full auth system |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Next.js App                     │
│                                                  │
│  ┌──────────────┐    ┌────────────────────────┐ │
│  │   Frontend    │    │   API Routes           │ │
│  │              │    │                        │ │
│  │  Creator Grid │◄──►│  /api/creators/search  │ │
│  │  (infinite    │    │  /api/creators/[id]    │ │
│  │   scroll)     │    │  /api/favorites        │ │
│  │              │    │  /api/sync             │ │
│  │  Filters Bar  │    │                        │ │
│  │  Detail Modal │    └──────────┬─────────────┘ │
│  └──────────────┘               │               │
│                                  │               │
│                    ┌─────────────▼─────────────┐ │
│                    │     Service Layer          │ │
│                    │                            │ │
│                    │  OnlyFansAPI Client        │ │
│                    │  (handles pagination,      │ │
│                    │   rate limiting, caching)  │ │
│                    │                            │ │
│                    └─────────────┬──────────────┘ │
│                                  │                │
│                    ┌─────────────▼──────────────┐ │
│                    │   SQLite Database           │ │
│                    │                             │ │
│                    │  creators (cached profiles) │ │
│                    │  favorites (bookmarked)     │ │
│                    │  outreach_log (contacted)   │ │
│                    └─────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │  onlyfansapi.com    │
                │  External API       │
                └─────────────────────┘
```

## Core Features

### 1. Infinite Scroll Creator Discovery
- Cursor-based pagination that never hits a wall
- Background pre-fetching of next pages while user scrolls
- Deduplication: track seen profile IDs to never show repeats
- Persist scroll position so refresh doesn't reset

### 2. Smart Filtering
- **Sort by**: Newest creators, Like count (asc/desc), Follower count
- **Filter: Has Instagram** — toggle to only show creators with linked IG
- **Filter: Like count range** — min/max slider
- **Filter: Creation date range** — target new creators specifically
- **Keyword search** — name, bio text, location

### 3. Creator Profile Cards
Each card shows:
- Avatar + cover photo
- Display name / username
- Like count
- Post count
- Instagram handle (highlighted if present)
- Account creation date
- Free vs. paid indicator + subscription price
- "Favorite" button + "Mark as Contacted" button

### 4. Recruitment Tracking (local DB)
- Favorite/bookmark creators for follow-up
- Mark creators as "Contacted" / "Responded" / "Signed" / "Passed"
- Notes field per creator
- Export favorites to CSV

### 5. Sync & Cache Layer
- Background sync job that pulls new creators into local SQLite
- Allows faster filtering without burning API credits every time
- Configurable sync schedule

## Database Schema

```sql
-- Cached creator profiles from API
CREATE TABLE creators (
  id TEXT PRIMARY KEY,           -- OnlyFans user ID
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  bio TEXT,
  like_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  photo_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  has_instagram BOOLEAN DEFAULT FALSE,
  instagram_handle TEXT,
  is_free BOOLEAN DEFAULT FALSE,
  subscription_price REAL,
  created_at TEXT,               -- When they joined OF
  fetched_at TEXT NOT NULL,      -- When we cached this
  raw_json TEXT                  -- Full API response for future use
);

-- Recruitment tracking
CREATE TABLE favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id TEXT NOT NULL REFERENCES creators(id),
  status TEXT DEFAULT 'saved',   -- saved | contacted | responded | signed | passed
  notes TEXT,
  added_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Outreach log
CREATE TABLE outreach_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id TEXT NOT NULL REFERENCES creators(id),
  action TEXT NOT NULL,          -- dm_sent | email_sent | ig_messaged | call
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_creators_likes ON creators(like_count);
CREATE INDEX idx_creators_created ON creators(created_at);
CREATE INDEX idx_creators_instagram ON creators(has_instagram);
CREATE INDEX idx_favorites_status ON favorites(status);
```

## File Structure

```
/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with providers
│   │   ├── page.tsx                # Main discovery page
│   │   ├── favorites/
│   │   │   └── page.tsx            # Saved/tracked creators
│   │   └── api/
│   │       ├── creators/
│   │       │   ├── search/route.ts # Proxy to onlyfansapi + local cache
│   │       │   └── [id]/route.ts   # Single creator detail
│   │       ├── favorites/
│   │       │   └── route.ts        # CRUD favorites
│   │       └── sync/
│   │           └── route.ts        # Trigger background sync
│   ├── components/
│   │   ├── creator-card.tsx        # Profile card component
│   │   ├── creator-grid.tsx        # Infinite scroll grid
│   │   ├── creator-detail.tsx      # Expanded profile modal
│   │   ├── filter-bar.tsx          # Search + filter controls
│   │   ├── status-badge.tsx        # Recruitment status indicator
│   │   └── export-button.tsx       # CSV export
│   ├── lib/
│   │   ├── onlyfans-api.ts        # API client wrapper
│   │   ├── db.ts                   # Drizzle DB setup
│   │   ├── schema.ts              # Drizzle schema
│   │   └── utils.ts               # Helpers
│   └── hooks/
│       ├── use-creators.ts         # Infinite query hook
│       └── use-favorites.ts        # Favorites CRUD hook
├── drizzle.config.ts
├── .env.local                      # API key + app password
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Implementation Steps

### Phase 1: Project Scaffolding
1. Initialize Next.js 14 project with TypeScript + Tailwind
2. Install dependencies: drizzle-orm, better-sqlite3, @tanstack/react-query, shadcn/ui
3. Set up env config for API key
4. Set up SQLite + Drizzle schema + migrations

### Phase 2: API Client & Data Layer
5. Build onlyfansapi.com client with rate limiting and error handling
6. Build API route `/api/creators/search` that:
   - Accepts filter params (sort, hasInstagram, likeRange, dateRange, keyword)
   - Queries local cache first, falls back to API
   - Returns paginated results with cursor for infinite scroll
7. Build sync endpoint that bulk-fetches and caches creators

### Phase 3: Frontend - Discovery Page
8. Build FilterBar component (sort dropdown, Instagram toggle, like range slider, date picker, search input)
9. Build CreatorCard component showing key profile data
10. Build CreatorGrid with TanStack Query `useInfiniteQuery` for true infinite scroll
11. Add deduplication logic (Set of seen IDs across pages)

### Phase 4: Recruitment Tracking
12. Build favorites API routes (add/remove/update status)
13. Build Favorites page with status columns (Kanban-style or table)
14. Add outreach logging
15. Add CSV export

### Phase 5: Polish
16. Add loading skeletons and error states
17. Add keyboard shortcuts (J/K to navigate, F to favorite)
18. Add simple password protection via middleware
19. Responsive design for mobile use

## OnlyFansAPI.com Integration Notes

- **Endpoint**: `GET /search` (Search & Filter Profiles) — part of their 200+ endpoints
- **Auth**: Bearer token with `sk_` prefix API key
- **Pagination**: Response includes `_meta._pagination.next_page` URL for cursor-based pagination
- **Rate limit**: 1,000 RPM on free/basic, 5,000 RPM on pro
- **Credits**: Each API call costs credits; caching locally is critical to stay within budget
- **Recommended plan**: Basic ($69/mo, 20K credits) to start, upgrade to Pro if needed

## Cost Considerations

- **Basic plan** ($69/mo): 20,000 API calls — with local caching, this should cover initial bulk sync + ongoing discovery
- **Strategy**: Do a large initial sync, then incremental daily syncs for new creators only. Serve most reads from local cache to minimize credit burn.
