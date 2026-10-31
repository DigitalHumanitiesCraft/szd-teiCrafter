---
title: Plan
project:
  name: teiCrafter SZD
  repository: https://github.com/DigitalHumanitiesCraft/szd-teiCrafter
status: active
language: en
created: 2026-10-30
updated: 2026-10-31
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

On 2026-10-31 four LLM agents annotated working copies of nine documents in the trial run by the rules of [annotation](annotation.md), directly in TEI, through the editor and in a hybrid way (ADR-015). Their findings drive the first steps, and the operator's trial run follows them.

1. Agent run evaluated. The four results compared on the calibration letter `o_szd.1222`, mark by mark, and the cost and failure of each way recorded, as material for the paper section the operator plans.
2. Proposal import and review, built on 2026-10-31 (ADR-016, FR-26). Next: a run in which the agents write proposal files in the format of [data](data.md#proposal-files) instead of annotated copies, reviewed by the operator in the editor, and the card of a GND-linked person showing name and dates from lobid instead of the identifier alone.
3. Dates from the letter date. The date dialog proposes values for incomplete and relative expressions from the document's own date, marked uncertain, and reads the forms the working set holds, such as two-digit years, English and French dates and seasons.
4. Marking across a line break in the text view, linking all occurrences of a name in one step, and a warning when a person hit can be a work title.
5. Register report. Which person, organisation and place occurs in which documents, with contradicting links of the same name, and register errors handed to SZD-split.
6. Operator review of the agent results in the editor, the step that verifies them, then the trial run, which doubles as the operator acceptance of S1 and S2.
7. Action menu, documents dialog and actions dialog after the Human User's review, recorded verbatim in [design](design.md#requirements-from-the-human-user): standard icons, no visible key letters, the menu on one line, selections snapped to word boundaries, a definition for each state icon, „Sammlungen“ instead of „Collections“, and the actions dialog's labels, tooltips and primary button.
8. Project ODD. When SZD-split provides it, pin its generated RELAX NG and action catalogue, add the schema as first entry of `source.schemas`, and add the drift check against `data/actions.json` (ADR-010, ADR-013, ADR-014). The rules of [annotation](annotation.md) become part of it, with Schematron where RELAX NG cannot express them.

## Milestones

| Milestone | Deliverable | Operator acceptance |
|---|---|---|
| S1 Editor core | editing, checks, facsimile, person and marker annotation | annotate, save into the clone, `git diff` shows only the edits |
| S2 Visible state and safe round trip | state ladder, save always possible, overwrite and conflict protection | interrupt work in a broken state, reopen, see the state, finish |
| S3 Collections and project page | SZD collections with per-document state, switching, partner guide | find unfinished documents of each collection and work through one |
| S4 Editorial rule layer | project rules for remaining markers and person references | a document the check calls clean has no open work |
| S5 Publication and partner trial | remote repository, Pages, a partner working through Git | the partner's commits arrive and are correct |
| S6 Derivation contract in the base | case register and contract in teiCrafter | the base names what any derivation must hold |

### S1 Editor core

Built: CodeMirror editor with checks for well-formedness and TEI All, IIIF facsimile following the caret, action menu with HTR marker actions and F8 queue, person annotation against the SZD person index, saving in place with unsaved-work protection. The independent review of 2026-10-30 ran and its findings are fixed.

Open: operator acceptance with a real save into the clone of this repository.

### S2 Visible state and safe round trip

- The state ladder of ADR-006 and ADR-008 shown in the header, in the save confirmation and as the colour and label of the check buttons.
- Overwrite protection: before writing, the editor rereads the file and warns when it changed on disk since opening, for instance after a pull.
- Changes since opening as a comparison view before a commit.
- Git conflict markers recognised and explained as two versions of one passage.
- Accepting a document, possible only when the machine conditions hold, written into the TEI.

Built on 2026-10-30: changes since opening as a line comparison, Git conflict markers explained in the problem list, overwrite protection with a question dialog that also replaced the browser's confirm before discarding unsaved work, each with browser cases. Later the same day the state ladder as a badge in the header (FR-15), acceptance into `revisionDesc` offered only in the ready state (FR-16, ADR-011), and unsaved work marked on the save button.

After the refactoring of the interface code into modules (ADR-002), the browser check follows the badge from not validated through ready and accepted to changed since, acceptance into a missing, an existing and an empty `revisionDesc`, and the unsaved dot, see [testing](testing.md#what-is-guaranteed).

An adversarial review of the save path on 2026-10-30 found data-loss and corruption risks, all fixed with regression checks and recorded as [data safety guarantees](specification.md#data-safety-guarantees). A save keeps its document while another is chosen, undo stays within the open document, only UTF-8 opens and a byte order mark survives, a download keeps the text unsaved, write permission comes before the disk comparison and a change while the write stream opens aborts it, inserted line breaks follow the file and mixed endings stay, acceptance waits for the pending check and only reaches a real `revisionDesc`, and a validation result belongs to its exact text. The fast unit tests under `test/unit/` now run before the browser check.

The save confirmation names the working state since 2026-10-31, and a document changed since its acceptance is saved as in progress.

Open: saving a malformed document has no browser case yet, see [testing](testing.md#gaps). Operator acceptance of the milestone in the trial run.

Verification adds browser cases for a file changed on disk, a file with conflict markers and saving a malformed document.

### S3 Collections and project page

- The four collections of the holdings (correspondence, life documents, works, essay files) as folders under `data/`, imported from szd-htr.
- A project page listing per collection the documents with title, signature, pages and state, filterable by state, opening a document in the editor with a way back.
- Collection-specific element suggestions where the TEI profiles differ, and existing `standOff` persons shown and checked against the index.
- A link to the version history of the open file on the Git platform and a short partner guide in the README.

Built on 2026-10-30: the working set of about ten documents per collection in one folder per collection, imported byte-exact with provenance by `tools/import-working-set.mjs` (ADR-009, ADR-010), and the document list (FR-14) over the generated `data/index.json` with search, collection and state filters, per-document pages, open spots and state tag, and the accepted count per collection. Opening starts at the first page break (FR-17), and wrapped lines hang under their own indentation (FR-18).

The browser check now covers the list with search, collection chip, state filter and the question before switching, the start at the first page break, the hanging indent, and every working-set document loading well-formed from the list, and it fails when `data/index.json` is stale.

The documents dialog was revised on 2026-10-30 after the Human User's feedback, with collections from `source.collections` used by the dialog and both tools, a chip that explains how a collection is set up, concept tooltips from `js/concepts.js`, state icons with accessible names, a formal count line per collection, the last search selected on reopening and Escape closing at once. His further points on it are resume step 2.

The shelf mark is a field of the index and searchable since 2026-10-31, and the README carries a partner guide.

Open: rebuilding the index without a manual step after state changes, collection-specific element suggestions, `standOff` persons shown and checked against the index, and the version-history link.

### S4 Editorial rule layer

- Annotation rules for persons, organisations, places and dates in [annotation](annotation.md), since 2026-10-31, with unlinked marks counted as open work and actions for all four. They are to be discussed with the szd team on the annotated example letters.
- Actions for the open-work kinds without an encoding rule yet, the gap `[...]`, the standalone `[?]` and the bracketed HTR remarks such as `[Randnotiz links:]`, which may become `gap`, `note`, `del`, `add` or a signature encoding. Until then F8 selects them and the menu names the open rule.
- The default attributes of `add`, `del` and `unclear`, and German framing for parser and schema messages.

### S5 Publication and partner trial

- The operator creates `DigitalHumanitiesCraft/szd-teiCrafter`, pushes and enables Pages.
- A project partner works on a set of documents through clone, edit, commit and push.

### S6 Derivation contract in the base

- `knowledge/derivation.md` in the teiCrafter base with the two observed derivation forms, the inherited invariants, the integration traps and the checks every derivation runs, as requested in the base handoff.

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

## Status tracker

| Milestone | Status | Notes |
|---|---|---|
| S1 Editor core | in progress | browser check green, independent reviews fixed, operator acceptance open in the trial run |
| S2 Visible state and safe round trip | in progress | built and checked, including the state in the save confirmation and the withdrawal of a stale acceptance, while a case for saving a malformed document and acceptance are open |
| S3 Collections and project page | in progress | working set imported, document list with search and filters, shelf marks and partner guide, while collection-specific suggestions, standOff persons and the version-history link are open |
| S4 Editorial rule layer | in progress | annotation rules for persons, organisations, places and dates with their actions and open-spot detection, rules for the remaining markers open |
| S5 Publication and partner trial | pending | operator action |
| S6 Derivation contract in the base | pending | handoff in the base since 2026-10-30 |

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
