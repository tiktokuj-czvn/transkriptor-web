// Vercel serverless proxy: schová OpenAI klíč na serveru, chrání ho sdíleným heslem.
// Frontend posílá surové WAV bajty v těle + hlavičky x-app-password / x-lang / x-model.
// Bez npm závislostí — používá globální fetch/FormData/Blob z Node 18+.

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Jen POST" });
    return;
  }

  const expected = process.env.APP_PASSWORD;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    res.status(500).json({ error: "Server nemá nastavený OPENAI_API_KEY." });
    return;
  }
  if (expected && req.headers["x-app-password"] !== expected) {
    res.status(401).json({ error: "Špatné heslo appky." });
    return;
  }

  const lang = (req.headers["x-lang"] || "auto").toString();
  const model = (req.headers["x-model"] || "whisper-1").toString();

  try {
    // surové tělo do bufferu
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const buf = Buffer.concat(chunks);
    if (!buf.length) {
      res.status(400).json({ error: "Prázdné tělo." });
      return;
    }

    const fd = new FormData();
    fd.append("file", new Blob([buf], { type: "audio/wav" }), "chunk.wav");
    fd.append("model", model);
    fd.append("response_format", "text");
    if (lang && lang !== "auto") fd.append("language", lang);

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: "Bearer " + openaiKey },
      body: fd,
    });

    const text = await r.text();
    if (!r.ok) {
      res.status(r.status).send(text || "OpenAI chyba");
      return;
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send(text.trim());
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
