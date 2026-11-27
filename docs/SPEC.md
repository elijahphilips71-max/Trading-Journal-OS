# OS Journal — build spec (v1)

A trading journal for one beginner swing trader (Elijah, UK), built to feel like paid journals (TraderSync / Tradezella level). It is a **separate app and repository** from his personal "elijah--os" app, but should share its feel where sensible.

Design source of truth: the clickable mockup at https://claude.ai/artifact/F2gTq6qd9NPRQqjGu1pyY8 (copies of its files are in `design/` in this package). Match its layout, copy tone and colours. All numbers in the mockup are sample data.

---

## 1. Who it's for and why

- Elijah is learning to **swing trade** liquid US shares and ETFs (SPY, QQQ, AAPL, NVDA, MSFT…), holding trades 2–10 days. He paper trades on TradingView now.
- **Goal:** prove consistency over a 3-month paper period so his dad opens a real account (Interactive Brokers, linked to TradingView) for him.
- Paper account: pretend **£500**, risking **1–2% per trade**, aiming for **30+ trades**.
- Strategy: a TJR-style approach adapted to swing trading (described in our own words — never copy any paid course content):
  1. **Bias** on the daily chart (trend via HH/HL vs LH/LL, premium vs discount, liquidity levels).
  2. **Setup:** liquidity sweep of an old low → break of structure (BOS) → buy the retrace into the fair value gap (FVG). Stop under the sweep, target the old high.
  3. **News check** before trading.
- He is new to trading terms. **All UI copy must be plain English**, short, UK English. Explain jargon inline (e.g. "Profit factor = money won ÷ money lost").

## 2. Platforms and look

