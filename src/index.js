import { json, limited, body, cap } from "./core.js";
import { inputGuard, outputGuard } from "./guards.js";
import { respond } from "./app.js";
import page from "./page.html";
export default {
  async fetch(req, env) {
    const p = new URL(req.url).pathname;
    // Model-free endpoint: run guards only (used by the offline/live guard eval).
    if (req.method === "POST" && p === "/api/guard") {
      const { text, output } = await body(req);
      if (typeof text !== "string" || text.length > 4000) return json({ error: "text required (<=4000 chars)" }, 400);
      return json(output ? outputGuard(text) : inputGuard(text));
    }
    if (req.method === "POST" && p === "/api/chat") {
      const { prompt, doc, guards = true } = await body(req);
      if (!cap(prompt) || (doc && (typeof doc !== "string" || doc.length > 2000))) return json({ error: "prompt required (<=500 chars), doc <=2000" }, 400);
      if (guards) { const g = inputGuard(prompt + "\n" + (doc || "")); if (g.blocked) return json({ blocked: "input", rules: g.rules, answer: "Request blocked by input guard." }); }
      if (await limited(req, env)) return json({ error: "Rate limit: try again in a minute." }, 429);
      try { return json(await respond(env, { prompt, doc, guards: !!guards })); } catch (e) { return json({ error: "Model error: " + e.message }, 502); }
    }
    return new Response(page, { headers: { "content-type": "text/html;charset=utf-8" } });
  },
};
