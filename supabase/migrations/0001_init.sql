-- OS Journal: first database schema (docs/SPEC.md section 6).
-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Every table has row-level security so each user only ever sees their own rows.

-- ---------------------------------------------------------------------------
-- profiles: one row per user, created automatically on sign-up
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  base_currency text not null default 'GBP',
  starting_balance numeric(12, 2) not null default 500,
  start_date date not null default (now() at time zone 'Europe/London')::date,
  risk_pct numeric(5, 2) not null default 1,          -- default risk per trade, in %
  period_months int not null default 3,
  min_trades int not null default 30,
  rules_threshold numeric(5, 2) not null default 90,  -- % of trades with all rules ticked
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- rules: his trading rules (ticked on every trade)
-- ---------------------------------------------------------------------------
create table public.rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index rules_user_idx on public.rules (user_id, sort);

-- ---------------------------------------------------------------------------
-- setups: his playbook setups
-- ---------------------------------------------------------------------------
create table public.setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  one_liner text,
  checklist jsonb not null default '[]'::jsonb,
  entry_rule text,
  stop_rule text,
  target_rule text,
  avoid text,
  example_image_path text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index setups_user_idx on public.setups (user_id, sort);

-- ---------------------------------------------------------------------------
-- trades
-- ---------------------------------------------------------------------------
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ticker text not null,
  direction text not null check (direction in ('long', 'short')),
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  entry numeric(14, 4) not null,
  stop numeric(14, 4) not null,
  target numeric(14, 4),
  exit numeric(14, 4),
  shares numeric(14, 2) not null,
  risk_pct numeric(5, 2) not null,
  risk_gbp numeric(12, 2) not null,
  fx_entry numeric(10, 5) not null,                   -- USD per 1 GBP when the trade opened
  fx_exit numeric(10, 5),
  pnl_gbp numeric(12, 2),
  r_multiple numeric(8, 2),
  setup_id uuid references public.setups (id) on delete set null,
  emotion text,
  notes text,
  source text not null default 'quick' check (source in ('quick', 'screenshot', 'csv')),
  needs_details boolean not null default false,
  external_id text,                                   -- CSV import dedupe key
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trades_user_idx on public.trades (user_id, opened_at desc);
create unique index trades_external_idx on public.trades (user_id, external_id) where external_id is not null;

-- Rule ticks for a trade, with the rule text copied at the time.
create table public.trade_rules (
  trade_id uuid not null references public.trades (id) on delete cascade,
  rule_id uuid references public.rules (id) on delete set null,
  rule_text text not null,
  followed boolean not null default false,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sort int not null default 0,
  primary key (trade_id, rule_text)
);

create table public.trade_screenshots (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'entry' check (kind in ('entry', 'exit')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AI coach
-- ---------------------------------------------------------------------------
create table public.ai_reviews (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'review' check (kind in ('review', 'plan_check')),
  grade text,
  went_well text,
  fix_next text,
  model text,
  created_at timestamptz not null default now()
);
create index ai_reviews_trade_idx on public.ai_reviews (trade_id, created_at desc);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trade_id uuid references public.trades (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table public.ai_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  period text not null,                               -- e.g. '2026-11' or 'all'
  bullets jsonb not null default '[]'::jsonb,
  model text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Playbook daily plan, and Dad's share link
-- ---------------------------------------------------------------------------
create table public.daily_plans (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  spy_trend text check (spy_trend in ('up', 'sideways', 'down')),
  range_zone text check (range_zone in ('discount', 'premium')),
  old_high numeric(14, 4),
  old_low numeric(14, 4),
  verdict text,
  notes text,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table public.share_links (
  token text primary key default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  show_notes boolean not null default false,
  show_ai boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row-level security: owner-only on every table
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['rules','setups','trades','trade_rules','trade_screenshots','ai_reviews',
                           'ai_messages','ai_patterns','daily_plans','share_links']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Keep updated_at fresh.
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger trades_touch before update on public.trades for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- New user: create a profile plus the starter rules and setup (seed data)
-- ---------------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'first_name', ''));

  insert into public.rules (user_id, text, sort) values
    (new.id, 'Daily bias agrees with the trade', 1),
    (new.id, 'Entered at my setup, not chasing', 2),
    (new.id, 'Stop set before I entered', 3),
    (new.id, 'Risk is 1–2% of my account', 4),
    (new.id, 'No earnings or big news in 2 days', 5);

  insert into public.setups (user_id, name, one_liner, checklist, entry_rule, stop_rule, target_rule, avoid, sort)
  values (
    new.id,
    'Sweep + FVG',
    'Price grabs an old low, flips up, and I buy the pullback into the gap.',
    '["Daily bias is up (higher highs and higher lows)",
      "Price swept below an old low (took the stops), then closed back above it",
      "Break of structure: price broke above the last lower high",
      "A fair value gap (a fast candle that left a gap) formed on the move up",
      "Price is in the discount half of the range"]'::jsonb,
    'Buy when price pulls back into the fair value gap.',
    'Just below the low of the sweep.',
    'The old high (where other traders have their stops).',
    'Earnings or big news within 2 days, no clear sweep, or price already ran to the target.',
    1
  );

  insert into public.share_links (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Storage for chart screenshots (private bucket, one folder per user)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

create policy "own screenshots read" on storage.objects for select
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own screenshots write" on storage.objects for insert
  with check (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own screenshots update" on storage.objects for update
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own screenshots delete" on storage.objects for delete
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
