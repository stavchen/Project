import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Extract Instagram handle from website URL or bio text */
export function extractInstagram(
  website?: string | null,
  bio?: string | null
): string | null {
  const HANDLE_RE = /[a-zA-Z0-9_.]{1,30}/;

  // Check website field first — if the whole URL is an instagram link
  if (website) {
    const urlMatch = website.match(
      /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i
    );
    if (urlMatch) return urlMatch[1];
  }

  if (!bio) return null;

  // 1. instagram.com/handle URLs in bio
  const bioUrlMatch = bio.match(
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i
  );
  if (bioUrlMatch) return bioUrlMatch[1];

  // 2. Keyword + optional separator + @handle patterns
  //    Matches: "IG: @user", "ig @user", "ig- user", "ig = @user",
  //    "instagram: @user", "insta @user", "my ig is @user", etc.
  const keywordMatch = bio.match(
    /(?:^|[\s,;|(])\s*(?:ig|instagram|insta)\s*(?:[:\-=>\s]|is)\s*@?([a-zA-Z0-9_.]{1,30})/i
  );
  if (keywordMatch && !isCommonWord(keywordMatch[1])) return keywordMatch[1];

  // 3. Camera emoji patterns: "📸 @user", "📸: user", "📷 @user"
  const cameraMatch = bio.match(
    /[📸📷]\s*[:\-=]?\s*@?([a-zA-Z0-9_.]{1,30})/
  );
  if (cameraMatch && !isCommonWord(cameraMatch[1])) return cameraMatch[1];

  // 4. "follow me on ig/insta" or "find me on instagram"
  const followMatch = bio.match(
    /(?:follow|find|add|dm|hmu|hit me up)\s+(?:me\s+)?(?:on\s+)?(?:ig|instagram|insta)\s*[:\-=@]?\s*@?([a-zA-Z0-9_.]{1,30})/i
  );
  if (followMatch && !isCommonWord(followMatch[1])) return followMatch[1];

  // 5. "@handle" right after "ig"/"insta" with 📩/➡️/👉 separators
  const arrowMatch = bio.match(
    /(?:ig|instagram|insta)\s*[📩➡️👉🔗💌]+\s*@?([a-zA-Z0-9_.]{1,30})/i
  );
  if (arrowMatch && !isCommonWord(arrowMatch[1])) return arrowMatch[1];

  return null;
}

/** Filter out false-positive matches that are common English words, not handles */
function isCommonWord(s: string): boolean {
  const words = new Set([
    "me", "my", "i", "is", "the", "a", "an", "and", "or", "for", "on",
    "in", "to", "dm", "link", "bio", "here", "page", "free", "new",
    "hi", "hey", "not", "no", "yes", "all", "available", "content",
  ]);
  return words.has(s.toLowerCase());
}

/** Format a number with K/M suffixes */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/** Format relative time like "2d ago", "3h ago" */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Convert creators data to CSV */
export function creatorsToCSV(
  data: Array<{
    username: string;
    displayName?: string | null;
    subscriberCount?: number | null;
    postCount?: number | null;
    instagramHandle?: string | null;
    subscriptionPrice?: number | null;
    joinedAt?: string | null;
    status?: string | null;
    notes?: string | null;
  }>
): string {
  const headers = [
    "Username",
    "Display Name",
    "Subscribers",
    "Posts",
    "Instagram",
    "Price",
    "Joined",
    "Status",
    "Notes",
  ];
  const rows = data.map((c) => [
    c.username,
    c.displayName || "",
    c.subscriberCount?.toString() || "0",
    c.postCount?.toString() || "0",
    c.instagramHandle || "",
    c.subscriptionPrice?.toString() || "Free",
    c.joinedAt || "",
    c.status || "",
    (c.notes || "").replace(/"/g, '""'),
  ]);
  return [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
  ].join("\n");
}

export const PIPELINE_STAGES = [
  "discovered",
  "contacted",
  "responded",
  "negotiating",
  "signed",
  "passed",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_COLORS: Record<PipelineStage, string> = {
  discovered: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  responded: "bg-purple-100 text-purple-800",
  negotiating: "bg-orange-100 text-orange-800",
  signed: "bg-green-100 text-green-800",
  passed: "bg-gray-100 text-gray-800",
};
