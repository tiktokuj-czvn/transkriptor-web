# Transkriptor Web 🎧→📄

Online vícejazyčný přepis audia/videa. Jedna statická stránka, běží kdekoli. Přepis jede přímo z prohlížeče na **Groq Whisper (large-v3-turbo)** — stejný model jako lokální verze, jen v cloudu (rychlé, levné, 99 jazyků, auto-detekce).

## Jak to funguje

1. Uživatel zadá svůj **Groq API klíč** (uloží se jen v jeho prohlížeči, `localStorage`).
2. Přetáhne audio/video → prohlížeč ho převede na 16 kHz mono a dlouhé nahrávky rozseká na 8min kousky.
3. Kousky se pošlou přímo na Groq, text se poskládá zpět → zobrazí, zkopíruje, stáhne jako `.txt`.

Žádný vlastní server, žádné timeouty. Data nikam kromě Groqu neodchází.

## Groq API klíč (zdarma)

1. Registrace na <https://console.groq.com> (přes Google).
2. **API Keys → Create Key**, zkopíruj `gsk_...`.
3. Vlož do appky. Free tier bohatě stačí; placený je ~$0.04 za hodinu audia.

## Nasazení (veřejná URL)

Je to jeden statický soubor `index.html`, takže nejjednodušší:

**Netlify Drop (nejrychlejší, bez účtu):**
1. Otevři <https://app.netlify.com/drop>
2. Přetáhni celou složku `transkriptor-web` na stránku.
3. Dostaneš veřejnou URL. Hotovo, funguje i z mobilu, můžeš sdílet.

**Vercel / Cloudflare Pages / GitHub Pages** fungují taky — stačí nahrát `index.html`.

## Limity

- Maximální velikost jednoho kousku pro Groq je 25 MB; appka proto seká po 8 min (16 kHz mono ≈ 15 MB/kus), takže délka nahrávky je v pořádku.
- Formáty: cokoli, co umí dekódovat prohlížeč (m4a, mp3, wav, mp4, mov, ogg, flac…).
- Kdo dostane URL, používá **svůj vlastní** Groq klíč — ty neplatíš za cizí přepisy.

## Lokální varianta

Plně offline verze (bez cloudu, běží na GPU Macu) je v `~/Vibecoding/transkriptor/`.
