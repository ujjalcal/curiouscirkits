# Domain Purchase — CuriousCirkits

## How It Works

Students search for a domain, see prices, claim it, and it points to their published portfolio. Model A (Squarespace/Wix model): platform registers on behalf of the customer.

## Architecture

```
Route 53    → registers the domain (only AWS dependency)
Cloudflare  → DNS zone, A records, TLS cert (automatic), CDN
Vercel      → serves the portfolio app
```

## Domain Search (tested and working)

### Search a name across multiple TLDs

```bash
NAME="reyanmakes"
for TLD in com xyz click link net org site online me; do
  aws route53domains check-domain-availability \
    --domain-name "${NAME}.${TLD}" --region us-east-1
done
```

Each call returns `{ "Availability": "AVAILABLE" }` or `"UNAVAILABLE"`.
Takes ~1-2 seconds per TLD. Run in parallel in the app for 2-3 second response time.

### Get price for a TLD

```bash
aws route53domains list-prices --tld com --region us-east-1
```

### Recommended TLDs to search (sorted by price)

| TLD | Price/year | Good for students? |
|-----|-----------|-------------------|
| .click | $3 | Cheap but unusual |
| .link | $5 | Cheap, decent |
| .com | $15 | Best, most professional |
| .org | $15 | Good for projects |
| .net | $17 | Familiar |
| .xyz | $18 | Tech-friendly |
| .site | $25 | Self-explanatory |
| .online | $25 | Modern |
| .me | $31 | Personal, great for portfolios |
| .io | $71 | Expensive, tech-oriented |
| .ai | $129 | Very expensive |

365 TLDs available on Route 53 total.

### Search UX for the app

```
Student types: "reyanmakes"

App shows (sorted by price):
  ✅ reyanmakes.click       $3/year
  ✅ reyanmakes.link        $5/year
  ✅ reyanmakes.com        $15/year    ← recommended
  ✅ reyanmakes.org        $15/year
  ❌ reyanmakes.net        TAKEN
  ✅ reyanmakes.xyz        $18/year
  ✅ reyanmakes.me         $31/year
```

Default search: 9 TLDs (com, xyz, click, link, net, org, site, online, me).
Run all checks in parallel via Promise.all() in the API route.

### API route design

```
GET /api/domains/search?name=reyanmakes

Response:
{
  "results": [
    { "domain": "reyanmakes.com", "available": true, "price": 15, "currency": "USD", "recommended": true },
    { "domain": "reyanmakes.click", "available": true, "price": 3, "currency": "USD" },
    ...
  ]
}
```

## Domain Registration (not yet tested with real purchase)

### Step 1: Register domain (costs real money)

```bash
aws route53domains register-domain \
  --domain-name example.com \
  --duration-in-years 1 \
  --auto-renew \
  --admin-contact '{...}' \
  --registrant-contact '{...}' \
  --tech-contact '{...}' \
  --privacy-protect-admin-contact \
  --privacy-protect-registrant-contact \
  --privacy-protect-tech-contact \
  --region us-east-1
```

Returns an operation ID. Registration takes 1-15 minutes.
Contact info is platform info (CuriousCirkits), not the student's. WHOIS privacy enabled.

### Step 2: Check registration status

```bash
aws route53domains get-operation-detail \
  --operation-id <id> --region us-east-1
```

Poll until status is `SUCCESSFUL`.

### Step 3: Create Cloudflare zone

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"name":"example.com","account":{"id":"ACCOUNT_ID"},"type":"full"}'
```

Returns zone ID and Cloudflare nameservers.

### Step 4: Set nameservers on Route 53

```bash
aws route53domains update-domain-nameservers \
  --domain-name example.com \
  --nameservers Name=ns1.cloudflare.com Name=ns2.cloudflare.com \
  --region us-east-1
```

### Step 5: Add A record in Cloudflare

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"example.com","content":"76.76.21.21","ttl":1,"proxied":true}'
```

Points the domain to Vercel (76.76.21.21).

### Step 6: Verify

```bash
dig @ns1.cloudflare.com example.com A +short
```

Cloudflare-side resolves in minutes. Full global propagation up to 48 hours.

## Credentials

### AWS (Route 53)
- IAM user: `curiouscirkits_cli`
- Permissions: `AmazonRoute53FullAccess` + `AmazonRoute53DomainsFullAccess`
- Region: `us-east-1` (Route 53 Domains API is us-east-1 only)
- Configured via `aws configure`

### Cloudflare
- Account ID: `8cd5b16ab59a1ab35f84284b2a009c86`
- API token name: `CuriousCirkits-CFToken`
- Permissions: Zone:Zone:Edit + Zone:DNS:Edit
- Token stored in: `scripts/domain-spike/.env`

## Key Rules

- Route 53 Domains API only works in `us-east-1` region
- Cloudflare Registrar API is Enterprise-only (can't register domains via CF)
- WHOIS privacy is always enabled (platform registers on behalf of student)
- No Stripe yet (Option A: platform eats the cost for early validation)
- Contact info uses CuriousCirkits platform details, not student info
- Auto-renew OFF for test domains, ON for production
- Search 9 TLDs by default: com, xyz, click, link, net, org, site, online, me
- Run TLD checks in parallel (Promise.all) for fast response
- Always show .com first if available, then sort rest by price

## User Flow (in the app)

```
1. Student types name     → "reyanmakes"
2. App searches 9 TLDs    → parallel Route 53 calls, ~2-3 seconds
3. Shows results + prices → sorted by price, .com highlighted
4. Student clicks "Claim" → registers via Route 53 (~$3-15)
5. App sets up DNS        → Cloudflare zone + A record + nameservers
6. Done                   → "Your site is live at reyanmakes.com!"
```

## Database

The `domain_bindings` table already exists in Supabase (migration 001):
```sql
domain_bindings (
  id, user_id, domain, portfolio_id, active_version_id,
  is_subdomain, registrar_ref, status, expires_at, created_at
)
```
Status machine: `pending → dns_pending → dns_active → cert_pending → live → failed`

## Spike Location

`scripts/domain-spike/` — standalone Node.js script for testing the full chain.
