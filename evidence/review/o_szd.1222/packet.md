# Prüfpaket o_szd.1222

Dieses Paket legt die Annotationsvorschläge des Probelaufs vom 31. Oktober 2026 für den Brief Stefan Zweigs an Anna Meingast vom 4. Januar 1935 (o_szd.1222, SZ-SAM/B7.52) zur unabhängigen Prüfung vor. Jedes Item ist eine Textstelle, an der mindestens ein Vorschlag eine Auszeichnung angesetzt hat, mit allen dafür vorgeschlagenen Varianten als Kandidaten. Von wem ein Kandidat stammt, wie oft er vorgeschlagen wurde und mit welcher Begründung, enthält das Paket bewusst nicht.

## Auftrag

Prüfe jedes Item gegen die Transkription, das Faksimile und die Annotationsregeln und entscheide es auf eine von drei Arten.

- `accept` mit der Kennung eines Kandidaten (`c1`, `c2`), wenn dieser Kandidat nach Text, Faksimile und Regeln richtig ist, Element und alle Attribute eingeschlossen.
- `reject`, wenn die Stelle nach den Regeln unmarkiert bleiben soll oder wenn kein Kandidat richtig ist. Hältst du ein anderes Element oder eine andere Kennung für richtig, nenne sie im Feld `suggested`.
- `open`, wenn Text, Faksimile, Regeln und die zugänglichen Register die Frage nicht entscheiden. Der Grund nennt, was fehlt.

Zu jeder Entscheidung gehören ein Satz Begründung und die Regel oder Quelle, auf die sie sich stützt, etwa `annotation.md, Organisations, Satz 3` oder `https://lobid.org/gnd/123152-2.json`. Ein Kandidat ohne `@ref` bedeutet eine Auszeichnung, die nach den Regeln als offene Stelle zählt. Ihn anzunehmen heißt, dass die Stelle markiert werden soll und sich nach deiner Prüfung nicht verknüpfen lässt. Stellen, die nach den Regeln markiert werden müssten und in der Itemliste fehlen, trägst du unter `missing` ein.

Die Reihenfolge der Kandidaten ist mechanisch (Element, dann ohne vor mit `@ref`, dann nach Attributwert) und sagt nichts über ihre Güte.

### Was nicht gelesen wird

Die Prüfung stützt sich nur auf dieses Paket und die unten genannten Quellen. Nicht geöffnet werden `provenance.json` in diesem Ordner, der Ordner `annotation/` dieses Probelaufs mit Arbeitskopien, Vorschlagsdateien, Entscheidungsprotokollen und Logs der annotierenden Agenten, und die Ergebnisdateien anderer Prüfender in diesem Ordner.

### Ergebnis

Schreibe das Ergebnis als `check-<kennung>.json` in diesen Ordner, wobei `<kennung>` die dir zugewiesene Kennung ist, und ändere sonst keine Datei. Das Ergebnis ist die Prüfung durch einen LLM-Agenten (Large Language Model) und ersetzt die Entscheidung einer Person nicht. Es setzt deshalb kein `@resp`, schreibt kein TEI und verwendet weder die Wörter `reviewer`, `review` oder `accepted` als Feldnamen noch erklärt es eine Stelle für geprüft im Sinn der Editionsregeln.

```json
{
  "document": "o_szd.1222",
  "checker": { "kind": "llm-agent", "label": "<kennung>" },
  "items": [
    { "item": "o_szd.1222.i01", "decision": "accept", "candidate": "c2", "reason": "…", "basis": "annotation.md, Organisations, Satz 3" },
    { "item": "o_szd.1222.i16", "decision": "open", "reason": "…", "basis": "…" },
    { "item": "o_szd.1222.i17", "decision": "reject", "reason": "…", "basis": "…", "suggested": { "element": "orgName", "attributes": { "ref": "http://d-nb.info/gnd/…" } } }
  ],
  "missing": [
    { "line": 0, "text": "…", "element": "…", "reason": "…", "basis": "…" }
  ]
}
```

Die Beispielzeilen zeigen nur das Format, keine Entscheidung. Jedes Item der Liste erhält genau einen Eintrag.

## Quellen

### Transkription

