/**
 * Transkriptor → Bataron zápis
 * Google Apps Script web-app. Přijme přepis z appky, vygeneruje zápis ve stylu
 * dokumentu "Bataron zápisy z meetingů" (přes Groq LLM) a vloží ho jako nový
 * datovaný oddíl na začátek dokumentu.
 *
 * Nastavení (Project Settings → Script Properties):
 *   ANTHROPIC_API_KEY = sk-ant-...      (klíč z console.anthropic.com)
 *   DOC_ID            = 11L6bS-...mHMY  (ID dokumentu se zápisy)
 *   SHARED_SECRET     = tajne-heslo     (stejné jako heslo appky, aby nepsal kdokoli)
 *
 * Přepis (Whisper) běží v appce přes Groq; tento skript řeší jen generování zápisu přes Claude.
 */

var LLM_MODEL = "claude-sonnet-5";   // kvalita/cena; levněji: "claude-haiku-4-5-20251001"

function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var body = JSON.parse(e.postData.contents || "{}");

    if (body.secret !== props.getProperty("SHARED_SECRET")) {
      return json_({ ok: false, error: "Špatný secret." });
    }
    var transcript = (body.transcript || "").trim();
    if (!transcript) return json_({ ok: false, error: "Prázdný přepis." });

    var meetingTitle = body.title || "";
    var dateStr = body.date || todayCz_();

    var zapis = generateZapis_(transcript, meetingTitle, dateStr, props.getProperty("ANTHROPIC_API_KEY"));
    insertAtTop_(props.getProperty("DOC_ID"), zapis);

    return json_({ ok: true, chars: zapis.length });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** Vygeneruje zápis v Bataron stylu přes Claude. Vrací markdown. */
function generateZapis_(transcript, title, dateStr, anthropicKey) {
  var system = [
    "Jsi zkušený asistent, který z přepisu meetingu píše DETAILNÍ strukturovaný zápis v češtině",
    "ve stylu dokumentu 'Bataron zápisy z meetingů'.",
    "",
    "FORMÁT:",
    "- Čistý markdown. První řádek: '# " + dateStr + "'. Druhý řádek: 'Zpracováno z přepisu " +
      (title ? "„" + title + "“" : "meetingu") + ".'. Pak '# Zápis z meetingu Bataron'.",
    "- Sekce '## ', podsekce '### ', pod-podsekce '#### '.",
    "- NIKDY nepoužívej pomlčky (— ani –). Místo nich čárka, dvojtečka, závorky, tečka.",
    "- Číslované seznamy piš jako '1. ', '2. ' na samostatných řádcích.",
    "- Uvnitř sekcí používej popiskové řádky zakončené dvojtečkou (Účel:, Důvod:, Závěr:, Pravidlo:, Dohoda:, Princip:, Otevřené:) a pod nimi rozvedený text nebo seznam.",
    "",
    "DETAIL (klíčové): Nepiš jednu větu na sekci. Každou sekci rozveď do několika vět a konkrétních bodů PŘÍMO z přepisu.",
    "Zachyť konkrétní argumenty, důvody, varianty, čísla, jména, rozhodnutí i nuance. Cílová délka 900 až 1600 slov.",
    "",
    "STRUKTURA (v tomto pořadí, sekci vynech jen když opravdu nejsou data):",
    "## Základní informace (Téma; Přítomní a Místo pokud zazní; Délka pokud lze odhadnout)",
    "## Hlavní cíl meetingu",
    "## Hlavní závěr",
    "## tematické sekce podle obsahu (klidně 4 až 8, s ## a ###)",
    "## Rozhodnutí",
    "## Otevřené otázky",
    "## Úkoly (### s pouhým jménem: David, Suzy, Woody, Julča, Naty, Všichni; jen ti, co zazní; pod každým číslovaný seznam)",
    "## Nejbližší další kroky",
    "## Shrnutí pro tým",
    "",
    "Členové týmu: David, Suzy, Woody (též Vůdy), Julča, Naty. Klient/značka: Bataron.",
    "Vytěž z přepisu maximum konkrétních detailů. Nevymýšlej si fakta, která v přepisu nejsou.",
    "Vrať POUZE samotný zápis v markdownu, bez úvodních a závěrečných poznámek."
  ].join("\n");

  var res = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "post",
    contentType: "application/json",
    headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 8000,
      system: system,
      messages: [
        { role: "user", content: "Datum meetingu: " + dateStr + "\n\nPŘEPIS:\n" + transcript }
      ]
    })
  });
  var data = JSON.parse(res.getContentText());
  if (!data.content || !data.content[0] || !data.content[0].text) {
    throw new Error("Claude chyba: " + res.getContentText().slice(0, 300));
  }
  return data.content[0].text.trim();
}

/** Vloží markdown jako naformátovaný obsah na ZAČÁTEK dokumentu (nejnovější nahoře). */
function insertAtTop_(docId, md) {
  var doc = DocumentApp.openById(docId);
  var b = doc.getBody();
  var lines = md.split("\n");
  var idx = 0;

  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i].replace(/\*\*/g, "").replace(/[—–]/g, ",").replace(/\s+$/, "");
    var t = raw.trim();
    if (t === "") { b.insertParagraph(idx++, ""); continue; }

    var h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      var level = h[1].length, text = h[2].trim();
      var p = b.insertParagraph(idx++, text);
      p.setHeading(level === 1 ? DocumentApp.ParagraphHeading.HEADING1
                 : level === 2 ? DocumentApp.ParagraphHeading.HEADING2
                 : level === 3 ? DocumentApp.ParagraphHeading.HEADING3
                 : DocumentApp.ParagraphHeading.HEADING4);
      continue;
    }
    var num = t.match(/^\d+\.\s+(.*)$/);
    var bullet = t.match(/^[-*]\s+(.*)$/);
    if (num) {
      b.insertListItem(idx++, num[1]).setGlyphType(DocumentApp.GlyphType.NUMBER);
    } else if (bullet) {
      b.insertListItem(idx++, bullet[1]).setGlyphType(DocumentApp.GlyphType.BULLET);
    } else {
      b.insertParagraph(idx++, t);
    }
  }
  // oddělovač mezi novým a předchozím zápisem
  b.insertHorizontalRule(idx++);
  b.insertParagraph(idx++, "");
  doc.saveAndClose();
}

function todayCz_() {
  var d = new Date();
  return d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
