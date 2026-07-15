# Transkriptor Web 🎧→📄

Online vícejazyčný přepis audia/videa. Přepis běží na **OpenAI Whisper (`whisper-1`)** — zavedené a stabilní, 99 jazyků, auto-detekce. Zápis (Bataron) generuje **Claude**.

Appka umí **dva režimy** a sama pozná, který použít:

- **Sdílené heslo (proxy):** tvůj OpenAI klíč je skrytý na serveru (Vercel), lidé zadají jen heslo. Platíš ty, ostatní nic neřeší. Toto je hlavní režim pro sdílení.
- **Vlastní klíč (přímo):** kdo otevře „Pokročilé" a zadá svůj OpenAI klíč, přepisuje na svůj účet přímo z prohlížeče (funguje i na čistě statickém hostingu bez serveru).

## Nasazení na Vercel (režim se sdíleným heslem)

1. Jdi na <https://vercel.com>, přihlas se přes GitHub.
2. **Add New → Project → Import** repo `tiktokuj-czvn/transkriptor-web`.
3. Ve **Environment Variables** přidej dvě:
   - `OPENAI_API_KEY` = tvůj klíč z <https://platform.openai.com/api-keys> (`sk-...`)
   - `APP_PASSWORD` = heslo, které budeš rozdávat lidem (cokoli si zvolíš)
4. **Deploy.** Dostaneš veřejnou URL (`…vercel.app`). Každý další push do `main` se nasadí sám.

Lidem pak pošleš URL + heslo. Přepisují bez vlastního klíče, platíš ty (OpenAI Whisper ≈ $0.36/hod audia).

## Architektura

- `index.html` — celá appka (UI + logika). V prohlížeči převede vstup na 16 kHz mono a dlouhé nahrávky rozseká (100 s/kus přes proxy kvůli 4,5 MB limitu Vercelu; 8 min přes vlastní klíč).
- `api/transcribe.js` — Vercel serverless proxy: ověří heslo (`APP_PASSWORD`), přepošle audio na OpenAI s klíčem (`OPENAI_API_KEY`). Bez npm závislostí.
- `api/bataron.js` — Vercel serverless proxy pro zápis do Google Apps Scriptu. Obchází CORS problém v prohlížeči a ověřuje stejné heslo appky.
- `vercel.json` — konfigurace funkce.

## GitHub Pages verze

Repo má zapnuté i GitHub Pages (<https://tiktokuj-czvn.github.io/transkriptor-web/>). Tam neběží server,
takže funguje jen režim s **vlastním OpenAI klíčem** (přes „Pokročilé"). Sdílené heslo vyžaduje Vercel.
Bataron zápis do Google Docs také vyžaduje Vercel, protože jde přes `/api/bataron`.

Stejné platí pro lokální statický náhled přes `python -m http.server`: stránka se otevře, ale režim
se sdíleným heslem nemá `/api/transcribe`. Pokud nemáš vlastní OpenAI klíč, otevři appku na nasazené
Vercel URL. Vlastní OpenAI klíč je jen pokročilá náhradní možnost pro statický test.

## Limity

- Formáty: cokoli, co umí dekódovat prohlížeč (m4a, mp3, wav, mp4, mov, ogg, flac…).
- Dlouhé nahrávky se sekají automaticky, takže délka nevadí.

## Lokální offline varianta

Plně offline verze (bez cloudu, běží na GPU Macu) je v `~/Vibecoding/transkriptor/`.
