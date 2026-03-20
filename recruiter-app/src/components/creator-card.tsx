"use client";

import { useState } from "react";
import {
  Heart,
  Instagram,
  ExternalLink,
  MessageCircle,
  Users,
  Image,
  Video,
  CheckCircle,
  Clock,
  Tag,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { formatCount, STAGE_COLORS, type PipelineStage } from "@/lib/utils";

interface CreatorCardProps {
  creator: any;
  tags?: any[];
  selected?: boolean;
  onSelect?: () => void;
  onFavorite?: () => void;
  onUpdateStatus?: (status: string) => void;
  onOpenDetail?: () => void;
  compact?: boolean;
}

export function CreatorCard({
  creator,
  tags = [],
  selected = false,
  onSelect,
  onFavorite,
  onUpdateStatus,
  onOpenDetail,
  compact = false,
}: CreatorCardProps) {
  const isFavorited = !!creator.favorite;
  const stage = creator.favorite?.status as PipelineStage | undefined;

  // Cooldown: show warning if contacted in last 48 hours
  const recentlyContacted =
    creator.favorite?.lastContactedAt &&
    Date.now() - new Date(creator.favorite.lastContactedAt).getTime() <
      48 * 60 * 60 * 1000;

  return (
    <div
      className={`group relative rounded-lg border bg-card overflow-hidden transition-all hover:shadow-md ${
        selected ? "ring-2 ring-primary" : ""
      } ${compact ? "flex items-center p-3 gap-3" : ""}`}
    >
      {/* Bulk select checkbox */}
      {onSelect && (
        <button
          onClick={onSelect}
          className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 transition-colors ${
            selected
              ? "bg-primary border-primary"
              : "border-white/70 bg-black/20 opacity-0 group-hover:opacity-100"
          }`}
        >
          {selected && (
            <CheckCircle className="h-4 w-4 text-white" />
          )}
        </button>
      )}

      {!compact && (
        <>
          {/* Cover */}
          <div className="h-20 bg-gradient-to-r from-purple-500 to-pink-500 relative">
            {creator.coverUrl && (
              <img
                src={creator.coverUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Avatar */}
          <div className="px-4 -mt-8 relative z-10">
            <div className="w-16 h-16 rounded-full border-4 border-card bg-muted overflow-hidden">
              {creator.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt={creator.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                  {(creator.displayName || creator.username)?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {compact && (
        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
          {creator.avatarUrl ? (
            <img
              src={creator.avatarUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
              {(creator.displayName || creator.username)?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
      )}

      <div className={compact ? "flex-1 min-w-0" : "p-4 pt-2"}>
        {/* Name + verification */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenDetail}
            className="font-semibold text-sm truncate hover:underline cursor-pointer"
          >
            {creator.displayName || creator.username}
          </button>
          {creator.isVerified && (
            <CheckCircle className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
          )}
        </div>

        <p className="text-xs text-muted-foreground truncate">
          @{creator.username}
          {creator.location && ` · ${creator.location}`}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {formatCount(creator.subscriberCount || 0)}
          </span>
          <span className="flex items-center gap-1">
            <Image className="h-3 w-3" />
            {formatCount(creator.photoCount || 0)}
          </span>
          <span className="flex items-center gap-1">
            <Video className="h-3 w-3" />
            {formatCount(creator.videoCount || 0)}
          </span>
          <span
            className={`font-medium ${
              creator.isFree ? "text-green-600" : "text-amber-600"
            }`}
          >
            {creator.isFree ? "FREE" : `$${creator.subscriptionPrice}/mo`}
          </span>
        </div>

        {/* Instagram */}
        {creator.instagramHandle && (
          <a
            href={`https://instagram.com/${creator.instagramHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1.5 text-xs text-pink-600 hover:text-pink-800"
          >
            <Instagram className="h-3 w-3" />@{creator.instagramHandle}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}

        {/* Tags */}
        {creator.tagIds?.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {creator.tagIds.map((tid: number) => {
              const tag = tags.find((t: any) => t.id === tid);
              return tag ? (
                <span
                  key={tid}
                  className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  <Tag className="h-2 w-2" />
                  {tag.name}
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Pipeline status + actions */}
        <div className="flex items-center gap-2 mt-3">
          {stage && (
            <Badge
              className={`${STAGE_COLORS[stage]} text-[10px] capitalize`}
              variant="secondary"
            >
              {stage}
            </Badge>
          )}

          {recentlyContacted && (
            <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              Contacted recently
            </span>
          )}

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${
              isFavorited ? "text-red-500" : "text-muted-foreground"
            }`}
            onClick={onFavorite}
          >
            <Heart
              className="h-4 w-4"
              fill={isFavorited ? "currentColor" : "none"}
            />
          </Button>

          <a
            href={`https://onlyfans.com/${creator.username}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
