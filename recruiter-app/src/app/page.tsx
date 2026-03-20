"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FilterBar } from "@/components/filter-bar";
import { CreatorGrid } from "@/components/creator-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreators,
  useFavorite,
  useTags,
  DEFAULT_FILTERS,
  type SearchFilters,
} from "@/hooks/use-creators";
import { creatorsToCSV } from "@/lib/utils";
import { Download, CheckSquare, Tag, X } from "lucide-react";

export default function DiscoverPage() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState("");

  const qc = useQueryClient();
  const {
    creators,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useCreators(filters);
  const { addFavorite, updateFavorite, removeFavorite } = useFavorite();
  const { tags, createTag, toggleTag } = useTags();

  // Saved searches
  const { data: savedSearchesData } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: async () => {
      const res = await fetch("/api/saved-searches");
      return res.json();
    },
  });
  const savedSearches = savedSearchesData?.data || [];

  const saveSearch = useMutation({
    mutationFn: async (data: { name: string; filters: SearchFilters }) => {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-searches"] });
      setShowSaveDialog(false);
      setSearchName("");
    },
  });

  const handleFavorite = useCallback(
    (creatorId: string) => {
      const creator = creators.find((c: any) => c.id === creatorId);
      if (creator?.favorite) {
        removeFavorite.mutate(creatorId);
      } else {
        addFavorite.mutate({ creatorId });
      }
    },
    [creators, addFavorite, removeFavorite]
  );

  const handleUpdateStatus = useCallback(
    (creatorId: string, status: string) => {
      const creator = creators.find((c: any) => c.id === creatorId);
      if (!creator?.favorite) {
        addFavorite.mutate({ creatorId, status });
      } else {
        updateFavorite.mutate({ creatorId, status });
      }
    },
    [creators, addFavorite, updateFavorite]
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
      qc.invalidateQueries({ queryKey: ["creators"] });
    },
    [qc]
  );

  const handleToggleTag = useCallback(
    (creatorId: string, tagId: number, action: "add" | "remove") => {
      toggleTag.mutate({ creatorId, tagId, action });
    },
    [toggleTag]
  );

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Bulk actions
  const bulkFavorite = useCallback(() => {
    selectedIds.forEach((id) => {
      const creator = creators.find((c: any) => c.id === id);
      if (!creator?.favorite) {
        addFavorite.mutate({ creatorId: id });
      }
    });
    setSelectedIds(new Set());
  }, [selectedIds, creators, addFavorite]);

  const bulkUpdateStatus = useCallback(
    (status: string) => {
      selectedIds.forEach((id) => {
        const creator = creators.find((c: any) => c.id === id);
        if (!creator?.favorite) {
          addFavorite.mutate({ creatorId: id, status });
        } else {
          updateFavorite.mutate({ creatorId: id, status });
        }
      });
      setSelectedIds(new Set());
    },
    [selectedIds, creators, addFavorite, updateFavorite]
  );

  // CSV export
  const handleExport = useCallback(() => {
    const csv = creatorsToCSV(
      creators.map((c: any) => ({
        ...c,
        status: c.favorite?.status,
        notes: c.favorite?.notes,
      }))
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `creators-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [creators]);

  const handleLoadSearch = useCallback((filtersJson: string) => {
    try {
      const parsed = JSON.parse(filtersJson);
      setFilters(parsed);
    } catch {}
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discover Creators</h1>
          <p className="text-sm text-muted-foreground">
            {creators.length} creators loaded
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-1">
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <Button size="sm" variant="ghost" onClick={bulkFavorite}>
                Favorite All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => bulkUpdateStatus("contacted")}
              >
                Mark Contacted
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onSaveSearch={() => setShowSaveDialog(true)}
        savedSearches={savedSearches}
        onLoadSearch={handleLoadSearch}
      />

      {/* Save search dialog */}
      {showSaveDialog && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Input
            placeholder="Name this search..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="max-w-xs"
          />
          <Button
            size="sm"
            onClick={() =>
              saveSearch.mutate({ name: searchName, filters })
            }
            disabled={!searchName}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSaveDialog(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Grid */}
      <CreatorGrid
        creators={creators}
        tags={tags}
        isLoading={isLoading}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={!!hasNextPage}
        fetchNextPage={fetchNextPage}
        onFavorite={handleFavorite}
        onUpdateStatus={handleUpdateStatus}
        onUpdateNotes={handleUpdateNotes}
        onLogOutreach={handleLogOutreach}
        onToggleTag={handleToggleTag}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
      />
    </div>
  );
}
