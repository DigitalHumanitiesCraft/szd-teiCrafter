# Protokoll des hybriden Annotationslaufs

Weg HYBRID im Annotationsexperiment vom 2026-10-31. Ein LLM-Agent (Large Language Model, hier Claude Opus 5.5) schlägt Annotationen für Personen, Orte, Organisationen und Daten vor, der Editor teiCrafter SZD wendet sie mit seinen eigenen Aktionen an, und derselbe Agent prüft das Ergebnis im Editor als Reviewer. Erzeuger aller Annotationen ist damit ein unrevidierter LLM-Agent. Eine menschliche Prüfung hat nicht stattgefunden. Grundlage sind die Regeln in `szd-teiCrafter/knowledge/annotation.md`. Bearbeitet wurden o_szd.1222 (Kalibrierbrief), o_szd.1786 und o_szd.1079.

## Phase 1, Vorschlagen

Der Agent las die drei Transkriptionen vollständig und klärte jede Nennung gegen den SZD-Personenindex (`data/register/szd-persons.json`), den SZD-Organisationsindex (GAMS, `o:szd.organisation/TEI_SOURCE`) und lobid-gnd (Suche und Einzelsätze, GeoNames aus `sameAs`). Das Briefdatum stammt jeweils aus dem Titel im Header. Das Skript `baue-vorschlaege.mjs` schreibt die Entscheidungen als `<id>.vorschlaege.json` und prüft dabei, dass jeder Anker im Original steht und sich keine Vorschläge überlappen.

Aufwand: etwa 45 GND-Abfragen in einem Dutzend gebündelter Aufrufe, ein Abruf des Organisationsindex, eine Indexsuche über 22 Namen, dazu die Lektüre der Editor-Module, um das Format auf deren Anwendungswege abzustimmen. Die meiste Zeit ging in Identifikationsfragen, deren Antwort nicht im Text steht (Kultusgemeinde, Fuchs, Werner Weisflog, Arnold Hauser, Gestapo-Leitstelle).

Ergebnis: 23 Vorschläge für o_szd.1222, 72 für o_szd.1786, 18 für o_szd.1079, dazu je eine Liste bewusst nicht ausgezeichneter Stellen mit Grund (Werktitel, Straßen, Adjektive, Schiffsname).

### Vorschlagsformat `teicrafter-proposals/0.1`

Eine Datei pro Dokument. Der Kopf nennt Dokument, Quellpfad, SHA-256 des Originals, Zeilenende und Offsetzählung, den Erzeuger (`kind: llm-agent`, LLM, `revised: false`, Datum, Regeldokument) und das Briefdatum mit Herkunft. Jeder Vorschlag trägt

- `id` (`o_szd.1786#v050`), `line`, `occurrence` und `offset` (`from`, `to` in UTF-16-Einheiten der Datei),
- `text` als exakter Quelltext einschließlich eines `\n        <lb/>` bei Umbruch, `shown` als lesbare Form,
- `context.before` und `context.after` (je 24 Zeichen) als zweiten Anker,
- `element` und `attributes` genau so, wie sie in das öffnende Tag gehören,
- `basis` als Liste typisierter Belege (`register`, `gnd`, `orgIndex`, `inference`, `text`, `none`) mit Kennung, Label, Quell-URL und bei Orten der GeoNames-Herkunft,
- `doubt` als Satz oder `null`, `status` (`proposed`, `proposed-open` für eine Nennung ohne Verknüpfung).

Der Hash und der doppelte Anker erlauben einem Import, jeden Vorschlag abzulehnen, dessen Stelle sich seit dem Vorschlagen verändert hat. `notMarked` hält fest, was der Agent gesehen und absichtlich ausgelassen hat, denn auch diese Entscheidungen braucht ein Review.

## Phase 2, Anwenden im Editor

`anwenden.mjs` öffnet das Dokument über die Dokumentliste des Editors (o_szd.1222 als Startdokument), arbeitet die Vorschläge vom Dokumentende her ab, damit die Offsets des Originals gültig bleiben, und prüft vor und nach jedem Schritt den Editortext. `page.evaluate` liest nur den Text und setzt Auswahl oder Caret. Markup entsteht ausschließlich über die Dialoge oder über Tastatureingabe (`keyboard.insertText`) in der XML-Ansicht.