Die Transkription ist `C:\Users\Chrisi\Documents\GitHub\szd-teiCrafter\data\o_szd.1222.tei.xml` (SHA-256 `5809b5bec61e5c9622497d60f427ba5279412c4f983c27aeedf47d68cfe02ddf`, Zeilenenden LF). Sie ist eine unrevidierte HTR-Transkription aus der szd-htr-Pipeline, Marker wie `~~…~~`, `[?]` und `{…}` gehören zum Text. Die Offsets der Items zählen UTF-16-Codeeinheiten ab dem Dateianfang, die Zeilennummern beziehen sich auf dieselbe Datei. Der Textteil lautet:

```xml
 31    <text>
 32      <body>
 33        <div type="document" n="o_szd.1222">
 34        <pb n="1" facs="#surf_1"/>
 35        <p>
 36          <lb/>Hotel Westminster                                Nizza, den 4.Januar 1935.
 37        </p>
 38        <p>
 39          <lb/>Liebe Frau Meingast!
 40        </p>
 41        <p>
 42          <lb/>Vor allem erinnere ich daran, dass ich am 10. mit dem Conte
 43          <lb/>di Savoia nach New York fahre. Drüben ist meine Adresse selbst-
 44          <lb/>verständlich die Viking Press, New York, 18 East, 48th Street.
 45          <lb/>Da ich aber noch nicht gewiss bin, so lange drüben zu bleiben,
 46          <lb/>bis Post mir nachkommen kann, bringe ich für alle Fälle in Er-
 47          <lb/>innerung, dass die Telegrammadresse Vikpress New York lautet
 48          <lb/>und wichtigere Dinge allenfalls per Nachtbrief (nightletter)
 49          <lb/>hinübertelegraphiert werden können. Im allgemeinen geben Sie
 50          <lb/>bei allen Briefen jetzt Auskunft, dass ich zur Zeit in Amerika
 51          <lb/>bin und eine Beantwortung vor längerer Frist nicht zu erwarten
 52          <lb/>ist.
 53        </p>
 54        <p>
 55          <lb/>Ein Exemplar des Erasmus wollen Sie freundlichst senden an
 56          <lb/>Professor Dr. Eugen Wolbe, Berlin N.W.21, Dortmunderstr.11. Und
 57          <lb/>wenn ich es noch nicht geschrieben habe, ein Exemplar an Dr. H~~amb~~[?]
 58          <lb/>Goetzfried bei Professor Lob, La Margolaine, Avenue Primrose, Nice.
 59          <lb/>Den Brief an die Kultusgemeinde lege ich bei und ich bitte {sende ich selbst}
 60          <lb/>nur gleichwertig[?] 
 61          <lb/>Sie, dann den Betrag per Postsparkasse einzuzahlen.
 62        </p>
 63        <p>
 64          <lb/>Ich möchte Sie noch informieren, damit Sie ungefähr wissen,
 65          <lb/>was vorgeht. Herr Reichner hat unglückseligerweise (das sage ich
 66          <lb/>Ihnen privat) in seiner Kleinlichkeit eine Reihe von Wünschen {wenn ich ihm meine Bücher gebe}
 67          <lb/>nicht erfüllt, die ich an ihn als Bedingung stellte, so unter an-
 68          <lb/>derm, dass er Herrn Fuchs, der jetzt postenlos ist, in den Verlag
 69          <lb/>aufnimmt. Ich habe darum alles gestoppt, solange er nicht restlos
 70        </p>
 71        <pb n="2" facs="#surf_2"/>
 72        <p>
 73          <lb/>die Bedingungen erfüllt und wahrscheinlich kann das Buch erst im
 74          <lb/>Herbst erscheinen. Ich werde Sie also bitten, weiteres Manuskript
 75          <lb/>nur auszufolgen, wenn ich Ihnen dazu telegraphische Order gegeben
 76          <lb/>habe.
 77        </p>
 78        <p>
 79          <lb/>Zum zweiten möchte ich Sie informieren, dass ich jetzt in
 80          <lb/>ziemlich aussichtsreichen Verhandlungen bin, Maria Stuart für Vor-
 81          <lb/>abdrucke, Uebersetzungen, soweit sie noch nicht vergeben sind und
 82          <lb/>überhaupt alle Vertriebsangelegenheiten einem sehr grossen und {damit all das von mir abfällt}
 83          <lb/>tüchtigen Agenten zu übergeben. Ich bitte also alle Anfragen auf
 84          <lb/>Maria Stuart zunächst dahin zu beantworten, dass eine Entscheidung
 85          <lb/>vorerst nicht getroffen werden kann.
 86        </p>
 87        <p>
 88          <lb/>Mit besten Grüssen Ihr
 89        </p>
 90        <p>
 91          <lb/>Stefan[?]
 92        </p>
 93        <p>
 94          <lb/>Ihre Gehalt lauft natürlich voll weiter, solange noch so
 95          <lb/>viel zu tun ist. Wir besprechen dann alles in Februar durch,
 96          <lb/>ich sehe noch nicht was weiter geschieht
 97        </p>
 98        <p>
 99          <lb/>Herr Relgis habe ich, bitte eintragen, Autorisation für
100          <lb/>Lesung durch den Geist erteilt
101        </p>
102        </div>
103      </body>
104    </text>
```

