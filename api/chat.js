// api/chat.js — Vercel Serverless Function
// Usa Google Gemini Flash — FREE TIER: 1,500 req/día, sin tarjeta de crédito.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY no configurada en Vercel" });
  }

  try {
    const { messages, max_tokens = 1500 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Faltan mensajes" });
    }

    const geminiContents = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: typeof m.content === "string" ? m.content : m.content[0]?.text || "" }]
    }));

    const geminiBody = {
      contents: geminiContents,
      generationConfig: {
        maxOutputTokens: max_tokens,
        temperature: 0.4,
      }
    };

    // Intentar con gemini-2.0-flash primero, luego gemini-1.5-flash como fallback
    const modelos = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest"
    ];

    let lastError = null;

    for (const modelo of modelos) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });

      // 429 = rate limit — no tiene sentido probar otro modelo, mismo límite
      if (response.status === 429) {
        const err = await response.text();
        console.warn("Rate limit 429:", err.slice(0, 200));
        return res.status(429).json({ error: "Rate limit — intentá en unos segundos" });
      }

      // 404 = modelo no disponible — probar el siguiente
      if (response.status === 404) {
        console.warn(`Modelo ${modelo} no disponible, probando siguiente...`);
        lastError = `Modelo ${modelo} no disponible`;
        continue;
      }

      if (!response.ok) {
        const err = await response.text();
        console.error(`Gemini error con ${modelo}:`, response.status, err.slice(0, 300));
        lastError = `Error ${response.status}: ${err.slice(0, 150)}`;
        continue;
      }

      const geminiData = await response.json();
      const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!text) {
        console.warn("Gemini devolvió respuesta vacía:", JSON.stringify(geminiData).slice(0, 200));
        lastError = "Respuesta vacía de Gemini";
        continue;
      }

      // Éxito — devolver en formato compatible con el frontend
      return res.status(200).json({
        content: [{ type: "text", text }]
      });
    }

    // Todos los modelos fallaron
    console.error("Todos los modelos fallaron. Último error:", lastError);
    return res.status(500).json({ error: lastError || "No se pudo obtener respuesta de Gemini" });

  } catch (error) {
    console.error("Error en proxy Gemini:", error);
    return res.status(500).json({ error: "Error interno: " + error.message });
  }
}
