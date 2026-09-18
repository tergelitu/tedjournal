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