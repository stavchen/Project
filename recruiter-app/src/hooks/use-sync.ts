"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export interface SyncStatus {
  id: string;
  status: "idle" | "running" | "paused" | "done" | "error";
  totalSynced: number;
  cursor: string | null;
  updatedAt: string | null;
  startedAt: string | null;
  error: string | null;
  message?: string;
}

export function useSync() {
  const qc = useQueryClient();
  const autoSyncTriggered = useRef(false);

  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ["sync-status"],
    queryFn: async () => {
      const res = await fetch("/api/sync");
      return res.json();
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll every 2s while running/paused (auto-continuing)
      if (status === "running" || status === "paused") return 2000;
      return false;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (reset: boolean = false) => {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sync-status"] });
      // Refresh creator list when sync makes progress
      qc.invalidateQueries({ queryKey: ["creators"] });
    },
  });

  // Auto-continue when status is "paused" (more pages to fetch)
  useEffect(() => {
    if (
      syncStatus?.status === "paused" &&
      !syncMutation.isPending
    ) {
      syncMutation.mutate(false);
    }
  }, [syncStatus?.status, syncMutation.isPending]);

  // Auto-start sync on first load if never synced
  useEffect(() => {
    if (
      syncStatus &&
      syncStatus.status === "idle" &&
      !syncStatus.totalSynced &&
      !autoSyncTriggered.current &&
      !syncMutation.isPending
    ) {
      autoSyncTriggered.current = true;
      syncMutation.mutate(false);
    }
  }, [syncStatus, syncMutation.isPending]);

  const startSync = (reset = false) => syncMutation.mutate(reset);

  const isRunning =
    syncStatus?.status === "running" || syncStatus?.status === "paused";

  return {
    syncStatus,
    startSync,
    isRunning,
    isSyncing: syncMutation.isPending || isRunning,
  };
}
