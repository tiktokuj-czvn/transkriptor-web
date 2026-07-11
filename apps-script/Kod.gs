/**
 * Transkriptor → Bataron zápis
 * Google Apps Script web-app. Přijme přepis z appky, vygeneruje zápis ve stylu
 * dokumentu "Bataron zápisy z meetingů" (přes Groq LLM) a vloží ho jako nový
 * datovaný oddíl na začátek dokumentu.
 *
 * Nastavení (Project Settings → Script Properties):
 *   GROQ_API_KEY   = gsk_...            (stejný klíč jako v appce)
 *   DOC_ID         = 11L6bS-...mHMY     (ID dokumentu se zápisy)
 *   SHARED_SECRET  = tajne-heslo        (stejné jako v appce, aby nepsal kdokoli)
 */

var LLM_MODEL = "llama-3.3-70b-versatile";

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

    var zapis = generateZapis_(transcript, meetingTitle, dateStr, props.getProperty("GROQ_API_KEY"));
    insertAtTop_(props.getProperty("DOC_ID"), zapis);

    return json_({ ok: true, chars: zapis.length });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** Vygeneruje zápis v Bataron stylu přes Groq LLM. Vrací markdown. */
function generateZapis_(transcript, title, dateStr, groqKey) {
  var system = [
    "Jsi asistent, který z přepisu meetingu píše strukturovaný zápis v češtině.",
    "Piš PŘESNĚ ve stylu dokumentu 'Bataron zápisy z meetingů'. Pravidla:",
    "- Výstup je čistý markdown. Nadpisy: '# ' = hlavní (datum, titul), '## ' = sekce, '### ' = podsekce, '#### ' = pod-podsekce.",
    "- NIKDY nepoužívej pomlčky (— ani –). Místo nich čárka, dvojtečka, závorky, tečka.",
    "- Číslované seznamy piš jako '1. ', '2. ' na samostatných řádcích.",
    "- Uvnitř sekcí používej krátké popiskové řádky zakončené dvojtečkou (Účel:, Důvod:, Závěr:, Pravidlo:, Princip:, Dohoda:, Otevřené:) a pod nimi text nebo seznam.",
    "- Jazyk: věcný, jasný, detailní, celé věty. Žádné uvozovky kolem celých odstavců.",
    "",
    "POVINNÁ STRUKTURA zápisu (v tomto pořadí, sekce vynech jen když opravdu nejsou data):",
    "# " + dateStr,
    "Zpracováno z přepisu " + (title ? "„" + title + "“" : "meetingu") + ".",
    "# Zápis z meetingu Bataron",
    "## Základní informace  (Datum, Místo pokud zazní, Téma, Délka záznamu pokud lze odhadnout)",
    "## Hlavní cíl meetingu",
    "## Hlavní závěr",
    "## (tematické sekce podle obsahu, klidně několik, s ## a ###)",
    "## Rozhodnutí",
    "## Otevřené otázky",
    "## Úkoly  (seskup po lidech: ### David, ### Suzy, ### Woody, ### Julča, ### Naty, ### Všichni; jen ty, co v přepisu zazní)",
    "## Nejbližší další kroky",
    "## Shrnutí pro tým",
    "",
    "Členové týmu: David, Suzy, Woody (též Vůdy), Julča, Naty. Klient/značka: Bataron.",
    "Vytěž z přepisu maximum konkrétních detailů, rozhodnutí a úkolů. Nevymýšlej si fakta, která v přepisu nejsou."
  ].join("\n");

  var user = "Datum meetingu: " + dateStr + "\n\nPŘEPIS:\n" + transcript;

  var res = UrlFetchApp.fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + groqKey },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      model: LLM_MODEL,
      temperature: 0.3,
      max_tokens: 8000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });
  var data = JSON.parse(res.getContentText());
  if (!data.choices || !data.choices[0]) {
    throw new Error("Groq LLM chyba: " + res.getContentText().slice(0, 300));
  }
  return data.choices[0].message.content.trim();
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
