# Protokoll direkt-a (Weg: direkt im TEI)

Urheber: unrevidierter LLM-Agent, 2026-10-31. Dokumente: o_szd.1222 (Kalibrierung), o_szd.1750, o_szd.1404.

## Vorgehen

1. Regelwerk `knowledge/annotation.md` gelesen, dazu die Abschnitte „Authority data and links“ und „Examples“ aus `knowledge/data.md`.
2. Die drei Originale vollständig gelesen (nur `text/body` und Titel), Kandidaten je Elementklasse notiert und Werktitel, Schiffe, Straßen und Gattungswörter bewusst ausgeschieden.
3. Registerabgleich in einem einzigen Node-Aufruf über `data/register/szd-persons.json` (Feld `search`, Teilstring) für alle Personennamen.
4. SZD-Organisationsindex (TEI_SOURCE) einmal in den Scratchpad geladen und als Liste `SZDORG.n` mit GND gelesen.
5. GND-Abfragen über ein kleines Node-Skript gegen lobid-gnd (Suche je Typ Person, PlaceOrGeographicName, CorporateBody; Einzeldatensätze für New York, USA, Indre-et-Loire, Amerika, Emil Fuchs, Viking Press). GeoNames jeweils aus `sameAs` des GND-Datensatzes.
6. Markup nicht von Hand, sondern über ein Skript mit verankerten Ersetzungen eingefügt: Jeder Eintrag nennt einen eindeutigen Kontextstring, das Ziel darin, Element und Attribut. Das Skript bricht ab, wenn der Kontext nicht genau einmal vorkommt. Das hat zweimal gegriffen (Kontext wurde durch eine vorherige Markierung verändert) und damit Fehlplatzierungen verhindert.
7. `pruefe.mjs` gelaufen, Ergebnis geprüft, Entscheidungstabellen geschrieben, `pruefe.mjs` erneut gelaufen.
8. Editor-Code gelesen, um die Werkzeugideen an konkrete Stellen zu binden.

Faksimiles wurden nicht herangezogen; keine Identifikation hing an einer strittigen Lesung, die das Bild hätte klären können (bei „H~~amb~~[?] Goetzfried“ hätte auch eine sichere Lesung keinen GND-Treffer erwarten lassen; das ist eine Vermutung).

## Aufwand

Rund 30 Tool-Aufrufe. Verteilung grob: Lesen von Regeln und Dokumenten 4, Register und Organisationsindex 4, GND-Abfragen 3 (gebündelt per Skript, je 8 bis 10 Abfragen), Einfügen und Prüfen 5, Codelektüre für Werkzeugideen 6, Schreiben der Ausgaben 5. Die meiste Denkzeit ging nicht in die Abfragen, sondern in Abgrenzungsfragen (was überhaupt markiert wird: Werktitel mit Personennamen, „Amerika“, Gattungswörter wie „Kultusgemeinde“, Hotel, Landsitz). Die eigentliche Markierung war dank Skript schnell und sicher.

## Schwierige Fälle

- „Mozart“ und „Handel“ (1750) sowie „Erasmus“ und „Maria Stuart“ (1222): Personennamen als Metonymie für Werke, Ausgaben oder Manuskripte. Nicht markiert, als Werkstufe gewertet. Bei „Mozart hoffe ich bereits wohlbehalten bei Jaffé“ bleibt offen, ob ein Autograph oder eine Ausgabe gemeint ist.
- „Amerika“/„Amérique“ (dreimal): Wortlaut Kontinent, gemeint nach Kontext die USA. Mit USA verknüpft (GND 4078704-7, GeoNames 6252001).
- „H.W.Allen“ (1750): zwei GND-Kandidaten, H. Warner Allen (brit. Journalist) und Hervey Allen (amerik. Romancier), keiner passt in Initialen und Herkunft zugleich. Offen gelassen.
- „Herrn Fuchs“ (1222): Register hat zwei Fuchs; Emil Fuchs (Journalist) wäre plausibel, ist aber nicht belegt. Offen gelassen.
- „Kultusgemeinde“ und „Postsparkasse“ (1222): Gattungswort für eine bestimmte Wiener Körperschaft. Markiert und durch Kontextschluss verknüpft (IKG Wien, Österreichische Postsparkasse), Zweifel vermerkt.
- „agence Bloch de la Société des Auteurs“ (1404): Agentur oder Agent? Als orgName ohne @ref; „Société des Auteurs“ als Kurzform der SACD verknüpft.
- Jahreszeit „Herbst“: Fenster September bis November mit cert="low" gesetzt; eine feste Abgrenzung gibt die Regel nicht vor.

## Regellücken in annotation.md

