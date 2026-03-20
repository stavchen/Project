import { extractInstagram } from "./utils";

const API_BASE = process.env.ONLYFANS_API_BASE || "https://app.onlyfansapi.com/api";
const API_KEY = process.env.ONLYFANS_API_KEY || "";

interface APIResponse<T> {
  data: T;
  _meta?: {
    _pagination?: {
      next_page: string | null;
    };
    _rate_limits?: {
      remaining_minute: number;
      limit_minute: number;
    };
  };
}

export interface APICreatorProfile {
  id: string;
  username: string;
  name?: string;
  about?: string;
  location?: string;
  website?: string;
  avatar?: string;
  avatarThumbs?: { c50?: string; c144?: string };
  header?: string;
  headerThumbs?: { w480?: string; w760?: string };
  subscribersCount?: number;
  subscribesCount?: number;
  postsCount?: number;
  photosCount?: number;
  videosCount?: number;
  audiosCount?: number;
  mediasCount?: number;
  subscribePrice?: number;
  isVerified?: boolean;
  isPerformer?: boolean;
  joinDate?: string;
  twitterUsername?: string;
  [key: string]: unknown;
}

/** Transform API profile to our local schema shape */
export function transformProfile(p: APICreatorProfile) {
  const ig = extractInstagram(p.website, p.about);
  return {
    id: String(p.id),
    username: p.username,
    displayName: p.name || p.username,
    avatarUrl: p.avatarThumbs?.c144 || p.avatar || null,
    coverUrl: p.headerThumbs?.w760 || p.header || null,
    bio: p.about || null,
    location: p.location || null,
    website: p.website || null,
    subscriberCount: p.subscribersCount || 0,
    postCount: p.postsCount || 0,
    photoCount: p.photosCount || 0,
    videoCount: p.videosCount || 0,
    mediaCount: p.mediasCount || 0,
    hasInstagram: !!ig,
    instagramHandle: ig,
    isFree: !p.subscribePrice || p.subscribePrice === 0,
    subscriptionPrice: p.subscribePrice || 0,
    isVerified: p.isVerified || false,
    joinedAt: p.joinDate || null,
    fetchedAt: new Date().toISOString(),
    rawJson: JSON.stringify(p),
  };
}

async function apiFetch<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<APIResponse<T>> {
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
  offset?: number;
  limit?: number;
  sort?: string;
}

/** Search creator profiles via the API */
export async function searchCreators(params: SearchParams) {
  const queryParams: Record<string, string> = {
    limit: String(params.limit || 20),
  };
  if (params.query) queryParams.query = params.query;
  if (params.offset) queryParams.offset = String(params.offset);
  if (params.sort) queryParams.sort = params.sort;

  const res = await apiFetch<APICreatorProfile[]>("/search", queryParams);
  return {
    profiles: (res.data || []).map(transformProfile),
    nextPage: res._meta?._pagination?.next_page || null,
    rateLimit: res._meta?._rate_limits || null,
  };
}

/** Get a single creator profile by username */
export async function getCreatorByUsername(username: string) {
  // The API uses an account identifier — we use a placeholder since
  // public profile lookup may not need a specific account
  const res = await apiFetch<APICreatorProfile>(`/users/${username}`);
  return transformProfile(res.data);
}
