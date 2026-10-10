-- ===== 0000_create_trading_journal.sql =====
-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,''), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- trades
CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  screenshot_path text,
  pair text NOT NULL,
  direction text NOT NULL DEFAULT 'buy',
  session text NOT NULL DEFAULT 'london',
  tp_pip numeric NOT NULL DEFAULT 0,
  sl_pip numeric NOT NULL DEFAULT 0,
  lot_size numeric NOT NULL DEFAULT 0,
  result text NOT NULL DEFAULT 'be',
  net_pip numeric NOT NULL DEFAULT 0,
  notes text,
  traded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trades_user_traded_at_idx ON public.trades (user_id, traded_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trades TO authenticated;
GRANT ALL ON public.trades TO service_role;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own trades select" ON public.trades FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own trades insert" ON public.trades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own trades update" ON public.trades FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own trades delete" ON public.trades FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- keep net_pip consistent with result
CREATE OR REPLACE FUNCTION public.set_trade_net_pip()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.net_pip := CASE NEW.result
    WHEN 'tp' THEN COALESCE(NEW.tp_pip, 0)
    WHEN 'sl' THEN -COALESCE(NEW.sl_pip, 0)
    ELSE 0
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trades_net_pip
BEFORE INSERT OR UPDATE ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.set_trade_net_pip();

-- ===== 0001_trade_screenshot_storage_policies.sql =====
CREATE POLICY "own screenshots select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "own screenshots insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "own screenshots update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "own screenshots delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ===== 0002_add_setup_tag_and_actual_pip.sql =====
ALTER TABLE public.trades ADD COLUMN setup_tag text;
ALTER TABLE public.trades ADD COLUMN actual_pip numeric;

CREATE OR REPLACE FUNCTION public.set_trade_net_pip()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.actual_pip IS NOT NULL THEN
    NEW.net_pip := NEW.actual_pip;
  ELSE
    IF NEW.result = 'tp' THEN
      NEW.net_pip := NEW.tp_pip;
    ELSIF NEW.result = 'sl' THEN
      NEW.net_pip := -NEW.sl_pip;
    ELSE
      NEW.net_pip := 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
-- ===== 0003_create_personal_trading_rules.sql =====
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
