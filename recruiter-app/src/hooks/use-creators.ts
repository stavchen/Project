"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";

export interface SearchFilters {
  query: string;
  sort: string;
  hasInstagram: boolean;
  isFree: string; // "all" | "true" | "false"
  minSubscribers: string;
  maxSubscribers: string;
  source: string; // "api" | "cache"
}

export const DEFAULT_FILTERS: SearchFilters = {
  query: "",
  sort: "newest",
  hasInstagram: false,
  isFree: "all",
  minSubscribers: "",
  maxSubscribers: "",
  source: "api",
};

async function fetchCreators({
  pageParam = 0,
  filters,
}: {
  pageParam?: number;
  filters: SearchFilters;
}) {
  const params = new URLSearchParams({
    offset: String(pageParam),
    limit: "20",
    sort: filters.sort,
    source: filters.source,
  });
  if (filters.query) params.set("query", filters.query);
  if (filters.hasInstagram) params.set("hasInstagram", "true");
  if (filters.isFree !== "all") params.set("isFree", filters.isFree);
  if (filters.minSubscribers) params.set("minSubscribers", filters.minSubscribers);
  if (filters.maxSubscribers) params.set("maxSubscribers", filters.maxSubscribers);

  const res = await fetch(`/api/creators/search?${params}`);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export function useCreators(filters: SearchFilters) {
  const seenIds = useRef(new Set<string>());

  const query = useInfiniteQuery({
    queryKey: ["creators", filters],
    queryFn: ({ pageParam }) => fetchCreators({ pageParam, filters }),
    getNextPageParam: (lastPage: any) =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
    initialPageParam: 0,
    staleTime: 60_000,
  });

  // Deduplicate across pages
  const creators = useMemo(() => {
    if (!query.data?.pages) return [];
    seenIds.current.clear();
    const all: any[] = [];
    for (const page of query.data.pages) {
      for (const creator of page.data || []) {
        if (!seenIds.current.has(creator.id)) {
          seenIds.current.add(creator.id);
          all.push(creator);
        }
      }
    }
    return all;
  }, [query.data]);

  return { ...query, creators };
}

export function useFavorite() {
  const qc = useQueryClient();

  const addFavorite = useMutation({
    mutationFn: async ({
      creatorId,
      status = "discovered",
    }: {
      creatorId: string;
      status?: string;
    }) => {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, status }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creators"] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  const updateFavorite = useMutation({
    mutationFn: async ({
      creatorId,
      status,
      notes,
    }: {
      creatorId: string;
      status?: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/favorites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, status, notes }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creators"] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (creatorId: string) => {
      const res = await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creators"] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  return { addFavorite, updateFavorite, removeFavorite };
}

export function useTags() {
  const qc = useQueryClient();

  const tagsQuery = useInfiniteQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await fetch("/api/tags");
      return res.json();
    },
    getNextPageParam: () => undefined,
    initialPageParam: 0,
  });

  const tags = tagsQuery.data?.pages?.[0]?.data || [];

  const createTag = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });

  const toggleTag = useMutation({
    mutationFn: async ({
      creatorId,
      tagId,
      action,
    }: {
      creatorId: string;
      tagId: number;
      action: "add" | "remove";
    }) => {
      const res = await fetch("/api/tags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, tagId, action }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creators"] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  return { tags, createTag, toggleTag, isLoading: tagsQuery.isLoading };
}
