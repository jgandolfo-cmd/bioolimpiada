// api/get-progress.js — Recuperar progreso de un alumno desde Google Sheets

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const dni = req.query.dni;
  if (!dni) return res.status(400).json({ error: "Falta DNI" });

  const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL;
  const privateKey   = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const sheetId      = process.env.GOOGLE_SHEET_ID;

  if (!serviceEmail || !privateKey || !sheetId) {
    return res.status(200).json({ historial: {}, xp: 0, racha: 0 });
  }

  try {
    const token = await getGoogleToken(serviceEmail, privateKey);

    // Leer todas las filas de la hoja de progreso
    // Buscamos en la hoja "Progreso" — filas con DNI + historial JSON
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Progreso!A:D?majorDimension=ROWS`;
    const r = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!r.ok) {
      // La hoja Progreso puede no existir aún — no es error crítico
      return res.status(200).json({ historial: {}, xp: 0, racha: 0 });
    }

    const data = await r.json();
    const rows = data.values || [];

    // Buscar la fila más reciente con este DNI
    const filasDni = rows.filter(row => row[0] === String(dni));
    if (!filasDni.length) {
      return res.status(200).json({ historial: {}, xp: 0, racha: 0 });
    }

    // Tomar la última fila
    const ultima = filasDni[filasDni.length - 1];
    const historial = ultima[2] ? JSON.parse(ultima[2]) : {};
    const xp = parseInt(ultima[3]) || 0;

    return res.status(200).json({ historial, xp, racha: 0 });

  } catch (e) {
    console.error("get-progress error:", e.message);
    return res.status(200).json({ historial: {}, xp: 0, racha: 0 });
  }
}

// ── JWT para Google API ────────────────────────────────────────
async function getGoogleToken(email, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify(claim));
  const input   = `${header}.${payload}`;
  const keyData = pemToBuffer(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(input));
  const jwt = `${input}.${b64urlBuf(sig)}`;
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const d = await resp.json();
  if (!d.access_token) throw new Error("No token: " + JSON.stringify(d));
  return d.access_token;
}
function b64url(str) { return btoa(str).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,""); }
function b64urlBuf(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,""); }
function pemToBuffer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g,"").replace(/\s/g,"");
  const bin = atob(b64); const buf = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) buf[i]=bin.charCodeAt(i);
  return buf.buffer;
}