| Weg | 1222 | 1786 | 1079 |
|---|---|---|---|
| Menü (Strg+.) und Personendialog | 5 | 13 (+4 fehlgeschlagen) | 7 |
| Menü und Ortsdialog, GeoNames danach getippt | 7 | 33 | 4 |
| Menü und Ortsdialog ohne GeoNames | 0 | 1 | 1 (+1 fehlgeschlagen) |
| Menü und Datumsdialog | 1 | 5 | 0 |
| Menü und Datumsdialog, `@cert` danach getippt | 3 | 5 | 0 |
| getippt, keine orgName-Aktion | 4 | 5 | 2 |
| getippt, Person ohne `@ref` | 2 | 1 | 0 |
| getippt, Nennung über Zeilenumbruch | 1 | 5 | 3 |

Von 113 Vorschlägen liefen 33 vollständig über eine Editoraktion. 52 liefen über einen Dialog und brauchten danach Tippen für GeoNames oder `@cert`, 23 wurden ganz getippt (orgName, Umbrüche, Personen ohne Verknüpfung), 5 scheiterten im ersten Anlauf. Pro Vorschlag fielen drei bis sechs Bedienschritte an. Fünf Vorschläge scheiterten: viermal schloss sich das Menü bei einer Auswahl am Ende einer langen umbrochenen Zeile in o_szd.1786 (wahrscheinlich ein Zeitproblem der headless Steuerung beim Scrollen, kein beobachteter Fehler des Editors), einmal wies der Ortsdialog die GND-Kennung 63291-0 von Komotau als ungültig zurück. Der erste Lauf für o_szd.1222 hatte einen Fehler im eigenen Skript (falsche Wartebedingung auf das Schließen der Dialoge), sodass GeoNames und `@cert` fehlten. Er wurde verworfen und vom Original aus wiederholt. Die Zeit ging vor allem in Wartezeiten der Dialoge und in diesen Fehlversuch.

Der Datumsdialog schlug für alle vollständigen Daten den richtigen ISO-Wert selbst vor (`4.Januar 1935`, `10. Mai 1938`, `1935`, `1. März 1938`). Für relative Angaben (`10.`, `5. ds.`, `Herbst`, `Februar`, `20. April a.c.`) schlug er nichts vor, das Feld wurde aus dem Vorschlag gefüllt. Nach der Anwendung meldete der Editor für alle drei Dokumente „Wohlgeformt“ und „TEI-konform“.

## Phase 3, Review im Editor

`pruefen.mjs` öffnet die angewendete Kopie unter ihrem eigenen Pfad, öffnet in der Textansicht für jede Auszeichnung die Karte mit Enter, geht mit F8 durch die offenen Stellen, validiert, wendet die Review-Korrekturen aus `<id>.korrekturen.json` über Karte, Menü oder Tippen an, zeigt den Änderungsvergleich und speichert per Download als `<id>.tei.xml`. Screenshots liegen im Ordner (`*-karte-*.png`, `*-textansicht.png`, `*-f8.png`, `*-pruefung-aenderungen.png`) und wurden angesehen.

Das Review änderte inhaltlich einen Vorschlag und trug fünf nicht angewendete nach.

| Dokument | Vorschlag | Entscheidung | Grund |
|---|---|---|---|
| o_szd.1222 | v016 Kultusgemeinde | `@ref` entfernt, bleibt offen | Der Text nennt keine Gemeinde. Wien war nur aus dem Wohnort der Sekretärin erschlossen, Salzburg bleibt möglich. Eine falsche Verknüpfung wiegt schwerer als eine offene Stelle. |
| o_szd.1079 | v002 Komotau | nachgetragen, getippt | Ortsdialog lehnte 63291-0 ab |
| o_szd.1786 | v020, v030 Stauffacher; v038, v060 Stefan Zweig | nachgetragen über Menü und Personendialog | im Anwendungslauf nicht angewendet |

