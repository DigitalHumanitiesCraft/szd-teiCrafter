---
title: Plan
project:
  name: teiCrafter SZD
  repository: https://github.com/DigitalHumanitiesCraft/szd-teiCrafter
status: active
language: en
created: 2026-10-30
updated: 2026-10-30
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
related: [specification, journal, INDEX]
---

# Plan

This plan orders the accepted next steps of the editor. Decisions taken along the way move into [specification](specification.md#decisions), and completed transitions into [journal](journal.md).

## Target state

- An editor team works on real letters in a shared repository, divides documents and commits valid TEI without leaving the browser for XML work.
- The annotation actions cover the open work in the HTR output, persons, deletions, uncertain readings and additions.
- The derivation contract is clear enough that the generic modules can move into the teiCrafter base and another edition can derive its editor by writing a source configuration.

## Phases and milestones

| Phase | Milestones | Quality gate |
|---|---|---|
| Phase 1 — Working editor | M1 editor and person annotation | operator acceptance |
| Phase 2 — Annotation set | M2 person register, M3 HTR marker actions, M4 toolbar order | browser check extended |
| Phase 3 — Team workflow | M8 safe round trip, M9 project page, M5 repository and Pages, M6 partner trial | partner acceptance |
| Phase 4 — Back into the base | M7 derivation contract in teiCrafter | base checks |

### Phase 1 — Working editor

Goal: the editing task chain works on the example letter.

#### Milestone 1 — Editor and person annotation

Exit condition (M1): the operator has annotated persons, saved into the clone and confirmed with `git diff` that only the annotations changed (FR-06, FR-07).

### Phase 2 — Annotation set

Goal: the actions match the open work in the letters.

#### Milestone 2 — Project person register

Entry condition: M1 accepted.

- A person register of the edition, kept as TEI `listPerson` in the repository, so that persons without a GND record (such as the letter's addressee) get a stable project identifier and persons recur across letters without a new search.
- The person dialog searches the register first and the GND second, with suggestions while typing, and offers to add a new register entry.
- Annotation then writes `persName/@ref` to the register entry, which carries the GND URI where one exists.

Exit condition (M2): a person without a GND record can be annotated and is found again in the next letter.

#### Milestone 3 — HTR marker actions

- Selection actions that turn `~~…~~` into `del`, `[?]` into `unclear` and `{…}` into `add`, and a project rule set that reports remaining markers as open work.

Exit condition (M3): no marker survives unnoticed in a document the check calls clean.

#### Milestone 4 — Toolbar order

- One toolbar row per pane, container queries instead of viewport queries, the image source behind an icon, editor-styled zoom controls in place of OpenSeadragon's own buttons, a smaller navigator.

Exit condition (M4): toolbars stay on one row at half width and remain usable in a narrow pane.

### Phase 3 — Team workflow

Goal: a letter goes from one team member through Git to another and back without lost work, and its state is visible in the project. Git stays outside the editor, which neither commits nor needs an access token.

#### Milestone 8 — Safe round trip

- Save rule: malformed XML is never written, a document with schema errors is written with a visible note on the open errors.
- Overwrite protection: before writing, the editor rereads the file and warns when it changed on disk since opening, for instance after a pull.
- Changes since opening: a comparison of the current text with the opened version, the check before a commit.
- Git conflict markers are recognised and explained as two versions of one passage.
- Working state: in progress or accepted (ADR-006), shown in the editor and settable as accepted only when the machine conditions hold.

Exit condition (M8): the browser check covers each case, including a file changed on disk and a file with conflict markers.

#### Milestone 9 — Project page

- A separate view lists the letters of the released `data/` folder with title, working state, open spots and well-formedness, and opens a letter in the editor. The editor keeps exactly one document and gains a way back to the list.
- A link to the version history of the open file on the Git platform, built from the repository address in `js/source.js` without an API.
- A short guide for partners in the README covering clone, open, save, commit and push.

Exit condition (M9): a partner reaches every letter from the list and sees which ones still need work.

#### Milestone 5 — Repository and Pages

- The operator creates `DigitalHumanitiesCraft/szd-teiCrafter`, pushes and enables Pages.

#### Milestone 6 — Partner trial

- A project partner works on a set of letters through clone, edit, commit and push.

### Phase 4 — Back into the base

#### Milestone 7 — Derivation contract in teiCrafter

- The generic modules and the source configuration contract are offered to the teiCrafter base through its handoff, and the base decides how derivations are structured.

## Status tracker

| Milestone | Status | Notes |
|---|---|---|
| M1 — Editor and person annotation | in progress | browser check green, operator acceptance open |
| M2 — Person register | completed | the SZD person index replaces a register of our own (ADR-007) |
| M3 — HTR marker actions | in progress | actions, counter and F8 built; rule set for remaining markers open |
| M4 — Toolbar order | completed | one row per pane at half width; a very narrow facsimile pane still wraps |
| M8 — Safe round trip | pending | next step |
| M9 — Project page | pending | person register (M2) follows it on the project page |
| M5 — Repository and Pages | pending | operator action |
| M6 — Partner trial | pending | |
| M7 — Derivation contract in the base | pending | handoff to teiCrafter sent 2026-10-30 |

## Open decisions and dependencies

- Whether the register lives in one `persons.xml` or in the `standOff` of each letter, before M2.
- Whether derivations stay build-free with vendored bundles or move to the Vite stack of the teiCrafter base, before M7. ADR-003 keeps both open.
- Whether the save rule of M8 (never malformed, schema errors with a note) is accepted, which departs from the fail-closed gate of the base and the Wenzelsbibel derivation, before M8.
- Where the working state lives, proposed as `revisionDesc/@status` in the TEI (`draft`, `approved`) so that Git diff, project page and editor read the same value, and who may accept, before M8.
- Whether partners are asked to use Chrome or Edge, the browsers that write files in place, before M6.
- Whether the narrow view gets a switch between text and facsimile as separate views, which the usability review of 2026-10-30 proposed because stacked panes separate the passage from its image, before M6.
- How collections are modelled, so that a project holds several collections (SZD letters, a medieval manuscript) whose objects show their working state and can be switched, before M9. Operator request of 2026-10-30.
- Whether auto-closing tags stay, since the base requires that typing inserts exactly the typed characters, before M6.
