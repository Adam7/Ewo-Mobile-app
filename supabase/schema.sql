-- GlowUp MVP schema (PostgreSQL / Supabase)
-- Generated: 2026-03-26

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  age_confirmed boolean not null default false,
  active_goal text check (active_goal in ('skin','hair','cut','bulk')),
  level text not null default 'beginner' check (level in ('beginner','intermediate','advanced')),
  daily_time integer not null default 15 check (daily_time in (15,30,45,60)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','plus','pro')),
  provider text not null default 'revenuecat',
  provider_customer_id text,
  expires_at timestamptz,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  completed_task_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists idx_daily_progress_user_day on public.daily_progress(user_id, day desc);

-- Auto update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_subscription_state_updated_at on public.subscription_state;
create trigger trg_subscription_state_updated_at
before update on public.subscription_state
for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_progress_updated_at on public.daily_progress;
create trigger trg_daily_progress_updated_at
before update on public.daily_progress
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.subscription_state enable row level security;
alter table public.daily_progress enable row level security;

-- Policies: each user can access only own data
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "subscription_select_own" on public.subscription_state
for select using (auth.uid() = user_id);
create policy "subscription_upsert_own" on public.subscription_state
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "progress_select_own" on public.daily_progress
for select using (auth.uid() = user_id);
create policy "progress_insert_own" on public.daily_progress
for insert with check (auth.uid() = user_id);
create policy "progress_update_own" on public.daily_progress
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "progress_delete_own" on public.daily_progress
for delete using (auth.uid() = user_id);
