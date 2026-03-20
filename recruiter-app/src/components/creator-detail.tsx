"use client";

import { useState } from "react";
import {
  X,
  Instagram,
  ExternalLink,
  Users,
  Image,
  Video,
  Calendar,
  MessageCircle,
  Phone,
  Mail,
  StickyNote,
  Tag,
  CheckCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  formatCount,
  timeAgo,
  PIPELINE_STAGES,
  STAGE_COLORS,
  type PipelineStage,
} from "@/lib/utils";

interface CreatorDetailProps {
  creator: any;
  tags?: any[];
  allTags?: any[];
  onClose: () => void;
  onUpdateStatus: (status: string) => void;
  onUpdateNotes: (notes: string) => void;
  onLogOutreach: (action: string, details: string) => void;
  onToggleTag: (tagId: number, action: "add" | "remove") => void;
}

export function CreatorDetail({
  creator,
  tags = [],
  allTags = [],
  onClose,
  onUpdateStatus,
  onUpdateNotes,
  onLogOutreach,
  onToggleTag,
}: CreatorDetailProps) {
  const [notes, setNotes] = useState(creator.favorite?.notes || "");
  const [outreachNote, setOutreachNote] = useState("");
  const stage = creator.favorite?.status as PipelineStage | undefined;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative">
          <div className="h-32 bg-gradient-to-r from-purple-500 to-pink-500">
            {creator.coverUrl && (
              <img
                src={creator.coverUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/40 rounded-full p-1.5 text-white hover:bg-black/60"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="px-6 -mt-12 relative z-10">
            <div className="w-24 h-24 rounded-full border-4 border-card bg-muted overflow-hidden">
              {creator.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                  {(creator.displayName || creator.username)?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 pt-3 space-y-5">
          {/* Identity */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">
                {creator.displayName || creator.username}
              </h2>
              {creator.isVerified && (
                <CheckCircle className="h-5 w-5 text-blue-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{creator.username}</p>
            {creator.bio && (
              <p className="text-sm mt-2 text-foreground/80">{creator.bio}</p>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                icon: Users,
                label: "Subscribers",
                value: formatCount(creator.subscriberCount || 0),
              },
              {
                icon: Image,
                label: "Photos",
                value: formatCount(creator.photoCount || 0),
              },
              {
                icon: Video,
                label: "Videos",
                value: formatCount(creator.videoCount || 0),
              },
              {
                icon: Calendar,
                label: "Joined",
                value: creator.joinedAt
                  ? new Date(creator.joinedAt).toLocaleDateString()
                  : "Unknown",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg bg-muted/50 p-3 text-center"
              >
                <stat.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Links */}
          <div className="flex gap-2 flex-wrap">
            <a
              href={`https://onlyfans.com/${creator.username}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3 w-3 mr-1" />
                OnlyFans Profile
              </Button>
            </a>
            {creator.instagramHandle && (
              <a
                href={`https://instagram.com/${creator.instagramHandle}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="text-pink-600">
                  <Instagram className="h-3 w-3 mr-1" />@
                  {creator.instagramHandle}
                </Button>
              </a>
            )}
            <span
              className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                creator.isFree
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {creator.isFree ? "FREE" : `$${creator.subscriptionPrice}/mo`}
            </span>
          </div>

          {/* Pipeline status */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Pipeline Status</h3>
            <div className="flex gap-1.5 flex-wrap">
              {PIPELINE_STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdateStatus(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    stage === s
                      ? STAGE_COLORS[s] + " ring-2 ring-offset-1 ring-primary"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Tags</h3>
            <div className="flex gap-1.5 flex-wrap">
              {allTags.map((tag: any) => {
                const isActive = creator.tagIds?.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() =>
                      onToggleTag(tag.id, isActive ? "remove" : "add")
                    }
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                      isActive
                        ? "text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    style={isActive ? { backgroundColor: tag.color } : {}}
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => onUpdateNotes(notes)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Add recruitment notes..."
            />
          </div>

          {/* Quick outreach logging */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Log Outreach</h3>
            <div className="flex gap-2 mb-2">
              {[
                { action: "dm_sent", icon: MessageCircle, label: "DM" },
                { action: "ig_messaged", icon: Instagram, label: "IG" },
                { action: "email_sent", icon: Mail, label: "Email" },
                { action: "call", icon: Phone, label: "Call" },
              ].map((o) => (
                <Button
                  key={o.action}
                  variant="outline"
                  size="sm"
                  onClick={() => onLogOutreach(o.action, outreachNote)}
                  className="flex-1"
                >
                  <o.icon className="h-3 w-3 mr-1" />
                  {o.label}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Optional note about this outreach..."
              value={outreachNote}
              onChange={(e) => setOutreachNote(e.target.value)}
            />
          </div>

          {/* Outreach history */}
          {creator.outreachHistory?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">History</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {creator.outreachHistory.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 text-xs"
                  >
                    <span className="text-muted-foreground whitespace-nowrap">
                      {timeAgo(entry.createdAt)}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {entry.action.replace("_", " ")}
                    </Badge>
                    {entry.details && (
                      <span className="text-foreground/70">{entry.details}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
