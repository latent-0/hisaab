// Shared auth for machine-to-machine automation endpoints (n8n, cron, etc.).
// Protected by a bearer token in AUTOMATION_TOKEN. If unset, endpoints are
// disabled (return 503) rather than open.

export function checkAutomationAuth(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const token = process.env.AUTOMATION_TOKEN;
  if (!token) {
    return { ok: false, status: 503, error: "Automation disabled: set AUTOMATION_TOKEN." };
  }
  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.replace(/^Bearer\s+/i, "").trim() || req.headers.get("x-automation-token") || "";
  if (provided !== token) {
    return { ok: false, status: 401, error: "Invalid automation token." };
  }
  return { ok: true };
}
