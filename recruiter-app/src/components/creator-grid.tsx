"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { CreatorCard } from "./creator-card";
import { CreatorDetail } from "./creator-detail";

interface CreatorGridProps {
  creators: any[];
  tags: any[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  onFavorite: (creatorId: string) => void;
  onUpdateStatus: (creatorId: string, status: string) => void;
  onUpdateNotes: (creatorId: string, notes: string) => void;
  onLogOutreach: (creatorId: string, action: string, details: string) => void;
  onToggleTag: (creatorId: string, tagId: number, action: "add" | "remove") => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export function CreatorGrid({
  creators,
  tags,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  onFavorite,
  onUpdateStatus,
  onUpdateNotes,
  onLogOutreach,
  onToggleTag,
  selectedIds,
  onToggleSelect,
}: CreatorGridProps) {
  const [detailCreator, setDetailCreator] = useState<any>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Infinite scroll trigger
  const lastCardRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && detailCreator) {
        setDetailCreator(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [detailCreator]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Searching creators...</span>
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg font-medium">No creators found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {creators.map((creator, idx) => (
          <div
            key={creator.id}
            ref={idx === creators.length - 3 ? lastCardRef : undefined}
          >
            <CreatorCard
              creator={creator}
              tags={tags}
              selected={selectedIds.has(creator.id)}
              onSelect={() => onToggleSelect(creator.id)}
              onFavorite={() => onFavorite(creator.id)}
              onUpdateStatus={(status) => onUpdateStatus(creator.id, status)}
              onOpenDetail={() => setDetailCreator(creator)}
            />
          </div>
        ))}
      </div>

      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading more...
          </span>
        </div>
      )}

      {/* Detail modal */}
      {detailCreator && (
        <CreatorDetail
          creator={detailCreator}
          tags={tags.filter((t: any) =>
            detailCreator.tagIds?.includes(t.id)
          )}
          allTags={tags}
          onClose={() => setDetailCreator(null)}
          onUpdateStatus={(status) => {
            onUpdateStatus(detailCreator.id, status);
            setDetailCreator({ ...detailCreator, favorite: { ...detailCreator.favorite, status } });
          }}
          onUpdateNotes={(notes) => onUpdateNotes(detailCreator.id, notes)}
          onLogOutreach={(action, details) =>
            onLogOutreach(detailCreator.id, action, details)
          }
          onToggleTag={(tagId, action) =>
            onToggleTag(detailCreator.id, tagId, action)
          }
        />
      )}
    </>
  );
}
