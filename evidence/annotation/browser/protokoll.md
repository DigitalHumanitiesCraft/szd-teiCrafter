# Protokoll: Annotation durch den Browser-Editor

Weg: Annotation über teiCrafter SZD (http://127.0.0.1:8000/), gesteuert headless mit Playwright aus Node-Skripten in diesem Ordner. Producer: unrevised LLM agent, through the editor. Stand: 2026-10-31.

## Vorgehen

1. Regeln gelesen (`knowledge/annotation.md`), dazu README, `test/browser-check.mjs` (wie Auswahl, Menü, Dialoge, Ansichten und Speichern getrieben werden) und die Module `menu.js`, `person.js`, `place.js`, `datedialog.js`, `dates.js`, `register.js`, `gnd.js`, `markcard.js`, `source.js`, `actions.json`.
2. `lib.mjs`: Helfer, die nur Personen-Interaktionen ausführen. Auswahl per Maus-Ziehen über die Zeichenpositionen der Zeile, Scrollen per Mausrad, Caret per Mausklick, Tippen per Tastatur, Menü per Strg+. und Aktionsbuchstabe, Dialogfelder per Eingabe, Speichern per Klick auf „TEI speichern“ (Download, File System Access abgeschaltet). `page.evaluate` liest nur (Editortext, Auswahl) zur Protokollierung; Markup wird nie darüber geschrieben.
3. Nachschlage-Durchgang (`erkunde.mjs`): Personendialog und Ortsdialog auf einer Auswahl geöffnet, alle Kandidaten-Abfragen eingetippt, Index-, GND- und Ortstreffer aufgezeichnet (`erk-1222.json`, `erk-2.json`). Außerhalb des Editors per lobid-gnd-JSON gelesen: `sameAs` der Orte (GeoNames) und Körperschaften (Viking Press, Postsparkasse, Kultusgemeinde, Schnellenburg), weil der Editor beides nicht anbietet.
4. Probe des Tippens im XML-View (`probe-tippen.mjs`): Wie verhalten sich Autovervollständigung, closeBrackets und autoCloseTags, wenn man ein Element von Hand um einen Text legt.
5. Entscheidungen als Plan je Dokument (`plan-<id>.mjs`), dann `annotiere.mjs <id>`: Schritt für Schritt Dialog, wo es einen gibt, Tippen im XML-View, wo nicht; danach Textansicht (Screenshot), Validieren, Speichern als Download. 504 und 406 wurden über die Dokumentliste geöffnet.
6. Prüfung der Karte in der Textansicht (`probe-karte.mjs`) auf der gespeicherten Fassung, ohne zu speichern.
7. `pruefe.mjs` auf alle drei Dateien.

Muster für einen Fall ohne Dialog (orgName, Person ohne Kennung, Name über `<lb/>`): Caret vor den Namen klicken, `<orgName ref="…">` tippen, worauf der Editor sofort `</orgName>` hinter dem Caret einfügt; diese 10 Zeichen mit Entf löschen; mit der Pfeiltaste über den Namen gehen (oder hinter das Ende auf der nächsten Zeile klicken); `</` tippen, das der Editor meist zu `</orgName>` ergänzt; wenn nicht, den Namen von Hand zu Ende tippen. GeoNames: Caret vor das schließende Anführungszeichen von `@ref` klicken und ` http://www.geonames.org/ID` tippen. `@cert`: Caret vor das `>` des Datumstags klicken und ` cert="low"` tippen.

## Aufwand

Gezählt sind Personenaktionen der Skripte (Auswahl, Klick, Tastendruck-Folge, Eingabe), ohne den Nachschlage-Durchgang.

| Dokument | Aktionen | Laufzeit des letzten Laufs | Läufe bis zum Ergebnis |
|---|---|---|---|
| o_szd.1222 | 133 | 120 s | 3 (Lauf 1 und 2 brachen am Namen über `<lb/>` ab) |
| o_szd.504 | 53 | 50 s | 1 |
| o_szd.406 | 166 | 134 s | 2 (Lauf 1: Zweig im Index nicht gefunden) |

Dazu zwei Nachschlage-Läufe mit 20 Personen- und 17 Ortsabfragen und rund 20 lobid-Abrufe außerhalb des Editors. Ein Ort mit Kennung kostet 7 bis 8 Aktionen, davon 2 nur für GeoNames. Eine Person aus dem Index 4 Aktionen; eine nicht identifizierte Person 8 bis 9, weil der Dialog erst verweigert und dann getippt werden muss. Ein getipptes Element 5 bis 6, ein Datum mit `@cert` 4.

Die Zeit ging vor allem in drei Dinge: das Herausfinden, wie man im XML-View ein Element um einen Text legt (Probe, zwei abgebrochene Läufe); das Nachschlagen außerhalb des Editors (GeoNames, Körperschaften); und Abfragen, die das Gesuchte nicht unter den acht gezeigten Treffern haben (New York, Vienna, Zweig).

## Reibungen mit dem Editor

Nach Kosten geordnet. Codestellen gelesen; was beobachtet und was aus dem Code erschlossen ist, steht jeweils dabei.

1. **Personen ohne Kennung lassen sich im Dialog nicht markieren.** Versucht: Name auswählen, Strg+. P, keinen Treffer wählen, „Annotieren“. Ergebnis: „Bitte einen Treffer wählen oder eine Kennung eingeben, etwa SZDPER.2188 oder eine GND-ID.“ Erwartet: wie im Ortsdialog ein Markieren ohne Verknüpfung, denn die Regel verlangt `persName` ohne `@ref` für nicht Identifizierte. Betroffen: 17 der 25 Personen aller drei Dokumente (3 in 1222, 14 in 406, davon 7 auf der Duplikatseite). Code: `js/person.js:106-111` (Submit ohne Kennung abgelehnt), `data/actions.json` (`ref` `required: true`). Vorschlag: Knopf „Ohne Verknüpfung markieren“ wie `js/place.js:35-38`, `ref` auf nicht verpflichtend.
2. **Kein Weg für Organisationen.** Das Menü kennt keine Organisation; GND-Suche nach Körperschaften gibt es nicht; ein getipptes `orgName` erscheint in der Textansicht gar nicht (beobachtet: keine `.tv-mark` für „Viking Press“, „Kultusgemeinde“). Code: `data/actions.json` (keine Aktion), `js/source.js:119-121` (`marks` und `linked` ohne `orgName`), `js/textview.js:214` (Elemente außerhalb von `marks` werden übersprungen). Vorschlag: Aktion „Organisation“ mit Dialog nach dem Muster des Ortsdialogs, `searchGnd(query, "CorporateBody")` (`js/gnd.js:18` nimmt den Typ schon), SZDORG-URI als Alternative, `orgName` in `marks` und `linked`.
3. **Ein Element im XML-View von Hand um einen Text zu legen, ist mühsam und unzuverlässig.** autoCloseTags setzt das schließende Tag sofort hinter den Caret statt hinter den Text; es muss gelöscht und am Ende neu getippt werden. Die Ergänzung von `</` zum offenen Element griff in 1222 beim Namen über `<lb/>` nicht und, beobachtet im dritten Lauf, auch bei „Kultusgemeinde“ und „Postsparkasse“ nicht, bei „Viking Press“ und in 406 aber schon. Folge im ersten Lauf: ein liegengebliebenes `</` machte das Dokument kaputt, das Menü sah danach jede Auswahl als „in Markup“ an. Code: `js/editor.js:289` (`xml({ elements, autoCloseTags: true })`). Vorschlag: im XML-View einen Befehl „Auswahl in Element einschließen“ (Element aus den Aktionen und `source.elements`, Attribute als Felder), der beide Tags in einem Schritt setzt.
4. **Namen über einen Zeilenumbruch sind im Menü ausgeschlossen.** Eine Auswahl über `<lb/>` wird abgelehnt („Die Markierung enthält Markup. Nur reinen Text markieren.“). Die Regel verlangt genau ein Element mit dem `lb` darin (Goetzfried). Code: `js/menu.js:67-72` (`/[<>]/.test(text)`). Vorschlag: Auswahlen zulassen, deren Markup nur aus leeren Elementen besteht (`<lb/>`, `<pb …/>`); das Umschließen bleibt dann wohlgeformt.
5. **GeoNames fehlt im Ortsdialog; die Karte zeigt es falsch, „Ändern“ löscht es.** Das Kennungsfeld nimmt nur eine GND-ID (`js/place.js:35-38`); GeoNames musste außerhalb aus lobid gelesen und in jedes `@ref` getippt werden (2 Aktionen je Ort, 18 Orte). Die Karte zeigt „GND 4075416-9 http://www.geonames.org/2990440“ (beobachtet), weil `js/source.js:106` alles nach dem GND-Präfix als Kennung nimmt. „Ändern“ öffnet den Dialog mit leerem Kennungsfeld und Vorschau ohne `@ref`; nach erneuter GND-Eingabe steht nur noch die GND da (beobachtet, `js/place.js:121`, `js/app.js:588`). Vorschlag: beim Wählen eines GND-Treffers `sameAs` (GeoNames) aus derselben lobid-Antwort übernehmen und beide Links schreiben; `gndOf` nur das erste Token lesen; beim Ändern die vorhandenen Links vorbelegen und nicht gewählte erhalten.
6. **Datum: keine Sicherheit, schwache Vorschläge, eine Falle.** Der Dialog hat kein Feld für `@cert`; viermal getippt (`js/datedialog.js:11`, nur when/from/to/notBefore/notAfter). Für „10.“, „Februar“, „Herbst“, „23/11. 16“ kam kein Vorschlag (`js/dates.js:52-65`: nur vierstellige Jahre, keine Tag- oder Monatsangaben allein, keine römischen Monate). Bei „18.VI.1930“ schlug der Dialog `when="1930"` vor und hakte „Nur ‚1930‘ auszeichnen“ an (beobachtet): wer Enter drückt, verliert Tag und Monat und den Rest des Ausdrucks (Regel `js/dates.js:64`). Vorschlag: Kästchen „erschlossen“ → `cert="low"`; Vorschläge relativ zum Briefdatum aus dem Header (Tag allein, Monat allein, zweistelliges Jahr, römischer Monat); einen Teilvorschlag nicht vorab angehakt anbieten, wenn Ziffern des Ausdrucks unberücksichtigt bleiben.
7. **Offene Spots zählen unverknüpfte Einträge nicht.** Die Regel sagt, eine Person, Organisation oder ein Ort ohne `@ref` und ein Datum ohne Wert sind offene Stellen und blockieren die Abnahme. Beobachtet: 1222 zeigt vor und nach der Annotation „7 offene Stellen“, obwohl vier Einträge unverknüpft sind; F8 führt nicht zu ihnen. Code: `js/source.js:164-181` (`openWorkFor` kennt nur HTR-Marker). Vorschlag: Detektor für `persName`/`placeName`/`orgName` ohne `@ref` und `date` ohne Wert, mit der Aktion des Elements, damit F8 dorthin springt und der Dialog „Ändern“ öffnet.
8. **GND-Ortssuche: die gemeinte Stadt fehlt unter den acht Treffern.** „New York“ liefert Crystal Palace, Times Building, Stadtteile, aber nicht die Stadt (erst „New York, NY“, Treffer 2); „Vienna“ zeigt Vienna, Va. zuerst, Wien an Stelle 5; „Nice“ Nizza an Stelle 4. Code: `js/gnd.js:36-41` (Filter nach Wortzahl, dann `slice(0, 8)` in lobid-Reihenfolge). Vorschlag: Treffer, deren `preferredName` oder `variantName` gleich der Abfrage ist, nach vorn; bei Orten Bauwerke und Stadtteile hinter Gebietskörperschaften.
9. **Personenindex: Schreibvarianten und Kappung.** „Stephan Zweig“ (so geschrieben in 406) findet nichts, weil der Index „Stephan“ nicht als Variante führt (geprüft: 0 Einträge mit „stephan“ und „zweig“ in `data/register/szd-persons.json`); „Zweig“ zeigt acht alphabetisch sortierte Zweigs ohne Stefan. Code: `js/register.js:46-50` (Teilstring jedes Worts, Sortierung nur nach Anfang des ersten Worts, `slice(0, 8)`). Vorschlag: Nachnamen-Treffer mit passendem Vornamensanfang vorziehen (oder Edit-Distanz 1 auf Vornamen), Trefferzahl nennen und mehr zeigen.
10. **Veraltete GND-Treffer bleiben stehen.** Beim Wechsel der Abfrage im Personendialog stand die GND-Liste der vorigen Abfrage weiter da, während der Status „Suche in der GND …“ zeigte (beobachtet im Nachschlage-Lauf: bei „Fuchs“ noch die Reichner-Treffer). Ein schneller Klick wählt dann eine falsche Person. Code: `js/person.js:73-90` und `92-95` (Liste wird weder beim Tippen noch zu Beginn der Suche geleert). Vorschlag: `person-results` beim Tippen und zu Suchbeginn leeren.
11. **Abgelehnte Menüöffnung, dann tippt der Aktionsbuchstabe in den Text.** Im ersten Lauf lehnte Strg+. die Auswahl „Lob“ ab (wegen des liegengebliebenen `</`); das folgende P ersetzte „Lob“ durch „p“. Bei einer Person am Bildschirm, die Strg+. P schnell hintereinander drückt, ist das ein Datenverlust (rückgängig machbar, aber leicht übersehen). Code: `js/menu.js:109-111` (Meldung, Fokus bleibt im Editor bei bestehender Auswahl). Vorschlag: nach einer Ablehnung die Auswahl aufheben oder den Fokus auf die Meldung setzen.
12. **Dialoge verdecken Faksimile und Kontext.** Der modale Dialog liegt über Text und Faksimile; der Kontext der Auswahl (Zeile) erscheint im Dialog nicht, nur das ausgewählte Wort (Screenshots `shots/erkunde-person-last.png`, `shots/erkunde-place-last.png`). Gering, aber bei unsicheren Lesungen störend. Vorschlag: Zeile im Dialogkopf zitieren, Dialog seitlich statt mittig.

Gut funktionierte: Indextreffer mit GND und SZDPER in einer Zeile; das Weglassen von „Herr/Frau/Dr.“ in der Abfrage; der Datumsdialog bei vollständigen Daten („4.Januar 1935“); die Wohlgeformtheitsanzeige, die Validierung und die byte-genaue Speicherung (pruefe: `preserved` und `header` true bei allen drei); die Textansicht zeigt unverknüpfte Personen grau gewellt.

## Regellücken

- **Hotels, Gaststätten, Firmen in Datumszeile und Briefkopf.** Hotel Westminster, Hotel Villa Igiea, Schnellenburg (Ortszeile) nicht markiert; Rheinrestaurant Schnellenburg (Briefkopf) als `orgName` markiert. Entscheidung: als Absendeort kein Element, als Firma im Briefkopf `orgName`.
- **Organisation als Adresse.** Viking Press als Postadresse („meine Adresse … die Viking Press“): als `orgName` markiert, obwohl sie dort nicht handelt.
- **Gemeintes Gebilde unbestimmbar.** „die Kultusgemeinde“: Gattungsbezeichnung mit bestimmtem Artikel, als `orgName` ohne `@ref` markiert.
- **Historischer Name einer Körperschaft.** Postsparkasse 1935 → Österreichisches Postsparkassenamt (Wien), nicht die Österreichische Postsparkasse (ab 1970).
- **Ort, der etwas anderes meint als er heißt.** „Amerika“ für die USA: mit der USA verknüpft, nicht mit dem Kontinent.
- **Ort in Adressen und Telegrammadressen.** „Vikpress New York“: New York markiert; Straßen nicht (die Regel nennt Straßen nicht).
- **Jahreszeiten und Monate ohne Jahr.** „Herbst“ als Fenster 1935-09 bis 1935-11 mit `cert="low"`; „in Februar“ als 1935-02 mit `cert="low"`.
- **Geschriebenes Jahr widerspricht dem Briefdatum.** „23/11. 16“ bei Header 1906 und Poststempel 1906: 1906-11-23 mit `cert="low"`; die Regel kennt nur das Ausschreiben zweistelliger Jahre.
- **Initialen und verderbte Namen.** „W.“, „H.“ vor `[?]` je als `persName` ohne `@ref`; „Hiede ell Vries“ als Ganzes.
- **Doppelte Seiten.** 406 hat auf Seite 2 und 3 denselben Text; beide gleich annotiert.
- **Name in Grußformel der Signatur mit Marker.** „Stefan[?]“ mit `[?]` im Element, mit Zweig verknüpft.

## Ausgabe von pruefe.mjs

```
{"file":"o_szd.1222.tei.xml","preserved":true,"header":true,"wellFormed":"Wohlgeformt","valid":"TEI-konform","state":"In Bearbeitung | 7 offene Stellen","marks":{"placeName":{"count":7,"open":0},"date":{"count":4,"open":0},"persName":{"count":8,"open":3},"orgName":{"count":3,"open":1}}}
{"file":"o_szd.504.tei.xml","preserved":true,"header":true,"wellFormed":"Wohlgeformt","valid":"TEI-konform","state":"In Bearbeitung | 43 offene Stellen","marks":{"date":{"count":1,"open":0},"placeName":{"count":6,"open":0},"persName":{"count":1,"open":0}}}
{"file":"o_szd.406.tei.xml","preserved":true,"header":true,"wellFormed":"Wohlgeformt","valid":"TEI-konform","state":"In Bearbeitung | 70 offene Stellen","marks":{"placeName":{"count":5,"open":0},"date":{"count":1,"open":0},"orgName":{"count":2,"open":2},"persName":{"count":16,"open":14}}}
```

Die offenen Stellen des Editors (7, 43, 70) sind die HTR-Marker der Originale, die diese Annotation nicht auflöst; die unverknüpften Einträge zählt der Editor nicht mit (Reibung 7).

## Dateien

`o_szd.*.tei.xml` (Downloads aus dem Editor), `o_szd.*.entscheidungen.md`, `log-<id>.json` (jeder Schritt mit Dialogtreffern, Vorschau, Aktionen), `run-*.txt`, `erk-*.json`, `shots/`, Skripte `lib.mjs`, `erkunde.mjs`, `annotiere.mjs`, `plan-*.mjs`, `probe-tippen.mjs`, `probe-karte.mjs`.
