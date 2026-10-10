import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  endOfMonth,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";

import { Button } from "@/components/ui/button";
import { computeStats, formatPip, useTrades, type Trade } from "@/lib/trades";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Trading Calendar — TedJournal" },
      {
        name: "description",
        content: "Daily trade count, win rate, net pips and estimated dollars month by month.",
      },
      { property: "og:title", content: "Trading Calendar — TedJournal" },
      {
        property: "og:description",
        content: "See each trading day's count, win rate and net pips at a glance.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "http://localhost:8080/calendar" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "http://localhost:8080/calendar" }],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { data: trades = [] } = useTrades();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, Trade[]>();
    trades.forEach((t) => {
      const key = format(new Date(t.traded_at), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    });
    return map;
  }, [trades]);

  const monthTrades = trades.filter((t) => isSameMonth(new Date(t.traded_at), month));
  const monthStats = computeStats(monthTrades);
  const selectedTrades = selected
    ? (byDay.get(format(selected, "yyyy-MM-dd")) ?? [])
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Net pips per day — the dollar figure is only an estimate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => setMonth(addMonths(month, -1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="font-display w-40 text-center text-base font-semibold">
            {format(month, "MMMM yyyy")}
          </span>
          <Button variant="secondary" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Trades", value: String(monthStats.count) },
          { label: "Win rate", value: `${monthStats.winRate.toFixed(1)}%` },
          { label: "Net pips", value: formatPip(monthStats.netPip) },
          {
            label: "Est. net $",
            value: `${monthStats.netDollars >= 0 ? "+" : "-"}$${Math.abs(monthStats.netDollars).toFixed(0)}`,
          },
        ].map((item) => (
          <div key={item.label} className="surface-panel p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{item.label}</p>
            <p className="num mt-2 text-2xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="surface-panel p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-wider text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d} className="py-2">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayTrades = byDay.get(format(day, "yyyy-MM-dd")) ?? [];
            const stats = computeStats(dayTrades);
            const outside = !isSameMonth(day, month);
            const isSelected = selected && isSameDay(day, selected);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelected(day)}
                className={`min-h-24 rounded-lg border p-2 text-left transition-colors ${
                  outside ? "border-transparent opacity-35" : "border-border/70"
                } ${isSelected ? "glow-ring border-primary/60" : ""} ${
                  dayTrades.length
                    ? stats.netPip > 0
                      ? "bg-success/10"
                      : stats.netPip < 0
                        ? "bg-destructive/10"
                        : "bg-secondary/50"
                    : "hover:bg-secondary/40"
                }`}
              >
                <span className="num text-xs text-muted-foreground">{format(day, "d")}</span>
                {dayTrades.length ? (
                  <span className="mt-1 block space-y-0.5">
                    <span
                      className={`num block text-sm font-semibold ${
                        stats.netPip >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatPip(stats.netPip)}p
                    </span>
                    <span className="num block text-[11px] text-muted-foreground">
                      {stats.count} tr · {stats.winRate.toFixed(0)}%
                    </span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div className="surface-panel p-5">
          <h2 className="font-display text-base font-semibold">
            {format(selected, "EEEE, d MMM yyyy")}
          </h2>
          {selectedTrades.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No trades on this day.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border/70">
              {selectedTrades.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="font-medium">{t.pair}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.direction} · {t.session.replace("-", " ")} · {Number(t.lot_size)} lot
                  </span>
                  <span
                    className={`num ${Number(t.net_pip) >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {formatPip(Number(t.net_pip))}p
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
