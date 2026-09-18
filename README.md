# Hisaab — the GST copilot built into every Paytm transaction

Hisaab reads a merchant's sales straight from Paytm's ledger, matches them to
purchase invoices, catches every unclaimed rupee of **Input Tax Credit (ITC)**,
and pre-fills **GSTR-3B** — always reviewed by a human before filing. Voice-first,
in the merchant's own language.

> Build for India · Merchant Growth AI track.

<p align="center"><em>Intake → Classify → Cross-Check → Calculate → Generate — five agents, one pipeline, human-reviewed.</em></p>

---

## Why it's different

| | Existing GST tools | **Hisaab** |
|---|---|---|
| Data entry | Manual, every invoice | **Automatic — zero entry** |
| Where it lives | A separate app to remember | **Inside the Paytm app** |
| Update speed | Monthly, at filing time | **Real-time, every settlement** |

The sales side (QR / Soundbox / EDC) is the wedge no standalone tool can see —
Hisaab treats it as a first-class ledger and reconciles the purchase side against it.

---

## What's in the box

- **Marketing site** (`/`) and a **merchant dashboard** — the "moment that sells it":
  unclaimed ITC this month, invoices flagged before filing, and a voice assistant.
- **5-agent pipeline** over every purchase invoice:
  1. **Intake** — reads the invoice (OCR / paste / manual) into structured fields
  2. **Classify** — expense category + ITC eligibility (incl. Section 17(5) blocked credits)
  3. **Cross-Check** — GSTR-2B reconciliation, GSTIN validation, duplicate detection
  4. **Calculate** — claimable ITC, net liability
  5. **Generate** — a GSTR-3B draft (per-rate, exportable)
- **Reconciliation** view — the two ledgers, finally talking.
- **Human-in-the-loop review queue** — anything low-confidence lands here.
- **Voice assistant** — "इस महीने कितना GST बचा?" answered out loud, in-language.
- **n8n automations** — scheduled settlement sync + filing reminders.
- **Cloud Run**-ready container.

Everything runs **with zero API keys** using deterministic mock/sandbox providers.

---

## Quick start

```bash
cp .env.example .env        # defaults work as-is (all mock/sandbox)
npm install
npm run db:reset            # create SQLite schema + seed demo data
npm run dev                 # http://localhost:3000
```

Sign in as **Sharma General Store** (phone `9876543210`) or **Anand Tiffins**
(`9812345678`).

### Handy scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run db:seed` | Seed demo data |
| `npm run db:reset` | Wipe + recreate + seed |
| `npm run typecheck` | `tsc --noEmit` |

---

## Configuration

All optional — see [`.env.example`](.env.example). The app degrades gracefully to
mocks if a key is missing or a call fails.

| Variable | Values | Notes |
|---|---|---|
| `LLM_PROVIDER` | `mock` · `groq` · `anthropic` · `gemini` | Powers Intake/Classify + voice answers |
| `GROQ_API_KEY` / `GROQ_MODEL` | | when `groq` (fast OpenAI-compatible inference) |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | | when `anthropic` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | | when `gemini` (uses your GCP credits) |
| `VOICE_PROVIDER` | `mock` · `sarvam` | Indic ASR/TTS; browser speech by default |
| `OCR_PROVIDER` | `mock` · `gemini` | `gemini` reads PDFs/images |
| `COGNEE_API_BASE` / `COGNEE_API_KEY` / `COGNEE_TENANT_ID` | | knowledge-graph memory ("Ask your books") |
| `DATABASE_URL` | | SQLite by default; Postgres for prod |
| `AUTOMATION_TOKEN` | | enables `/api/automation/*` for n8n/cron |
| `FILE_STORE` | `local` · `gcs` | invoice file storage |

**Provider-agnostic AI:** the pipeline talks to one `AiEngine` interface
(`src/lib/ai/`). Swap providers with an env var; the mock is always the fallback.

---

## Architecture

```
src/
  app/
    (app)/            authenticated shell: dashboard, invoices, reconciliation,
                      returns, review, settings
    api/              auth, invoices, returns, review, sales, voice, automation, health
    page.tsx          marketing landing
    login/            demo sign-in
  components/         UI primitives, sidebar, charts, pipeline, voice widget
  lib/
    ai/               provider-agnostic engine (mock | anthropic | gemini)
    adapters/         paytm.ts (settlements), gstr2b.ts (ITC reconciliation)
    agents/pipeline.ts  Intake→Classify→Cross-Check→Calculate over one invoice
    returns.ts        Calculate + Generate (GSTR-3B) at the period level
    ocr.ts, storage.ts, session.ts, constants.ts, types.ts, utils.ts
prisma/               schema + seed
integrations/n8n/     scheduled sync + filing-reminder workflows
deploy/cloudrun.sh    one-command Cloud Run deploy
```

**The Paytm & GSTN seam.** Real Paytm settlement and GSTN GSTR-2B APIs require a
merchant/GSP partnership. Hisaab isolates them behind `PaytmAdapter` and
`Gstr2bAdapter`; the sandbox implementations return realistic, deterministic data
so the whole product works end to end. Swap in the real clients without touching
the pipeline, UI, or API.

**Data model portability.** SQLite for local dev (zero setup). JSON payloads are
stored as strings and "enums" as validated string constants, so the identical
schema moves to Postgres by changing one `provider` line.

---

## Deploy to Google Cloud Run

```bash
PROJECT_ID=your-project REGION=asia-south1 ./deploy/cloudrun.sh
```

This builds the container with Cloud Build and deploys it. The default image is
self-contained (SQLite + seed on boot) — great for a live demo. **Data is
ephemeral on Cloud Run** (resets on cold start).

### Production database (durable)

1. Create Cloud SQL for PostgreSQL and a database `hisaab`.
2. In `prisma/schema.prisma`, set `datasource.provider = "postgresql"`.
3. Set `DATABASE_URL` to the Cloud SQL connection string.
4. Run once against prod: `npm run prisma:push && npm run db:seed`.
5. Redeploy with `HISAAB_SEED=false` and `DATABASE_URL` set.

---

## Knowledge memory — "Ask your books" (Cognee)

When `COGNEE_*` is set, the **Analytics** page gains an *Ask your books* card. Hitting
**Sync** pushes a natural-language knowledge base of the merchant's invoices,
suppliers, ITC status and monthly returns into a Cognee knowledge graph
(`src/lib/knowledge.ts` → `src/lib/cognee.ts`). You can then ask cross-time
questions grounded in that graph — *"Which supplier gave me the most ITC?"*,
*"How much ITC is blocked and why?"*, *"How did my net GST change over the months?"*
Per-merchant isolation uses one Cognee dataset per GSTIN.

## Automation (n8n)

Set `AUTOMATION_TOKEN`, then import the workflows in
[`integrations/n8n/`](integrations/n8n/):

- **Daily Paytm sync** — refresh settlements + GSTR-3B for all merchants each morning.
- **GSTR-3B reminders** — localized deadline nudges with net payable & unclaimed ITC.

---

## Notes & honest limitations

- Paytm settlements and GSTR-2B are **sandbox** data by design (no partner APIs in a hackathon).
- "Mark as filed" is a demo action; it does not submit to the GST portal. The
  GSTR-3B **JSON export** mirrors the portal's section numbering for adaptation.
- Voice uses the browser's Web Speech API (Chrome/Edge best); Sarvam wires in server-side.
- Not tax advice. Every return is a **draft for human review**.
