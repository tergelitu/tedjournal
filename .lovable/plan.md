# TedJournal benchmark features

Add the core benchmark metrics that most trading journals surface, keep the pip-first focus, and capture two extra fields per trade to make the data richer.

## Goal

Expand the Dashboard with professional baseline metrics:
- Profit factor
- Expectancy per trade (in pips)
- Average win ÷ average loss (payoff ratio)
- Max drawdown (in pips) + drawdown curve

Also add optional fields to the new-trade form:
- Setup / strategy tag
- Actual realized pips (+/−)

Pips stay primary; dollars stay secondary.

## What changes

### Database

Migration adds two nullable columns to `public.trades`:
- `setup_tag text`
- `actual_pip numeric`

Update the existing `set_trade_net_pip()` trigger so net pip logic becomes:
- If `actual_pip` is provided, use it as the signed net pip.
- Otherwise keep the current behavior: `+tp_pip` for TP, `−sl_pip` for SL, `0` for BE.

No data is destroyed; new columns are nullable.

### Shared logic (`src/lib/trades.ts`)

- Add `setup_tag` and `actual_pip` to the `Trade` and `NewTradeInput` interfaces.
- Pass them through `useCreateTrade`.
- Add computed benchmark fields to `computeStats()`:
  - `profitFactor` — gross win pips ÷ |gross loss pips|
  - `expectancy` — average net pip per trade
  - `payoffRatio` — average win ÷ average loss
  - `maxDrawdown` — largest peak-to-trough drop in cumulative pips
- Add a `drawdownSeries()` helper that returns `{ trade, cumulative, runningMax, drawdown }` for the drawdown chart.

### New-trade form (`src/routes/_authenticated/journal.tsx`)

Add two optional inputs below the existing fields:
- Setup / strategy tag — plain text, e.g. "breakout", "fomc fade"
- Actual pips — number input accepting signed values; label explains it overrides the planned TP/SL value

Both are optional so the existing quick-entry flow still works.

### Dashboard (`src/routes/_authenticated/dashboard.tsx`)

Add four new stat cards in the existing stat grid:
- Profit factor
- Expectancy / trade (pips)
- Avg win ÷ avg loss
- Max drawdown (pips)

Add a new line chart below the cumulative-pips chart:
- Drawdown over time (pips)

Keep weekly / monthly / yearly / all-time filtering so the new metrics respect the selected range.

### Trade log details (`src/routes/_authenticated/log.tsx`)

Show `setup_tag` and `actual_pip` on each trade card when present.

### Types

Update `src/integrations/supabase/types.ts` to include the two new columns.

## Technical details

- Tailwind theme tokens only; no hardcoded colors.
- No new dependencies.
- Drawdown uses the same time ordering as the cumulative-pips chart (`traded_at` ascending).
- Profit factor shows "∞" when there are no losing trades.
- Expectancy and drawdown are rounded to one decimal pip like other pip displays.

## Verification

- Build passes without type errors.
- Run the Playwright smoke flow: sign in → add a trade with setup tag and actual pips → verify Dashboard shows profit factor, expectancy, payoff ratio, max drawdown, and drawdown chart.
- Verify a trade without actual pips still uses the TP/SL result logic.
