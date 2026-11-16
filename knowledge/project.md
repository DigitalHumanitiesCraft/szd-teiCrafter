---
title: Project
project:
  name: teiCrafter SZD
  repository: https://github.com/DigitalHumanitiesCraft/szd-teiCrafter
status: draft
language: en
created: 2026-10-30
updated: 2026-11-16
authors: [Christopher Pollin]
generated-with: Claude Code (Claude Opus 5.5)
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Projekt-Wissensdokument
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/project
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-project
knowledge-sources:
  institutions:
    Literaturarchiv Salzburg: https://stefanzweig.digital
    GAMS, University of Graz: https://gams.uni-graz.at
    German National Library (GND): https://www.dnb.de/gnd
  standards:
    TEI P5: https://tei-c.org/guidelines/p5/
    IIIF Presentation API: https://iiif.io/api/presentation/
    IIIF Image API: https://iiif.io/api/image/
related: [specification, data, design]
---

# Project

teiCrafter SZD is a browser editor in which a researcher corrects and annotates the TEI of documents from the Stefan Zweig Digital collections next to their facsimile. It is developed as the working editor of that project and is the first lean derivation that tests whether teiCrafter can be adapted to one edition through a single configuration file.

## Data basis

The working material is machine-generated TEI from the szd-htr pipeline, which transcribes Stefan Zweig Digital objects with an LLM (Large Language Model) and leaves structure and transcription unreviewed. The documents fall into four collections of the holdings, and the example letter `o_szd.1222` carries the typical open work, uncertain readings, deletions, handwritten additions and unidentified persons. Facsimiles stay at GAMS and are loaded through IIIF, and person identifiers come from the edition's person index, with the GND for persons outside it. Sources, licences and encoding are described in [data](data.md).

## Context

teiCrafter is DHCraft's browser tool for TEI work. Its base repository holds the generic tool, and editions derive their own editor from it. The Wenzelsbibel editor is the first, larger derivation. teiCrafter SZD starts small and on freely licensed material, so that the derivation pattern can be shown and discussed without rights questions.

## What it is about

Editing a digital edition means closing the gap between a machine transcription and an encoded, checked text. The editor supports this as a working environment with source and image side by side, live well-formedness, validation against TEI All and annotation actions that write correct TEI. Research data and editor live in one Git repository, so that team members divide documents, commit their work and exchange it through GitHub or a self-hosted GitLab without a server of their own.

## Research use

The editor is also a case for the operator's research on agent-based edition workflows, continuing the experiment on the writings of Jeanne Hersch reported in the SIDE contribution the operator is writing with a co-author from the Zentralbibliothek Zürich. That contribution divides entity annotation between deterministic rules, an AI agent and a person's verification. teiCrafter SZD adds the tool as a further variable, which turns the division into configurations that can be compared:

| Configuration | Decides | Writes the markup | Checks |
|---|---|---|---|
| Deterministic (Hersch, stage 1) | rule and entity list | matcher | tests, then a person |
| Tool alone | person | editor actions | editor checks, person |
| Agent with tool | agent | editor actions | editor checks, then a person |
| Agent directly in TEI | agent | agent | shared check, then a person |

The agent run of 2026-10-31 compared the last two (ADR-015). On the calibration letter four agents agreed on all but three marks, which shows stability under one model, rule set and source set, not correctness. A person's review of the proposals (ADR-016) is the next evidence, and an agent run on the Hersch data with review in its curation frontend would carry the comparison back to the original experiment, subject to the co-author's consent.

## What the project has learned

