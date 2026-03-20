"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreatorCard } from "@/components/creator-card";
import { CreatorDetail } from "@/components/creator-detail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFavorite, useTags } from "@/hooks/use-creators";
import {
  PIPELINE_STAGES,
  STAGE_COLORS,
  creatorsToCSV,
  type PipelineStage,
} from "@/lib/utils";
import { Download, Users } from "lucide-react";

export default function PipelinePage() {
  const [detailCreator, setDetailCreator] = useState<any>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const qc = useQueryClient();
  const { updateFavorite, removeFavorite } = useFavorite();
  const { tags, toggleTag } = useTags();

  const { data, isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await fetch("/api/favorites");
      return res.json();
    },
  });

  const allFavorites = data?.data || [];

  // Group by pipeline stage
  const grouped = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = allFavorites.filter(
        (c: any) => c.favorite?.status === stage
      );
      return acc;
    },
    {} as Record<PipelineStage, any[]>
  );

  const handleUpdateStatus = useCallback(
    (creatorId: string, status: string) => {
      updateFavorite.mutate({ creatorId, status });
    },
    [updateFavorite]
  );

  const handleUpdateNotes = useCallback(
    (creatorId: string, notes: string) => {
      updateFavorite.mutate({ creatorId, notes });
    },
    [updateFavorite]
  );

  const handleLogOutreach = useCallback(
    async (creatorId: string, action: string, details: string) => {
      await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, action, details }),
      });
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
    [qc]
  );

  const handleToggleTag = useCallback(
    (creatorId: string, tagId: number, action: "add" | "remove") => {
      toggleTag.mutate({ creatorId, tagId, action });
    },
    [toggleTag]
  );

  const handleExport = useCallback(() => {
    const csv = creatorsToCSV(
      allFavorites.map((c: any) => ({
        ...c,
        status: c.favorite?.status,
        notes: c.favorite?.notes,
      }))
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pipeline-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [allFavorites]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading pipeline...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recruitment Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {allFavorites.length} creators in pipeline
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Stage tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveStage(null)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeStage === null
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          All ({allFavorites.length})
        </button>
        {PIPELINE_STAGES.map((stage) => (
          <button
            key={stage}
            onClick={() => setActiveStage(stage)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              activeStage === stage
                ? STAGE_COLORS[stage] + " ring-2 ring-offset-1 ring-primary"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {stage} ({grouped[stage].length})
          </button>
        ))}
      </div>

      {/* Kanban view when showing all, list view when filtered */}
      {activeStage === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage} className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Badge
                  className={`${STAGE_COLORS[stage]} capitalize text-xs`}
                  variant="secondary"
                >
                  {stage}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {grouped[stage].length}
                </span>
              </div>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {grouped[stage].map((creator: any) => (
                  <CreatorCard
                    key={creator.id}
                    creator={creator}
                    tags={tags}
                    compact
                    onFavorite={() =>
                      removeFavorite.mutate(creator.id)
                    }
                    onUpdateStatus={(status) =>
                      handleUpdateStatus(creator.id, status)
                    }
                    onOpenDetail={() => setDetailCreator(creator)}
                  />
                ))}
                {grouped[stage].length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No creators
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {grouped[activeStage as PipelineStage].map((creator: any) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              tags={tags}
              onFavorite={() => removeFavorite.mutate(creator.id)}
              onUpdateStatus={(status) =>
                handleUpdateStatus(creator.id, status)
              }
              onOpenDetail={() => setDetailCreator(creator)}
            />
          ))}
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
            handleUpdateStatus(detailCreator.id, status);
            setDetailCreator({
              ...detailCreator,
              favorite: { ...detailCreator.favorite, status },
            });
          }}
          onUpdateNotes={(notes) => handleUpdateNotes(detailCreator.id, notes)}
          onLogOutreach={(action, details) =>
            handleLogOutreach(detailCreator.id, action, details)
          }
          onToggleTag={(tagId, action) =>
            handleToggleTag(detailCreator.id, tagId, action)
          }
        />
      )}
    </div>
  );
}
