// Vercel serverless function: POST /api/review  { "text": "<PRD text>" }
// The API key and the review prompt stay on the server, never in the page.

const MODEL = process.env.MODEL || "claude-haiku-4-5-20251001";
const MAX_CHARS = 12000;          // cap on PRD length per request
const MAX_PER_HOUR = 15;          // per-IP limit (best effort, resets on cold start)
const hits = new Map();

const SYSTEM_PROMPT = "You are a senior engineering lead reviewing a product requirements document before it is handed to engineering. Be specific, direct and useful, not generic. Quote the PRD's actual words. Return ONLY valid JSON, no markdown, matching exactly this shape: {\"score\":integer 0-100,\"verdict\":\"one or two sentences\",\"vague\":[{\"quote\":\"exact phrase from PRD\",\"issue\":\"why it is vague\",\"fix\":\"a measurable rewrite\"}],\"missing\":[{\"item\":\"e.g. success metrics, edge cases, error states, dependencies, out-of-scope\",\"why\":\"why it matters here\"}],\"requirements\":[{\"text\":\"the weak requirement\",\"problem\":\"why it is not testable\",\"criteria\":\"concrete acceptance criteria\"}],\"questions\":[\"question engineering would ask\"],\"scorecard\":[{\"name\":\"criterion\",\"status\":\"pass or partial or fail\",\"note\":\"one short sentence\"}]}. The scorecard must list exactly these 11 criteria in this order: Problem statement, Target user, Measurable goals and success metrics, Scope and out-of-scope, Testable requirements, Edge cases, Error states, Dependencies and risks, Privacy security and compliance, Timeline and ownership, Rollout and analytics tracking. Keep every string under 25 words and make the score consistent with the scorecard. Limit to the 5 most important vague phrases, 6 missing pieces, 5 requirements and 6 questions. If the text is not a PRD, set score to 0 and explain in verdict, with empty arrays.";

function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 3600e3);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_HOUR;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "Server is not configured." });

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return res.status(429).json({ error: "Too many requests", code: "rate_limited" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const text = String(body.text || "").trim().slice(0, MAX_CHARS);
  if (text.length < 40) return res.status(400).json({ error: "Please send a longer PRD." });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: "PRD:\n" + text }]
      })
    });
    if (!r.ok) {
      if (r.status === 429) return res.status(429).json({ error: "Busy", code: "rate_limited" });
      return res.status(502).json({ error: "The review service failed." });
    }
    const data = await r.json();
    const out = (data.content || []).map(c => c.type === "text" ? c.text : "").join("");
    return res.status(200).json({ text: out });
  } catch (e) {
    return res.status(502).json({ error: "The review service failed." });
  }
};
