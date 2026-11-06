# Protokoll Weg direkt, Agent B

Producer aller Annotationen: unrevised LLM agent. Bearbeitet am 2026-10-31: o_szd.1222 (Kalibrierungsbrief), o_szd.1437 (Brief mit Gedichtbeilagen, 25 Seiten), o_szd.152 (Lebensdokument, Antwortkarte).

## Vorgehen

1. `knowledge/annotation.md` vollständig gelesen, danach `pruefe.mjs`, um zu wissen, was gemessen wird (Tag-Entfernung gegen das Original, Header, Wohlgeformtheit, Validität, Zählung offener Marken).
2. Die drei Originale gelesen und Kandidaten pro Element notiert, einschliesslich der Fälle, die bewusst nicht markiert werden (Werktitel, Schiffsname, Adressbestandteile).
3. SZD-Personenregister (`data/register/szd-persons.json`, Form `{persons:[{id,name,gnd,dates,search}]}`) per Node-Einzeiler nach allen Personenkandidaten durchsucht. Treffer: Meingast, Reichner, Relgis, Zweig, Betty Cohen; mehrdeutig: Fuchs; kein Treffer: Wolbe, Goetzfried, Lob, Meyer Cohen.
4. SZD-Organisationsindex (GAMS TEI_SOURCE) geladen und durchsucht: Viking Press (SZDORG.61, GND 10102943-3); Herbert Reichner Verlag vorhanden, aber im Text nicht benannt; keine Kultusgemeinde, keine Postsparkasse, kein Hotel.
5. lobid-gnd in drei Sammelläufen (Suche) und einem Lauf auf Einzelsätze abgefragt; GeoNames-IDs aus `sameAs` übernommen und in die Form `http://www.geonames.org/ID` umgeschrieben.
6. Für o_szd.152 den GAMS-Katalog der Lebensdokumente (SZDLEB.73) gelesen, um eine Datierung zu finden. Er nennt keine; er bestätigt drei unbenutzte Exemplare eines Aufdrucks.
7. Markup nicht von Hand eingefügt, sondern mit einem kleinen Node-Skript im Scratchpad: eine geordnete Liste aus (Wortlaut, Element, Attributen), jede Fundstelle nach der vorigen gesucht, mit Abbruch bei Nichtfund. Das hält die Transkription unangetastet und macht doppelte Namen (dreimal "New York", zweimal "Salzburg") eindeutig. Der Name über den Zeilenumbruch (`H~~amb~~[?]` / `Goetzfried`) steht mit Zeilenumbruch, Einrückung und `<lb/>` als ein Suchstring in der Liste.
8. `pruefe.mjs` einmal gelaufen, alle drei Dateien beim ersten Lauf erhalten, wohlgeformt und TEI-konform.
9. Um Werkzeugvorschläge belegen zu können, den Editor-Code gelesen (`js/source.js`, `js/state.js`, `js/place.js`, `js/gnd.js`, `js/dates.js`, `data/actions.json`) und `parseDate` an den Datumsausdrücken der drei Dokumente ausprobiert.
10. Entscheidungstabellen geschrieben und die Zeilennummern der nicht markierten Fälle per grep gegen die Datei geprüft (sechs Schätzungen mussten korrigiert werden).

## Aufwand

Rund 30 Werkzeugaufrufe. Die Annotation selbst war ein Skriptlauf. Die Zeit ging in dieser Reihenfolge an: Identifikation über lobid-gnd (Abwägen zwischen Kandidatensätzen, Prüfen der Einzelsätze, GeoNames aus `sameAs`), Lesen des Editor-Codes für die Verbesserungsvorschläge, Schreiben der Entscheidungstabellen. Ohne Skript, also mit Einzel-Edits pro Marke (39 Marken), wären es rund 40 weitere Aufrufe mit entsprechend höherem Risiko eines Zeichenfehlers gewesen.

## Schwierige Fälle