### Faksimile

Das IIIF-Presentation-Manifest des Objekts ist `https://gams.uni-graz.at/o:szd.1222/sdef:IIIF/getManifest`. Es hat zwei Canvases, deren Bilder als IIIF Image API Level 2 unter `https://gams.uni-graz.at/iiif/o:szd.1222%2FIMG.1` (Seite 1, Zeilen 34–70) und `https://gams.uni-graz.at/iiif/o:szd.1222%2FIMG.2` (Seite 2, Zeilen 71–101) liegen. Ein lesbares Gesamtbild liefert etwa `https://gams.uni-graz.at/iiif/o:szd.1222%2FIMG.1/full/1200,/0/default.jpg`, Ausschnitte die Region im Pfad (`/x,y,w,h/`). Die Größe nennt `info.json` des jeweiligen Bildes.

### Annotationsregeln

Maßgeblich ist `C:\Users\Chrisi\Documents\GitHub\szd-teiCrafter\knowledge\annotation.md` im Stand von Commit `759795c` (Blob `6455584`). Dieser Stand enthält die mit Commit `eef6fb3` eingeführten Regeln zu Hotels, Gattungswörtern und konkurrierenden GND-Sätzen. Die Datei steht hier unverändert:

````markdown
# Annotation

The rules by which persons, places, organisations and dates are marked in the transcription body. They follow the conventions of the Stefan Zweig Digital holdings where those exist (SZD-split `knowledge/data-model.md` and `collections.md`), and record the operator's choices of 2026-10-31 where they do not, including the cases that the first annotation run by LLM agents left open. They are a first stage that a project ODD with Schematron will take over (ADR-010). Works, letter metadata and LLM suggestions are later stages in [plan](plan.md).

## Scope

The rules apply inside `text/body`, enclosures and poems included. The header, including `correspDesc`, belongs to SZD-split and stays untouched. Annotation inserts markup only: every character of the transcription, HTR marker syntax included, stays where it is, so removing the inserted tags gives back the file byte for byte.

A name is marked for what the passage refers to. When the evidence does not settle which entity that is, for instance two register candidates that the letter does not tell apart, the mark stays without `@ref` and the candidates go into the record of the decision.

## Persons

- Element `persName` around the name as written, inflected forms included (`Zweigs`). Forms of address and titles (`Herr`, `Frau`, `Dr.`) stay outside, as in the editor's search.
- Every naming is marked, in salutation, signature and running text. Pronouns and bare kinship terms are not.
- A person named through another, such as `Mrs Meyer Cohen`, is marked on the name as written and linked to the person meant.
- A person's name standing for a work (`Erasmus` and `Maria Stuart` as Zweig's books) is not a person and waits for the works stage. The person index lists several such names, so a register hit alone does not decide.
- `@ref` points to the SZD person index as `#SZDPER.n`. A person outside the index gets the GND as `http://d-nb.info/gnd/ID`, check character in upper case.
- A person who cannot be identified stays without `@ref`. That counts as an open spot and blocks acceptance until someone links it or decides otherwise.

## Organisations

