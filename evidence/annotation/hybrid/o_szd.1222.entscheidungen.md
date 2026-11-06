# Entscheidungen o_szd.1222

Brief an Anna Meingast, Nizza, 4. Januar 1935 (Kalibrierbrief). Erzeuger: unrevidierter LLM-Agent (Claude Opus 5.5), angewendet über den Editor teiCrafter SZD, Review durch denselben Agenten im Editor; keine menschliche Prüfung. Regeln: szd-teiCrafter/knowledge/annotation.md. Vorschläge: o_szd.1222.vorschlaege.json, Anwendungsprotokoll: o_szd.1222.anwendung.json, Review-Korrekturen: o_szd.1222.korrekturen.json.

| Zeile | Text | Element | Wert | Grundlage | Weg im Editor | Review |
|---|---|---|---|---|---|---|
| 36 | Hotel Westminster | orgName | @ref http://d-nb.info/gnd/1259093344 | GND 1259093344 (Hôtel Westminster, Nizza). Zweifel: Hotel als Firma ausgelegt; Briefkopfangabe, nicht Teil des Fließtexts. | getippt (keine orgName-Aktion) | übernommen |
| 36 | Nizza | placeName | @ref http://d-nb.info/gnd/4075416-9 http://www.geonames.org/2990440 | GND 4075416-9 (Nizza), GeoNames aus sameAs | Menü + Ortsdialog, GeoNames getippt | übernommen |
| 36 | 4.Januar 1935 | date | @when 1935-01-04 | im Text: Datumszeile | Menü + Datumsdialog | übernommen |
| 39 | Meingast | persName | @ref #SZDPER.1575 | Personenindex SZDPER.1575 (Meingast, Anna (1881-05-13–1953-11-17)) | Menü + Personendialog | übernommen |
| 42 | 10. | date | @when 1935-01-10, @cert low | erschlossen: Tag ohne Monat, Monat und Jahr aus dem Briefdatum 1935-01-04 | Menü + Datumsdialog, @cert getippt | übernommen |
| 43 | New York | placeName | @ref http://d-nb.info/gnd/4042011-5 http://www.geonames.org/5128581 | GND 4042011-5 (New York, NY), GeoNames aus sameAs | Menü + Ortsdialog, GeoNames getippt | übernommen |
| 44 | Viking Press | orgName | @ref http://d-nb.info/gnd/10102943-3 | Organisationsindex SZDORG.61; GND 10102943-3 (Viking Press, New York) | getippt (keine orgName-Aktion) | übernommen |
| 44 | New York | placeName | @ref http://d-nb.info/gnd/4042011-5 http://www.geonames.org/5128581 | GND 4042011-5 (New York, NY), GeoNames aus sameAs | Menü + Ortsdialog, GeoNames getippt | übernommen |
| 47 | New York | placeName | @ref http://d-nb.info/gnd/4042011-5 http://www.geonames.org/5128581 | GND 4042011-5 (New York, NY), GeoNames aus sameAs. Zweifel: Teil der Telegrammadresse „Vikpress New York“; als Ortsnennung markiert. | Menü + Ortsdialog, GeoNames getippt | übernommen |
| 50 | Amerika | placeName | @ref http://d-nb.info/gnd/4078704-7 http://www.geonames.org/6252001 | GND 4078704-7 (USA), GeoNames aus sameAs. Zweifel: „Amerika“ meint hier die USA (Reiseziel New York); alternativ GND 4001670-5 Amerika (Kontinent, ohne GeoNames). | Menü + Ortsdialog, GeoNames getippt | übernommen |
| 56 | Eugen Wolbe | persName | @ref http://d-nb.info/gnd/117458201 | GND 117458201 (Wolbe, Eugen (1873–1938), Historiker, Lehrer, Publizist, Wirkungsort Berlin) | Menü + Personendialog | übernommen |
| 56 | Berlin | placeName | @ref http://d-nb.info/gnd/4005728-8 http://www.geonames.org/2950157 | GND 4005728-8 (Berlin), GeoNames aus sameAs | Menü + Ortsdialog, GeoNames getippt | übernommen |
| 57 | H~~amb~~[?] | Goetzfried | persName | ohne @ref (offen) | nicht identifiziert. Zweifel: Vorname unsicher gelesen (H~~amb~~[?]); weder im Index noch in der GND identifizierbar. | getippt (über Zeilenumbruch) | übernommen |
| 58 | Lob | persName | ohne @ref (offen) | nicht identifiziert. Zweifel: „Professor Lob“ in Nizza; weder im Index noch in der GND gefunden. | getippt (Person ohne @ref) | übernommen |
| 58 | Nice | placeName | @ref http://d-nb.info/gnd/4075416-9 http://www.geonames.org/2990440 | GND 4075416-9 (Nizza), GeoNames aus sameAs | Menü + Ortsdialog, GeoNames getippt | übernommen |
| 59 | Kultusgemeinde | orgName | @ref http://d-nb.info/gnd/123152-2 | GND 123152-2 (Israelitische Kultusgemeinde Wien). Zweifel: Welche Kultusgemeinde gemeint ist, sagt der Text nicht; Wien aus dem Wohnort der Sekretärin erschlossen, Salzburg ist möglich. | getippt (keine orgName-Aktion) | geändert: Der Text nennt nur „die Kultusgemeinde“; Wien ist aus dem Wohnort der Sekretärin erschlossen, Salzburg bleibt möglich. Eine falsche Verknüpfung wiegt schwerer als eine offene Stelle, daher ohne @ref. |
| 61 | Postsparkasse | orgName | @ref http://d-nb.info/gnd/2001451-X | GND 2001451-X (Österreichische Postsparkasse). Zweifel: Österreichische Postsparkasse aus dem Kontext (Zahlung durch die Wiener Sekretärin) erschlossen. | getippt (keine orgName-Aktion) | übernommen |
| 65 | Reichner | persName | @ref #SZDPER.2188 | Personenindex SZDPER.2188 (Reichner, Herbert (1899-03-04–1971)) | Menü + Personendialog | übernommen |
| 68 | Fuchs | persName | ohne @ref (offen) | nicht identifiziert. Zweifel: Im Index stehen Fuchs, Rudolf (SZDPER.439) und Fuchs, Emil (SZDPER.2122); der Text („postenlos“, Aufnahme in den Verlag) entscheidet nicht. | getippt (Person ohne @ref) | übernommen |
| 74 | Herbst | date | @notBefore 1935-09, @notAfter 1935-11, @cert low | erschlossen: Jahreszeit, Jahr aus dem Briefdatum; Herbst als September bis November. Zweifel: Die Regeln nennen Jahreszeiten nicht; Fenster gewählt. | Menü + Datumsdialog, @cert getippt | übernommen |
| 91 | Stefan[?] | persName | @ref #SZDPER.1560 | Personenindex SZDPER.1560 (Zweig, Stefan (1881-11-28–1942-02-23)) | Menü + Personendialog | übernommen |
| 95 | Februar | date | @when 1935-02, @cert low | erschlossen: Monat ohne Jahr, Jahr aus dem Briefdatum | Menü + Datumsdialog, @cert getippt | übernommen |
| 99 | Relgis | persName | @ref #SZDPER.1153 | Personenindex SZDPER.1153 (Relgis, Eugen (1895–1987)) | Menü + Personendialog | übernommen |

## Bewusst nicht ausgezeichnet

| Zeile | Text | Grund |
|---|---|---|
| 42 | Conte di Savoia | Schiffsname; die Regeln kennen keine Schiffe. |
| 44 | 18 East, 48th Street | Straßenadresse; Straßen sind keine Orte im Sinn der Regeln. |
| 47 | Vikpress | Telegrammkennung des Verlags, kein Name einer Körperschaft im Text. |
| 55 | Erasmus | Werktitel (Buch), Werke sind eine spätere Stufe. |
| 56 | Dortmunderstr.11 | Straßenadresse. |
| 58 | La Margolaine, Avenue Primrose | Villen- und Straßenname. |
| 68 | Verlag | Gattungswort, kein Name. |
| 80 | Maria Stuart | Werktitel (Buch), nicht die Person. |
| 84 | Maria Stuart | Werktitel (Buch), nicht die Person. |
| 100 | Lesung durch den Geist | Werktitel (vermutlich HTR-Fehler für „Heilung durch den Geist“). |
