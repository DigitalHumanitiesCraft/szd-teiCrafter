---
title: Data
project:
  name: teiCrafter SZD
  repository: https://github.com/DigitalHumanitiesCraft/szd-teiCrafter
status: draft
language: en
created: 2026-10-30
updated: 2026-10-30
authors: [Christopher Pollin]
generated-with: Claude Code (Claude Opus 5.5)
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Datengrundlage
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/data
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-data
knowledge-sources:
  institutions:
    Stefan Zweig Digital: https://stefanzweig.digital
    GAMS: https://gams.uni-graz.at
  vocabularies:
    GND: https://d-nb.info/gnd/
    lobid-gnd: https://lobid.org/gnd
related: [project, specification]
---

# Data

The editor works on letters of Stefan Zweig Digital in machine-generated TEI, with facsimiles from GAMS and person identifiers from the GND.

## Subject

The material is Stefan Zweig's correspondence as held by the Literaturarchiv Salzburg. The example letter `o_szd.1222` is a typed business letter to his secretary in Vienna, dated Nice, 4 January 1935, signature SZ-SAM/B7.52, with handwritten additions and a postscript.

## Sources

- TEI letter: `data/o_szd.1222.tei.xml`, copied from `results/korrespondenzen/` of the szd-htr repository. The szd-htr pipeline transcribed the page images with gemini-3.1-flash-lite-preview into Page-JSON and converted that into TEI. Its header states that structure and transcription are unreviewed. Licence CC BY 4.0 per Stefan Zweig Digital, attribution in `data/NOTICE.md`.
- Facsimile: the IIIF Presentation 2 manifest `https://gams.uni-graz.at/o:szd.1222/sdef:IIIF/getManifest`, whose canvases point to IIIF Image API level 2 services under `https://gams.uni-graz.at/iiif/`. GAMS answers with permissive CORS headers. Images are not copied into the repository.
- Persons: the GND through the lobid-gnd search API, queried only when the user searches.

## Model

The TEI follows the szd-htr conversion. `teiHeader` carries the title and `idno[@type="objectId"]` (`o_szd.NNNN`), `facsimile` holds one `surface` per page with a `graphic/@url` to the GAMS image, and `text/body/div[@type="document"]` holds paragraphs with `lb` and a `pb[@facs]` per page.

The HTR (Handwritten Text Recognition) output marks open editorial work in plain text rather than in elements:

- `~~…~~` for a deletion, the later `del`.
- `[?]` after an uncertain reading, the later `unclear`.
- `{…}` for a handwritten addition, the later `add`.

The editor adds `persName` with a GND URI in `@ref`.

## Limits

The transcription is unreviewed LLM output and contains reading errors. Because the HTR markers are plain text, validation against TEI All cannot see them, so a valid document may still hold open work. Persons without a GND record have no identifier source yet.

## Authority data and links

- GND URIs in `persName/@ref`, form `https://d-nb.info/gnd/{id}`.
- IIIF manifests derived from the object id by `source.manifestFor` in `js/source.js`.

## Examples

```xml
<pb n="2" facs="#surf_2"/>
<p>
  <lb/>Herr <persName ref="https://d-nb.info/gnd/1057079499">Relgis</persName> habe ich, bitte eintragen, Autorisation für
  <lb/>Lesung durch den Geist erteilt
</p>
```
