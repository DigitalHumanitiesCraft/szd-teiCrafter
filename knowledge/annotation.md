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
