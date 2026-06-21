"use client";

import { Zap, Heart, ArrowUpRight, RotateCcw, Loader2, Activity } from "lucide-react";
import { cn, shortAddress, formatXlm, formatRelativeTime, explorerTxUrl } from "@/lib/utils";
import { useEvents } from "@/hooks/useEvents";
import { useEventStore } from "@/store/event-store";
import type { ContractEvent } from "@/types";

// ──────────────────────────────────────────────────────────────────────────────
// Event Configuration
// ──────────────────────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<
  ContractEvent["type"],
  { label: string; icon: typeof Heart; color: string; bg: string }
> = {
  campaign_created: {
    label: "Campaign Created",
    icon: Zap,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
  donation_made: {
    label: "Donation Made",
    icon: Heart,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  funds_withdrawn: {
    label: "Funds Withdrawn",
    icon: ArrowUpRight,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  refund_issued: {
    label: "Refund Issued",
    icon: RotateCcw,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Event Feed Component
// ──────────────────────────────────────────────────────────────────────────────

interface EventFeedProps {
  limit?: number;
  showHeader?: boolean;
}

export function EventFeed({ limit, showHeader = true }: EventFeedProps) {
  const { events: storeEvents } = useEventStore();
  const { events: queryEvents, isLoading, isPolling, refetch } = useEvents();

  // Use store events (deduped & sorted) if available, otherwise query results
  const allEvents = storeEvents.length > 0 ? storeEvents : queryEvents;
  const displayEvents = limit ? allEvents.slice(0, limit) : allEvents;

  return (
    <div className="flex flex-col gap-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg">Activity Feed</h2>
            {isPolling && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                <div className="dot-active" />
                <span className="text-xs text-primary font-medium">Live</span>
              </div>
            )}
          </div>
          <button
            onClick={() => refetch()}
            className="btn-ghost text-xs py-1.5 px-3"
            aria-label="Refresh events"
          >
            <Activity className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && displayEvents.length === 0 && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && displayEvents.length === 0 && (
        <div className="glass-card px-6 py-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
            <Activity className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground/80">No events yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Events will appear here when campaigns are created or donations are made
            </p>
          </div>
        </div>
      )}

      {/* Events list */}
      {displayEvents.length > 0 && (
        <div className="space-y-2 stagger-children">
          {displayEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Single Event Card
// ──────────────────────────────────────────────────────────────────────────────

function EventCard({ event }: { event: ContractEvent }) {
  const config = EVENT_CONFIG[event.type] || {
    label: event.type,
    icon: Activity,
    color: "text-muted-foreground",
    bg: "bg-muted/20",
  };
  const Icon = config.icon;

  return (
    <div className="event-card animate-fade-in">
      {/* Icon */}
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border",
          config.bg
        )}
      >
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full border",
                  config.bg,
                  config.color
                )}
              >
                {config.label}
              </span>
              <span className="text-xs text-muted-foreground">
                Campaign #{event.campaignId}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-foreground/90 mt-1.5 line-clamp-1">
              {event.description}
            </p>

            {/* Address + Amount */}
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs font-mono text-muted-foreground">
                {shortAddress(event.walletAddress, 4)}
              </span>
              {event.amount !== undefined && (
                <span className={cn("text-xs font-semibold", config.color)}>
                  {formatXlm(event.amount)}
                </span>
              )}
            </div>
          </div>

          {/* Right side: time + explorer */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(event.timestamp)}
            </span>
            <a
              href={explorerTxUrl(event.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:text-primary/80 font-mono transition-colors"
              title={event.txHash}
            >
              {event.txHash.slice(0, 8)}...
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Skeleton
// ──────────────────────────────────────────────────────────────────────────────

function EventCardSkeleton() {
  return (
    <div className="event-card">
      <div className="skeleton w-9 h-9 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="skeleton h-5 w-28 rounded-full" />
          <div className="skeleton h-5 w-20 rounded" />
        </div>
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="flex gap-3">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}
