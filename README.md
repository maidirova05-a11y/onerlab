# OnerLab — лендинг академии живописи для детей (Астана)

Production-ready fullstack landing page for **OnerLab**, an offline painting academy for
children (grades 1–8) in Astana.

- **Frontend UI is entirely in Russian.** Code, comments and docs are in English.
- **Stack:** Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v4 · Prisma ·
  PostgreSQL · Zod · Pino.

---

## Quick start

```bash
npm install
```

```bash
cp .env.example .env
```

Fill in `DATABASE_URL`, then create the schema and run the dev server:

```bash
npm run db:push
```

```bash
npm run dev
```

The site is served at <http://localhost:3000>.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server with HMR |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` — strict, no `any` escape hatches |
| `npm run db:push` | Sync the Prisma schema to the database (dev) |
| `npm run db:migrate` | Create a migration (dev) |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:studio` | Browse leads in Prisma Studio |

---

## Project structure

Business logic, UI, API routes and database config are deliberately kept apart, so each
layer can be tested and changed on its own.

```
├── prisma/
│   └── schema.prisma              # Lead model + LeadStatus enum
├── public/
│   ├── logo.png                   # circular badge, cut from the supplied logo
│   ├── logo-wordmark.png          # transparent wordmark for the header
│   └── apple-touch-icon.png
└── src/
    ├── app/
    │   ├── layout.tsx             # metadata, fonts, JSON-LD, CSP nonce
    │   ├── page.tsx               # section composition
    │   ├── globals.css            # design tokens (@theme) + base styles
    │   ├── error.tsx              # route error boundary (leaks nothing)
    │   ├── not-found.tsx
    │   ├── privacy/page.tsx       # Политика конфиденциальности
    │   ├── robots.ts / sitemap.ts
    │   └── api/leads/route.ts     # POST /api/leads — the only write endpoint
    ├── components/
    │   ├── icons/                 # inline SVG set (no icon dependency)
    │   ├── layout/                # Header, Footer, Logo
    │   ├── sections/              # Hero, About, Advantages, Program, Gallery, Signup
    │   ├── form/                  # LeadForm, CaptchaWidget
    │   └── ui/                    # Button, Container, SectionHeading, Reveal
    ├── content/site.ts            # ALL Russian copy — single source of truth
    ├── lib/
    │   ├── env.ts                 # Zod-validated environment, fails fast at boot
    │   ├── db.ts                  # Prisma singleton
    │   ├── logger.ts              # Pino + redaction
    │   ├── http.ts                # response envelope + error taxonomy
    │   ├── rate-limit.ts          # sliding-window limiter (swappable store)
    │   ├── captcha.ts             # Turnstile / reCAPTCHA verification
    │   ├── request-context.ts     # client IP, IP hashing, CORS, origin check
    │   ├── sanitize.ts            # XSS / control-char / phone normalisation
    │   ├── phone-mask.ts          # +7 (7XX) XXX-XX-XX input mask
    │   ├── reveal-controller.ts   # one shared scroll-reveal observer + fallback
    │   └── cn.ts
    ├── server/services/
    │   └── lead.service.ts        # lead business logic (no HTTP concerns)
    ├── validation/
    │   └── lead.schema.ts         # ONE Zod schema, used by client AND server
    └── middleware.ts              # per-request CSP nonce
```

---

## Design system

Colours were sampled directly out of the supplied logo file rather than estimated:

| Token | Value | Where it comes from | Used for |
| --- | --- | --- | --- |
| `--color-brand` | `#FAC90A` | mean of the "lab" badge pixels | primary CTAs, highlights **only** |
| `--color-ink-soft` | `#5D5D5D` | mean of the "öner" wordmark | secondary text |
| `--color-ink` | `#333333` | per brief | headings and body copy |
| `--color-canvas` | `#FFFFFF` | per brief | backgrounds |

Yellow is rationed on purpose: exactly one element per screen is yellow, otherwise nothing
reads as *the* action.

Other notes:

- **Mobile-first.** Every layout starts as a single column; `sm`/`lg` only add.
  Touch targets are ≥ 44 px. Pinch-zoom is never disabled.
