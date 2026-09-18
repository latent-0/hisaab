// Cognee client, AI memory / knowledge graph over a merchant's GST history.
//
// Flow: add(raw text) → cognify(build graph) → search(natural-language query).
// Everything is optional: if COGNEE_* env vars are unset, cogneeConfigured()
// is false and callers skip Cognee and fall back to the local engine.

const BASE = process.env.COGNEE_API_BASE?.replace(/\/$/, "") ?? "";
const KEY = process.env.COGNEE_API_KEY ?? "";
const TENANT = process.env.COGNEE_TENANT_ID ?? "";

export function cogneeConfigured(): boolean {
  return Boolean(BASE && KEY);
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "X-Api-Key": KEY };
  if (TENANT) h["X-Tenant-Id"] = TENANT;
  return h;
}

/** Deterministic per-merchant dataset name. */
export function datasetFor(gstin: string): string {
  return `hisaab_${gstin.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

/**
 * Push a block of natural-language knowledge into a dataset. Cognee's /add
 * ingests the `data` field as an uploaded file (the `raw_data` string field is
 * accepted but not ingested), so we send the text as a .txt file.
 */
export async function cogneeAdd(dataset: string, text: string): Promise<void> {
  const form = new FormData();
  const blob = new Blob([text], { type: "text/plain" });
  form.append("data", blob, `${dataset}.txt`);
  form.append("datasetName", dataset);
  const res = await fetch(`${BASE}/api/v1/add`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(`Cognee add failed (${res.status}): ${await res.text()}`);
}

/** Kick off graph construction for a dataset (async on Cognee's side). */
export async function cogneeCognify(dataset: string): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/cognify`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ datasets: [dataset] }),
  });
  if (!res.ok) throw new Error(`Cognee cognify failed (${res.status}): ${await res.text()}`);
}

const NO_INFO =
  /(no (information|supplier|data|context|relevant)|does not (contain|mention|include|specify|provide)|do(es)? ?n'?t have (enough|any)|not enough (information|data|context)|cannot (find|answer|determine)|unable to (determine|answer|find)|provide the relevant|please (supply|provide))/i;

/**
 * Query the knowledge graph scoped to one merchant's dataset. Returns a grounded
 * natural-language answer, or null if the graph has nothing relevant (so the
 * caller can fall back).
 */
export async function cogneeSearch(
  dataset: string,
  query: string,
  searchType = "GRAPH_COMPLETION",
): Promise<string | null> {
  const res = await fetch(`${BASE}/api/v1/search`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ query, search_type: searchType, datasets: [dataset] }),
  });
  if (!res.ok) throw new Error(`Cognee search failed (${res.status}): ${await res.text()}`);

  const data = (await res.json()) as Array<{ dataset_name: string; search_result: string[] }>;
  const entry = data.find((d) => d.dataset_name === dataset) ?? data[0];
  if (!entry) return null;
  const answer = (entry.search_result ?? []).join(" ").trim();
  if (!answer || NO_INFO.test(answer)) return null;
  return answer;
}
