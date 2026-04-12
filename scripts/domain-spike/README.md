# Domain Purchase Spike

Quick and dirty proof-of-concept: register a domain via AWS Route 53, point it to Cloudflare DNS, verify TLS.

## Architecture

```
AWS Route 53  →  registers the domain (only part outside Cloudflare)
     ↓
Set nameservers to Cloudflare
     ↓
Cloudflare handles everything else:
  - DNS zone + records
  - TLS cert (automatic, free)
  - CDN / Workers (if needed later)
```

This is the Squarespace/Wix model: platform registers on behalf of the customer. Customer "owns" the domain via TOS. WHOIS shows platform proxy info.

## Two Phases

### Phase 1: Free validation (no purchase)
Proves all APIs work without spending money:
1. Route 53: check domain availability
2. Route 53: create hosted zone + A record
3. Cloudflare: create zone + A record
4. Log all responses

Cost: $0.50 for Route 53 hosted zone (deleted during cleanup)

### Phase 2: Real purchase ($2-12)
One actual domain registration to prove the full chain:
1. Register a cheap .xyz domain via Route 53
2. Set nameservers to Cloudflare
3. Verify resolution via dig

## Prerequisites

- AWS account with Route 53 access
- AWS CLI configured (`aws configure`)
- Cloudflare account with API token (Zone:Edit, DNS:Edit permissions)
- Node.js 18+

## Setup

```bash
cd scripts/domain-spike
npm install
cp .env.example .env
# Fill in CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID
```

## Run

```bash
# Phase 1: free validation
npx tsx spike.ts phase1 test-cirkits.xyz

# Clean up test zones when done
npx tsx spike.ts cleanup test-cirkits.xyz

# Phase 2: real purchase (costs money!)
npx tsx spike.ts register test-cirkits.xyz

# Check availability only
npx tsx spike.ts check reyanmakes.xyz

# Print verification commands
npx tsx spike.ts verify test-cirkits.xyz
```

## What This Proves

- Route 53 can register domains programmatically
- Cloudflare can create DNS zones and manage records via API
- TLS cert is issued automatically by Cloudflare
- The full chain works: register -> DNS -> resolve
- This is the same model Squarespace and Wix use

## What This Skips

- Stripe / payments
- UI
- Error handling beyond basics
- Status machine (pending -> dns_pending -> live)
- Production deployment
- Per-domain WHOIS contacts (not needed for Model A)