Die übrigen Vorschläge mit Zweifel blieben stehen, weil der Reviewer keine bessere Grundlage fand: Werner Weisflog (GND-Satz ohne Ort, aber Name, Beruf und Jahrgang passen), SZDPER.2226 für H. Weisflog trotz der Reichner-GND im Index, Amerika als USA, Postsparkasse als Österreichische Postsparkasse, Gestapo als Wiener Leitstelle, die Herbst- und Wochenfenster. Bei einem menschlichen Review sind genau diese Stellen die ersten Kandidaten.

Die Abhängigkeit des Reviews vom Vorschlagenden ist der größte methodische Vorbehalt. Derselbe Agent prüfte seine eigenen Vorschläge, mit denselben Quellen. Das Review hat vor allem Anwendungsfehler und eine überdehnte Inferenz gefunden. Es konnte kaum Identifikationsfehler finden, weil die Karten dafür zu wenig zeigen (siehe Reibungen).

## Reibungen mit dem Editor

1. Keine orgName-Aktion. `data/actions.json` kennt nur Person, Ort, Datum und die Markeraktionen. orgName wird in der XML-Ansicht getippt, erscheint in der Textansicht weder als Auszeichnung noch mit Karte (`js/source.js:119` `marks` ohne orgName, `:121` `linked` ohne orgName) und wird daher im Review unsichtbar. Vorschlag: Aktion `org` mit Dialog, der den Organisationsindex und die GND (`CorporateBody`) durchsucht.
2. Der Ortsdialog schreibt nur die GND. GeoNames, das die Regeln verlangen, muss in jedes `@ref` getippt werden. `js/place.js:182-186` akzeptiert nur eine GND-Kennung. Die Karte zeigt danach „GND 4075416-9 http://www.geonames.org/2990440“, weil `source.place.gndOf` (`js/source.js:106`) den Rest der Referenz ungetrennt anhängt. Vorschlag: GeoNames beim Wählen eines GND-Treffers aus `sameAs` übernehmen, wie die Regeln es beschreiben, und die Karte beide Kennungen getrennt anzeigen lassen.
3. Kurze GND-Kennungen werden abgelehnt. `isGndId` in `js/gnd.js:52` verlangt sechs bis elf Ziffern vor dem Prüfzeichen. Körperschafts- und Geografikasätze wie 63291-0 (Chomutov) oder 35565-3 (Home Office) haben weniger. Vorschlag: `^\d{1,11}-[\dX]$|^\d{8,11}[\dX]?$` oder ein Abgleich gegen lobid.
4. Der Datumsdialog hat kein Feld für `@cert`. Jedes erschlossene Datum braucht danach Tippen (`js/datedialog.js:11` `FIELDS`). Die Karte verweist für `@cert` nur auf die XML-Ansicht. Vorschlag: Ankreuzfeld „erschlossen“, das `cert="low"` schreibt und auf der Karte als „erschlossen“ erscheint.
5. Der Personendialog verlangt eine Kennung (`js/person.js:107-112`). Eine nicht identifizierbare Person, die die Regeln ausdrücklich ohne `@ref` vorsehen, lässt sich nur tippen. Ebenso kann die Karte eine Verknüpfung nicht lösen, nur das ganze Element entfernen. Vorschlag: „Ohne Verknüpfung markieren“ wie im Ortsdialog.
6. Nennungen über einen Zeilenumbruch lassen sich nicht über das Menü auszeichnen, weil `selectionProblem` jede Auswahl mit `<` ablehnt (`js/menu.js:67-70`). Das betraf neun Vorschläge. Vorschlag: eine Auswahl zulassen, deren einziges Markup leere Elemente wie `<lb/>` sind.
7. Unverknüpfte Personen, Orte und Organisationen zählen nicht als offene Stellen. Die Regeln sagen, sie blockieren die Abnahme. Der Editor zeigt o_szd.1786 trotz „ARNOLD HAUSER“ ohne `@ref` als „Bereit zur Abnahme“, und F8 springt in o_szd.1222 an Goetzfried, Lob, Fuchs und der Kultusgemeinde vorbei. `openWorkFor` in `js/source.js:164` enthält keinen Detektor dafür. Vorschlag: Detektor „nicht verknüpft“ für die Elemente aus `linked` (erweitert um orgName) und für `date` ohne Wert.
8. Die Karte einer GND-Person zeigt nur „GND 117458201“ ohne Namen und Lebensdaten (`js/app.js:564-572`). Für den Index gibt es Name und Daten. Ein Reviewer kann eine GND-Verknüpfung im Editor daher nicht beurteilen. Vorschlag: Name, Lebensdaten und Beruf aus lobid nachladen und zwischenspeichern.
9. Der Änderungsvergleich ist zeilenbasiert (`js/diff.js:15`). Bei Annotationen ist jede geänderte Zeile ganz rot und ganz grün, die eingefügten Tags muss man selbst suchen (Screenshot `o_szd.1786-pruefung-aenderungen.png`). Vorschlag: Wortdiff innerhalb geänderter Zeilen.

