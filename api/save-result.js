// api/save-result.js — Guarda resultados de sesión en Google Sheets
// Usa JWT directo (sin librerías externas) para autenticar con Google

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL;
  const privateKey   = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const sheetId      = process.env.GOOGLE_SHEET_ID;

  if (!serviceEmail || !privateKey || !sheetId) {
    return res.status(500).json({ error: "Variables de entorno de Google no configuradas" });
  }

  try {
    const { dni, nombre, resultados } = req.body;
    if (!dni || !resultados?.length) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    // 1 — Obtener access token de Google via JWT
    const token = await getGoogleToken(serviceEmail, privateKey);

    // 2 — Preparar filas: una por pregunta respondida
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString("es-AR");
    const hora  = ahora.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

    const filas = resultados.map(r => [
      dni,
      nombre || dni,
      fecha,
      hora,
      r.tema     || "",
      r.tipo     || "",
      r.ok ? "Correcta" : "Incorrecta",
      r.xp       || 0,
      r.meta     || "",   // metacognición: "completo" | "parcial" | "no"
      r.rondas   || 0,
    ]);

    // 3 — Append a Google Sheets
    // Guardar resultados de sesión en Hoja1
    const url1 = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Hoja 1'!A:J:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const resp1 = await fetch(url1, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: filas }),
    });
    if (!resp1.ok) {
      const err = await resp1.text();
      console.error("Sheets Hoja1 error:", err);
      return res.status(resp1.status).json({ error: err });
    }

    // Guardar historial SM-2 en hoja "Progreso" (upsert por DNI)
    if (req.body.historial && Object.keys(req.body.historial).length > 0) {
      try {
        const ahora = new Date();
        const filaProgreso = [[
          String(dni),
          ahora.toISOString(),
          JSON.stringify(req.body.historial),
          String(req.body.xp_total || 0),
        ]];
        const url2 = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Progreso!A:D:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
        await fetch(url2, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: filaProgreso }),
        });
      } catch(e) {
        console.warn("No se pudo guardar en hoja Progreso:", e.message);
      }
    }

    return res.status(200).json({ ok: true, filas: filas.length });

  } catch (err) {
    console.error("Error save-result:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ── JWT para Google API (sin dependencias externas) ────────────
async function getGoogleToken(email, privateKey) {
  const now   = Math.floor(Date.now() / 1000);
  const claim = {
    iss:   email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud:   "https://oauth2.googleapis.com/token",
    exp:   now + 3600,
    iat:   now,
  };

  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify(claim));
  const input   = `${header}.${payload}`;

  // Importar clave privada RSA
  const keyData = pemToBuffer(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(input)
  );

  const jwt = `${input}.${b64urlBuf(sig)}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }),
  });

  const data = await resp.json();
  if (!data.access_token) throw new Error("No se pudo obtener token de Google: " + JSON.stringify(data));
  return data.access_token;
}

function b64url(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function b64urlBuf(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function pemToBuffer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}
