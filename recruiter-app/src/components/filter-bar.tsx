"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Save, Instagram, Star, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import type { SearchFilters } from "@/hooks/use-creators";

interface FilterBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSaveSearch?: () => void;
  savedSearches?: Array<{ id: number; name: string; filters: string }>;
  onLoadSearch?: (filters: string) => void;
}

export function FilterBar({
  filters,
  onFiltersChange,
  onSaveSearch,
  savedSearches = [],
  onLoadSearch,
}: FilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.query);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.query) {
        onFiltersChange({ ...filters, query: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, bio, location..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort */}
        <select
          value={filters.sort}
          onChange={(e) => onFiltersChange({ ...filters, sort: e.target.value })}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="subscribers">Most Subscribers</option>
        </select>

        {/* Source toggle */}
        <select
          value={filters.source}
          onChange={(e) =>
            onFiltersChange({ ...filters, source: e.target.value })
          }
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="api">Live API</option>
          <option value="cache">Local Cache</option>
        </select>

        {/* Save search */}
        {onSaveSearch && (
          <Button variant="outline" size="sm" onClick={onSaveSearch}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">
          <Filter className="h-3 w-3 inline mr-1" />
          Filters:
        </span>

        {/* Has Instagram */}
        <button
          onClick={() =>
            onFiltersChange({
              ...filters,
              hasInstagram: !filters.hasInstagram,
            })
          }
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            filters.hasInstagram
              ? "bg-pink-100 text-pink-800 border border-pink-300"
              : "bg-secondary text-secondary-foreground border border-transparent"
          }`}
        >
          <Instagram className="h-3 w-3" />
          Has Instagram
        </button>

        {/* Free/Paid */}
        {["all", "true", "false"].map((val) => (
          <button
            key={val}
            onClick={() => onFiltersChange({ ...filters, isFree: val })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filters.isFree === val
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {val === "all" ? "All" : val === "true" ? "Free" : "Paid"}
          </button>
        ))}

        {/* Subscriber range */}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            placeholder="Min subs"
            value={filters.minSubscribers}
            onChange={(e) =>
              onFiltersChange({ ...filters, minSubscribers: e.target.value })
            }
            className="h-7 w-24 text-xs"
          />
          <span className="text-muted-foreground text-xs">-</span>
          <Input
            type="number"
            placeholder="Max subs"
            value={filters.maxSubscribers}
            onChange={(e) =>
              onFiltersChange({ ...filters, maxSubscribers: e.target.value })
            }
            className="h-7 w-24 text-xs"
          />
        </div>

        {/* Active filter count */}
        {(filters.hasInstagram ||
          filters.isFree !== "all" ||
          filters.minSubscribers ||
          filters.maxSubscribers) && (
          <button
            onClick={() =>
              onFiltersChange({
                ...filters,
                hasInstagram: false,
                isFree: "all",
                minSubscribers: "",
                maxSubscribers: "",
              })
            }
            className="text-xs text-destructive hover:underline"
          >
            <X className="h-3 w-3 inline" /> Clear filters
          </button>
        )}
      </div>

      {/* Saved searches */}
      {savedSearches.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">
            <Star className="h-3 w-3 inline mr-1" />
            Saved:
          </span>
          {savedSearches.map((s) => (
            <button
              key={s.id}
              onClick={() => onLoadSearch?.(s.filters)}
              className="rounded-full px-3 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
