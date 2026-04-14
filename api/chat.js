// api/chat.js — Vercel Serverless Function
// La API key NUNCA llega al navegador. Solo vive en las variables de entorno de Vercel.

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verificar que venga del origen correcto (tu dominio de Vercel)
  const origin = req.headers.origin || "";
  const allowed = [
    process.env.ALLOWED_ORIGIN || "",
    "http://localhost:3000",
    "http://localhost:5500",
  ];
  // En producción Vercel el origin es el propio dominio, siempre permitido
  // Este chequeo es una capa extra de seguridad
  if (origin && !allowed.some(a => a && origin.includes(a.replace("https://", "").replace("http://", ""))) && !origin.includes("vercel.app")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key no configurada en Vercel" });
  }

  try {
    const { messages, max_tokens = 1500 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Faltan mensajes" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // Haiku: más rápido y barato para preguntas
        max_tokens,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("Error en proxy AI:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
