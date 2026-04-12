---
name: domain-purchase
description: |
  Register a domain via AWS Route 53 and set up Cloudflare DNS to point it
  to the CuriousCirkits portfolio app. Handles the full chain: register,
  create Cloudflare zone, set nameservers, add A record, verify resolution.
  Use when the user asks to "buy a domain", "register a domain", "claim this
  domain", "set up a domain", or wants to connect a domain to their portfolio.
  Always run /domain-search first to find available domains.
---

# Domain Purchase

Register a domain via AWS Route 53, set up Cloudflare DNS, and point it to the CuriousCirkits portfolio on Vercel.

## Architecture

```
AWS Route 53  → registers the domain (only AWS piece)
Cloudflare    → DNS zone, A records, TLS cert (automatic)
Vercel        → serves the portfolio app at 76.76.21.21
```

This is the Squarespace/Wix model (Model A): platform registers on behalf of the customer. WHOIS privacy enabled. Student "owns" the domain via TOS.

## Prerequisites

Before running this skill:
1. Run `/domain-search` to confirm the domain is available and the user wants it
2. AWS CLI configured with Route 53 access (`aws configure`)
3. Cloudflare API token with Zone:Zone:Edit and Zone:DNS:Edit permissions

Credentials reference:
- AWS IAM user: `curiouscirkits_cli`
- AWS region: `us-east-1` (Route 53 Domains API only works here)
- Cloudflare Account ID: `8cd5b16ab59a1ab35f84284b2a009c86`
- Cloudflare token name: `CuriousCirkits-CFToken`
- Cloudflare token stored in: `scripts/domain-spike/.env`

## Step 1: Confirm with user

Show the domain and price. Ask for confirmation:
"Register <domain> for $<price>/year? This costs real money (charged to the AWS account)."

If no confirmation, stop.

## Step 2: Register the domain

```bash
aws route53domains register-domain \
  --domain-name <domain> \
  --duration-in-years 1 \
  --no-auto-renew \
  --admin-contact '{"FirstName":"CuriousCirkits","LastName":"Platform","ContactType":"COMPANY","OrganizationName":"CuriousCirkits","AddressLine1":"123 Platform St","City":"Portland","State":"OR","CountryCode":"US","ZipCode":"97201","PhoneNumber":"+1.5551234567","Email":"domains@curiouscirkits.com"}' \
  --registrant-contact '{"FirstName":"CuriousCirkits","LastName":"Platform","ContactType":"COMPANY","OrganizationName":"CuriousCirkits","AddressLine1":"123 Platform St","City":"Portland","State":"OR","CountryCode":"US","ZipCode":"97201","PhoneNumber":"+1.5551234567","Email":"domains@curiouscirkits.com"}' \
  --tech-contact '{"FirstName":"CuriousCirkits","LastName":"Platform","ContactType":"COMPANY","OrganizationName":"CuriousCirkits","AddressLine1":"123 Platform St","City":"Portland","State":"OR","CountryCode":"US","ZipCode":"97201","PhoneNumber":"+1.5551234567","Email":"domains@curiouscirkits.com"}' \
  --privacy-protect-admin-contact \
  --privacy-protect-registrant-contact \
  --privacy-protect-tech-contact \
  --region us-east-1
```

Save the operation ID from the response.

## Step 3: Wait for registration

Poll until complete (typically 1-15 minutes):

```bash
aws route53domains get-operation-detail \
  --operation-id <id> --region us-east-1
```

Poll every 10 seconds. Show progress: "Registering <domain>... (Xs elapsed)"

## Step 4: Create Cloudflare zone

Read the Cloudflare token from `scripts/domain-spike/.env`:

```bash
source scripts/domain-spike/.env
curl -s -X POST "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"name\":\"<domain>\",\"account\":{\"id\":\"$CLOUDFLARE_ACCOUNT_ID\"},\"type\":\"full\"}"
```

Save the zone ID and Cloudflare nameservers from the response.

## Step 5: Set nameservers

Point the domain to Cloudflare's nameservers:

```bash
aws route53domains update-domain-nameservers \
  --domain-name <domain> \
  --nameservers Name=<ns1> Name=<ns2> \
  --region us-east-1
```

Use the nameservers returned from Step 4.

## Step 6: Add A record

Point the domain to Vercel:

```bash
source scripts/domain-spike/.env
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/<zone-id>/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"<domain>","content":"76.76.21.21","ttl":1,"proxied":true}'
```

76.76.21.21 is Vercel's A record IP.

## Step 7: Verify

```bash
dig @<cloudflare-ns1> <domain> A +short
```

Should return 76.76.21.21 (or Cloudflare proxy IP if proxied). Cloudflare-side resolves in minutes. Full global propagation up to 48 hours.

## Step 8: Report

```
══════════════════════════════════════
  DOMAIN REGISTERED
══════════════════════════════════════
  Domain:      <domain>
  Price:       $<price>/year
  Nameservers: <ns1>, <ns2>
  Points to:   Vercel (76.76.21.21)
  TLS:         Automatic (Cloudflare)
  Status:      LIVE (or PROPAGATING)
══════════════════════════════════════
```

## Key rules

- Always confirm with user before registering (costs real money)
- Auto-renew OFF for test domains
- Contact info is CuriousCirkits platform info, not student info
- WHOIS privacy always enabled
- Route 53 Domains API only works in us-east-1
- No Stripe yet (Option A: platform eats cost for validation)
- After purchase, update the domain_bindings table in Supabase (future step)

## Database (future integration)

The `domain_bindings` table exists in Supabase (migration 001):
```sql
domain_bindings (id, user_id, domain, portfolio_id, active_version_id,
  is_subdomain, registrar_ref, status, expires_at, created_at)
```
Status machine: `pending → dns_pending → dns_active → cert_pending → live → failed`