- **Fuchs (1222, Z. 68).** "Herrn Fuchs, der jetzt postenlos ist", soll im Verlag Reichner unterkommen. Das Register bietet Rudolf Fuchs (Prager Redakteur, 1935 nicht stellungslos belegt) und Emil Fuchs (Journalist, 1885–1959, GND ohne Biographie). Nichts im Text stützt einen von beiden; offen gelassen, Kandidat genannt.
- **Kultusgemeinde (1222, Z. 59).** Ohne Ortsangabe. Die Sekretärin sitzt in Wien, Zweigs Wohnsitz bis 1934 war Salzburg. Für Wien gäbe es GND 123152-2, für Salzburg keinen Satz. Offen gelassen.
- **Amerika (1222, Z. 50).** Wörtlich der Erdteil, gemeint nach Kontext die USA. Mit USA verknüpft (Inferenz, im Zweifel vermerkt).
- **Cards. (1437, Z. 108).** Zwei GND-Sätze für dasselbe Gebiet: 1023980-7 "Cardiganshire" (Variante "Cardiganshire / Council", also eher Verwaltungskörperschaft) und 4069856-7 "Ceredigion" (Variante "Cardiganshire"). Der geographische Satz gewählt. Keiner hat GeoNames.
- **Datum des Poststempels (152, Z. 49, 68).** Ein Datumsausdruck, der auf ein Datum ausserhalb des Textes verweist, das auf diesen unbenutzten Karten nie existiert hat. Nach der Regel ein Datum ohne Wert, also eine offene Stelle, die sich nie schliessen lässt. Ein Fenster 1919–1934 (Salzburger Jahre) wäre erschliessbar, datiert aber den Druck, nicht den Ausdruck; nicht gesetzt.
- **Werktitel aus Personennamen (1222, "Erasmus", zweimal "Maria Stuart").** Beide stehen im Register als Personen (SZDPER.364, SZDPER.905). Ein Register-Abgleich ohne Kontext hätte sie falsch als `persName` markiert. Nicht markiert, weil Werke auf die Werkstufe warten.
- **Postsparkasse (1222, Z. 61).** "per Postsparkasse einzuzahlen" ist eher Zahlungsweg als handelnde Körperschaft. Markiert mit dem zeitlich passenden Satz "Österreichisches Postsparkassenamt (Wien)"; der Satz "Österreichische Postsparkasse" gilt laut Gründungsangabe ab 1970.

## Regellücken in annotation.md

1. **Präposition im Datumsausdruck.** "around the expression as written" und das Beispiel `am 10.` lassen offen, ob "am", "im", "in" zum Element gehören. Entschieden: ausserhalb (`am <date>10.</date>`, `im <date>Herbst</date>`).
2. **Jahreszeiten.** "Herbst", "Spring 1944" haben keine Regel. Entschieden: meteorologisches Fenster mit `@notBefore`/`@notAfter`; `@cert="low"` nur, wenn das Jahr aus dem Briefdatum erschlossen ist.
3. **Daten in Beilagen und Gedichttiteln.** Gilt die Regel auch für Datumsangaben in literarischen Beilagen ("Ploughing 1944.", "D-Day June 6th. 1944.")? Entschieden: ja, markiert.
4. **Platzhalter-Daten in Vordrucken** ("Datum des Poststempels"). Die Regel erzeugt eine dauerhaft offene Stelle, die die Abnahme blockiert. Es braucht eine Form für "datierbar nur ausserhalb des Textes" (z. B. Wert ausdrücklich leer und entschieden).
5. **Werktitel, die Personennamen sind** ("Erasmus", "Maria Stuart"). Die Regel sagt nur, dass Periodika auf die Werkstufe warten; für Buchtitel aus Personennamen fehlt der ausdrückliche Satz "nicht als persName".
6. **Schiffe, Hotels, Hausnamen, Strassen, Postbezirke.** "Conte di Savoia" (Schiff), "Hotel Westminster" (als Firma markiert), "La Margolaine", "Bodwenog" (Hausnamen, nicht markiert), Strassen und "N.W.21" (nicht markiert). Keine Regel.
7. **Telegrammadressen und Codenamen von Körperschaften** ("Vikpress"). Nicht markiert; offen, ob das eine Nennung der Körperschaft ist.
8. **Ort mit GeoNames, aber ohne GND** (Llangranog). Die Regel nimmt GeoNames nur aus dem GND-`sameAs`; ein Ort ohne GND bleibt dadurch offen, obwohl er eindeutig identifizierbar ist.
9. **Konkurrierende GND-Sätze für ein Gebiet** (Cardiganshire/Ceredigion, Postsparkassenamt/Postsparkasse). Keine Vorgabe, ob der geographische oder der Körperschaftssatz, ob der zeitgenössische oder der heutige gilt.
10. **Personen, die nur über den Namen eines anderen erscheinen** ("Mrs Meyer Cohen"). Markiert als `persName` des Ehemanns ohne `@ref`; offen, ob diese Namensform überhaupt als Nennung des Mannes zählt.
11. **Mythologische und allegorische Orte** ("Styx", "Peaceful Lands"). Nicht markiert; die Regel nennt nur "named geographic features".
12. **Ortsnamen in fremder Sprachform** (Nice für Nizza). Unproblematisch, aber nirgends gesagt, dass dieselbe GND gilt.

