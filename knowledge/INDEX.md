---
title: Index
project:
  name: teiCrafter SZD
  repository: https://github.com/DigitalHumanitiesCraft/szd-teiCrafter
status: draft
language: en
version: 0.1
created: 2026-10-30
updated: 2026-10-30
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

This knowledge base describes teiCrafter SZD, a browser editor for TEI letters of Stefan Zweig Digital with an IIIF facsimile beside the source, and the first source-specific derivation of the teiCrafter idea. The shared document schema version is kept here once (`version` above), and the other documents inherit it.

## Documents

| Path | Function | Routing question | Updated |
|---|---|---|---|
| [project](project.md) | Charter | What is this editor, for whom, on which material? | when identity or scope changes |
| [specification](specification.md) | Specification | What must the editor do, and which decisions shape it? | when a requirement or decision changes |
| [data](data.md) | Material | What do the letter, the facsimile service and the GND deliver? | when a source or the encoding changes |
| [design](design.md) | Design | How does the interface look and behave? | when the design system or an interaction pattern changes |
| [testing](testing.md) | Quality Assurance | What is checked, how, and what stays unchecked? | when a check is added or its scope changes |
| [plan](plan.md) | Planning | What comes next, in which order? | when a step is accepted, done or reordered |
| [handoff](handoff.md) | Handoff | Which received inputs await integration? | when an input arrives or is processed |
| [journal](journal.md) | Provenance | What was decided, corrected or changed, and why? | after each coherent transition |

The action layer is [CLAUDE.md](../CLAUDE.md) in the repository root.

## Storage zones

- `knowledge/` holds these documents.
- `data/` holds the research data, the TEI files edited with the tool, each third-party object with a `NOTICE.md`.
- `vendor/` and `schemas/` hold vendored third-party code and the TEI schema, each with its `NOTICE.md`.
- `test/` holds the browser check and its only dependency.

## Reading paths

- Session start: INDEX → [handoff](handoff.md) → [plan](plan.md) → the document for the task.
- Changing editor behaviour: [specification](specification.md#decisions) → [design](design.md) → [testing](testing.md).
- Deriving an editor for another edition: [specification](specification.md#adr-002-generic-modules-and-one-source-configuration) → [project](project.md#technical-realisation) → `js/source.js`.

## Convention

This knowledge base follows the Promptotyping Documents convention, mirrored at https://dhcraft.org/Promptotyping/#konvention-v0.1.

## Terms

### Derivation

An editor built for one edition from the generic teiCrafter modules plus a source configuration. teiCrafter SZD and the Wenzelsbibel editor are derivations.

### GAMS

Geisteswissenschaftliches Asset Management System of the University of Graz, the repository that publishes Stefan Zweig Digital objects, their images and their IIIF manifests.

### GND

Gemeinsame Normdatei of the German National Library, the authority file whose identifiers the editor writes into `persName/@ref`.

### Source configuration

The file `js/source.js`. It holds everything specific to one edition, such as where facsimiles come from, which elements the editor suggests and how an annotation is written.

### SZD

Stefan Zweig Digital, the digital edition of the Literaturarchiv Salzburg whose letters this editor works on.
