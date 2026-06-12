"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ScoreChartProps = {
  data: { at: string; score: number }[];
};

export function ScoreChart({ data }: ScoreChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Complete a session to see your score trend.</p>
    );
  }

  const chartData = data.map((point) => ({
    ...point,
    label: new Date(point.at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#64748B" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#64748B" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          labelFormatter={(_, payload) => {
            const at = payload?.[0]?.payload?.at as string | undefined;
            return at
              ? new Date(at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "";
          }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #E2E8F0",
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#6366F1"
          strokeWidth={2}
          dot={{ r: 3, fill: "#6366F1", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