## Abweichung zwischen Regel und Editor (beobachtet)

`annotation.md` sagt, eine Marke ohne `@ref` und ein Datum ohne Wert seien offene Stellen, die die Abnahme blockieren. Der Editor zählt sie nicht: o_szd.1437 (eine Person, ein Ort ohne `@ref`) und o_szd.152 (zwei Daten ohne Wert) zeigen "Bereit zur Abnahme", und o_szd.1222 zeigt dieselben 7 offenen Stellen wie das unannotierte Original (Testerwartung in `test/browser-check.mjs:221`), obwohl vier unverknüpfte Marken hinzugekommen sind. Ursache im Code: `openWorkFor` in `js/source.js:164` kennt nur HTR-Marker-Detektoren (`unresolved`, ab Z. 137, und `stray`), keinen Detektor für unverknüpfte Annotationen.

## Was ein Editor oder Werkzeug bieten müsste

1. **Unverknüpfte Marken als offene Stellen zählen** (`js/source.js:164`, `openWorkFor`): ein Detektor für `persName|placeName|orgName` ohne `@ref` und `date` ohne Datumswert, damit Regel und Arbeitsstand übereinstimmen und F8 sie anspringt.
2. **Organisationen als Aktion** (`data/actions.json`): es gibt Person, Ort, Datum, aber kein `orgName`; dazu eine Suche im SZD-Organisationsindex analog zum Personenregister (`js/register.js:39`, `searchRegister`).
3. **GeoNames aus dem GND-Satz übernehmen** (`js/gnd.js:43–49` verwirft `sameAs`; `js/place.js:35–38`, `chosenRef`, schreibt nur die GND): das Suchergebnis sollte die GeoNames-ID mitnehmen und `@ref` mit beiden Links schreiben, wie die Regel es verlangt.
4. **`@cert` im Datumsdialog** (`js/datedialog.js:11`, `FIELDS`, und die Datumsaktion in `data/actions.json` ohne `cert`): erschlossene Daten lassen sich im Editor nicht als `cert="low"` markieren.
5. **Datumsparser für die vorkommenden Formen** (`js/dates.js:52`, `RULES`): `parseDate` liefert für "27.6.44" nichts (zweistelliges Jahr, das die Regel ausschreiben lässt), für "June 6th. 1944" und "Spring 1944" nur das Jahr, für "am 10.", "in Februar", "im Herbst" nichts. Ein Vorschlag relativ zum Briefdatum aus dem Titel, mit `cert="low"`, würde die häufigsten Fälle abdecken.
6. **Kontextwarnung bei Register-Treffern, die Werktitel sein können**: Register-Einträge wie Erasmus von Rotterdam oder Maria Stuart, die zugleich Zweigs Buchtitel sind, sollten beim Markieren als möglicher Werktitel gekennzeichnet werden.
7. **Stapelvorschlag mit Bestätigung**: für den direkten Weg war das Entscheidende eine geordnete Liste (Wortlaut, Element, Ref) mit Abbruch bei Nichtfund. Ein Editor, der eine solche Liste importiert, Fundstellen einzeln zur Bestätigung zeigt und Herkunft (LLM-Vorschlag) vermerkt, verbände die Geschwindigkeit des direkten Wegs mit der Prüfung im Editor.

## Ausgabe von pruefe.mjs

```
{"file":"o_szd.1222.tei.xml","preserved":true,"header":true,"wellFormed":"Wohlgeformt","valid":"TEI-konform","state":"In Bearbeitung | 7 offene Stellen","marks":{"orgName":{"count":4,"open":1},"placeName":{"count":7,"open":0},"date":{"count":4,"open":0},"persName":{"count":8,"open":3}}}
{"file":"o_szd.1437.tei.xml","preserved":true,"header":true,"wellFormed":"Wohlgeformt","valid":"TEI-konform","state":"Bereit zur Abnahme | ","marks":{"placeName":{"count":3,"open":1},"date":{"count":4,"open":0},"persName":{"count":3,"open":1}}}
{"file":"o_szd.152.tei.xml","preserved":true,"header":true,"wellFormed":"Wohlgeformt","valid":"TEI-konform","state":"Bereit zur Abnahme | ","marks":{"persName":{"count":2,"open":0},"placeName":{"count":2,"open":0},"date":{"count":2,"open":2}}}
```
