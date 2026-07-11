# Transkriptor Web 🎧→📄

Online vícejazyčný přepis audia/videa. Přepis běží na **Groq Whisper (large-v3-turbo)** — stejný model jako lokální verze, jen v cloudu (rychlé, levné, 99 jazyků, auto-detekce).

Appka umí **dva režimy** a sama pozná, který použít:

- **Sdílené heslo (proxy):** tvůj Groq klíč je skrytý na serveru (Vercel), lidé zadají jen heslo. Platíš ty, ostatní nic neřeší. Toto je hlavní režim pro sdílení.
- **Vlastní klíč (přímo):** kdo otevře „Pokročilé" a zadá svůj Groq klíč, přepisuje na svůj účet přímo z prohlížeče (funguje i na čistě statickém hostingu bez serveru).

## Nasazení na Vercel (režim se sdíleným heslem)

1. Jdi na <https://vercel.com>, přihlas se přes GitHub.
2. **Add New → Project → Import** repo `tiktokuj-czvn/transkriptor-web`.
3. Ve **Environment Variables** přidej dvě:
   - `GROQ_API_KEY` = tvůj klíč z <https://console.groq.com/keys> (`gsk_...`)
   - `APP_PASSWORD` = heslo, které budeš rozdávat lidem (cokoli si zvolíš)
4. **Deploy.** Dostaneš veřejnou URL (`…vercel.app`). Každý další push do `main` se nasadí sám.

Lidem pak pošleš URL + heslo. Přepisují bez vlastního klíče, platíš ty (Groq ≈ $0.04/hod audia).

## Architektura

- `index.html` — celá appka (UI + logika). V prohlížeči převede vstup na 16 kHz mono a dlouhé nahrávky rozseká (100 s/kus přes proxy kvůli 4,5 MB limitu Vercelu; 8 min přes vlastní klíč).
- `api/transcribe.js` — Vercel serverless proxy: ověří heslo (`APP_PASSWORD`), přepošle audio na Groq s klíčem (`GROQ_API_KEY`). Bez npm závislostí.
- `vercel.json` — konfigurace funkce.

## GitHub Pages verze

Repo má zapnuté i GitHub Pages (<https://tiktokuj-czvn.github.io/transkriptor-web/>). Tam neběží server,
takže funguje jen režim s **vlastním Groq klíčem** (přes „Pokročilé"). Sdílené heslo vyžaduje Vercel.

## Limity

- Formáty: cokoli, co umí dekódovat prohlížeč (m4a, mp3, wav, mp4, mov, ogg, flac…).
- Dlouhé nahrávky se sekají automaticky, takže délka nevadí.

## Lokální offline varianta

Plně offline verze (bez cloudu, běží na GPU Macu) je v `~/Vibecoding/transkriptor/`.
