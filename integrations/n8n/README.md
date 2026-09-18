# Hisaab × n8n workflows

Two ready-to-import workflows that automate Hisaab using its token-protected
automation API (`/api/automation/*`).

## Setup

1. In the Hisaab app, set `AUTOMATION_TOKEN` to a long random string.
2. In n8n, add these environment variables (Settings → Variables, or host env):
   - `HISAAB_URL`, your deployed base URL, e.g. `https://hisaab-xxxx.a.run.app`
   - `HISAAB_AUTOMATION_TOKEN`, the same value as `AUTOMATION_TOKEN`
   - `SLACK_WEBHOOK_URL`, (reminders workflow only) an incoming webhook, or
     replace that node with WhatsApp Business / email / SMS.
3. Import the JSON files (n8n → Workflows → Import from File) and activate them.

## Workflows

### `hisaab-daily-paytm-sync.json`
Every morning at 6am, pulls the latest Paytm settlements for **every** merchant
and refreshes their GSTR-3B draft. Mirrors what the "Sync Paytm" button does,
across the whole book.

### `hisaab-gstr3b-reminders.json`
On the 15th and 18th, fetches each merchant's unfiled GSTR-3B and, when the
deadline is within 7 days, sends a localized reminder (Hindi/English) with the
net payable, unclaimed ITC, and open review count.

### `hisaab-flagged-slack-digest.json`
Every evening at 8pm, posts a Slack digest of every invoice flagged for review
across all merchants (grouped by business, with total ITC at stake). Uses the
app's pre-formatted `slackText`, so the workflow stays a simple fetch → Slack post.

## Endpoints these use

| Method | Path                          | Purpose                                  |
| ------ | ----------------------------- | ---------------------------------------- |
| POST   | `/api/automation/sync`        | Sync settlements + regenerate returns    |
| GET    | `/api/automation/reminders`   | Pending filings + reminder messages      |
| GET    | `/api/automation/flagged`     | Flagged invoices + ready-made Slack text  |

Both require header `Authorization: Bearer <AUTOMATION_TOKEN>`.
`POST /api/automation/sync` accepts an optional JSON body `{ "gstin": "…", "period": "YYYY-MM" }`.
