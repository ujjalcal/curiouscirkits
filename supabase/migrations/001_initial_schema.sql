-- CuriousCirkits initial schema
-- Run this in your Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

-- Enable RLS on all tables
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;

-- ═══════════════════════════════════════════════════
-- USERS (extends Supabase Auth)
-- ═══════════════════════════════════════════════════
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.users enable row level security;

create policy "Users can read own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own data"
  on public.users for update
  using (auth.uid() = id);

-- Auto-create user row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════
-- PORTFOLIOS
-- ═══════════════════════════════════════════════════
create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null default 'My Portfolio',
  subdomain text unique,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.portfolios enable row level security;

create policy "Users can read own portfolios"
  on public.portfolios for select
  using (auth.uid() = user_id);

create policy "Users can insert own portfolios"
  on public.portfolios for insert
  with check (auth.uid() = user_id);

create policy "Users can update own portfolios"
  on public.portfolios for update
  using (auth.uid() = user_id);

create policy "Users can delete own portfolios"
  on public.portfolios for delete
  using (auth.uid() = user_id);

-- Subdomain validation: lowercase alphanumeric + hyphens, 3-30 chars
alter table public.portfolios
  add constraint valid_subdomain
  check (subdomain is null or subdomain ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$');

-- Reserved subdomains
create or replace function public.check_reserved_subdomain()
returns trigger as $$
begin
  if new.subdomain in ('www', 'admin', 'api', 'app', 'mail', 'ftp', 'blog', 'help', 'support', 'status', 'docs') then
    raise exception 'Subdomain "%" is reserved', new.subdomain;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger check_subdomain_reserved
  before insert or update on public.portfolios
  for each row
  when (new.subdomain is not null)
  execute function public.check_reserved_subdomain();

-- ═══════════════════════════════════════════════════
-- PORTFOLIO VERSIONS
-- ═══════════════════════════════════════════════════
create table public.portfolio_versions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  theme_id text not null check (theme_id in ('minimal', 'bold', 'creative')),
  content jsonb not null,
  rendered_html text,
  status text not null default 'draft' check (status in ('draft', 'published', 'publish_failed')),
  created_at timestamptz not null default now()
);

alter table public.portfolio_versions enable row level security;

create policy "Users can read own versions"
  on public.portfolio_versions for select
  using (
    exists (
      select 1 from public.portfolios
      where portfolios.id = portfolio_versions.portfolio_id
      and portfolios.user_id = auth.uid()
    )
  );

create policy "Users can insert own versions"
  on public.portfolio_versions for insert
  with check (
    exists (
      select 1 from public.portfolios
      where portfolios.id = portfolio_versions.portfolio_id
      and portfolios.user_id = auth.uid()
    )
  );

create policy "Users can update own versions"
  on public.portfolio_versions for update
  using (
    exists (
      select 1 from public.portfolios
      where portfolios.id = portfolio_versions.portfolio_id
      and portfolios.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════
-- DOMAIN BINDINGS (Phase 2, schema ready)
-- ═══════════════════════════════════════════════════
create table public.domain_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  domain text unique not null,
  portfolio_id uuid not null references public.portfolios(id),
  active_version_id uuid references public.portfolio_versions(id),
  is_subdomain boolean not null default true,
  registrar_ref text,
  status text not null default 'pending' check (status in ('pending', 'dns_pending', 'dns_active', 'cert_pending', 'live', 'failed')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.domain_bindings enable row level security;

create policy "Users can read own domains"
  on public.domain_bindings for select
  using (auth.uid() = user_id);

create policy "Users can insert own domains"
  on public.domain_bindings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own domains"
  on public.domain_bindings for update
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════
-- ASSETS (Cloudflare Images)
-- ═══════════════════════════════════════════════════
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  portfolio_id uuid references public.portfolios(id) on delete set null,
  cf_images_id text not null,
  filename text not null,
  mime_type text not null,
  size_bytes integer,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.assets enable row level security;

create policy "Users can read own assets"
  on public.assets for select
  using (auth.uid() = user_id);

create policy "Users can insert own assets"
  on public.assets for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own assets"
  on public.assets for delete
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════
create index idx_portfolios_user_id on public.portfolios(user_id);
create index idx_portfolios_subdomain on public.portfolios(subdomain) where subdomain is not null;
create index idx_portfolio_versions_portfolio_id on public.portfolio_versions(portfolio_id);
create index idx_domain_bindings_domain on public.domain_bindings(domain);
create index idx_assets_user_id on public.assets(user_id);
create index idx_assets_portfolio_id on public.assets(portfolio_id);

-- Soft-delete filters (exclude deleted rows by default)
create index idx_portfolios_active on public.portfolios(user_id) where deleted_at is null;
create index idx_assets_active on public.assets(user_id) where deleted_at is null;
