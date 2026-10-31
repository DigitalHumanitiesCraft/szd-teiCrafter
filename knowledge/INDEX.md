---
title: Index
project:
  name: teiCrafter SZD
  repository: https://github.com/DigitalHumanitiesCraft/szd-teiCrafter
status: draft
language: en
version: 0.1
created: 2026-10-30
updated: 2026-10-31
authors: [Christopher Pollin]
generated-with: Claude Code (Claude Opus 5.5)
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Index
  version: 0.4
  url: https://dhcraft.org/Promptotyping/promptotyping-document/index
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-index
related: [project, specification, data, design, testing, plan, handoff, journal]
---

# Index

This knowledge base describes teiCrafter SZD, a browser editor for TEI documents of the Stefan Zweig Digital collections with an IIIF facsimile beside the source, and the first lean derivation of teiCrafter. The shared document schema version is kept here once (`version` above), and the other documents inherit it.

## Documents

| Path | Function | Routing question | Updated |
|---|---|---|---|
| [project](project.md) | Charter | What is this editor, for whom, on which material? | when identity or scope changes |
| [specification](specification.md) | Specification | What must the editor do, and which decisions shape it? | when a requirement or decision changes |
| [data](data.md) | Material | What do the documents, the facsimile service, the person index and the GND deliver? | when a source or the encoding changes |
| [design](design.md) | Design | How does the interface look and behave? | when the design system or an interaction pattern changes |
| [testing](testing.md) | Quality Assurance | What is checked, how, and what stays unchecked? | when a check is added or its scope changes |
| [plan](plan.md) | Planning | What comes next, in which order? | when a step is accepted, done or reordered |
| [handoff](handoff.md) | Handoff | Which received inputs await integration? | when an input arrives or is processed |
| [journal](journal.md) | Provenance | What was decided, corrected or changed, and why? | after each coherent transition |

The action layer is [CLAUDE.md](../CLAUDE.md) in the repository root.

## Storage zones

- `knowledge/` holds these documents.
- `data/` holds the research data, the TEI files edited with the tool in one folder per collection, with their provenance in `data/IMPORT.md`, the generated document index and the person index, each third-party object with a `NOTICE.md`.
- `tools/` holds the Node scripts that import the working set and build the document and person indexes.
- `vendor/` and `schemas/` hold vendored third-party code and the TEI schema, each with its `NOTICE.md`.
- `test/` holds the browser check and its only dependency.

## Reading paths

- Session start: INDEX → [handoff](handoff.md) → [plan](plan.md) → the document for the task.
- Changing editor behaviour: [specification](specification.md#decisions) → [design](design.md) → [testing](testing.md).
- Deriving an editor for another edition: [specification](specification.md#adr-002-generic-modules-and-one-source-configuration) → [project](project.md#technical-realisation) → `js/source.js`.

## Convention

This knowledge base follows the Promptotyping Documents convention, mirrored at https://dhcraft.org/Promptotyping/#konvention-v0.1.

## Terms

### Action registry

The file `data/actions.json`, which lists the annotation actions of the edition with element, attributes, dialog, views and the HTR marker each resolves. The menu, the dialogs, the open-work count and the settings view „Aktionen“ read it, see ADR-013 in the specification.

### Collection

A group of documents of the Stefan Zweig Digital holdings with a common TEI profile, namely correspondence, life documents, works and essay files, kept as a folder under `data/`.

### Derivation

An editor built for one edition from the generic teiCrafter modules plus a source configuration. teiCrafter SZD and the Wenzelsbibel editor are derivations.

### Document index

The generated list `data/index.json` of the documents per collection with title, pages, open spots and working state, from which the editor builds its document list without reading every file. `tools/build-document-index.mjs` rebuilds it, see [data](data.md#sources).

### GAMS

Geisteswissenschaftliches Asset Management System of the University of Graz, the repository that publishes Stefan Zweig Digital objects, their images and their IIIF manifests.

### GND

Gemeinsame Normdatei of the German National Library. The editor writes a GND URI into `persName/@ref` for persons outside the person index, and the index itself carries GND links where it has them.

### Person index

The register of persons of Stefan Zweig Digital, GAMS object `o:szd.personen`, whose entries carry identifiers of the form `SZDPER.n`. Annotations point to its entries, see ADR-007 in the specification.

### Schema list

The schemas of the source configuration, ordered strictest first, against which the editor validates the first one that loads. The project schema is the RELAX NG generated from the edition's ODD, and TEI All is the fallback, see ADR-014 in the specification.

### Source configuration

The file `js/source.js`. It holds everything specific to one edition, such as where facsimiles come from, the collections, the text view settings, the person and place references, the path of the action registry and the schema list.

### SZD

Stefan Zweig Digital, the digital edition of the Literaturarchiv Salzburg whose collections this editor works on.

### Text view

The presentation of the open document without visible markup, on the same editor state as the XML view, in lines or flowing paragraphs, see ADR-012 in the specification.

### Working set

The selection of documents imported from szd-htr into this repository, about ten per collection chosen for the variety of their TEI profiles, listed with reasons in `tools/working-set.json` and with provenance in `data/IMPORT.md`. From the import on, this repository is authoritative for their transcription body and SZD-split for their header and catalogue description, see ADR-010 in the specification.

### Working state

Where a document stands on the way to finished, from not well-formed through well-formed, valid and free of open spots to accepted. Saving is possible in every state, and the state is shown. Only in progress and accepted are stored, in `revisionDesc/@status`, and the steps between are computed by the editor. A document saved after a change since its acceptance is stored as in progress again, see ADR-006, ADR-008 and ADR-011 in the specification.
