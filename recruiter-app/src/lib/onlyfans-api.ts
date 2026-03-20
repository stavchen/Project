import { extractInstagram } from "./utils";

const API_BASE =
  process.env.ONLYFANS_API_BASE || "https://app.onlyfansapi.com/api";
const API_KEY = process.env.ONLYFANS_API_KEY || "";

interface APISearchResponse {
  data: APICreatorProfile[];
  _pagination?: {
    total_results: number;
    next_cursor: string | null;
    next_page_url: string | null;
  };
  _meta?: {
    _credits?: { used: number; balance: number };
    _rate_limits?: {
      limit_minute: number;
      remaining_minute: number;
    };
  };
}

export interface APICreatorProfile {
  onlyfans_id: number;
  username: string;
  name?: string;
  about?: string;
  location?: string;
  website?: string;
  avatar_url?: string | null;
  header_url?: string | null;
  subscribe_price?: number;
  min_subscribe_price?: number;
  posts_count?: number;
  photos_count?: number;
  videos_count?: number;
  audios_count?: number;
  favorites_count?: number;
  favorited_count?: number;
  subscribers_count?: number | null;
  is_verified?: boolean;
  is_performer?: boolean;
  is_real_performer?: boolean;
  join_date?: string;
  last_seen_at?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  facebook?: string | null;
  fansly?: string | null;
  ofapi_gender?: string;
  ofapi_gender_confidence?: number;
  [key: string]: unknown;
}

/** Transform API profile to our local schema shape */
export function transformProfile(p: APICreatorProfile) {
  // Instagram: use direct field first, then parse from website/bio
  const igDirect = p.instagram || null;
  const igParsed = extractInstagram(p.website, p.about);
  const instagramHandle = igDirect || igParsed;

  return {
    id: String(p.onlyfans_id),
    username: p.username,
    displayName: p.name || p.username,
    avatarUrl: p.avatar_url || null,
    coverUrl: p.header_url || null,
    bio: p.about ? p.about.replace(/<[^>]*>/g, "") : null, // strip HTML
    location: p.location || null,
    website: p.website || null,
    subscriberCount: p.favorited_count || p.subscribers_count || 0,
    postCount: p.posts_count || 0,
    photoCount: p.photos_count || 0,
    videoCount: p.videos_count || 0,
    mediaCount:
      (p.photos_count || 0) + (p.videos_count || 0) + (p.audios_count || 0),
    hasInstagram: !!instagramHandle,
    instagramHandle,
    isFree: !p.subscribe_price || p.subscribe_price === 0,
    subscriptionPrice: p.subscribe_price || 0,
    isVerified: p.is_verified || false,
    joinedAt: p.join_date || null,
    fetchedAt: new Date().toISOString(),
    rawJson: JSON.stringify(p),
  };
}

async function apiFetch(
  endpoint: string,
  params?: Record<string, string>
): Promise<APISearchResponse> {
  const url = new URL(`${API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    });
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json();
}

export interface SearchParams {
  query?: string;
  cursor?: string;
  limit?: number;
  sort?: string;
}

/** Search creator profiles via the API */
export async function searchCreators(params: SearchParams) {
  const queryParams: Record<string, string> = {
    limit: String(params.limit || 20),
  };
  if (params.query) queryParams.query = params.query;
  if (params.cursor) queryParams.cursor = params.cursor;
  if (params.sort) queryParams.sort = params.sort;

  const res = await apiFetch("/search", queryParams);
  return {
    profiles: (res.data || []).map(transformProfile),
    nextCursor: res._pagination?.next_cursor || null,
    totalResults: res._pagination?.total_results || 0,
    rateLimit: res._meta?._rate_limits || null,
    credits: res._meta?._credits || null,
  };
}
