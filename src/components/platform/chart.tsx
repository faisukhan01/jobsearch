"use client";

import { Area, AreaChart as RechartsAreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function MomentumChart({ data }: { data: Array<{ label: string; applied: number }> }) {
  return (
    <div className="h-44 w-full sm:h-52" role="img" aria-label="Applications per day over the last 14 days">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="appliedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
          <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "oklch(0.19 0 0)",
              border: "1px solid oklch(1 0 0 / 10%)",
              borderRadius: 10,
              fontSize: 12,
              color: "#e4e4e7",
            }}
            labelStyle={{ color: "#a1a1aa" }}
            itemStyle={{ color: "#6ee7b7" }}
          />
          <Area type="monotone" dataKey="applied" stroke="#34d399" strokeWidth={2} fill="url(#appliedFill)" animationDuration={700} />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
