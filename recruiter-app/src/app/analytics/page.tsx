"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Heart,
  Instagram,
  TrendingUp,
  MessageCircle,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import { PIPELINE_STAGES, STAGE_COLORS, type PipelineStage } from "@/lib/utils";

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color = "text-primary",
}: {
  icon: any;
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 bg-muted ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {subtext && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {subtext}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      return res.json();
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading analytics...
      </div>
    );
  }

  const pipeline = data.pipelineStats || {};
  const outreach = data.recentOutreach || {};
  const conversion = data.conversionRates || {};

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Recruitment performance overview
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Creators Cached"
          value={data.totalCreators}
          color="text-blue-600"
        />
        <StatCard
          icon={Heart}
          label="In Pipeline"
          value={data.totalFavorites}
          color="text-red-500"
        />
        <StatCard
          icon={Instagram}
          label="With Instagram"
          value={data.withInstagram}
          subtext={`${data.totalCreators > 0 ? Math.round((data.withInstagram / data.totalCreators) * 100) : 0}% of total`}
          color="text-pink-600"
        />
        <StatCard
          icon={CheckCircle}
          label="Signed"
          value={pipeline.signed || 0}
          color="text-green-600"
        />
      </div>

      {/* Pipeline breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Pipeline Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PIPELINE_STAGES.map((stage) => (
            <div
              key={stage}
              className={`rounded-lg p-4 text-center ${STAGE_COLORS[stage]}`}
            >
              <p className="text-2xl font-bold">{pipeline[stage] || 0}</p>
              <p className="text-xs capitalize font-medium">{stage}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Conversion funnel */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Conversion Rates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-5 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
            <p className="text-3xl font-bold">
              {conversion.contactToResponse?.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Contact → Response Rate
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <p className="text-3xl font-bold">
              {conversion.responseToSigned?.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Response → Signed Rate
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-3xl font-bold">
              {conversion.overallConversion?.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Overall Pipeline → Signed
            </p>
          </div>
        </div>
      </div>

      {/* Recent outreach (last 7 days) */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Outreach Activity (Last 7 Days)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: "dm_sent", label: "DMs Sent", icon: MessageCircle },
            { key: "ig_messaged", label: "IG Messages", icon: Instagram },
            { key: "email_sent", label: "Emails", icon: BarChart3 },
            { key: "call", label: "Calls", icon: Users },
          ].map((item) => (
            <div
              key={item.key}
              className="rounded-lg border bg-card p-4 text-center"
            >
              <item.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xl font-bold">{outreach[item.key] || 0}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
