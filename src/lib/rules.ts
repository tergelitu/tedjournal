import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function rulesQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ["trading-rules", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_rules")
        .select("rules")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data?.rules ?? [];
    },
  });
}

export async function saveRules(userId: string, rules: string[]) {
  const { error } = await supabase.from("trading_rules").upsert({
    user_id: userId,
    rules,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}