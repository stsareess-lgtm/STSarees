# Sakthi Textile hosting architecture (industry standard)

## Target stack (recommended — do not full-migrate to Cloudflare Workers yet)

| Layer | Service | Role |
|-------|---------|------|
| **DNS + edge CDN + WAF** | Cloudflare (Free or Pro) | Proxy `www`, cache static assets, block bots |
| **App (Next.js SSR/ISR)** | Vercel Pro (~$20/mo) | Serverless functions, admin, checkout |
| **Database** | Supabase `cpqcndouxlqutlmvowiy` | Postgres via **transaction pooler :6543** |
| **Product media CDN** | Cloudflare R2 + `cdn.sakthitextile.com` | Already in place |
| **Cross-instance cache** | Upstash Redis | Storefront data cache |

This matches how most small/mid e-commerce shops run: **Cloudflare in front, Vercel as origin, Supabase as DB**.

## Cloudflare DNS setup (orange cloud)

1. In **Cloudflare DNS** for `sakthitextile.com`:
   - `www` → CNAME → `cname.vercel-dns.com` — **Proxied (orange cloud)**
   - `@` apex → redirect to `https://www.sakthitextile.com` (Cloudflare Redirect Rule or CNAME flattening to www)
2. In **Vercel** → Project → Domains: add `www.sakthitextile.com` (already should be there).
3. SSL/TLS mode: **Full (strict)**.
4. Do **not** point `cdn.sakthitextile.com` at Vercel — it stays on R2.

### Cloudflare cache rules (dashboard → Rules → Cache Rules)

| Rule | Match | Cache |
|------|-------|-------|
| Static Next assets | URI Path starts with `/_next/static/` | Cache Everything, Edge TTL 1 year |
| Public product API | URI Path equals `/api/storefront/products` | Respect origin `Cache-Control` (s-maxage=300) |
| Bypass dynamic | URI Path starts with `/admin`, `/api/create-checkout`, `/api/cashfree`, `/api/phonepe`, `/cart`, `/orders` | Bypass cache |
| Bypass health deep | URI Path equals `/api/health` and query `deep=1` | Bypass cache |

## Vercel environment (production)

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | `postgresql://postgres.cpqcndouxlqutlmvowiy:…@aws-0-ap-south-1.pooler.supabase.com:5432/postgres` (app rewrites to **6543**) |
| `CRON_SECRET` | Random secret (required for hourly stock-release cron) |
| **Unset** | `SUPABASE_DB_SESSION_POOLER` — must not be `true` |

## Health checks

| URL | Use |
|-----|-----|
| `GET /api/health` | Uptime / keep-warm (no DB, cheap) |
| `GET /api/health?deep=1` | Alerting only (DB + Redis), e.g. once per hour |

## What we optimized in code

- Middleware skips `/api/*` (webhooks, health, storefront JSON) → fewer edge requests
- Storefront ISR TTL **5 minutes** with on-demand revalidation when products change
- Stock release via **Vercel cron** hourly, not on every page view
- Static `/_next/static` long-cache headers for Cloudflare

## When to upgrade Vercel Pro

Upgrade when **Fluid Active CPU** or **function invocations** exceed Hobby limits. Cloudflare proxy helps edge/bots but **does not remove** SSR CPU on Vercel.

## When *not* to move fully to Cloudflare

Full Next.js on Workers requires OpenNext migration, re-testing checkout/webhooks, and ongoing ops. Only consider if Vercel cost >> engineering time **after** these optimizations.