- Element `orgName` for publishers, firms, institutions, associations and editorial offices acting as bodies.
- A generic word (`die Kultusgemeinde`, `den Verlag`) is marked only where the context makes one body unambiguous.
- A hotel is marked only where it acts as a body. As an address or place of stay it is not marked in this stage.
- A periodical named as a title waits for the works stage. Ships and telegram addresses are not marked.
- `@ref` is the GND of the entry in the SZD organisation index, or `https://gams.uni-graz.at/o:szd.organisation#SZDORG.n` for an entry without a GND, then the GND for a body outside the index. Without either it is an open spot like a person.
- Of competing GND records, the one whose dates cover the time of the document is chosen.

## Places

- Element `placeName` for settlements, countries, regions and named geographic features.
- Not marked in this stage are streets, addresses, postal districts, buildings and estates, a place inside an organisation name or used as an adjective (`Wiener`), and mythological or allegorical places.
- A place is linked for what is meant. `Amerika` for the United States is linked to the United States, and the doubt goes into the record of the decision.
- `@ref` holds the GND and, where known, GeoNames, separated by a space: `http://d-nb.info/gnd/4066009-6 http://www.geonames.org/2761367` for Wien. The GeoNames id is taken from the `sameAs` of the GND record at lobid-gnd, which gives it as `https://sws.geonames.org/ID`, and written in the form of the holdings. The holdings have no place index and only one written rule, GeoNames, so both links are kept until SZD decides.
- A place without a GND record gets GeoNames alone. Of a geographic record and the record of the administrative body, the geographic one is chosen unless the body is meant.
- A place that cannot be identified stays without `@ref` and counts as an open spot.

## Dates

- Element `date` around the date expression, without a preceding preposition or article (`am`, `im`, `le`). A noun that carries the month stays with it (`mois d'Octobre`).
- The value is ISO 8601 in `@when` (`1931`, `1931-05`, `1931-05-10`), `@from` and `@to` for a span, `@notBefore` and `@notAfter` for a window.
- A two-digit year is written out (`'31` as `1931`).
- A date that the text leaves incomplete or relative (`am 10.`, `8.Oktober`, `Montag`, `gestern`) is inferred from the date of the letter and marked `@cert="low"`. A season is a window of its meteorological months (spring March to May, summer June to August, autumn September to November, winter December to February), with `@cert="low"` when the year is inferred.
- A date that cannot be inferred stays without a value and counts as an open spot.
- Not marked are times of day, durations, adjectives such as `heutig`, event names such as `D-Day`, and the placeholders of printed forms such as `Datum des Poststempels`.

## Line breaks and open spots

A name or date broken across lines is marked as one element containing the `lb`. HTR marker syntax inside a name (`~~…~~`, `[?]`) stays inside the element and remains an open spot of its own.

## Producer

Who produced an annotation is part of its evidence. An LLM agent delivers its annotations as a proposal file beside the working copy, never as markup in `data/`, and a person decides each proposal in the editor (ADR-016). The encoding follows the provenance contract of zbz-ocr-tei (decision E131 there): `@resp` names the activities that produced a mark as pointers to `respStmt` declarations in `titleStmt`, and `@cert` keeps its meaning of an inferred date.

```xml
<!-- proposed by an agent and accepted by a person -->
<persName ref="#SZDPER.2188" resp="#resp-agent-annotation #resp-editor-review">Reichner</persName>
<!-- a person's own annotation, also a proposal the person changed before accepting -->
<persName ref="http://d-nb.info/gnd/117458201">Eugen Wolbe</persName>
```