- **Canvas texture** is an inline SVG turbulence filter (`.texture-canvas`) — no image
  request. Paint-stroke accents (`.brush-underline`, `.paint-blob`) are pure CSS/SVG.
- **Motion** is driven by one shared `IntersectionObserver` for the whole page and is
  fully disabled under `prefers-reduced-motion`. Because the reveal animation starts at
  `opacity: 0`, the controller also runs a throttled geometry sweep on `scroll`/`resize`
  as a safety net — content must never be left invisible because an observer did not
  report. That sweep is throttled with `setTimeout`, deliberately not
  `requestAnimationFrame`, since rAF is suspended in exactly the situation the fallback
  exists for.
- **Fonts** (Inter + Manrope, both with Cyrillic subsets) are self-hosted at build time by
  `next/font`, so no request ever reaches Google and the CSP needs no font host.

### Adding real gallery photos

Drop files into `public/gallery/` and add `src` to the matching entry in
`src/content/site.ts`. The `Gallery` component renders `next/image` instead of the styled
placeholder automatically — no component change needed.

---

## Security

### Request pipeline for `POST /api/leads`

Checks are ordered cheapest-first, so abusive traffic is rejected before it costs a
database round-trip or an outbound CAPTCHA call.

| # | Control | Blocks | Status |
| --- | --- | --- | --- |
| 1 | Origin allow-list | cross-site abuse / CSRF | `403` |
| 2 | `Content-Type: application/json` required | simple-request CSRF | `415` |
| 3 | Body size cap (8 KB, header **and** actual bytes) | memory exhaustion | `413` |
| 4 | Sliding-window rate limit per IP (count + record serialised per IP with a transaction-scoped advisory lock) | spam, app-layer DoS | `429` |
| 5 | Honeypot field | naive bots | `201` decoy |
| 6 | Zod validation + sanitisation | malformed / hostile input | `400` |
| 7 | CAPTCHA verification | scripted bots | `403` |
| 8 | Duplicate guard (same phone / 10 min, serialised per phone with a transaction-scoped advisory lock) | double submits | `409` |
| 9 | Prisma write | — | `201` |

### Injection & XSS

- **SQL/NoSQL injection:** every query goes through Prisma, which only emits parameterised
  statements. There is no `$queryRawUnsafe` anywhere in the codebase.
- **XSS:** React escapes on render; on top of that `sanitize.ts` strips C0/C1 control
  characters, zero-width and **bidi-override** characters (Trojan-Source style attacks),
  collapses whitespace and hard-caps length before anything is stored. `escapeHtml()` is
  available for non-auto-escaping sinks (CSV export, email templates, CRM fields).
- **Mass assignment:** `lead.service.ts` lists columns explicitly instead of spreading the
  parsed body, so a client cannot smuggle in `status` or `id`.

### Headers

Static headers (`next.config.ts`): HSTS (2 years, `includeSubDomains; preload`),
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
`Permissions-Policy`, COOP/CORP, and `poweredByHeader: false`.

Per-request CSP (`middleware.ts`) with a fresh nonce and `'strict-dynamic'`, plus
`frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`.

> **Why the page is dynamically rendered.** A nonce must differ per request, so
> `layout.tsx` reads `headers()` — which opts the tree into dynamic rendering. Baking a
> nonce into statically prerendered HTML would make it identical for every visitor
> (worthless), and with `'strict-dynamic'` the prerendered scripts would carry no nonce at
> all, so the browser would block the whole bundle. Every section is a Server Component
> with no data fetching, so a render is pure string assembly. If you would rather have the
> full-page static cache, remove the `headers()` call *and* drop the nonce from the CSP —
> not one without the other.

### Secrets

All credentials live in `.env` (gitignored); `.env.example` documents every key with
placeholder values. `src/lib/env.ts` parses the whole environment through Zod at boot, so
a missing or malformed value is a startup failure with a readable message, never a
mystery 500 later. Error output names variables only — values are never echoed.