## Was ein Vorschlagsimport und ein Review-Modus brauchen

Vorgeschlagen ist, Vorschläge als Entwurf außerhalb des Textes zu halten und erst bei Annahme Markup zu schreiben. So bleibt die Datei bis zur Entscheidung unverändert, und die Regel aus `annotation.md` (LLM-Annotationen erst nach Prüfung in die Bestände) gilt ohne Zusatzaufwand.

Import. Ein Knopf „Vorschläge laden“ neben „Öffnen“ liest eine Datei im Format oben und prüft den Hash gegen den geöffneten Text. Weicht er ab, wird jeder Vorschlag über `context` neu gesucht, und ein nicht mehr auffindbarer gilt als verworfen mit Grund. Andocken würde das in `js/files.js` (eine zweite Ladefunktion neben `load`, `js/files.js:222`) und für die Zustandsverwaltung in einem neuen Modul `js/proposals.js`, das ADR-002 als Verantwortung führen müsste.

Anzeige. In der Textansicht erscheinen Vorschläge als eigene Dekoration, etwa gestrichelt umrandet und mit einem Badge „V“, damit Farbe nicht allein trägt. Andockpunkt ist der Aufbau der Dekorationen in `js/textview.js:247-250`, der heute nur bestehende Auszeichnungen kennt. Der Arbeitszustand zählt offene Vorschläge als eigene Art offener Arbeit, sodass F8 sie anspringt (`js/state.js:63` `openSpots`, Detektor in `openWorkFor`, `js/source.js:164`) und „Bereit zur Abnahme“ erst nach Entscheidung aller Vorschläge erscheint (`js/state.js` `workingState`).

Entscheiden. Die Karte (`js/markcard.js:16-40` `describeMark`) zeigt für einen Vorschlag Element, Wert, Identität mit Name und Lebensdaten, die Belege aus `basis` und den `doubt`-Satz, dazu „Annehmen“, „Ändern“ und „Verwerfen“. Annehmen schreibt das Element über `editor.replace` wie die Dialoge (`js/editor.js:440`), Ändern öffnet den vorhandenen Dialog vorbefüllt (`js/app.js:574-593` `onChange`), Verwerfen markiert den Vorschlag als verworfen und fragt optional nach einem Grund. Tastatur: Enter öffnet die Karte, A, Ä und V wählen, F8 springt weiter.

Kennzeichnung im TEI. Angenommene Annotationen tragen die Herkunft, damit sie von menschlichen unterscheidbar bleiben. Naheliegend ist `@resp="#llm-agent"` am Element mit einer `respStmt` oder einem `change` im `revisionDesc`, der LLM, Datum und Vorschlagsdatei nennt, und bei geänderten Vorschlägen `@resp` des Menschen. Das deckt sich mit der Proposal-Schicht der teiCrafter-Basis, die `knowledge/plan.md` (Zeile 140) für die Plausibilitätsprüfung vorsieht. Ob SZD-split `@resp` im Body erlaubt, muss das Projektschema entscheiden (ADR-010). Verworfene Vorschläge gehören in eine Begleitdatei, nicht ins TEI.

## Regellücken

