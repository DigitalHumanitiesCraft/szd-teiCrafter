# o_szd.1222, Entscheidungen

Producer: unrevised LLM agent, through the editor (teiCrafter SZD, http://127.0.0.1:8000/, headless Chromium über Playwright). Brief an Anna Meingast, Nizza, 4. Januar 1935. Zeilen nach der Originaldatei in `szd-teiCrafter/data/`.

Abkürzungen: Personendialog = Auswahl, Strg+. und P; Ortsdialog = Auswahl, Strg+. und O; Datumsdialog = Auswahl, Strg+. und D; XML getippt = im XML-View von Hand getippt, weil der Editor keinen Weg bietet. GeoNames jeweils aus `sameAs` des lobid-gnd-Datensatzes (außerhalb des Editors per lobid-JSON gelesen), als `http://www.geonames.org/ID` in `@ref` getippt.

| Zeile | Text wie geschrieben | Element | @ref oder Datumswert | Wie gefunden | Zweifel |
|---|---|---|---|---|---|
| 36 | Nizza | placeName | http://d-nb.info/gnd/4075416-9 http://www.geonames.org/2990440 | Ortsdialog, Abfrage „Nizza“, erster Treffer Nizza (GND 4075416-9); GeoNames getippt | keiner |
| 36 | 4.Januar 1935 | date | when="1935-01-04" | Datumsdialog, Vorschlag 1935-01-04 übernommen | keiner |
| 39 | Meingast | persName | #SZDPER.1575 | Personendialog, Abfrage „Meingast“, erster Indextreffer Meingast, Anna | keiner |
| 42 | 10. | date | when="1935-01-10" cert="low" | Datumsdialog ohne Vorschlag, Wert getippt; @cert im XML getippt | Monat aus Briefdatum erschlossen (Abfahrt nach dem 4. Januar) |
| 43 | New York | placeName | http://d-nb.info/gnd/4042011-5 http://www.geonames.org/5128581 | Ortsdialog: „New York“ liefert die Stadt nicht unter den 8 Treffern, erst „New York, NY“ (Treffer 2); GeoNames getippt | keiner |
| 44 | Viking Press | orgName | http://d-nb.info/gnd/10102943-3 | XML getippt; GND per lobid-Suche (type CorporateBody) außerhalb des Editors, Viking Press, New York, gegr. 1925 | als Postadresse genannt, nicht handelnd; dennoch als Verlag markiert |
| 44 | New York | placeName | http://d-nb.info/gnd/4042011-5 http://www.geonames.org/5128581 | Ortsdialog, „New York, NY“; GeoNames getippt | keiner |
| 47 | New York | placeName | http://d-nb.info/gnd/4042011-5 http://www.geonames.org/5128581 | Ortsdialog, „New York, NY“; GeoNames getippt | Teil der Telegrammadresse „Vikpress New York“ |
| 50 | Amerika | placeName | http://d-nb.info/gnd/4078704-7 http://www.geonames.org/6252001 | Ortsdialog, Abfrage „USA“ statt „Amerika“, Treffer USA; GeoNames getippt | Text meint die USA; GND kennt auch den Kontinent Amerika (4001670-5) |
| 56 | Eugen Wolbe | persName | http://d-nb.info/gnd/117458201 | Personendialog: Index ohne Treffer; „Auch in der GND suchen“, Treffer Wolbe, Eugen, 1873–1938, Historiker | Identität aus Name, Titel und Berliner Adresse erschlossen |
| 56 | Berlin | placeName | http://d-nb.info/gnd/4005728-8 http://www.geonames.org/2950157 | Ortsdialog, „Berlin“, erster Treffer; GeoNames getippt | keiner |
| 57–58 | H~~amb~~[?] / Goetzfried | persName | ohne @ref (offen) | XML getippt, weil der Name über `<lb/>` läuft und das Menü Markup in der Auswahl ablehnt; GND „Goetzfried“ ohne passenden Treffer | Vorname unsicher gelesen, Person nicht identifiziert |
| 58 | Lob | persName | ohne @ref (offen) | Personendialog: Index nur Fehltreffer (Teilstring „lob“), GND Lob, Jacques u. a., keiner passt; Dialog verweigert Annotieren ohne Kennung, daher XML getippt | „Professor Lob“ in Nizza nicht identifiziert |
| 58 | Nice | placeName | http://d-nb.info/gnd/4075416-9 http://www.geonames.org/2990440 | Ortsdialog, Abfrage „Nizza“ statt „Nice“ („Nice“ liefert Nizza erst an 4. Stelle); GeoNames getippt | keiner |
| 59 | Kultusgemeinde | orgName | ohne @ref (offen) | XML getippt | welche Israelitische Kultusgemeinde (Wien oder Salzburg) bleibt offen; Salzburg hat keinen GND-Satz gefunden |
| 61 | Postsparkasse | orgName | http://d-nb.info/gnd/2029439-6 | XML getippt; lobid-Suche „Postsparkasse Wien“: Österreichisches Postsparkassenamt (Wien), Name seit 1926 laut Satz 2001451-X | historische Körperschaft 1935 aus den Vorgänger/Nachfolger-Angaben erschlossen |
| 65 | Reichner | persName | #SZDPER.2188 | Personendialog, Abfrage „Reichner“, einziger Indextreffer | keiner |
| 68 | Fuchs | persName | ohne @ref (offen) | Personendialog: Index Emil Fuchs (SZDPER.2122), Rudolf Fuchs (SZDPER.439); keiner belegbar; Dialog verweigert ohne Kennung, XML getippt | möglicher Kandidat Emil Fuchs, nicht belegt |
| 74 | Herbst | date | notBefore="1935-09" notAfter="1935-11" cert="low" | Datumsdialog, Form „unsicherer Zeitraum“, Werte getippt; @cert im XML getippt | Jahreszeit als Fenster; Regel nennt Jahreszeiten nicht |
| 91 | Stefan[?] | persName | #SZDPER.1560 | Personendialog: Abfrage „Stefan“ auf „Stefan Zweig“ ergänzt, erster Indextreffer | Unterschrift, [?] bleibt im Element |
| 95 | Februar | date | when="1935-02" cert="low" | Datumsdialog ohne Vorschlag, Wert getippt; @cert im XML getippt | Jahr aus Briefdatum |
| 99 | Relgis | persName | #SZDPER.1153 | Personendialog, Abfrage „Relgis“, einziger Indextreffer | keiner |

Nicht markiert: „Erasmus“, „Maria Stuart“ (Werktitel, Werkstufe); „Conte di Savoia“ (Schiff); „Hotel Westminster“ (Hotel als Absendeort, Regellücke); „Vikpress“ (Telegrammkürzel); Straßen und Villen (18 East, 48th Street; Dortmunderstr.11; La Margolaine; Avenue Primrose); „N.W.21“ (Postbezirk); „Agenten“, „Verlag“ (ohne Namen); „jetzt“, „zur Zeit“.
