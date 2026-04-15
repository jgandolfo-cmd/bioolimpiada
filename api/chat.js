// api/chat.js — Vercel Serverless Function
// Usa Google Gemini 2.0 Flash — FREE TIER: 1,500 req/día, sin tarjeta de crédito.
// La API key NUNCA llega al navegador. Solo vive en las variables de entorno de Vercel.

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

    // Convertir formato Anthropic → formato Gemini
    // El frontend manda [{role:"user", content:"..."}]
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

    // Gemini 2.0 Flash — free tier en Google AI Studio
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini error:", err);
      return res.status(response.status).json({ error: err });
    }

    const geminiData = await response.json();

    // Extraer el texto de la respuesta de Gemini
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Devolver en el mismo formato que usaba Anthropic para no tocar el frontend
    return res.status(200).json({
      content: [{ type: "text", text }]
    });

  } catch (error) {
    console.error("Error en proxy Gemini:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
