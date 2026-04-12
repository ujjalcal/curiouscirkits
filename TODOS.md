# TODOS

## Pre-Interview (before sharing with students)
- [ ] Replace regex HTML sanitization with DOMPurify (P1 security fix)
- [ ] Add rate limiting to /api/ai/generate (P1 abuse prevention)
- [ ] Add max length constraints to Zod content schema (P2)
- [ ] Switch draft save from INSERT to UPSERT (P2, prevents table bloat)
- [ ] Add Open Graph meta tags to /p/[subdomain] (P1, portfolios look broken when shared)
- [ ] Install Vitest + write unit tests for sanitization, schema, publish route (~15-20 tests)

## Pre-Spike
- [ ] Research registrar alternatives to ResellerClub: Porkbun (simple API, no IP whitelisting, cheap .xyz), Gandi (per-domain contacts, documented API). Pick simplest path for the spike.

## Post-Interview (Week 2-3, conditional)
- [ ] Add Playwright E2E tests for critical user flows (onboarding -> generate -> sign up -> editor -> publish -> view). ~35 tests planned from original eng review.
- [ ] Image upload API route (assets table exists, no endpoint)
- [ ] Google OAuth redirect URI for production Vercel URL
- [ ] Verify /p/[subdomain] works on production
