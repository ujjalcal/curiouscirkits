# Cloudflare Operations — CuriousCirkits

## Account
- Account ID: `8cd5b16ab59a1ab35f84284b2a009c86`
- Email: ujjal.b@gmail.com
- Plan: Free
- CLI: `wrangler` (installed via `npm install -g wrangler`, auth via `wrangler login`)

## Zones
- `curiouscirkits.com` — Zone ID: `a0e1ff1abb7776e96cd5575564177c48`
  - Nameservers: `clint.ns.cloudflare.com`, `wren.ns.cloudflare.com`
  - Original registrar: Squarespace Domains II LLC
  - Original NS: Google Domains (`ns-cloud-a1-4.googledomains.com`)

## DNS Records (curiouscirkits.com)
- `A @ → 199.36.158.100` (Firebase Hosting, proxy OFF)
- `TXT @ → hosting-site=curiouscirkits-a6f8c` (Firebase verification)
- `TXT @ → v=spf1 include:_spf.google.com ~all` (email SPF)
- `MX @ → aspmx.l.google.com + alt1-4` (Google email)

## Key Rules

### Wrangler CLI does NOT manage DNS
Wrangler is for Workers, Pages, R2, KV, D1. It has no DNS commands.
For DNS operations, use the Cloudflare REST API directly.

### Wrangler OAuth tokens lack DNS write permission
The default `wrangler login` scopes include `zone:read` but NOT `dns_records:write`.
To write DNS records, create a dedicated API token at:
https://dash.cloudflare.com/profile/api-tokens

Required permissions: Zone → DNS → Edit

### Cloudflare Registrar API is Enterprise-only
You CANNOT register new domains via the Cloudflare API on Free/Pro plans.
The API only supports listing, managing, and transferring existing domains.
Use AWS Route 53 for programmatic domain registration.

### Firebase Hosting + Cloudflare
When Cloudflare manages DNS for a Firebase-hosted domain:
- A record must point to `199.36.158.100`
- Proxy must be OFF (grey cloud, DNS only) — Firebase handles TLS
- If proxy is ON, SSL handshake breaks

## API Usage

### Authentication
```bash
# API token (recommended for scripts)
curl -H "Authorization: Bearer $CF_TOKEN" \
  https://api.cloudflare.com/client/v4/...

# Token stored at: scripts/domain-spike/.env
```

### Common Operations
```bash
ZONE_ID="a0e1ff1abb7776e96cd5575564177c48"

# List all DNS records
curl -s "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_TOKEN"

# Add A record
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"@","content":"1.2.3.4","ttl":1,"proxied":false}'

# Create new zone
curl -s -X POST "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"name":"example.com","account":{"id":"8cd5b16ab59a1ab35f84284b2a009c86"},"type":"full"}'

# Delete zone
curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/$ZONE_ID" \
  -H "Authorization: Bearer $CF_TOKEN"
```

## Domain Registration Architecture (for CuriousCirkits)

```
AWS Route 53  →  registers domain (only part outside Cloudflare)
     ↓
Set nameservers to Cloudflare (clint/wren.ns.cloudflare.com)
     ↓
Cloudflare handles everything else:
  - DNS zone + records (API)
  - TLS certs (automatic, free)
  - CDN (if proxied)
  - Workers (subdomain routing, Phase 2)
```

This is the Squarespace/Wix model (Model A):
- Platform registers domains on behalf of customers
- Customer "owns" domain via TOS
- WHOIS shows platform proxy info
- No per-domain WHOIS contacts needed

## Spike Location
`scripts/domain-spike/` — Phase 1 (free API validation) + Phase 2 (real purchase)
