---
title: Plan
project:
  name: teiCrafter SZD
  repository: https://github.com/DigitalHumanitiesCraft/szd-teiCrafter
status: active
language: en
created: 2026-10-30
updated: 2026-11-06
authors: [Christopher Pollin]
generated-with: Claude Code (Claude Opus 5.5)
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Plan
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/plan
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-plan
related: [specification, journal, testing, INDEX]
---

# Plan

This plan orders the work on the SZD editor in milestones, each with its deliverable, its verification and the point where the operator accepts it. Decisions taken along the way move into [specification](specification.md#decisions), completed transitions into [journal](journal.md).

## Target state

- An edition team works on the documents of the Stefan Zweig Digital collections in a shared repository, saves at any point and sees per document whether it is well-formed, valid, free of open spots and accepted.
- The annotation actions cover the open work in the HTR output and link persons to the edition's person index.
- The derivation contract is clear enough that the generic modules can move into the teiCrafter base and another edition can derive its editor by writing a source configuration.

## Projects in this work

- teiCrafter SZD, this repository, carries the milestones below.
- teiCrafter base (`ResearchTools/teiCrafter`) receives findings through its handoff and owns the derivation contract with its case register, milestone S6.
- Wenzelsbibel derivation (`wenzelsbibel-teiCrafter`) runs as its own project and only exchanges findings through handoffs.
- The vault mirrors the state in ACTIVE-WORK (entries Stefan Zweig Digital and teiCrafter) and in the teiCrafter hub, written back at each milestone close.

## How work is verified and accepted

Each milestone passes three checks in this order.

1. Automated check: `test/browser-check.mjs` gains a case for every promised behaviour and passes in full.
2. Independent review: a fresh agent receives the user tasks, the requirements and the running editor, without the implementer's verdict, drives it with pointer and keyboard and reports findings with screenshots. Material findings are fixed and rechecked before the operator sees the milestone.
3. Operator acceptance: a short acceptance list of tasks the operator performs in the running editor, in Chrome or Edge, closing with the result named in the milestone.

## Who decides what

- Settled without asking and reported afterwards: technical and reversible choices, fixes of observed defects, wording and layout within the design rules.
- Researched before asking: facts that live in the vault, the SZD repositories, GAMS or the web, such as reference forms, licences, existing registers or service behaviour. The person index of 2026-10-30 is the model case.
- Asked as one question with a recommendation: methodology and data authority, rights, what counts as finished, scope of a milestone, and every outward or irreversible action such as pushing, publishing or deleting.
- The operator stays in the loop at each milestone start (scope confirmed), after the independent review (findings and fixes reported) and at acceptance.

## Where to resume

On 2026-10-31 four LLM agents annotated nine documents in the trial run (ADR-015), the editor was changed after their findings, and proposals became reviewable one by one (ADR-016). All nine annotated objects lie as proposal files under `evidence/annotation/`, those of the direct and browser agents converted from their annotated copies with `tools/proposals-from-copy.mjs`. The steps follow from there.

1. Operator review of further letters. The calibration letter `o_szd.1222` was decided by the operator on 2026-10-31, and the reviewed letter and its review log lie in `evidence/review/o_szd.1222/`. The operator decided the disputed items one by one and confirmed the rest as a block after both agent checks, without checking each against the facsimile, so it is the first reference annotation with that reach. The proposals of the further letters are reviewed in the editor in the same way, saving TEI and review log.
2. Evaluation against the reference: precision, recall and correct links per entity type for each way of annotating, a second run of the browser and hybrid agents to measure what the editor changes removed, a run in which agents write proposal files only, with review time and acceptance rate from the review log, and the same task repeated and run on a smaller model for stability and cost.
3. Lookup quality. The card of a GND-linked person shows name and dates from lobid, the register search matches whole words or name beginnings instead of substrings (`Rom` finds unrelated persons today), a person hit that is also a work title is flagged, and the place ranking is measured again on the queries of the research of 2026-10-31.
4. Register report. Which person, organisation and place occurs in which documents, with contradicting links of the same name.
5. Refactoring with a measured need: one function that opens the dialog of an action instead of four branches in `docs/js/app.js`, one helper for card placement and one for downloads, `docs/js/person.js` renamed after what it holds, and the browser check split per run with a local stand-in for the GAMS manifest, whose slow answers cost reruns.
6. The trial run, set up by `tools/trial-run/setup.ps1` with its guide in `tools/trial-run/README.md`, which doubles as the operator acceptance of S1 and S2, and an independent review of the interface added on 2026-10-31 (review mode, organisation action, date dialog) in both colour schemes and at 900 px.
7. Action menu, documents dialog and actions dialog after the Human User's review, recorded verbatim in [design](design.md#requirements-from-the-human-user): standard icons, no visible key letters, the menu on one line, selections snapped to word boundaries, a definition for each state icon, „Sammlungen“ instead of „Collections“, and the actions dialog's labels, tooltips and primary button.
8. Project ODD. When SZD-split provides it, pin its generated RELAX NG and action catalogue, add the schema as first entry of `source.schemas`, and add the drift check against `docs/data/actions.json` (ADR-010, ADR-013, ADR-014). The rules of [annotation](annotation.md) become part of it, with Schematron where RELAX NG cannot express them.

## Milestones

Each milestone states its deliverable, the operator's acceptance task, its status, what is built and what is open. The open decisions that cut across milestones are listed under [open decisions and dependencies](#open-decisions-and-dependencies).

### S1 Editor core

- Deliverable: editing, checks, facsimile, person and marker annotation.
- Operator acceptance: annotate, save into the clone, `git diff` shows only the edits.
- Status: in progress.

Built: CodeMirror editor with checks for well-formedness and TEI All, IIIF facsimile following the caret, action menu with HTR marker actions and F8 queue, person annotation against the SZD person index, saving in place with unsaved-work protection. The browser check passes, and the findings of the independent review of 2026-10-30 are fixed.

Open: operator acceptance with a real save into a clone of this repository, in the trial run.

### S2 Visible state and safe round trip

- Deliverable: state ladder, save always possible, overwrite and conflict protection.
- Operator acceptance: interrupt work in a broken state, reopen, see the state, finish.
- Status: in progress.

Scope:

- The state ladder of ADR-006 and ADR-008 shown in the header, in the save confirmation and as the colour and label of the check buttons.
- Overwrite protection: before writing, the editor rereads the file and warns when it changed on disk since opening, for instance after a pull.
- Changes since opening as a comparison view before a commit.
- Git conflict markers recognised and explained as two versions of one passage.
- Accepting a document, possible only when the machine conditions hold, written into the TEI.

Built on 2026-10-30: changes since opening as a line comparison, Git conflict markers explained in the problem list, overwrite protection with a question dialog that also replaced the browser's confirm before discarding unsaved work, each with browser cases. Later the same day the state ladder as a badge in the header (FR-15), acceptance into `revisionDesc` offered only in the ready state (FR-16, ADR-011), and unsaved work marked on the save button.

After the refactoring of the interface code into modules (ADR-002), the browser check follows the badge from not validated through ready and accepted to changed since, acceptance into a missing, an existing and an empty `revisionDesc`, and the unsaved dot, see [testing](testing.md#what-is-guaranteed).

An adversarial review of the save path on 2026-10-30 found data-loss and corruption risks, all fixed with regression checks and recorded as [data safety guarantees](specification.md#data-safety-guarantees). A save keeps its document while another is chosen, undo stays within the open document, only UTF-8 opens and a byte order mark survives, a download keeps the text unsaved, write permission comes before the disk comparison and a change while the write stream opens aborts it, inserted line breaks follow the file and mixed endings stay, acceptance waits for the pending check and only reaches a real `revisionDesc`, and a validation result belongs to its exact text. The fast unit tests under `test/unit/` run before the browser check.

The save confirmation names the working state since 2026-10-31, and a document changed since its acceptance is saved as in progress.

Open: a browser case for saving a malformed document, see [testing](testing.md#gaps), and the operator acceptance in the trial run.

### S3 Collections and project page

- Deliverable: SZD collections with per-document state, switching, partner guide.
- Operator acceptance: find unfinished documents of each collection and work through one.
- Status: in progress.

Scope:

- The four collections of the holdings (correspondence, life documents, works, essay files) as folders under `docs/data/`, imported from szd-htr.
- A project page listing per collection the documents with title, signature, pages and state, filterable by state, opening a document in the editor with a way back.
- Collection-specific element suggestions where the TEI profiles differ, and existing `standOff` persons shown and checked against the index.
- A link to the version history of the open file on the Git platform and a short partner guide in the README.

Built on 2026-10-30: the working set in one folder per collection, imported byte-exact with provenance by `tools/import-working-set.mjs` (ADR-009, ADR-010), and the document list (FR-14) over the generated `docs/data/index.json` with search, collection and state filters, per-document pages, open spots and state tag, and the accepted count per collection. Opening starts at the first page break (FR-17), and wrapped lines hang under their own indentation (FR-18).

The browser check covers the list with search, collection chip, state filter and the question before switching, the start at the first page break, the hanging indent, and every working-set document loading well-formed from the list, and it fails when `docs/data/index.json` is stale.

The documents dialog was revised on 2026-10-30 after the Human User's feedback, with collections from `source.collections` used by the dialog and both tools, a chip that explains how a collection is set up, concept tooltips from `docs/js/concepts.js`, state icons with accessible names, a formal count line per collection, the last search selected on reopening and Escape closing at once. His further points on it are resume step 7.

The shelf mark is a field of the index and searchable since 2026-10-31, and the README carries a partner guide.

Open: rebuilding the index without a manual step after state changes, collection-specific element suggestions, `standOff` persons shown and checked against the index, and the version-history link.

### S4 Editorial rule layer

- Deliverable: project rules for remaining markers and person references.
- Operator acceptance: a document the check calls clean has no open work.
- Status: in progress.

Built: annotation rules for persons, organisations, places and dates in [annotation](annotation.md), since 2026-10-31, with unlinked marks counted as open work and actions for all four.

Open:

- Discussing the annotation rules with the szd team on the annotated example letters.
- Actions for the open-work kinds without an encoding rule yet, the gap `[...]`, the standalone `[?]` and the bracketed HTR remarks such as `[Randnotiz links:]`, which may become `gap`, `note`, `del`, `add` or a signature encoding. Until then F8 selects them and the menu names the open rule.
- The default attributes of `add`, `del` and `unclear`, and German framing for parser and schema messages.

### S5 Publication and partner trial

- Deliverable: the public repository `DigitalHumanitiesCraft/szd-teiCrafter` served with GitHub Pages from the `docs/` folder, and a partner working through Git.
- Operator acceptance: the partner's commits arrive and are correct.
- Status: pending.

Built: the remote repository exists and is private. On 2026-11-06 the operator decided that it becomes public and is served with GitHub Pages from `docs/`, and the application moved there (`docs/index.html`, `docs/css/`, `docs/js/`, `docs/data/`, `docs/schemas/`, `docs/vendor/`), while `tools/`, `test/`, `knowledge/` and `evidence/` stay at the root.

Open:

- Public delivery of the transcriptions and registers under `docs/data/` is covered by CC BY 4.0, as `docs/data/IMPORT.md`, `docs/data/NOTICE.md` and `docs/data/register/NOTICE.md` record with attribution to Stefan Zweig Digital.
- Facsimile images are only loaded live from GAMS and never delivered with the site or committed, which is also why screenshots of the evidence stay out of Git.
- The operator makes the repository public and enables Pages.
- A project partner works on a set of documents through clone, edit, commit and push.

### S6 Derivation contract in the base

- Deliverable: case register and contract in teiCrafter.
- Operator acceptance: the base names what any derivation must hold.
- Status: pending, with the handoff in the base since 2026-10-30.

Open: `knowledge/derivation.md` in the teiCrafter base with the two observed derivation forms, the inherited invariants, the integration traps and the checks every derivation runs, as requested in the base handoff.

## Later

These items are accepted as direction and not yet placed in a milestone.

- A quiet working-state display beyond the badge: a count line of persons, places, organisations and dates with their unlinked share, a strip per facsimile page, and the counts in the document list.
- Works as a fourth entity against the SZD work index, and the letter metadata of SZD-split's `correspDesc` shown beside the body for comparison.
- Scaling. Assigning documents to persons, a way to the next open document, and performance on very large documents, where the longest works of the working set are the test case.
- Documents beyond the size limit of NFR-05. Opening a large document is fast, while every check after a typing pause and every edit in the text view work on the whole text. Research items, each to be measured with `test/size-check.mjs`:
  - Live well-formedness from the incremental syntax tree CodeMirror already keeps, with the full parse only on demand.
  - Open work counted only in the changed lines instead of the whole text.
  - Text view decorations built for the visible part only.
  - Parse and open work moved into the worker, with results that may arrive a moment later.
  - Editing one section of a very large document at a time, cut out by its offsets and spliced back byte-exact, as the teiCrafter base edits by offset splices.
  - Where the browser stops altogether, namely the memory of one tab and the address space of WebAssembly, which bounds validation inside the worker.

## Open decisions and dependencies

- For SZD-split: the project ODD has to allow `@resp` and `respStmt` as ADR-016 writes them, with a Schematron rule that every `@resp` token resolves, and the register errors listed in [data](data.md#limits) await correction there.
- The import scope and the authoritative place (ADR-010), the place of the working state and the withdrawal of a stale acceptance (ADR-011) are built as reversible defaults and await the operator's confirmation. Who may accept, and how the acceptance names that person, belongs to S4.
- The editorial rules for `add`, `del`, `unclear` and `gap`, and the annotation rules of 2026-10-31, are discussed with the project partners on example letters, before S4 closes.
- Whether partners are asked to use Chrome or Edge, the browsers that write files in place, before S5.
- Whether the narrow view gets a switch between text and facsimile, proposed by the usability review because stacked panes separate a passage from its image, before S5.
- Whether auto-closing tags stay, since the base requires that typing inserts exactly the typed characters, before S5.
- The text view was decided by the Human User on 2026-10-30 and built as ADR-012. Its remaining form questions are the resume steps above.
- The merge of the SZD-split header with the body corrected here, and where it runs, depends on SZD-split and the project ODD (ADR-010).
- Whether acceptance requires the project schema once it exists, or whether a result against the TEI All fallback still suffices (ADR-014).
- Whether derivations stay build-free with vendored bundles or move to the Vite stack of the base, before S6. ADR-003 keeps both open.
