import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  estimateDollars,
  formatPip,
  useDeleteTrade,
  useScreenshotUrls,
  useTrades,
  type Trade,
} from "@/lib/trades";

export const Route = createFileRoute("/_authenticated/log")({
  head: () => ({
    meta: [
      { title: "Screenshot Log — TedJournal" },
      {
        name: "description",
        content: "Every logged trade with its chart screenshot, pips, lot size and result.",
      },
      { property: "og:title", content: "Screenshot Log — TedJournal" },
      {
        property: "og:description",
        content: "Browse your trade screenshots with pair, session, pips and outcome.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://trade-tales-cyan.lovable.app/log" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://trade-tales-cyan.lovable.app/log" }],
  }),
  component: LogPage,
});

function resultBadge(result: string) {
  if (result === "tp") return "bg-success/15 text-success";
  if (result === "sl") return "bg-destructive/15 text-destructive";
  return "bg-secondary text-muted-foreground";
}

function LogPage() {
  const { data: trades = [], isLoading } = useTrades();
  const deleteTrade = useDeleteTrade();
  const [zoom, setZoom] = useState<string | null>(null);

  const paths = useMemo(
    () => trades.map((t) => t.screenshot_path).filter((p): p is string => Boolean(p)),
    [trades],
  );
  const { data: urls = {} } = useScreenshotUrls(paths);

  async function remove(trade: Trade) {
    try {
      await deleteTrade.mutateAsync(trade);
      toast.success("Trade removed.");
    } catch {
      toast.error("Could not remove that trade.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Screenshot log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {trades.length} trade{trades.length === 1 ? "" : "s"} logged.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your trades…</p>
      ) : trades.length === 0 ? (
        <div className="surface-panel p-10 text-center text-sm text-muted-foreground">
          Nothing logged yet — upload your first chart from “New trade”.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trades.map((trade) => {
            const url = trade.screenshot_path ? urls[trade.screenshot_path] : undefined;
            return (
              <article key={trade.id} className="surface-panel overflow-hidden">
                <button
                  type="button"
                  className="block w-full bg-secondary/40"
                  onClick={() => url && setZoom(url)}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={`${trade.pair} trade chart screenshot`}
                      loading="lazy"
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="h-44 w-full animate-pulse bg-secondary/60" />
                  )}
                </button>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-display text-base font-semibold">{trade.pair}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(trade.traded_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`num rounded-md px-2 py-1 text-xs font-semibold uppercase ${resultBadge(trade.result)}`}
                    >
                      {trade.result}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{trade.direction}</Badge>
                    <Badge variant="secondary">{trade.session.replace("-", " ")}</Badge>
                    <Badge variant="secondary">{Number(trade.lot_size)} lot</Badge>
                    {trade.setup_tag ? <Badge variant="outline">{trade.setup_tag}</Badge> : null}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">TP</p>
                      <p className="num">{Number(trade.tp_pip)}p</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">SL</p>
                      <p className="num">{Number(trade.sl_pip)}p</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net</p>
                      <p
                        className={`num ${Number(trade.net_pip) >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {formatPip(Number(trade.net_pip))}p
                      </p>
                    </div>
                  </div>
                  {trade.actual_pip !== null ? (
                    <p className="text-xs text-muted-foreground">
                      Actual result: <span className="num text-foreground">{formatPip(Number(trade.actual_pip))}p</span>
                    </p>
                  ) : null}
                  {trade.notes ? (
                    <p className="text-xs text-muted-foreground">{trade.notes}</p>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="num text-xs text-muted-foreground">
                      est. ${estimateDollars(Number(trade.net_pip), Number(trade.lot_size)).toFixed(0)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(trade)}
                      aria-label="Delete trade"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(zoom)} onOpenChange={(open) => !open && setZoom(null)}>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="sr-only">Trade screenshot</DialogTitle>
          {zoom ? (
            <img src={zoom} alt="Trade chart screenshot enlarged" className="w-full rounded-lg" />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
