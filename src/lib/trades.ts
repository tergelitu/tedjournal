import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SCREENSHOT_BUCKET = "trade-screenshots";

export type TradeResult = "tp" | "be" | "sl";
export type TradeDirection = "buy" | "sell";
export type TradeSession = "asia" | "london" | "new-york";

export interface Trade {
  id: string;
  user_id: string;
  screenshot_path: string | null;
  pair: string;
  direction: string;
  session: string;
  tp_pip: number;
  sl_pip: number;
  lot_size: number;
  result: string;
  net_pip: number;
  notes: string | null;
  traded_at: string;
  created_at: string;
}

export const PAIRS = [
  "XAUUSD",
  "NAS100",
  "US30",
  "SPX500",
  "GER40",
  "XAGUSD",
  "USOIL",
  "BTCUSD",
  "ETHUSD",
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "USDCHF",
  "USDCAD",
  "AUDUSD",
  "NZDUSD",
  "EURJPY",
  "GBPJPY",
  "AUDJPY",
  "CADJPY",
  "CHFJPY",
  "NZDJPY",
  "EURGBP",
  "EURAUD",
  "EURNZD",
  "EURCAD",
  "EURCHF",
  "GBPAUD",
  "GBPNZD",
  "GBPCAD",
  "GBPCHF",
  "AUDNZD",
  "AUDCAD",
  "AUDCHF",
  "NZDCAD",
  "NZDCHF",
  "CADCHF",
];

export const SESSIONS: { value: TradeSession; label: string }[] = [
  { value: "asia", label: "Asia" },
  { value: "london", label: "London" },
  { value: "new-york", label: "New York" },
];

export const RESULTS: { value: TradeResult; label: string }[] = [
  { value: "tp", label: "TP" },
  { value: "be", label: "BE" },
  { value: "sl", label: "SL" },
];

/** Rough dollar estimate — the journal's focus is pips, dollars are secondary. */
export function estimateDollars(netPip: number, lotSize: number) {
  return netPip * lotSize * 10;
}

export function useTrades() {
  return useQuery({
    queryKey: ["trades"],
    queryFn: async (): Promise<Trade[]> => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .order("traded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Trade[];
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      return {
        id: user.id,
        email: data?.email ?? user.email ?? "",
        has_nickname: Boolean(data?.display_name?.trim()),
        display_name:
          data?.display_name ??
          (user.user_metadata?.["full_name"] as string | undefined) ??
          (user.email ?? "").split("@")[0],
        avatar_url:
          data?.avatar_url ?? (user.user_metadata?.["avatar_url"] as string | undefined) ?? null,
      };
    },
  });
}

export interface NewTradeInput {
  file: File | null;
  pair: string;
  direction: TradeDirection;
  session: TradeSession;
  tp_pip: number;
  sl_pip: number;
  lot_size: number;
  result: TradeResult;
  traded_at: string;
  notes: string;
}

export function useCreateTrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTradeInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Not signed in");

      let screenshotPath: string | null = null;
      if (input.file) {
        const ext = input.file.name.split(".").pop() ?? "png";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(SCREENSHOT_BUCKET)
          .upload(path, input.file, { upsert: false });
        if (uploadError) throw uploadError;
        screenshotPath = path;
      }

      const { error } = await supabase.from("trades").insert({
        user_id: user.id,
        screenshot_path: screenshotPath,
        pair: input.pair,
        direction: input.direction,
        session: input.session,
        tp_pip: input.tp_pip,
        sl_pip: input.sl_pip,
        lot_size: input.lot_size,
        result: input.result,
        traded_at: new Date(input.traded_at).toISOString(),
        notes: input.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
    },
  });
}

export function useDeleteTrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (trade: Trade) => {
      if (trade.screenshot_path) {
        await supabase.storage.from(SCREENSHOT_BUCKET).remove([trade.screenshot_path]);
      }
      const { error } = await supabase.from("trades").delete().eq("id", trade.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trades"] }),
  });
}

export function useScreenshotUrls(paths: string[]) {
  const key = paths.slice().sort().join(",");
  return useQuery({
    queryKey: ["screenshot-urls", key],
    enabled: paths.length > 0,
    staleTime: 45 * 60 * 1000,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.storage
        .from(SCREENSHOT_BUCKET)
        .createSignedUrls(paths, 60 * 60);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((item) => {
        if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
      });
      return map;
    },
  });
}

export type RangeKey = "weekly" | "monthly" | "yearly" | "all";

export function rangeStart(range: RangeKey): Date | null {
  const now = new Date();
  if (range === "weekly") {
    const d = new Date(now);
    const day = (d.getDay() + 6) % 7; // Monday start
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "monthly") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === "yearly") return new Date(now.getFullYear(), 0, 1);
  return null;
}

export function filterByRange(trades: Trade[], range: RangeKey) {
  const start = rangeStart(range);
  if (!start) return trades;
  return trades.filter((t) => new Date(t.traded_at) >= start);
}

export interface Stats {
  count: number;
  wins: number;
  losses: number;
  breakEven: number;
  winRate: number;
  netPip: number;
  netDollars: number;
  avgWinPip: number;
  avgLossPip: number;
}

export function computeStats(trades: Trade[]): Stats {
  const wins = trades.filter((t) => t.result === "tp");
  const losses = trades.filter((t) => t.result === "sl");
  const breakEven = trades.filter((t) => t.result === "be");
  const decided = wins.length + losses.length;
  const netPip = trades.reduce((sum, t) => sum + Number(t.net_pip), 0);
  const netDollars = trades.reduce(
    (sum, t) => sum + estimateDollars(Number(t.net_pip), Number(t.lot_size)),
    0,
  );
  return {
    count: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakEven: breakEven.length,
    winRate: decided ? (wins.length / decided) * 100 : 0,
    netPip,
    netDollars,
    avgWinPip: wins.length
      ? wins.reduce((s, t) => s + Number(t.net_pip), 0) / wins.length
      : 0,
    avgLossPip: losses.length
      ? losses.reduce((s, t) => s + Number(t.net_pip), 0) / losses.length
      : 0,
  };
}

export function statsByPair(trades: Trade[]) {
  const map = new Map<string, Trade[]>();
  trades.forEach((t) => {
    const list = map.get(t.pair) ?? [];
    list.push(t);
    map.set(t.pair, list);
  });
  return Array.from(map.entries())
    .map(([pair, list]) => ({ pair, ...computeStats(list) }))
    .sort((a, b) => b.count - a.count);
}

export function formatPip(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}
