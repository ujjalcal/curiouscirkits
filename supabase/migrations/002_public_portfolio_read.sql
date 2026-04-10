-- Allow anonymous (unauthenticated) users to read published portfolios.
-- This enables serving portfolios at /p/[subdomain] without requiring login.

-- Anonymous users can read portfolios by subdomain (only non-deleted ones with a subdomain set)
create policy "Anyone can read published portfolios"
  on public.portfolios for select
  using (
    subdomain is not null
    and deleted_at is null
  );

-- Anonymous users can read published portfolio versions (only published ones with rendered HTML)
create policy "Anyone can read published versions"
  on public.portfolio_versions for select
  using (
    status = 'published'
    and rendered_html is not null
    and exists (
      select 1 from public.portfolios
      where portfolios.id = portfolio_versions.portfolio_id
      and portfolios.subdomain is not null
      and portfolios.deleted_at is null
    )
  );