- Telegrammadressen („Vikpress New York“, „Dr. Weisflog, Zürich“). Entschieden, Orts- und Personennennung darin auszuzeichnen, die Kennung selbst nicht.
- Straßen und Hausnamen (Hallam Street, La Margolaine). Nicht ausgezeichnet, weil die Regeln Siedlungen, Länder, Regionen und Naturräume nennen.
- Schiffe (Conte di Savoia). Nicht ausgezeichnet.
- Personennamen in Firmennamen („Verlag Herbert Reichner“, „Herbert Reichner-Verlages“). Als orgName ohne inneres persName, analog zur Regel für Orte in Organisationsnamen.
- Öffentliche Register (Schweizerisches Handelsregister). Nicht als Körperschaft ausgezeichnet.
- Hotels im Briefkopf. Als orgName ausgezeichnet.
- Jahreszeiten und Wochenangaben („Herbst“, „dieser Woche“). Als Fenster mit `@notBefore`, `@notAfter` und `@cert="low"`, Herbst als September bis November.
- Präpositionen und Artikel vor Daten („am 10.“, „den 4.Januar 1935“) bleiben außerhalb, analog zu den Anredeformen bei Personen.
- „ds.“ und „a.c.“ ergeben den Monat oder das Jahr aus dem Briefdatum. Gewertet als erschlossen, daher `@cert="low"`.
- Länder in Adjektivform als Namensteil („des deutschen Reiches“). Ausgezeichnet, weil es der Name des Staates ist.
- Mehrdeutige Gattungsnamen („die Kultusgemeinde“, „Postsparkasse“). Die Regeln sagen nicht, wie weit eine Inferenz aus dem Briefkontext für `@ref` reichen darf. Das Review hat hier enger entschieden als der Vorschlag.
- Indexfehler. SZDPER.2226 (Weisflog, Heinrich) trägt die GND von Herbert Reichner. Die Regel „Index zuerst“ sagt nicht, was bei widersprüchlichem Index geschieht.
- Doppelte Transkription (o_szd.1079, Seite 5 wiederholt Seite 4). Gleich behandelt wie das Original.
- Briefdatum nur im Titel des Headers. Als Bezug für relative Daten verwendet.

## Ausgabe von pruefe.mjs

```
{"file":"o_szd.1222.tei.xml","preserved":true,"header":true,"wellFormed":"Wohlgeformt","valid":"TEI-konform","state":"In Bearbeitung | 7 offene Stellen","marks":{"orgName":{"count":4,"open":1},"placeName":{"count":7,"open":0},"date":{"count":4,"open":0},"persName":{"count":8,"open":3}}}
{"file":"o_szd.1786.tei.xml","preserved":true,"header":true,"wellFormed":"Wohlgeformt","valid":"TEI-konform","state":"Bereit zur Abnahme | ","marks":{"persName":{"count":18,"open":1},"placeName":{"count":34,"open":0},"date":{"count":11,"open":0},"orgName":{"count":9,"open":0}}}
{"file":"o_szd.1079.tei.xml","preserved":true,"header":true,"wellFormed":"Wohlgeformt","valid":"TEI-konform","state":"Bereit zur Abnahme | ","marks":{"persName":{"count":8,"open":0},"placeName":{"count":6,"open":0},"orgName":{"count":2,"open":0},"date":{"count":2,"open":0}}}
```

Die sieben offenen Stellen in o_szd.1222 sind HTR-Marker (Streichung, Unsicher, Ergänzungen), keine der vier unverknüpften Annotationen. Der Zustand „Bereit zur Abnahme“ für o_szd.1786 trotz einer unverknüpften Person ist Reibung 7.

## Dateien

Vorschläge `*.vorschlaege.json`, Anwendungsprotokolle `*.anwendung.json` mit Zwischenstand `*.angewendet.tei.xml`, Review-Lesedurchgang `*.pruefung.json`, Korrekturen `*.korrekturen.json` und `*.pruefung-korrektur.json`, Endstand `*.tei.xml`, Entscheidungstabellen `*.entscheidungen.md`, Skripte `baue-vorschlaege.mjs`, `anwenden.mjs`, `pruefen.mjs`, Laufprotokolle `*.log`, Screenshots `*.png`.
