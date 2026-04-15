// api/chat.js — usa Groq (free tier, sin restricciones de host)
// Modelos disponibles: llama-3.1-8b-instant (rápido), llama3-8b-8192 (equilibrado)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: "GROQ_API_KEY no configurada en Vercel" });

  const { messages, max_tokens = 1500 } = req.body || {};
  if (!messages?.length) return res.status(400).json({ error: "Faltan mensajes" });

  // Modelos de Groq en orden de preferencia
  const modelos = [
    "llama-3.1-8b-instant",   // más rápido
    "llama3-8b-8192",          // fallback
  ];

  for (const modelo of modelos) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: modelo,
          messages,
          max_tokens,
          temperature: 0.4
        })
      });

      if (r.status === 429) {
        return res.status(429).json({ error: "Rate limit — esperá unos segundos" });
      }
      if (!r.ok) {
        const err = await r.text();
        console.error(`Groq ${modelo} error ${r.status}:`, err.slice(0, 200));
        continue;
      }

      const data = await r.json();
      const text = data?.choices?.[0]?.message?.content || "";
      if (!text) { console.warn("Groq devolvió texto vacío"); continue; }

      // Devolver en formato compatible con el frontend
      return res.status(200).json({
        content: [{ type: "text", text }]
      });

    } catch (e) {
      console.error(`Groq ${modelo} excepción:`, e.message);
      continue;
    }
  }

  return res.status(500).json({ error: "No se pudo conectar con Groq. Verificá GROQ_API_KEY en Vercel." });
}