Run metadata, the basis of each proposal, candidate lists and rejected proposals stay in the proposal file and the review log, see [data](data.md#proposal-files).
````

### Register und Normdaten ohne Zugangsdaten

- SZD-Personenindex als lokale Kopie `C:\Users\Chrisi\Documents\GitHub\szd-teiCrafter\data\register\szd-persons.json` (Quelle `https://gams.uni-graz.at/o:szd.personen/TEI_SOURCE`, abgerufen 2026-10-30). Ein Eintrag trägt `id` (`SZDPER.n`), `name`, `gnd`, `dates` und Suchformen.
- SZD-Organisationsindex als lokale Kopie `C:\Users\Chrisi\Documents\GitHub\szd-teiCrafter\data\register\szd-organisations.json` (Quelle `https://gams.uni-graz.at/o:szd.organisation/TEI_SOURCE`, abgerufen 2026-10-31), mit `id` (`SZDORG.n`), `name`, `gnd` und Ortsangabe.
- GND über lobid-gnd, öffentlich und ohne Schlüssel. Ein Datensatz liegt unter `https://lobid.org/gnd/<GND-ID>.json` und enthält Ansetzung, Varianten, Gründungs- und Auflösungsdaten, Vorgänger und Nachfolger sowie unter `sameAs` die GeoNames-Kennung als `https://sws.geonames.org/<ID>`. Die Suche lautet `https://lobid.org/gnd/search?q=<Begriff>&format=json`, eingegrenzt etwa mit `&filter=type:CorporateBody`.
- GeoNames wird über das `sameAs` des GND-Satzes erreicht und in der Form `http://www.geonames.org/<ID>` geschrieben. Die GeoNames-API verlangt ein Benutzerkonto und gehört deshalb nicht zu den Quellen.

Anfragen an öffentliche Dienste enthalten nur den Suchbegriff oder die Kennung, keine personenbezogenen Daten, keine E-Mail-Adresse und keine Kennungen der prüfenden Instanz.

## Items

Die Liste steht maschinenlesbar mit denselben Kennungen in `items.json`. Die Angabe „Ansetzung“ ist die Vorzugsbenennung des Registers oder der GND zur jeweiligen Kennung, beim Bau des Pakets nachgeschlagen und nicht gegen den Brief geprüft.

### o_szd.1222.i01

Zeile 36, Offsets 1096–1113, Vorkommen 1

```text
Hotel Westminster
```

- c1: `<orgName>`
- c2: `<orgName ref="http://d-nb.info/gnd/1259093344">`
  - `http://d-nb.info/gnd/1259093344`, GND, Ansetzung „Hôtel Westminster“
- Zu den Alternativen gehört auch, die Stelle unmarkiert zu lassen. Diese Entscheidung lautet `reject`.

### o_szd.1222.i02

Zeile 36, Offsets 1145–1150, Vorkommen 1

```text
Nizza
```

- c1: `<placeName ref="http://d-nb.info/gnd/4075416-9 http://www.geonames.org/2990440">`
  - `http://d-nb.info/gnd/4075416-9`, GND, Ansetzung „Nizza“
  - `http://www.geonames.org/2990440`, GeoNames

### o_szd.1222.i03

Zeile 36, Offsets 1156–1169, Vorkommen 1

```text
4.Januar 1935
```

- c1: `<date when="1935-01-04">`

### o_szd.1222.i04

Zeile 39, Offsets 1216–1224, Vorkommen 2

```text
Meingast
```

- c1: `<persName ref="#SZDPER.1575">`
  - `#SZDPER.1575`, SZD person index, Ansetzung „Meingast, Anna“

### o_szd.1222.i05

Zeile 42, Offsets 1302–1305, Vorkommen 1

```text
10.
```

- c1: `<date when="1935-01-10" cert="low">`

### o_szd.1222.i06

Zeile 43, Offsets 1348–1356, Vorkommen 1

```text
New York
```

- c1: `<placeName ref="http://d-nb.info/gnd/4042011-5 http://www.geonames.org/5128581">`
  - `http://d-nb.info/gnd/4042011-5`, GND, Ansetzung „New York, NY“
  - `http://www.geonames.org/5128581`, GeoNames

### o_szd.1222.i07

Zeile 44, Offsets 1427–1439, Vorkommen 1

```text
Viking Press
```

- c1: `<orgName ref="http://d-nb.info/gnd/10102943-3">`
  - `http://d-nb.info/gnd/10102943-3`, SZD organisation index SZDORG.61, Ansetzung „Viking Press“

### o_szd.1222.i08

Zeile 44, Offsets 1441–1449, Vorkommen 2

```text
New York
```

- c1: `<placeName ref="http://d-nb.info/gnd/4042011-5 http://www.geonames.org/5128581">`
  - `http://d-nb.info/gnd/4042011-5`, GND, Ansetzung „New York, NY“
  - `http://www.geonames.org/5128581`, GeoNames

### o_szd.1222.i09

Zeile 47, Offsets 1683–1691, Vorkommen 3

```text
New York
```

- c1: `<placeName ref="http://d-nb.info/gnd/4042011-5 http://www.geonames.org/5128581">`
  - `http://d-nb.info/gnd/4042011-5`, GND, Ansetzung „New York, NY“
  - `http://www.geonames.org/5128581`, GeoNames

### o_szd.1222.i10

Zeile 50, Offsets 1915–1922, Vorkommen 1

```text
Amerika
```

- c1: `<placeName ref="http://d-nb.info/gnd/4078704-7 http://www.geonames.org/6252001">`
  - `http://d-nb.info/gnd/4078704-7`, GND, Ansetzung „USA“
  - `http://www.geonames.org/6252001`, GeoNames

### o_szd.1222.i11

Zeile 56, Offsets 2137–2148, Vorkommen 1

```text
Eugen Wolbe
```

- c1: `<persName ref="http://d-nb.info/gnd/117458201">`
  - `http://d-nb.info/gnd/117458201`, GND, Ansetzung „Wolbe, Eugen“

### o_szd.1222.i12

Zeile 56, Offsets 2150–2156, Vorkommen 1

```text
Berlin
```

- c1: `<placeName ref="http://d-nb.info/gnd/4005728-8 http://www.geonames.org/2950157">`
  - `http://d-nb.info/gnd/4005728-8`, GND, Ansetzung „Berlin“
  - `http://www.geonames.org/2950157`, GeoNames

### o_szd.1222.i13

Zeile 57, Offsets 2261–2296, Vorkommen 1

```text
H~~amb~~[?]
        <lb/>Goetzfried
```

- c1: `<persName>`

### o_szd.1222.i14

Zeile 58, Offsets 2311–2314, Vorkommen 1

```text
Lob
```

- c1: `<persName>`

### o_szd.1222.i15

Zeile 58, Offsets 2348–2352, Vorkommen 1

```text
Nice
```

- c1: `<placeName ref="http://d-nb.info/gnd/4075416-9 http://www.geonames.org/2990440">`
  - `http://d-nb.info/gnd/4075416-9`, GND, Ansetzung „Nizza“
  - `http://www.geonames.org/2990440`, GeoNames

### o_szd.1222.i16

Zeile 59, Offsets 2384–2398, Vorkommen 1

```text
Kultusgemeinde
```

- c1: `<orgName>`
- c2: `<orgName ref="http://d-nb.info/gnd/123152-2">`
  - `http://d-nb.info/gnd/123152-2`, GND, Ansetzung „Israelitische Kultusgemeinde Wien“

### o_szd.1222.i17

Zeile 61, Offsets 2517–2530, Vorkommen 1

```text
Postsparkasse
```

- c1: `<orgName ref="http://d-nb.info/gnd/2001451-X">`
  - `http://d-nb.info/gnd/2001451-X`, GND, Ansetzung „Österreichische Postsparkasse“
- c2: `<orgName ref="http://d-nb.info/gnd/2029439-6">`
  - `http://d-nb.info/gnd/2029439-6`, GND, Ansetzung „Österreichisches Postsparkassenamt (Wien)“

### o_szd.1222.i18

Zeile 65, Offsets 2669–2677, Vorkommen 1

```text
Reichner
```

- c1: `<persName ref="#SZDPER.2188">`
  - `#SZDPER.2188`, SZD person index, Ansetzung „Reichner, Herbert“

### o_szd.1222.i19

Zeile 68, Offsets 2936–2941, Vorkommen 1

```text
Fuchs
```

- c1: `<persName>`

### o_szd.1222.i20

Zeile 74, Offsets 3206–3212, Vorkommen 1

```text
Herbst
```

- c1: `<date notBefore="1935-09" notAfter="1935-11" cert="low">`

### o_szd.1222.i21

Zeile 91, Offsets 4028–4037, Vorkommen 1

```text
Stefan[?]
```

- c1: `<persName ref="#SZDPER.1560">`
  - `#SZDPER.1560`, SZD person index, Ansetzung „Zweig, Stefan“

### o_szd.1222.i22

Zeile 95, Offsets 4188–4195, Vorkommen 1

```text
Februar
```

- c1: `<date when="1935-02" cert="low">`

### o_szd.1222.i23

Zeile 99, Offsets 4296–4302, Vorkommen 1

```text
Relgis
```

- c1: `<persName ref="#SZDPER.1153">`
  - `#SZDPER.1153`, SZD person index, Ansetzung „Relgis, Eugen“
