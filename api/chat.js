// api/chat.js — Vercel Serverless Function
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY no configurada" });

  const { messages, max_tokens = 1500 } = req.body || {};
  if (!messages?.length) return res.status(400).json({ error: "Faltan mensajes" });

  const body = JSON.stringify({
    contents: messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "") }]
    })),
    generationConfig: { maxOutputTokens: max_tokens, temperature: 0.4 }
  });

  const modelos = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-8b"];

  for (const modelo of modelos) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });

      if (r.status === 429) {
        return res.status(429).json({ error: "Rate limit — esperá unos segundos" });
      }
      if (!r.ok) {
        const err = await r.text();
        console.error(`${modelo} falló ${r.status}:`, err.slice(0, 200));
        continue;
      }

      const data = await r.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) { console.warn(`${modelo} devolvió texto vacío`); continue; }

      return res.status(200).json({ content: [{ type: "text", text }] });
    } catch (e) {
      console.error(`${modelo} excepción:`, e.message);
      continue;
    }
  }

  return res.status(500).json({ error: "Todos los modelos de Gemini fallaron. Revisá la API key en Vercel." });
}
