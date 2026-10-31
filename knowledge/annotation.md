# Annotation

The rules by which persons, places, organisations and dates are marked in the transcription body. They follow the conventions of the Stefan Zweig Digital holdings where those exist (SZD-split `knowledge/data-model.md` and `collections.md`), and record the operator's choices of 2026-10-31 where they do not. They are a first stage that a project ODD with Schematron will take over (ADR-010). Works, letter metadata and LLM suggestions are later stages in [plan](plan.md).

## Scope

The rules apply inside `text/body`. The header, including `correspDesc`, belongs to SZD-split and stays untouched. Annotation inserts markup only: every character of the transcription, HTR marker syntax included, stays where it is, so removing the inserted tags gives back the file byte for byte.

## Persons

- Element `persName` around the name as written, inflected forms included (`Zweigs`). Forms of address and titles (`Herr`, `Frau`, `Dr.`) stay outside, as in the editor's search.
- Every naming is marked, in salutation, signature and running text. Pronouns and bare kinship terms are not.
- `@ref` points to the SZD person index as `#SZDPER.n`. A person outside the index gets the GND as `http://d-nb.info/gnd/ID`, check character in upper case.
- A person who cannot be identified stays without `@ref`. That counts as an open spot and blocks acceptance until someone links it or decides otherwise.

## Organisations

- Element `orgName` for publishers, firms, institutions, associations and editorial offices acting as bodies. A periodical named as a title waits for the works stage.
- `@ref` is the GND, or `https://gams.uni-graz.at/o:szd.organisation#SZDORG.n` for a body without a GND, spelled as in the organisation index. Without either it is an open spot like a person.

## Places

- Element `placeName` for settlements, countries, regions and named geographic features. A place inside an organisation name or used as an adjective (`Wiener`) is not marked in this stage.
- `@ref` holds the GND and, where known, GeoNames, separated by a space: `http://d-nb.info/gnd/4066009-6 http://www.geonames.org/2761367` for Wien. The GeoNames id is taken from the `sameAs` of the GND record at lobid-gnd, which gives it as `https://sws.geonames.org/ID`, and written in the form of the holdings. The holdings have no place index and only one written rule, GeoNames, so both links are kept until SZD decides.
- A place that cannot be identified stays without `@ref` and counts as an open spot.

## Dates

- Element `date` around the expression as written, with an ISO 8601 value in `@when` (`1931`, `1931-05`, `1931-05-10`), `@from` and `@to` for a span, `@notBefore` and `@notAfter` for a window.
- A two-digit year is written out (`'31` as `1931`).
- A date that the text leaves incomplete or relative (`am 10.`, `Montag`, `gestern`) is inferred from the date of the letter and marked `@cert="low"`. A date that cannot be inferred stays without a value and counts as an open spot.
- Times of day and durations are not marked.

## Line breaks and open spots

A name or date broken across lines is marked as one element containing the `lb`. HTR marker syntax inside a name (`~~…~~`, `[?]`) stays inside the element and remains an open spot of its own.

## Producer

Who produced an annotation is part of its evidence. Until the editor shows LLM suggestions as such, annotations produced by an LLM agent stay in a working copy outside `data/`, with a record of each decision and its basis, and enter the holdings only after a person has reviewed them.
