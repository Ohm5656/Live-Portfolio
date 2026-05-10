create table if not exists public.portfolios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_setup_complete boolean not null default false,
  items jsonb not null default '[]'::jsonb,
  triggered_alerts jsonb not null default '{}'::jsonb,
  global_exchange_rate jsonb not null default '{"rate":36,"status":"fallback","lastUpdated":null}'::jsonb,
  cached_prices jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolios enable row level security;

drop policy if exists "Users can read their own portfolio" on public.portfolios;
create policy "Users can read their own portfolio"
on public.portfolios for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own portfolio" on public.portfolios;
create policy "Users can insert their own portfolio"
on public.portfolios for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own portfolio" on public.portfolios;
create policy "Users can update their own portfolio"
on public.portfolios for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists set_portfolios_updated_at on public.portfolios;
drop function if exists public.set_portfolios_updated_at();

create function public.set_portfolios_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_portfolios_updated_at
before update on public.portfolios
for each row
execute function public.set_portfolios_updated_at();
