// api/get-all-data.js — Lee toda la Hoja1 de Sheets para el panel docente

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL;
  const privateKey   = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const sheetId      = process.env.GOOGLE_SHEET_ID;

  if (!serviceEmail || !privateKey || !sheetId) {
    return res.status(500).json({ error: "Variables de Google no configuradas" });
  }

  try {
    const token = await getGoogleToken(serviceEmail, privateKey);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Hoja 1'!A:J`;
    const r = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }

    const data = await r.json();
    const rows = (data.values || []).slice(1); // saltar encabezado si existe

    const sesiones = rows
      .filter(row => row.length >= 7)
      .map(row => ({
        dni:      row[0] || "",
        nombre:   row[1] || "",
        fecha:    row[2] || "",
        hora:     row[3] || "",
        tema:     row[4] || "",
        tipo:     row[5] || "",
        correcta: row[6] || "",
        xp:       parseInt(row[7]) || 0,
        meta:     row[8] || "",
        rondas:   parseInt(row[9]) || 0,
      }));

    return res.status(200).json({ sesiones, total: sesiones.length });

  } catch (e) {
    console.error("get-all-data error:", e);
    return res.status(500).json({ error: e.message });
  }
}

async function getGoogleToken(email, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const claim = { iss: email, scope: "https://www.googleapis.com/auth/spreadsheets.readonly", aud: "https://oauth2.googleapis.com/token", exp: now+3600, iat: now };
  const header = b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const payload = b64url(JSON.stringify(claim));
  const input = `${header}.${payload}`;
  const keyData = pemToBuffer(privateKey);
  const cryptoKey = await crypto.subtle.importKey("pkcs8", keyData, {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"}, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(input));
  const jwt = `${input}.${b64urlBuf(sig)}`;
  const resp = await fetch("https://oauth2.googleapis.com/token", {method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt})});
  const d = await resp.json();
  if (!d.access_token) throw new Error("No token: "+JSON.stringify(d));
  return d.access_token;
}
function b64url(s){return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");}
function b64urlBuf(buf){return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");}
function pemToBuffer(pem){const b64=pem.replace(/-----[^-]+-----/g,"").replace(/\s/g,"");const bin=atob(b64);const buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);return buf.buffer;}
