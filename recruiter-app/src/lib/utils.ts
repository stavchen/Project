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
  // Check website field first
  if (website) {
    const urlMatch = website.match(
      /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i
    );
    if (urlMatch) return urlMatch[1];
  }

  // Check bio text
  if (bio) {
    // Match instagram.com/handle patterns
    const bioUrlMatch = bio.match(
      /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i
    );
    if (bioUrlMatch) return bioUrlMatch[1];

    // Match "IG: @handle" or "ig: handle" patterns
    const igMatch = bio.match(
      /(?:ig|instagram|insta)\s*[:\-]\s*@?([a-zA-Z0-9_.]+)/i
    );
    if (igMatch) return igMatch[1];
  }

  return null;
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
