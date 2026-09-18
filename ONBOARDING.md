# Hisaab — Agent Handoff & Project Context

> Read this first. It is the single source of truth for picking up work on Hisaab.
> Secrets are **not** in this file — they live in `.env` (gitignored) on the machine.

---

## 1. What Hisaab is

**Hisaab is an AI "money brain" for Indian merchants, pitched as a feature built into Paytm.**
It started as a **GST copilot** (reads Paytm sales, matches purchase invoices, catches unclaimed
Input Tax Credit, pre-fills GSTR-3B, human-reviewed) and now extends into a full merchant-growth
suite: business health, working-capital credit, digital khata (udhaar), and compliance.

- Hackathon: **Build for India — Merchant Growth AI** track. Owner: `kunal@napkin.ie` (GitHub `latent-0`).
- Voice-first, Indic languages. Everything runs **keyless** via mock/sandbox fallbacks; real keys light up real AI/voice/memory.

### Live + repo
- **Prod app:** https://hisaab-s8f4.onrender.com
- **Paytm-integration demo:** https://hisaab-s8f4.onrender.com/v2  (tap **Hisaab · GST** → seamless auto-login into the app)
- **Repo:** https://github.com/latent-0/hisaab (branch `main`)
- **BMC artifact:** https://claude.ai/artifact/BR9PcPewaCAnqaoErAhoom

---

## 2. Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v3 · Prisma ORM · SQLite (dev + prod-ephemeral).
Deployed as a Docker container on **Render** (free tier). AI is provider-agnostic.

---

## 3. Run locally

```bash
cp .env.example .env      # then fill keys (or leave blank — mocks work)
npm install
npm run db:seed           # wipes + seeds demo data (do NOT use db:reset — its --force-reset trips Prisma's consent guard)
npm run dev               # http://localhost:3000
```

Demo logins: **9876543210** (Sharma General Store, hi) · **9812345678** (Anand Tiffins, en).
After changing `prisma/schema.prisma`: `npx prisma db push --skip-generate && npx prisma generate`, then **restart the dev server** (it caches the Prisma client).

Scripts: `npm run build` · `npm run typecheck` · `npm run db:seed`.

---

## 4. Directory map

```
src/
  app/
    page.tsx                marketing landing
    v2/                     Paytm-style shell (concept demo) + /v2/open-hisaab (auto-login hand-off)
    login/                  demo sign-in
    (app)/                  authed shell: dashboard, health, invoices, reconciliation,
                            returns, review, khata, credit, compliance, analytics, settings
    api/                    auth, invoices, returns, review, sales, voice, cognee,
                            automation (n8n), merchant, khata, compliance, health
  lib/
    ai/                     provider-agnostic engine: mock | groq | anthropic | gemini
    adapters/               paytm.ts (settlements), gstr2b.ts (ITC reconciliation) — sandbox
    agents/pipeline.ts      Intake→Classify→Cross-Check→Calculate over one invoice
    returns.ts              Calculate + Generate (GSTR-3B) at period level
    growth.ts credit.ts compliance.ts   Merchant-growth features
    cognee.ts knowledge.ts  knowledge-graph memory ("Ask your books")
    sarvam.ts               Indic STT/TTS/translate
    ocr.ts storage.ts session.ts constants.ts types.ts utils.ts impact.ts analytics.ts
prisma/                     schema + deterministic seed
integrations/n8n/           3 importable workflows
deploy/cloudrun.sh          GCP Cloud Run deploy (blocked: no active GCP billing — see §7)
Dockerfile docker-entrypoint.sh render.yaml
```

---

## 5. Environment variables

Full template in `.env.example`. **Real values are in `.env` on the machine (gitignored).**
Currently **active** providers: `LLM_PROVIDER=groq`, `VOICE_PROVIDER=sarvam`, Cognee configured.

| Variable | Purpose | Notes |
|---|---|---|
| `DATABASE_URL` | DB connection | SQLite `file:./dev.db` locally; Postgres for durable prod |
| `LLM_PROVIDER` | agent LLM | `mock` \| `groq` \| `anthropic` \| `gemini` (active: **groq**) |
| `GROQ_API_KEY` / `GROQ_MODEL` | Groq inference | model `openai/gpt-oss-20b` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Gemini (+ OCR) | optional; uses GCP credits |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Claude | optional |
| `VOICE_PROVIDER` | voice | `mock` \| `sarvam` (active: **sarvam**) |
| `SARVAM_API_KEY` | Indic STT/TTS/translate | `SARVAM_TTS_MODEL=bulbul:v3`, speaker `anushka` |
| `OCR_PROVIDER` | invoice OCR | `mock` \| `gemini` |
| `COGNEE_API_BASE` / `COGNEE_API_KEY` / `COGNEE_TENANT_ID` | knowledge graph | powers "Ask your books" on /analytics |
| `SESSION_SECRET` | signs demo session cookie | change in prod |
| `AUTOMATION_TOKEN` | protects `/api/automation/*` | for n8n/cron |
| `FILE_STORE` / `GCS_BUCKET` | invoice file storage | `local` \| `gcs` |
| `RENDER_API_KEY` | (tooling) manage the Render service | not used by the app |

