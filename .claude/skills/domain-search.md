# Domain Search — CuriousCirkits

Search for available domains across multiple TLDs, show prices, and help users pick the best one.

## Quick Search

```bash
# Search a name across popular TLDs
NAME="reyanmakes"
for TLD in com xyz click link net org site online me; do
  aws route53domains check-domain-availability \
    --domain-name "${NAME}.${TLD}" --region us-east-1 \
    --output json
done
```

## Get Price for a TLD

```bash
aws route53domains list-prices --tld com --region us-east-1
```

## Pricing Reference (Route 53, April 2026)

| TLD | Register | Renew | Notes |
|-----|----------|-------|-------|
| .click | $3 | $3 | Cheapest available |
| .link | $5 | $5 | Cheap, decent |
| .com | $15 | $15 | Most professional, recommend first |
| .org | $15 | $15 | Good for projects/nonprofits |
| .net | $17 | $17 | Familiar, established |
| .xyz | $18 | $18 | Tech-friendly |
| .site | $25 | $25 | Self-explanatory |
| .online | $25 | $25 | Modern feel |
| .me | $31 | $31 | Great for personal portfolios |
| .co | $38 | $38 | Startup-friendly |
| .tech | $40 | $40 | Tech audience |
| .io | $71 | $71 | Expensive, developer-oriented |
| .ai | $129 | $129 | Very expensive |

365 TLDs available on Route 53 total.

## Default Search TLDs

Search these 9 by default (covers cheap + popular + portfolio-friendly):
```
com, xyz, click, link, net, org, site, online, me
```

## Display Rules

1. Always show .com first (if available), it's the most professional
2. Sort remaining by price (cheapest first)
3. Mark taken domains with ❌
4. Mark recommended domain (usually .com if available, else cheapest)
5. Show price per year

## Example Output

```
Search: reyanmakes

  ❌ reyanmakes.com         TAKEN
  ✅ reyanmakes.click        $3/year
  ✅ reyanmakes.link         $5/year    ← cheapest
  ✅ reyanmakes.org         $15/year
  ✅ reyanmakes.net         $17/year
  ✅ reyanmakes.xyz         $18/year
  ✅ reyanmakes.site        $25/year
  ✅ reyanmakes.online      $25/year
  ✅ reyanmakes.me          $31/year    ← great for portfolios
```

## Variations to Suggest

When the exact name is taken on .com, suggest:
- Add a prefix: `the-`, `my-`, `hey-`, `im-`
- Add a suffix: `-dev`, `-makes`, `-codes`, `-works`, `-portfolio`
- Example: reyanmakes.com is taken → suggest myreyan.com, reyan-dev.com, reyan.me

## API Route Design (for the app)

```
GET /api/domains/search?name=reyanmakes

Response:
{
  "query": "reyanmakes",
  "results": [
    { "domain": "reyanmakes.com", "available": false, "tld": "com" },
    { "domain": "reyanmakes.click", "available": true, "tld": "click", "price": 3, "currency": "USD" },
    { "domain": "reyanmakes.link", "available": true, "tld": "link", "price": 5, "currency": "USD" },
    { "domain": "reyanmakes.com", "available": true, "tld": "org", "price": 15, "currency": "USD", "recommended": true }
  ]
}
```

## Performance

- Each Route 53 availability check takes ~1-2 seconds
- 9 TLDs sequentially = ~15 seconds (too slow)
- Run all 9 in parallel via Promise.all() = ~2-3 seconds (good)
- Cache TLD pricing (changes rarely, fetch once at app start)

## Key Rules

- Route 53 Domains API only works in `us-east-1` region
- Always pass `--region us-east-1` to domain commands
- Availability returns `AVAILABLE`, `UNAVAILABLE`, `DONT_KNOW`, or `RESERVED`
- Treat `DONT_KNOW` and `RESERVED` as unavailable for display
- Never cache availability results (changes in real time)
- Do cache pricing (update daily or on deploy)

## Credentials

Uses the same AWS credentials as domain-purchase:
- IAM user: `curiouscirkits_cli`
- Permissions: `AmazonRoute53DomainsFullAccess`
- Region: `us-east-1`
