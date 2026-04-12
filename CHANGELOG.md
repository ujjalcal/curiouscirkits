# Changelog

All notable changes to CuriousCirkits will be documented in this file.

## [0.2.0.0] - 2026-04-12

### Added
- Login and logout routes (`/auth/login`, `/auth/logout`) for returning users
- Landing page nav shows auth state: "Sign in" for guests, "My portfolio" + "Sign out" for logged-in users
- Domain purchase spike script for Route 53 + Cloudflare DNS integration testing
- Cloudflare operations skill for future session context
- Vitest test framework with 16 unit tests (content schema validation, HTML sanitization, theme rendering)
- TODOS.md tracking pre-interview and post-interview work items

### Changed
- Excluded `scripts/` from TypeScript build to avoid spike dependency conflicts

## [0.1.0] - 2026-04-10

### Added
- Initial MVP: AI portfolio generation, Google OAuth, form editor, 3 Handlebars themes
- Publish to `/p/[subdomain]` with server-rendered HTML
- Supabase auth + Postgres with row-level security
- AI generation with Gemini 2.5 Flash + HuggingFace Qwen 72B fallback
