CREATE TABLE public.trading_rules (
  user_id uuid PRIMARY KEY,
  rules text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_rules TO authenticated;
GRANT ALL ON public.trading_rules TO service_role;
ALTER TABLE public.trading_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own rules" ON public.trading_rules FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users insert their own rules" ON public.trading_rules FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users update their own rules" ON public.trading_rules FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users delete their own rules" ON public.trading_rules FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);