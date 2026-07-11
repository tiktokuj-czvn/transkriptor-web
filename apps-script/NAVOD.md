# Bataron zápis → Google Docs (Apps Script)

Automatika: appka pošle přepis, tento skript vygeneruje zápis ve stylu dokumentu
„Bataron zápisy z meetingů" a vloží ho jako nový datovaný oddíl na začátek dokumentu.
Skript běží pod tvým Google účtem, takže má právo do dokumentu psát.

## Nasazení (jednorázově, ~10 min)

1. Jdi na <https://script.google.com> → **Nový projekt**.
2. Smaž ukázkový kód, vlož celý obsah `Kod.gs` z této složky.
3. **Project Settings** (ozubené kolo vlevo) → dolů **Script Properties** → **Add script property**, přidej tři:
   | Property | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | tvůj Claude klíč `sk-ant-...` z <https://console.anthropic.com> |
   | `DOC_ID` | `11L6bS-IL23RfPW-atcPcwGT8_y-ncJXzofaRzc0mHMY` (dokument Bataron zápisy) |
   | `SHARED_SECRET` | **stejné heslo** jako `APP_PASSWORD` ve Vercelu / heslo appky |
4. Nahoře **Deploy → New deployment** → typ **Web app**.
   - **Execute as:** Me
   - **Who has access:** Anyone
   - **Deploy** → poprvé tě to vyzve k autorizaci (povol přístup k dokumentům a externím službám).
5. Zkopíruj **Web app URL** (končí `/exec`).
6. V appce zvol **Účel = Bataron zápis** a URL vlož do pole **Apps Script URL**.

Hotovo. Od teď: přepis s účelem Bataron → zápis se sám vytvoří a objeví se nahoře v dokumentu.

## Jak to celé jede

1. Appka přepíše audio (Groq Whisper).
2. Pošle celý přepis na tvůj Apps Script (`/exec`), ověří se heslem (`SHARED_SECRET`).
3. Skript zavolá Groq LLM (`llama-3.3-70b`), vygeneruje zápis v Bataron stylu.
4. Vloží ho do dokumentu jako nový oddíl s dnešním datem nahoře, oddělený čárou.

## Poznámky

- **Heslo:** appka posílá jako secret to samé „Heslo appky". Proto `SHARED_SECRET` = `APP_PASSWORD`.
- **Model zápisu:** v `Kod.gs` proměnná `LLM_MODEL`, výchozí `claude-sonnet-5` (kvalitní detailní čeština).
  Levnější varianta: `claude-haiku-4-5-20251001`. (Groq Llama byla otestovaná, ale dělá moc stručné zápisy.)
- **Změna kódu:** po úpravě `Kod.gs` musíš udělat **Deploy → Manage deployments → Edit → New version**.
- **Tab vs oddíl:** Google API neumí spolehlivě vytvořit nový *tab*, proto se zápis vkládá jako nový
  datovaný oddíl (H1) na začátek dokumentu, což odpovídá tomu, jak jsou zápisy strukturované.
  Když z toho budeš chtít tab, stačí v Docs kliknout na oddíl a „Convert to tab" ručně.
