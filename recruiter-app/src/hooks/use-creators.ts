"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";

export interface SearchFilters {
  query: string;
  sort: string;
  hasInstagram: boolean;
  isFree: string; // "all" | "true" | "false"
  minSubscribers: string;
  maxSubscribers: string;
  source: string; // "api" | "cache"
  creatorsOnly: boolean;
  hasProfilePic: boolean;
}

export const DEFAULT_FILTERS: SearchFilters = {
  query: "",
  sort: "newest",
  hasInstagram: false,
  isFree: "all",
  minSubscribers: "",
  maxSubscribers: "",
  source: "api",
  creatorsOnly: true,
  hasProfilePic: true,
};

async function fetchCreators({
  pageParam = "",
  filters,
}: {
  pageParam?: string;
  filters: SearchFilters;
}) {
  const params = new URLSearchParams({
    limit: "20",
    sort: filters.sort,
    source: filters.source,
  });

  // Unified page token — server handles cursor vs offset internally
  if (pageParam) {
    params.set("page", pageParam);
  }

  if (filters.query) params.set("query", filters.query);
  if (filters.hasInstagram) params.set("hasInstagram", "true");
  if (filters.isFree !== "all") params.set("isFree", filters.isFree);
  if (filters.minSubscribers)
    params.set("minSubscribers", filters.minSubscribers);
  if (filters.maxSubscribers)
    params.set("maxSubscribers", filters.maxSubscribers);
  if (filters.creatorsOnly) params.set("creatorsOnly", "true");
  if (filters.hasProfilePic) params.set("hasProfilePic", "true");

  const res = await fetch(`/api/creators/search?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Search failed");
  }
  return res.json();
}

export function useCreators(filters: SearchFilters) {
  const seenIds = useRef(new Set<string>());

  const query = useInfiniteQuery({
    queryKey: ["creators", filters],
    queryFn: ({ pageParam }) => fetchCreators({ pageParam, filters }),
    getNextPageParam: (lastPage: any) => {
      if (!lastPage.hasMore) return undefined;
      // Server returns a unified nextPage token (cursor:X or offset:X)
      return lastPage.nextPage || undefined;
    },
    initialPageParam: "",
    staleTime: 60_000,
    retry: 1,
  });

  // Auto-fetch next page when a page returns 0 results but has more
  // (happens when filters remove all results from an API page)
  useEffect(() => {
    const pages = query.data?.pages;
    if (!pages || pages.length === 0) return;
    const lastPage = pages[pages.length - 1];
    if (
      lastPage.hasMore &&
      (lastPage.data || []).length === 0 &&
      !query.isFetchingNextPage
    ) {
      query.fetchNextPage();
    }
  }, [query.data, query.isFetchingNextPage, query.fetchNextPage]);

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

/** Optimistically patch the favorite field for a creator across all infinite query pages */
function optimisticSetFavorite(
  qc: ReturnType<typeof useQueryClient>,
  creatorId: string,
  favorite: any
) {
  qc.setQueriesData({ queryKey: ["creators"] }, (old: any) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page: any) => ({
        ...page,
        data: (page.data || []).map((c: any) =>
          c.id === creatorId ? { ...c, favorite } : c
        ),
      })),
    };
  });
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
    onMutate: async ({ creatorId, status = "discovered" }) => {
      await qc.cancelQueries({ queryKey: ["creators"] });
      optimisticSetFavorite(qc, creatorId, {
        creatorId,
        status,
        addedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creators"] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (_err, { creatorId }) => {
      optimisticSetFavorite(qc, creatorId, null);
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
    onMutate: async (creatorId) => {
      await qc.cancelQueries({ queryKey: ["creators"] });
      optimisticSetFavorite(qc, creatorId, null);
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
