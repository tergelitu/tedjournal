import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  computeStats,
  drawdownSeries,
  filterByRange,
  formatPip,
  statsByPair,
  useTrades,
  type RangeKey,
} from "@/lib/trades";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Trading Dashboard — TedJournal" },
      {
        name: "description",
        content: "Win rate, net pips, win rate by pair and result split for weekly to all-time.",
      },
      { property: "og:title", content: "Trading Dashboard — TedJournal" },
      {
        property: "og:description",
        content: "Pip-first performance dashboard: win rate, net pips and pair breakdown.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://trade-tales-cyan.lovable.app/dashboard" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://trade-tales-cyan.lovable.app/dashboard" }],
  }),
  component: DashboardPage,
});

const ranges: { value: RangeKey; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "all", label: "All time" },
];

const RESULT_COLORS: Record<string, string> = {
  TP: "var(--color-chart-2)",
  BE: "var(--color-chart-1)",
  SL: "var(--color-chart-3)",
};

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "up" | "down";
}) {
  return (
    <div className="surface-panel p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`num mt-2 text-2xl font-semibold ${
          accent === "up" ? "text-success" : accent === "down" ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function DashboardPage() {
  const { data: trades = [], isLoading } = useTrades();
  const [range, setRange] = useState<RangeKey>("monthly");

  const scoped = useMemo(() => filterByRange(trades, range), [trades, range]);
  const stats = useMemo(() => computeStats(scoped), [scoped]);
  const pairs = useMemo(() => statsByPair(scoped), [scoped]);

  const pie = [
    { name: "TP", value: stats.wins },
    { name: "BE", value: stats.breakEven },
    { name: "SL", value: stats.losses },
  ].filter((d) => d.value > 0);

  const equity = useMemo(() => {
    let running = 0;
    return scoped
      .slice()
      .sort((a, b) => +new Date(a.traded_at) - +new Date(b.traded_at))
      .map((t, i) => {
        running += Number(t.net_pip);
        return { idx: i + 1, pips: Math.round(running * 10) / 10 };
      });
  }, [scoped]);
  const drawdown = useMemo(() => drawdownSeries(scoped), [scoped]);

  const ratio = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : "∞");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pips lead the scoreboard — dollars are only an estimate.
          </p>
        </div>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-secondary/40 p-1">
          {ranges.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={range === r.value ? "default" : "ghost"}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your trades…</p>
      ) : scoped.length === 0 ? (
        <div className="surface-panel p-10 text-center text-sm text-muted-foreground">
          No trades in this period yet. Log one from “New trade”.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Net pips"
              value={formatPip(stats.netPip)}
              sub="Primary performance metric"
              accent={stats.netPip >= 0 ? "up" : "down"}
            />
            <Stat
              label="Win rate"
              value={`${stats.winRate.toFixed(1)}%`}
              sub={`${stats.wins}W · ${stats.breakEven}BE · ${stats.losses}L`}
            />
            <Stat label="Trades" value={String(stats.count)} sub="Entries logged" />
            <Stat
              label="Est. dollars"
              value={`${stats.netDollars >= 0 ? "+" : "-"}$${Math.abs(stats.netDollars).toFixed(0)}`}
              sub="Secondary — pips first"
            />
            <Stat
              label="Profit factor"
              value={ratio(stats.profitFactor)}
              sub="Gross wins ÷ gross losses"
              accent={stats.profitFactor >= 1 ? "up" : "down"}
            />
            <Stat
              label="Expectancy / trade"
              value={`${formatPip(stats.expectancy)}p`}
              sub="Average outcome"
              accent={stats.expectancy >= 0 ? "up" : "down"}
            />
            <Stat
              label="Avg win ÷ loss"
              value={ratio(stats.payoffRatio)}
              sub="Payoff ratio"
            />
            <Stat
              label="Max drawdown"
              value={`${stats.maxDrawdown.toFixed(1)}p`}
              sub="Largest peak-to-trough decline"
              accent={stats.maxDrawdown > 0 ? "down" : undefined}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <section className="surface-panel p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Result split
              </h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                      {pie.map((entry) => (
                        <Cell key={entry.name} fill={RESULT_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        color: "var(--color-popover-foreground)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="surface-panel p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Cumulative pips
              </h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equity}>
                    <XAxis dataKey="idx" stroke="var(--color-muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        color: "var(--color-popover-foreground)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pips"
                      stroke="var(--color-chart-1)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="surface-panel p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Drawdown over time
              </h2>
              <span className="num text-xs text-destructive">Max −{stats.maxDrawdown.toFixed(1)}p</span>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={drawdown}>
                  <XAxis dataKey="trade" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip
                    formatter={(value: number) => `${Number(value).toFixed(1)} pips`}
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="drawdown"
                    stroke="var(--color-chart-3)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="surface-panel p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Win rate by pair
            </h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pairs.slice(0, 10)}>
                  <XAxis dataKey="pair" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis
                    unit="%"
                    domain={[0, 100]}
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                  />
                  <Tooltip
                    formatter={(v: number) => `${Number(v).toFixed(1)}%`}
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                  <Bar dataKey="winRate" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4">Pair</th>
                    <th className="py-2 pr-4">Trades</th>
                    <th className="py-2 pr-4">Win rate</th>
                    <th className="py-2 pr-4">Net pips</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((p) => (
                    <tr key={p.pair} className="border-t border-border/70">
                      <td className="py-2 pr-4 font-medium">{p.pair}</td>
                      <td className="num py-2 pr-4">{p.count}</td>
                      <td className="num py-2 pr-4">{p.winRate.toFixed(1)}%</td>
                      <td
                        className={`num py-2 pr-4 ${p.netPip >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {formatPip(p.netPip)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