1. Werktitel aus Personennamen (Erasmus, Maria Stuart, Händel, Mozart): Die Regel nennt nur Periodika als Werkstufe; ob ein als Werk gebrauchter Personenname persName bekommt, ist offen.
2. Gebrauch eines Kontinentnamens für ein Land („Amerika“ für USA): Referent oder Wortlaut?
3. Gattungswort für eine bestimmte Körperschaft („die Kultusgemeinde“, „Postsparkasse“, „den Verlag“): ab wann ist das eine Benennung?
4. Hotels, Landsitze, Villen, Straßen, Postbezirke (Hotel Westminster, Grandcour, La Margolaine, Dortmunderstr., N.W.21): nicht erfasst. Ich habe das Hotel als Firma markiert, die übrigen nicht.
5. Schiffe (Conte di Savoia) und Telegrammadressen (Vikpress): keine Elementklasse.
6. Umfang des Datumsausdrucks: gehören Präpositionen und Rahmen („am 10.“, „le mois d'Octobre“) ins Element? Die Regel gibt `am 10.` als Beispiel für einen Ausdruck, regelt aber nicht die Elementgrenze. Ich habe „am“ draußen gelassen, „mois d'Octobre“ drin.
7. Tag und Monat ohne Jahr („8.Oktober“): Gilt das als unvollständig mit cert="low"? Ich habe ja entschieden, weil das Jahr erschlossen ist.
8. Jahreszeiten: keine ISO-Abgrenzung festgelegt.
9. Adjektivische Relativdaten („des heutigen Briefes“): nicht markiert, nicht geregelt.
10. Körperschaften, deren GND-Datensatz keine GeoNames hat (Indre-et-Loire): Regel sagt „where known“, gut; aber ein Departement ist eine Region, für die GeoNames sehr wohl eine Id hat. Ob man GeoNames anders als über GND-sameAs ermitteln darf, ist offen.

## Widersprüche in der Wissensbasis

- `knowledge/data.md`, Abschnitt „Examples“: das Beispiel verknüpft Relgis mit `http://d-nb.info/gnd/1057079499`, obwohl Relgis im Register steht (SZDPER.1153) und `annotation.md` dann `#SZDPER.n` verlangt. Ich bin `annotation.md` gefolgt.
- `knowledge/data.md`, Zeile 46 und `js/source.js:100`: „GeoNames is not used“; `annotation.md`, Abschnitt Places, verlangt GeoNames aus GND-sameAs. Ich bin `annotation.md` gefolgt.
- `annotation.md` sagt, unverknüpfte Personen, Orte, Organisationen und Daten ohne Wert blockieren die Abnahme. Der Editor zählt sie nicht: o_szd.1750 hat zwei persName ohne @ref und steht im Editor auf „Bereit zur Abnahme“ (siehe pruefe-Ausgabe).

## Was ein Werkzeug bieten müsste

- Offene Stellen für unverknüpfte Markierungen: Detektor für persName, placeName, orgName ohne @ref und date ohne Wert in `openWorkFor` (`js/source.js:164`), sonst widerspricht der Editor der Regel.
- orgName als Aktion: `data/actions.json` kennt nur persName, placeName und date; `js/source.js:121` (`linked`) und `marks` (`js/source.js:119`) kennen orgName nicht. Eine Organisationsaktion mit Suche im SZD-Organisationsindex und GND (CorporateBody) fehlt.
- GeoNames aus GND-sameAs: `searchGnd` (`js/gnd.js:19`) wirft `sameAs` weg, `place.gndRef` (`js/source.js:104`) schreibt nur die GND. Beides zusammen würde die Regel ohne GeoNames-Konto erfüllen.
- Datum relativ zum Briefdatum: Der Datumsdialog kann `@cert` nicht schreiben (`data/actions.json`, Aktion `date`, Zeile 54, Attributliste Zeilen 59–80) und kennt das Briefdatum nicht. Ein Vorschlag „Jahr aus Briefdatum, cert=low“ würde „am 10.“, „8.Oktober“, „Februar“ in einem Schritt erledigen.
- Alle Vorkommen eines Namens zugleich verknüpfen (New York dreimal, Kredel/Kredels, Paris, Saint-Avertin, Felix Bloch Erben je zweimal).
- Ein Entscheidungsprotokoll als Nebenprodukt: Grundlage (Registertreffer, GND-Datensatz, Kontextschluss) und Urheber je Markierung, statt einer händisch geführten Tabelle.
- Für den direkten Weg selbst: ein verankertes Einfügewerkzeug (Kontext, Ziel, Element, Wert) mit Eindeutigkeitsprüfung und anschließendem Byte-Vergleich, wie ich es mir als Skript gebaut habe. Das ist die Stelle, an der der direkte Weg ohne Werkzeug am fehleranfälligsten wäre.

## pruefe.mjs-Ausgabe (letzter Lauf)

```
{"file":"o_szd.1222.tei.xml","preserved":true,"header":true,"wellFormed":"Wohlgeformt","valid":"TEI-konform","state":"In Bearbeitung | 7 offene Stellen","marks":{"orgName":{"count":4,"open":1},"placeName":{"count":7,"open":0},"date":{"count":4,"open":0},"persName":{"count":8,"open":3}}}
{"file":"o_szd.1750.tei.xml","preserved":true,"header":true,"wellFormed":"Wohlgeformt","valid":"TEI-konform","state":"Bereit zur Abnahme | ","marks":{"date":{"count":2,"open":0},"persName":{"count":6,"open":2},"placeName":{"count":2,"open":0},"orgName":{"count":2,"open":0}}}
{"file":"o_szd.1404.tei.xml","preserved":true,"header":true,"wellFormed":"Wohlgeformt","valid":"TEI-konform","state":"In Bearbeitung | 2 offene Stellen","marks":{"placeName":{"count":7,"open":0},"date":{"count":3,"open":0},"orgName":{"count":4,"open":1},"persName":{"count":1,"open":0}}}
```

Beim ersten Lauf meldete o_szd.1750 `"valid":"Prüfung fehlgeschlagen"`. Ein zweiter Lauf mit derselben, unveränderten Datei und mit dem Original ergab beide „TEI-konform“. Der erste Fehlschlag war also flüchtig (vermutlich Zeitüberschreitung des Validierungs-Workers, möglicherweise wegen paralleler Läufe anderer Agenten; das ist eine Vermutung). Die „7 offenen Stellen“ in o_szd.1222 und „2“ in o_szd.1404 sind HTR-Marker der Transkription, nicht meine unverknüpften Markierungen.