**Getting keys:** Groq → console.groq.com · Sarvam → dashboard.sarvam.ai · Cognee → platform.cognee.ai → API Keys.

---

## 6. Deployment pipeline (prod)

**Push to `main` → Render auto-deploys.** No manual step.

- Host: **Render** (free Docker web service). Service `srv-damt91btqb8s739piplg`, region `singapore`, workspace `tea-cspreua3esus73al9gsg`.
- Build: Render builds the `Dockerfile`. On boot, `docker-entrypoint.sh` runs `prisma db push` then seeds if the DB is empty (`HISAAB_SEED=true`).
- **Ephemeral data:** free tier gives a fresh container per deploy/cold-start → SQLite **reseeds** and the Cognee sync flag resets. Fine for demo; for durable data use Postgres (§7).
- Env vars are set in the Render dashboard (Environment tab) — mirror `.env` there. `render.yaml` is the blueprint.
- Manage via Render API with `RENDER_API_KEY` (create service, read deploy status) or the dashboard.
- **Warm-up:** free instance sleeps after ~15 min idle; first hit cold-starts ~30–60s. Hit the URL before a demo. After a cold start, click **Analytics → Sync knowledge** to re-arm Cognee (~50s graph build).

### Durable production (optional)
Provision Cloud SQL / Neon Postgres → set `datasource.provider = "postgresql"` in `prisma/schema.prisma`,
set `DATABASE_URL`, run `npm run prisma:push && npm run db:seed` once, deploy with `HISAAB_SEED=false`.

### Google Cloud Run (currently blocked)
`deploy/cloudrun.sh` is ready, but the account's **GCP billing accounts are closed**, so Cloud Run can't
deploy. gcloud is installed; user is signed in as kunalachintya@gmail.com. Use Render unless billing is enabled.

---

## 7. Conventions & gotchas (important)

- **Commits: never credit Claude.** No `Co-Authored-By: Claude`, no "Generated with Claude Code". Commit as `latent-0 <kunalachintya01@gmail.com>`. The user also has commits **backdated to 2026-09-18** to keep a single-day history — match that pattern (`GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE`) unless told otherwise.
- **No em-dashes** anywhere in UI copy, titles, or docs (style preference). En-dashes in numeric ranges are fine.
- **Deterministic seed:** `prisma/seed.ts` forces `LLM_PROVIDER=mock` so demo numbers are stable (₹4,120 unclaimed, ₹2,432 net). Live uploads use the real provider (groq).
- **Cognee `/add` ingests the `data` field as an uploaded FILE (Blob)** — the `raw_data` string field silently no-ops. Auth headers: `X-Api-Key` + `X-Tenant-Id`. Sync is per-database, so after a fresh deploy click "Sync knowledge".
- **Sarvam** needs proper UTF-8 (Node `fetch` is fine; Windows `curl -d` mangles Devanagari). TTS model must be `bulbul:v3` (v2 deprecated); speakers are v3-specific.
- Auth-gated pages return **307 → /login** when logged out (expected, not a bug).
- Windows: Git warns `LF will be replaced by CRLF` — harmless.
- Dev tips: prefer editing files over `db:reset`; the app runs fully with zero keys.

---

## 8. 2-minute demo script

1. Open **/v2** → tap **Hisaab · GST** (auto-signs in) → land on the dashboard.
2. Dashboard: ₹4,120 unclaimed ITC, GSTR-3B draft, **Grow your business** strip (health / credit / khata).
3. Voice widget (bottom-right): ask *"How much GST did I save this month?"* (engine) and *"Which supplier gave me the most ITC?"* (Cognee).
4. **/health** growth score · **/credit** ₹2.35L pre-approved · **/khata** overdue udhaar + remind · **/compliance** deadlines + paste a GST notice → AI explains it.
5. **/analytics → Ask your books** (Cognee) and **Sync knowledge** if needed.

---

## 9. Product context (for pitch/BMC work)

GST is the free wedge; the daily value (profit, cash, credit, compliance) drives retention and widens
the market beyond the ~1.4 cr GST-registered to all 4.8 cr Paytm merchants. Moat: only Paytm sees the
real-time sales ledger; zero-CAC in-app distribution; reconciled books feed a lending flywheel.
Monetization: Free copilot → Pro (CA-reviewed filing) → credit take-rate → multi-outlet SaaS.