- **Responsive, mobile-first.** Used equally on phone and laptop. Installable PWA on phone.
- Phone: bottom tab bar — Home, Trades, big + (Log), Playbook, Stats. Dad's view from a link icon in the header.
- Laptop: left sidebar (Home, Trades, Playbook, Stats, AI coach, Dad's view), multi-column dashboard (see `design/Laptop.dc.html`).
- **Dark, pro trading look.** Tokens from the mockup:
  - background `#0B0E13`, surface `#121721`, surface-2 `#1A2130`, border `#222A39`
  - text `#E6EAF2`, muted `#8E98AB`, accent `#7EA6FF`
  - gain `#36D399`, loss `#FF8080`, warning `#F5C866`
  - fonts: Inter (UI), JetBrains Mono (numbers, tabular figures)
  - Never rely on colour alone for win/loss: always show +/− signs.
- **Brand:** name "OS Journal". Logo = cartoon stack of green cash with a white paper band and white feathered wings, navy outlines, on black (SVG in `design/Logo.dc.html`; export as app icon 512/192/favicon).

## 3. Screens

### 3.0 Login (Supabase Auth, required)
The whole app sits behind a login. The only public page is Dad's read-only share page. Design: `design/Login.dc.html`.
- **Supabase Auth.** Log in / Create account tabs, with email + password (8+ characters) plus "Email me a login link" (magic link). Include "Forgot password?" with a reset email and a reset page, and email confirmation on sign-up.
- Sessions persist, so he stays logged in on his phone and laptop until he logs out. Add a log out button in settings.
- Every app route is protected: redirect to `/login` if there's no session, and back to where he was after logging in. Server-side checks use Supabase SSR helpers (`@supabase/ssr`) in middleware, and every table has row-level security keyed on `auth.uid()`.
- On first login, run a short onboarding: first name, starting balance (default £500), start date, risk % (default 1%). These are stored in `profiles`.
- Later, optionally: Google sign-in, and 2FA.
- Env: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` go in the browser. `SUPABASE_SERVICE_ROLE_KEY` is server only and used just by the public share endpoint and cron jobs.

### 3.1 Home
- "Road to a real account" card: month X of 3, day N of 90, progress bar, target date, and the **4 targets** each with value + status pill (On track / Passing / Watch it / Failing) + one-line plain-English hint.
- Trades logged X / 30 bar.
- Paper account balance (+£ and +% since start), risk per trade in £.
- Big "Log a trade" button.
- AI coach "pattern spotted" card.
- Open trades, recent 3 closed trades (tap → detail).

### 3.2 Log a trade (must be fast — this is the #1 requirement)
Three modes in a segmented control:
1. **Quick add:** ticker (input + recent-ticker chips), Long/Short, entry, stop, target, risk % chips (1 / 1.5 / 2). **Live auto-calc:** shares to buy, £ at risk, £ potential reward, reward:risk pill, warning if position > account. Setup chips, rule checklist (tick boxes), emotion chips (Calm, Confident, Anxious, FOMO, Bored, Revenge), notes, attach screenshot, Save. Saving should take < 20 seconds end to end.
2. **Screenshot auto-fill:** upload/paste (Ctrl+V on laptop) a TradingView screenshot with the long/short position tool drawn. AI vision extracts ticker, direction, entry, stop, target → show "Found 4 things" → "Use these" fills the Quick add form with a banner "Filled from your screenshot. Check the numbers, then save." Screenshot is stored on the trade.
3. **CSV import:** TradingView Paper Trading export (and Interactive Brokers later). Match buy/sell fills into round-trip trades, dedupe against existing trades, preview list, import. Imported trades are flagged "needs details" (setup + emotion). **Get a real sample export from Elijah before writing the parser** — don't guess the columns.

Closing a trade: from trade detail, "Close trade" → exit price + date (+ optional exit screenshot) → triggers AI review.

### 3.3 Trades list
Filter chips All / Wins / Losses / Open (plus by setup later). Row: ticker tile, ticker · setup, closed date · emotion, £ P&L, coach grade pill.

### 3.4 Trade detail
£ P&L big, R multiple, dates/held. Chart screenshot with entry/stop/target lines when available. Grid: entry, exit, size, stop, target, risk. Pills: setup, emotion, rules X/5. **AI coach review** card: letter grade (A+…F), "What went well", "Fix next time", "Ask the coach a question" (chat about this trade). Rule checklist with ticks/crosses. Notes. Edit / delete.

### 3.5 Playbook (three tabs)
1. **1 · Bias** — daily routine: HH/HL vs LH/LL diagram; SPY daily trend chips (Up / Sideways / Down); range position chips (Discount / Premium); old high & old low inputs (liquidity). Output verdict card: Look for buys / Wait / Be picky / Sit out with a reason. Save as today's plan (stored per date).
2. **2 · Setup** — the setup card: name, one-liner, **annotated example chart** (sweep, BOS, FVG, entry, stop, target), "What I look for" checklist, entry/stop/target rules, "Skip it if", **his live results with this setup** (trades, wins, avg R, £) and a coach note; "Log a trade with this setup". Elijah can edit setups, upload his own example screenshot, and add more setups ("+ Add my own setup").
3. **Trade today?** — day chips (today + next trading days):
   - Verdict: Trade day / Trade carefully / Wait until HH:MM / Sit out (green/amber/red) + reason.
   - US market hours in **UK time** (handle half days and holidays).
   - **Day timeline** (colour strip 13:00–21:30 UK + list): Opening rush (hands off), NY morning (best), lunch lull (quiet), afternoon (OK), last hour (best for swing confirmation), after close (journal & plan). News events shift/redden segments (e.g. jobs report day: hands off until after the release).
   - Economic events with UK time, impact (High/Medium/Low) and a plain-English explanation.
   - Earnings dates for his watchlist + open positions in the next 2 days (rule: no trades with earnings within 2 days).
   - Coach game plan for the day.
   - Morning push notification by 08:00 UK with the verdict.

### 3.6 Stats
Month / all-time toggle. Tiles: net P&L, win rate, avg win vs avg loss, profit factor (with one-line explanations), average R. Equity curve. **Calendar** (Mon–Fri grid, P&L by close date, market holidays greyed). By-setup bars. By emotion, by weekday, by hold time (later). AI "Patterns this month" bullets.

### 3.7 Dad's view
- Settings: toggle live read-only link on/off, copy link, regenerate link, toggles "show my trade notes", "show AI coach reviews".
- Public page (no login) at `/r/<random-token>`: light theme, "Elijah's paper trading · LIVE", targets met X of 4, month boxes (Nov/Dec/Jan %), each target with value, trades so far, last updated time; optional latest note and coach summary. No editing, no other data exposed.

## 4. Goal targets (exact definitions)

Configurable: `start_date`, `starting_balance` (£500), `period_months` (3), `min_trades` (30), `rules_threshold` (90%).

| Target | Rule | Status logic |
|---|---|---|
| Profitable 2 of 3 months | count of calendar months in the period with net P&L > 0 ≥ 2 | On track if still achievable, Done when met, Failing when impossible |
| Avg win > avg loss | mean £ of winning closed trades > mean abs £ of losing closed trades | Passing / Failing |
| No month below −5% | every month's return = month P&L ÷ balance at month start ≥ −5% | Passing / Failing (warn at −3%) |
| Rules followed | closed trades with all rules ticked ÷ closed trades ≥ 90% | Passing / Watch it (within 5 pts) / Failing |
| 30+ trades | closed trades count ≥ 30 | progress bar |

## 5. Maths

- `risk_gbp = account_balance × risk_pct`
- FX: store a GBP→USD rate per trade at entry (fetch daily rate; allow manual override). `risk_usd = risk_gbp × fx`
- `risk_per_share = |entry − stop|`; `shares = risk_usd ÷ risk_per_share` (fractional allowed, 2 dp)
- `reward_risk = |target − entry| ÷ risk_per_share`
- On close: `pnl_usd = (exit − entry) × shares` (long; reversed for short), `pnl_gbp = pnl_usd ÷ fx_at_exit` (or entry fx; pick one and document it), `R = pnl_usd ÷ (risk_per_share × shares)`
- Profit factor = gross £ won ÷ gross £ lost. Expectancy = mean R.
- Balance = starting balance + Σ closed £ P&L.

## 6. Data model (Postgres)

- `profiles` (user, display name, base currency GBP, account settings, start_date, starting_balance, targets config)
- `trades` (id, user_id, ticker, direction, status open/closed, opened_at, closed_at, entry, stop, target, exit, shares, risk_pct, risk_gbp, fx_entry, fx_exit, pnl_gbp, r_multiple, setup_id, emotion, notes, source quick/screenshot/csv, needs_details bool, created_at, updated_at)
- `trade_rules` (trade_id, rule_id, followed bool) — snapshot of rule text at the time
- `trade_screenshots` (trade_id, kind entry/exit, storage_path)
- `ai_reviews` (trade_id, grade, went_well, fix_next, model, created_at); `ai_patterns` (period, bullets json, created_at)
- `setups` (id, user_id, name, one_liner, checklist json, entry_rule, stop_rule, target_rule, avoid, example_image_path, sort)
- `rules` (id, user_id, text, active, sort) — starter set: Daily bias agrees with the trade; Entered at my setup, not chasing; Stop set before I entered; Risk is 1–2% of my account; No earnings or big news in 2 days
- `daily_plans` (user_id, date, spy_trend, range_zone, old_high, old_low, verdict, notes)
- `share_links` (token, user_id, enabled, show_notes, show_ai, created_at)
- Row-level security: users only see their own rows; the public share page reads through a server endpoint that returns only the whitelisted summary.

## 7. AI coach (Claude API)

- Server-side only; never expose the API key to the browser. Use a current Claude model (e.g. `claude-sonnet-5-5` for reviews/vision, `claude-haiku-5-5` for cheap tasks) — check Anthropic docs for current IDs.
- **Trade review** on close (and a light "plan check" on open): input = trade fields, rules ticked, emotion, notes, setup definition, his recent stats; output JSON `{grade, went_well, fix_next}`. Tone: encouraging, specific, plain English, max ~2 sentences each. Never give financial advice or tell him what to buy; coach on process.
- **Pattern spotting** weekly/monthly + on demand: input = aggregated stats by setup, emotion, weekday, rule-breaks; output 3–5 bullets.
- **Screenshot extraction**: vision prompt returning `{ticker, direction, entry, stop, target, confidence}`; always require user confirmation.
- **Ask the coach**: chat scoped to one trade or the month.
- Cache results; show a cost-friendly limit (he's a student).

## 8. Integrations needing a decision / API key from Elijah

- **Market calendar** (US hours, half days, holidays) — can be a static yearly table + library; times converted with real time zones (US and UK DST change on different dates — never hard-code a 5-hour gap).
- **Economic calendar + earnings dates** — needs a data provider (e.g. Finnhub, Financial Modeling Prep or similar with a free tier). Pick one, document the key in `.env.example`.
- **FX rate** — free daily GBP/USD source.
- **Push notifications** — Web Push for the 08:00 verdict.
- Later: Interactive Brokers import once the real account exists.

## 9. Suggested stack (confirm against elijah--os first)

If elijah--os uses a stack Elijah already knows, prefer the same. Otherwise:
- Next.js (App Router) + TypeScript + Tailwind, PWA
- **Supabase (required):** Auth for the login system (see §3.0), Postgres, Storage (screenshots), RLS → **cloud sync** between phone and laptop
- Hosting: Vercel
- Charts: lightweight SVG/Recharts; TradingView Lightweight Charts optional later
- Tests: Vitest for maths/target logic (must have full coverage of section 4–5), Playwright for the log-a-trade flow on a phone viewport

## 10. Out of scope for v1

Live broker connection, real-money trading, social features, multiple users beyond Elijah + the dad link, options/futures.
