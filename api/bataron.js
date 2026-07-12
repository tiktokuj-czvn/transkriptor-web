// Vercel proxy pro Bataron Apps Script.
// Prohlizec nemuze spolehlive cist odpoved z Google Apps Scriptu kvuli CORS,
// takze se zapis posila pres stejnou domenu jako /api/transcribe.

export const config = { api: { bodyParser: false } };

function sendJson(res, status, obj) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).send(JSON.stringify(obj));
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseAppsScriptUrl(raw) {
  try {
    const url = new URL(raw);
    const isAppsScript =
      url.protocol === "https:" &&
      url.hostname === "script.google.com" &&
      url.pathname.startsWith("/macros/s/") &&
      url.pathname.endsWith("/exec");
    return isAppsScript ? url.toString() : null;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Jen POST" });
    return;
  }

  const expected = process.env.APP_PASSWORD;
  const appPassword = (req.headers["x-app-password"] || "").toString();
  if (expected && appPassword !== expected) {
    sendJson(res, 401, { ok: false, error: "Spatne heslo appky." });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readRawBody(req));
  } catch (e) {
    sendJson(res, 400, { ok: false, error: "Neplatna JSON data." });
    return;
  }

  const appsScriptUrl = parseAppsScriptUrl(payload.url);
  if (!appsScriptUrl) {
    sendJson(res, 400, {
      ok: false,
      error: "Apps Script URL musi byt verejna adresa z nasazeni Web app a koncit /exec.",
    });
    return;
  }

  const body = JSON.stringify({
    transcript: payload.transcript || "",
    title: payload.title || "",
    date: payload.date || "",
    secret: appPassword,
  });

  try {
    const r = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
    });
    const text = await r.text();

    if (!r.ok) {
      res.status(r.status).send(text || "Apps Script chyba");
      return;
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).send(text);
  } catch (e) {
    sendJson(res, 502, {
      ok: false,
      error: "Nepodarilo se spojit s Apps Scriptem: " + String(e && e.message || e),
    });
  }
}