- Agreement among several agents that run on the same LLM shows that a result is stable under that LLM, rule set and source set. Whether the result is correct is decided by a person who reads it against the facsimile, and acceptance records that judgement ([ADR-006](specification.md#adr-006-definition-of-done-and-two-working-states), [ADR-015](specification.md#adr-015-an-agentic-layer-beside-the-editor)). The LLM agent of the working session drew this from the run of 2026-10-31, in which four LLM agents agreed on all but three marks of the calibration letter `o_szd.1222`, and two LLM checks that agreed on every merged item both found a mark none of the four runs had proposed, so the journal records their agreement as machine evidence that accepts nothing ([journal](journal.md#2026-10-31-agent-annotation-run-and-the-editor-changes-it-called-for), [journal](journal.md#2026-10-31-neutral-check-of-the-calibration-letter), [ADR-016](specification.md#adr-016-proposals-are-reviewed-one-by-one-with-the-review-recorded-in-resp)).
- An agent needs no integration of its own in an editing tool when it works through the interface a person has, the files in Git, the rules in the knowledge base and the machine checks that run outside the browser ([ADR-015](specification.md#adr-015-an-agentic-layer-beside-the-editor), Rationale). The four LLM agents of 2026-10-31 worked this way, some editing the TEI directly and some driving the editor headless, and the gaps all of them met in the editor were then closed in the editor itself ([journal](journal.md#2026-10-31-agent-annotation-run-and-the-editor-changes-it-called-for)). The operator named these agents an optional agentic layer beside the editor, and the working session recorded the rationale in ADR-015.
- A hit in a person register does not by itself decide that a passage names a person. The person index of Stefan Zweig Digital lists names that also stand for Zweig's works, such as `Erasmus` and `Maria Stuart`, and its substring search finds persons for place names and common words such as `Rom` and `August` ([data](data.md#limits)). The persons rule in [annotation](annotation.md#persons) draws the consequence for names of works, which wait for the works stage, and neither document records who found these cases.

### Shared with sibling projects

Two sibling projects drew the same core lesson independently of this one, namely that a result which looks consistent can still be wrong and that only an independent check at the source or by a person shows it. In Klawiter-Rescue (`chpollin/klawiter-rescue`) a value stood in its source and still came from the wrong passage, unnoticed by single tests, and agent judgements have since counted only as proposals. In CorrespExplorer (`DigitalHumanitiesCraft/CorrespExplorer`) views that looked plausible hid reading errors of the parser, which only an independent recount at the source uncovered. These statements about the two projects come from a reading of their knowledge folders on 2026-11-16 and have not been checked here.

## Standards

- Encoding: TEI P5, validated against the strictest available schema, the project schema generated from the ODD once it exists and TEI All 4.11.0 as the fallback.
- Facsimiles: IIIF Presentation API 2 and 3 for manifests, IIIF Image API for deep zoom.
- Persons: entries of the Stefan Zweig Digital person index in `persName/@ref`, GND URIs for persons outside it.
- Versioning and exchange: Git, with research data under `docs/data/` kept byte-exact (no line-ending conversion).

Each standard keeps the edited files usable outside the editor. A file saved by the editor stays plain TEI that any XML tool reads, and the facsimile and person links resolve without it.

## Technical realisation

The editor is a static web page without a build step. Generic modules handle the code editor (CodeMirror 6, vendored as one bundle), TEI reading, IIIF resolution, the facsimile viewer (OpenSeadragon), validation (libxml2 compiled to WebAssembly) and GND search. Everything specific to Stefan Zweig Digital sits in the source configuration `docs/js/source.js`. The reasons for this cut are recorded in [specification](specification.md#decisions).

## Scope of functions

- TEI source editing with highlighting, line numbers, folding, search, element suggestions and code zoom.
- A facsimile that follows the caret from page break to page break.
- Person annotation against the Stefan Zweig Digital person index, with the GND as fallback.
- Checks for well-formedness and validity against TEI All.
- Saving back into the opened file in every state, with protection against overwriting and a comparison before a commit.
- A document list per collection with search, filters and the working state of each document, and acceptance recorded in the TEI.

The detailed requirements are in [specification](specification.md).

The machine transcription is shown as it is. The editor marks nothing as reviewed and makes no judgement on transcription quality, so every correction and annotation is a human decision recorded in the file and in Git.

## Terms

The constitutive terms, derivation and source configuration among them, are defined in [INDEX](INDEX.md#terms).

## Licence

Code is under MIT (`LICENSE`). The TEI documents are CC BY 4.0 with attribution to Stefan Zweig Digital, Literaturarchiv Salzburg (`docs/data/NOTICE.md`, `docs/data/IMPORT.md`). Vendored libraries and the TEI schema keep their own licences, each documented in its `NOTICE.md`.
