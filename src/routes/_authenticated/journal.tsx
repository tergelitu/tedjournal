import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ImageUp, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PAIRS,
  RESULTS,
  SESSIONS,
  useCreateTrade,
  type TradeDirection,
  type TradeResult,
  type TradeSession,
} from "@/lib/trades";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({
    meta: [
      { title: "Log a Trade — TedJournal" },
      {
        name: "description",
        content: "Upload your trade screenshot, then log pair, direction, session, pips and result.",
      },
      { property: "og:title", content: "Log a Trade — TedJournal" },
      {
        property: "og:description",
        content: "Screenshot first, then pair, session, TP/SL pips, lot size and result.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://trade-tales-cyan.lovable.app/journal" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://trade-tales-cyan.lovable.app/journal" }],
  }),
  component: NewTradePage,
});

function localNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function NewTradePage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const createTrade = useCreateTrade();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pair, setPair] = useState("XAUUSD");
  const [direction, setDirection] = useState<TradeDirection>("buy");
  const [session, setSession] = useState<TradeSession>("london");
  const [result, setResult] = useState<TradeResult>("tp");
  const [tpPip, setTpPip] = useState("");
  const [slPip, setSlPip] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [setupTag, setSetupTag] = useState("");
  const [actualPip, setActualPip] = useState("");
  const [tradedAt, setTradedAt] = useState(localNow());
  const [notes, setNotes] = useState("");

  function pick(selected: File | null) {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      toast.error("Please choose an image of your chart.");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setTpPip("");
    setSlPip("");
    setLotSize("");
    setSetupTag("");
    setActualPip("");
    setNotes("");
    setTradedAt(localNow());
  }

  async function submit() {
    if (!file) return;
    if (!lotSize) {
      toast.error("Lot size is required.");
      return;
    }
    if (result === "tp" && !tpPip) {
      toast.error("Add the TP pips for this win.");
      return;
    }
    if (result === "sl" && !slPip) {
      toast.error("Add the SL pips for this loss.");
      return;
    }
    try {
      await createTrade.mutateAsync({
        file,
        pair,
        direction,
        session,
        tp_pip: Number(tpPip) || 0,
        sl_pip: Number(slPip) || 0,
        lot_size: Number(lotSize) || 0,
        result,
        setup_tag: setupTag,
        actual_pip: actualPip === "" ? null : Number(actualPip),
        traded_at: tradedAt,
        notes,
      });
      toast.success("Trade saved.");
      reset();
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the trade.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">New trade</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with the chart screenshot — the details unlock right after.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="surface-panel p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Step 1 · Screenshot
          </h2>
          {preview ? (
            <div className="mt-4 space-y-3">
              <img
                src={preview}
                alt="Uploaded trade chart screenshot"
                className="w-full rounded-xl border border-border object-contain"
              />
              <Button variant="secondary" size="sm" onClick={reset}>
                <RotateCcw className="mr-2 size-4" /> Choose another
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pick(e.dataTransfer.files?.[0] ?? null);
              }}
              className="mt-4 flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-16 text-center transition-colors hover:border-primary/60 hover:bg-secondary/50"
            >
              <ImageUp className="size-8 text-primary" />
              <span className="text-sm font-medium">Upload trade screenshot</span>
              <span className="text-xs text-muted-foreground">
                Drag and drop, or click to browse · PNG/JPG up to 10 MB
              </span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </section>

        <section className={`surface-panel p-5 ${file ? "" : "pointer-events-none opacity-45"}`}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Step 2 · Trade details
          </h2>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Pair</Label>
                <Select value={pair} onValueChange={setPair}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {PAIRS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select
                  value={direction}
                  onValueChange={(v) => setDirection(v as TradeDirection)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session</Label>
                <Select value={session} onValueChange={(v) => setSession(v as TradeSession)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tradedAt">Date &amp; time</Label>
                <Input
                  id="tradedAt"
                  type="datetime-local"
                  value={tradedAt}
                  onChange={(e) => setTradedAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tp">TP pips</Label>
                <Input
                  id="tp"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 120"
                  value={tpPip}
                  onChange={(e) => setTpPip(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sl">SL pips</Label>
                <Input
                  id="sl"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 40"
                  value={slPip}
                  onChange={(e) => setSlPip(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lot">Lot size</Label>
                <Input
                  id="lot"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="e.g. 0.20"
                  value={lotSize}
                  onChange={(e) => setLotSize(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Result</Label>
                <div className="flex gap-2">
                  {RESULTS.map((r) => (
                    <Button
                      key={r.value}
                      type="button"
                      variant={result === r.value ? "default" : "secondary"}
                      className="flex-1"
                      onClick={() => setResult(r.value)}
                    >
                      {r.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="setupTag">Setup / strategy (optional)</Label>
                <Input
                  id="setupTag"
                  placeholder="e.g. breakout"
                  value={setupTag}
                  onChange={(e) => setSetupTag(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actualPip">Actual pips (optional)</Label>
                <Input
                  id="actualPip"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="e.g. +86 or -32"
                  value={actualPip}
                  onChange={(e) => setActualPip(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Overrides the TP or SL value.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="What made this setup valid?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={submit}
              disabled={createTrade.isPending || !file}
            >
              {createTrade.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save trade
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