`CAPTCHA_SECRET_KEY` is read exclusively on the server; the client receives only
`NEXT_PUBLIC_CAPTCHA_SITE_KEY`, passed down as a prop from a Server Component.

### Logging

Pino, JSON in production and pretty locally. Personal data (`phone`, `parentName`,
`childNameAge`), tokens, cookies and connection strings are **redacted by the logger
itself**, so a careless `log.info(body)` cannot leak them. Every request carries a
`requestId`, echoed to the client in `X-Request-Id`, which is what makes an incident
traceable from a user report to a log line.

### Error handling

`AppError` + a fixed catalogue of Russian messages. The client only ever sees a curated
string — never `error.message`, a stack trace, a Prisma error code or a table name. The
route wraps everything in a single `try/catch`, so no exception can crash the process.

### Personal data

Raw IP addresses are never stored. `ipHash` is a salted SHA-256 digest, which preserves
abuse-forensics value without keeping a directly identifying address in the database.

---

## Configuring bot protection

Development runs with `CAPTCHA_PROVIDER=none` (verification skipped). **Set a real
provider before going live** — the app logs a loud warning at boot if you do not.

**Cloudflare Turnstile** (recommended — free, no attribution UI required):

```
CAPTCHA_PROVIDER=turnstile
NEXT_PUBLIC_CAPTCHA_SITE_KEY=0x4AAAAAAA...
CAPTCHA_SECRET_KEY=0x4AAAAAAA...
```

**Google reCAPTCHA v3:**

```
CAPTCHA_PROVIDER=recaptcha
NEXT_PUBLIC_CAPTCHA_SITE_KEY=6Lc...
CAPTCHA_SECRET_KEY=6Lc...
CAPTCHA_MIN_SCORE=0.5
```

The CSP automatically opens the exact origins the selected provider needs, and nothing
more. Verification **fails closed**: if the provider is unreachable, the submission is
rejected rather than waved through.

---

## Scaling the rate limiter

The default store is in-process, which is correct for a single Node instance. Across N
replicas each keeps its own counters, so the effective limit becomes N × the quota.

`src/lib/rate-limit.ts` defines a `RateLimitStore` interface for exactly this reason —
implement it against Redis/Upstash and swap it in `createRateLimiter`. No route handler
changes.

---

## Deployment checklist

- [ ] `DATABASE_URL` points at production PostgreSQL **with `?sslmode=require`**
- [ ] `NEXT_PUBLIC_SITE_URL` is the real origin (drives CORS, canonical URLs, sitemap)
- [ ] `ALLOWED_ORIGINS` is empty unless a second domain genuinely needs API access
- [ ] `CAPTCHA_PROVIDER` + `CAPTCHA_SECRET_KEY` are set
- [ ] `npm run db:deploy` has been run
- [ ] TLS terminates in front of the app (HSTS is sent with `preload`)
- [ ] Reverse proxy **overwrites** `X-Forwarded-For` (`proxy_set_header X-Forwarded-For
      $remote_addr;`) — appending lets a client spoof it and dodge the rate limiter
- [ ] `LOG_LEVEL=info` and logs are shipped somewhere durable

## Деплой

Проект связан с этим репозиторием на Vercel: пуш в `main` выкатывает
продакшен на https://onerlab.kz, пул-реквест собирает preview-ссылку.

Сборка запускает `prisma generate && next build` (см. `vercel.json`).

**Миграции намеренно вынесены из сборки.** Neon на бесплатном тарифе усыпляет
compute после простоя, и `prisma migrate deploy` падал с `P1001` на холодной
базе — то есть косметическая правка текста не выкатывалась из-за того, что
база спала. Кроме того, миграция во время сборки не имеет пути отката и
конфликтует сама с собой при параллельных сборках.

Когда в схеме появилась новая миграция, накатите её отдельно и осознанно:

```bash
npm run db:deploy
```

Секреты живут только в переменных окружения проекта Vercel — в репозитории
их нет. Список требуемых ключей: `.env.example`.

Ручной деплой, если он всё же нужен:

```bash
npx vercel deploy --prod
```
