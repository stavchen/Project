"use client";

import { useQuery } from "@tanstack/react-query";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Instagram,
  Mail,
  Phone,
  StickyNote,
  ArrowRightLeft,
} from "lucide-react";

const ACTION_ICONS: Record<string, any> = {
  dm_sent: MessageCircle,
  ig_messaged: Instagram,
  email_sent: Mail,
  call: Phone,
  note: StickyNote,
  status_change: ArrowRightLeft,
};

const ACTION_COLORS: Record<string, string> = {
  dm_sent: "bg-blue-100 text-blue-800",
  ig_messaged: "bg-pink-100 text-pink-800",
  email_sent: "bg-green-100 text-green-800",
  call: "bg-yellow-100 text-yellow-800",
  note: "bg-gray-100 text-gray-800",
  status_change: "bg-purple-100 text-purple-800",
};

export default function ActivityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const res = await fetch("/api/activity?limit=100");
      return res.json();
    },
  });

  const feed = data?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading activity...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity Feed</h1>
        <p className="text-sm text-muted-foreground">
          Recent recruitment activity across all creators
        </p>
      </div>

      {feed.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">No activity yet</p>
          <p className="text-sm mt-1">
            Start by discovering creators and adding them to your pipeline
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feed.map((entry: any) => {
            const Icon = ACTION_ICONS[entry.action] || StickyNote;
            const colorClass =
              ACTION_COLORS[entry.action] || "bg-gray-100 text-gray-800";
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
                  {entry.creator.avatarUrl ? (
                    <img
                      src={entry.creator.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                      {entry.creator.displayName?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {entry.creator.displayName || entry.creator.username}
                    </span>
                    <Badge
                      className={`${colorClass} text-[10px]`}
                      variant="secondary"
                    >
                      <Icon className="h-2.5 w-2.5 mr-0.5" />
                      {entry.action.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(entry.createdAt)}
                    </span>
                  </div>
                  {entry.details && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {entry.details}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
