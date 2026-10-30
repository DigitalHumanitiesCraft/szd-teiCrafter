---
title: Specification
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
  name: Vorlage Specification
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/specification
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-specification
topics: ["[[Requirements Engineering]]", "[[Decision Records]]", "[[User Stories]]"]
related: [project, data, design, testing]
---

# Specification

The editor serves one task chain, opening a document of the Stefan Zweig Digital holdings, correcting and annotating its TEI beside the facsimile, checking it and saving it into the repository. Requirements and decisions change at different rates, so requirements stay stable while decisions grow monotonically below.

## Requirements

### Functional requirements

- FR-01: The editor opens a TEI file and shows its source with XML highlighting, line numbers and folding. Acceptance criterion: the example letter loads on start, and a file opened through the open action replaces it.
- FR-02: Well-formedness is checked while typing. Acceptance criterion: a malformed position is underlined in the text, the check button names the line, and activating it moves the caret there.
- FR-03: The document can be validated against TEI All. Acceptance criterion: each schema error is listed with a line link and underlined in the text, and any later edit marks the result as outdated.
- FR-04: The facsimile loads from a IIIF Presentation manifest (v2 or v3), a IIIF Image API service or a plain image URL, and for SZD objects the manifest is derived from the TEI. Acceptance criterion: the example letter shows its GAMS images without user input.
- FR-05: The facsimile follows the caret. Acceptance criterion: the shown page is the one whose `pb` precedes the caret.
- FR-06: A marked name becomes `<persName ref="…">` pointing to the entry of the Stefan Zweig Digital person index, found while typing, or to the GND for persons outside the index (ADR-007). Acceptance criterion: the saved file differs from the original only by the inserted elements.
- FR-07: Saving writes back into the opened file where the browser supports the File System Access API, and downloads the file elsewhere. Saving is always possible, whatever state the document is in (ADR-008). Unsaved work is marked until saved, Ctrl+S saves, and closing the tab with unsaved work asks first. Acceptance criterion: after saving, `git diff` shows only the edits.
- FR-08: Text and facsimile share the width through a movable split, and the facsimile can be hidden and restored. Acceptance criterion: dragging to the right edge hides it, and an always visible edge button restores it.
- FR-09: A text selection offers its annotation actions in a menu at the selection (Person, Streichung, Unsicher, Ergänzung), reachable with Ctrl+. and arrow keys. When the selection carries an HTR marker, the matching action is suggested and the marker syntax is removed on wrapping. Acceptance criterion: `~~x~~` becomes `<del>x</del>`, `x[?]` becomes `<unclear>x</unclear>`, `{x}` becomes `<add>x</add>`.
- FR-10: The remaining HTR markers are counted, and F8 or the counter selects the next one and offers its action. Acceptance criterion: working through the example letter with F8 and Enter leaves no marker, and the saved file equals the original transformed by the marker rules.

### Non-functional requirements

- NFR-01: The editor runs as static files without a build step. Measure: serving the repository root with any static server is enough, on GitHub Pages and GitLab Pages alike.
- NFR-02: No runtime CDN and no API key. Measure: all libraries and the person index are local files, and network calls go only to the IIIF service of the opened document and, on request, to lobid-gnd.
- NFR-03: Saving preserves every byte the user did not edit. Measure: the browser check compares the saved file with the original.
- NFR-04: Keyboard operation for every action, visible focus, light and dark mode, and a usable narrow view without horizontal page scrolling. Measure: the browser check and the acceptance list in [testing](testing.md).

## Epics and user stories

### Epic 1: correcting and annotating a letter

#### Annotating a person

*As an editor who works through a machine-transcribed letter, I want to mark a name and link it to the person index of the edition, so that the person is identified in the TEI without typing markup.*

Validation: assumption (proxy: operator), effect observed in the operator's test on 2026-10-30, resolution by a project partner working on real letters.

Derivation:
- Requirement FR-06
- Interaction pattern [design](design.md#interaction-patterns)
- Term [GND](INDEX.md#gnd)

#### Interrupting work at any point

*As an editor who has to stop in the middle of a document, I want to save it in whatever state it is and see clearly whether it is well-formed, valid and finished, so that I never lose work and nobody mistakes an unfinished file for a finished one.*

Validation: operator, 2026-10-30.

Derivation:
- Requirements FR-02, FR-03, FR-07
- Decisions [ADR-006](#adr-006-definition-of-done-and-two-working-states), [ADR-008](#adr-008-saving-is-always-possible-and-the-state-is-visible)

### Epic 2: working with the team through Git

#### Dividing documents

*As a member of an edition team, I want to open a file from my clone, edit it and save it in place, so that I can commit and push my share while others work on other files.*

Validation: assumption (proxy: operator), stated as a requirement on 2026-10-30.

Derivation:
- Requirements FR-07, NFR-01, NFR-03
- Decision [ADR-004](#adr-004-git-repository-as-backend)

## Scope of functions

### Text pane

Purpose. Editing the TEI source.

Data. The opened TEI file, see [data](data.md).

Interaction. Typing with auto-closing tags and element suggestions after `<`, search with Ctrl+F, folding, code zoom by buttons or Ctrl and mouse wheel, line wrapping on by default, check buttons for well-formedness and validation, the open-spot counter with F8, the action menu at a pointer selection or with Ctrl+., and saving with Ctrl+S.

Limits. Suggestions cover the element set of the source configuration. Schema-driven suggestions for all of TEI are not implemented.

### Facsimile pane

Purpose. Reading the original beside the source.

Data. Images from the IIIF manifest of the object.

Interaction. Page navigation, zoom in, zoom out and fit from the toolbar, rotation in 90 degree steps, following the caret, the image source behind an icon, hiding and restoring through the split.

Limits. Text and image are linked by page. Zones within a page are not linked.

### Person dialog

Purpose. Choosing the identity of a marked person.

Data. The person index of Stefan Zweig Digital as a local file, and on request live results from lobid-gnd.

Interaction. The query is the selection without forms of address and HTR marker syntax. Typing searches the index at once, a button asks the GND as well, arrow keys move through both lists, a chosen result or a typed index or GND identifier fills the field, a preview shows the resulting markup, and applying inserts it.

Limits. Persons in neither the index nor the GND cannot be annotated with an identifier.

## Decisions

### ADR-001 Static site without a build step

Context. Project partners should run and host the editor without a toolchain, and the tool sits next to their research data.

Choice. Plain HTML, CSS and ES modules, with libraries vendored into `vendor/`.

Rationale. A static site works from any web server and on GitHub or GitLab Pages, and stays maintainable without Node.

Effect. The repository runs by serving its root. The browser check needs Node and Playwright, which are limited to `test/`.

### ADR-002 Generic modules and one source configuration

Context. The editor is meant as a derivation of teiCrafter that other editions can repeat.

Choice. All edition-specific knowledge lives in `js/source.js`, namely the IIIF manifest rule, the element suggestions, the HTR marker actions and the person index with its reference forms. The other modules know no edition.

Rationale. A derivation for another edition replaces one file, and the generic modules can later move into the teiCrafter base.

Effect. The SZD specifics, including the person index added on 2026-10-30, have stayed confined to `js/source.js` and the data it points to.

### ADR-003 CodeMirror 6 as a vendored bundle

Context. A textarea with a coloured layer behind it could not support underlined errors, suggestions, folding or selection actions at reasonable cost. Working in the source should feel like a desktop XML editor.

Choice. CodeMirror 6, bundled once with esbuild into `vendor/codemirror/codemirror.js`, with the recipe in `vendor/codemirror/build/`.

Rationale. CodeMirror 6 provides these functions, is MIT-licensed, and the teiCrafter base already uses it. Bundling keeps ADR-001 intact. A later move to Vite changes import paths only, because the editor configuration stays the same.

Effect. Editing, diagnostics and suggestions work. Colours inside the editor come from its theme in `js/editor.js`, because CodeMirror's unlayered base styles override the layered application CSS.

Rejected. Monaco is heavier and weak on narrow screens. Ace and CodeMirror 5 are older technology. Structured editors such as Xonomy serve clicking more than typing.

### ADR-004 Git repository as backend

Context. Partners need to share edited files without a server of their own.

Choice. Editor and research data live in one repository. Saving writes into the file opened from the local clone, and the team divides documents and exchanges them by commit and push.

Rationale. Git versions every change, needs no infrastructure beyond GitHub or a self-hosted GitLab, and keeps the data in plain TEI.

Effect. Simultaneous editing of one file is not supported, which the team handles by dividing documents. Research data under `data/` is exempt from line-ending conversion in `.gitattributes`, and the editor saves with the line endings of the opened file, so a commit shows only the edits on any platform. This follows the byte-fidelity rule of the teiCrafter base.

### ADR-005 GND URIs in persName/@ref

Superseded by ADR-007 on 2026-10-30.

Context. Person annotation needs a stable identifier.

Choice. `<persName ref="https://d-nb.info/gnd/ID">`, the identifier as full URI, searched through lobid-gnd.

Rationale. The URI resolves without the editor and is the common TEI practice for authority links. lobid-gnd needs no key and allows browser requests, and the teiCrafter base uses it as well.

Effect. A live request goes to lobid.org only when the user searches, which is a deliberate exception to the rule of no live API calls, because looking up an identity is the editing act itself.

### ADR-006 Definition of done and two working states

Context. The project list, the save display and a later project rule set all need to know when a document counts as finished. The operator answered for letters, and the rule applies to every collection.

Choice. Operator, 2026-10-30: „Ein Brief ist fertig, wenn er formal wohlgeformt, gültig und genau ist und wenn er abgespeichert ist, also quasi abgenommen ist.“ A letter is either in progress or accepted. Well-formed, valid against TEI All and free of open HTR spots are machine-checkable conditions. Accuracy against the facsimile is a human judgement, and acceptance is the act that records it.

Rationale. Two states reflect the working status without a workflow engine, and the machine conditions let the editor offer acceptance only when they hold.

Effect. Where the state is encoded and who may accept are open in [plan](plan.md#open-decisions-and-dependencies).

### ADR-007 The person index of Stefan Zweig Digital as the person source

Context. ADR-005 wrote GND URIs directly. The question who owns a person's identity was answered by research on 2026-10-30: Stefan Zweig Digital keeps its own person index (`o:szd.personen`, CC BY 4.0) with index identifiers, GND and Wikidata links, life dates and name variants, and its holdings point to it as `https://gams.uni-graz.at/o:szd.personen#SZDPER.n`.

Choice. Annotation points to the index entry. The GND is the fallback for persons outside the index, written as `http://d-nb.info/gnd/ID` like the holdings. The index is prebuilt into `data/register/szd-persons.json` by `tools/build-person-index.mjs` and searched while typing, with forms of address ignored.

Rationale. The edition's own register carries persons without a GND record, corrects a wrong GND link in one place and is the form the Stefan Zweig Digital views resolve. A project register of our own would duplicate it. This supersedes ADR-005.

Effect. All three persons of the example letter, including the addressee whose GND search had failed on "Frau Meingast", are found in the index.

### ADR-008 Saving is always possible and the state is visible

Context. The teiCrafter base and the Wenzelsbibel derivation write only valid TEI. An editor who must stop in the middle of a correction would then lose the work or keep it outside the repository.

Choice. Operator, 2026-10-30: „Man muss schon immer speichern können, aber es muss irgendwie klar sein, was gültig ist. Wir müssen uns irgendwie visuell überlegen, dass man den Status vielleicht anzeigt.“ Saving never refuses. The state of the document, from not well-formed through well-formed, valid and free of open spots to accepted, is shown in the editor, named in the save confirmation and listed per document on the project page.

Rationale. Interrupted work belongs in the repository, where Git keeps it. Visibility instead of a gate keeps the distinction between unfinished and finished files.

Effect. This departs deliberately from the fail-closed gate of the base. The derivation contract records it as a case.

### ADR-009 Collections of the Stefan Zweig Digital holdings, one edition per derivation

Context. The operator asked for collections whose objects show their state and can be switched, and first considered a medieval manuscript as a second collection.

Choice. Operator, 2026-10-30: the SZD editor is developed as the real editor for the project and part of the Stefan Zweig Digital strategy, so editions are not mixed. Its collections follow the holdings, namely correspondence, life documents, works and the essay files, each with its own TEI profile. A medieval source becomes a derivation of its own when it is taken up.

Rationale. One source configuration per edition keeps ADR-002 intact, and the differing TEI profiles of the holdings already test the collection model.

Effect. The scope of the first import is open in [plan](plan.md#open-decisions-and-dependencies).

### ADR-010 This repository holds the corrected TEI, starting from a working set

Context. szd-htr produces machine TEI for the four collections. Correcting it in a second place raises the question which copy is authoritative and how much enters the editor at first.

Choice. Taken by the session as a reversible default on 2026-10-30, after the operator left recommended defaults to the session, open to the operator's confirmation. A document imported from szd-htr is from then on maintained here, and szd-htr stays the producer of raw transcriptions without receiving corrections back. The first import is a working set of about ten documents per collection, chosen for the variety of their TEI profiles.

Rationale. One authoritative place avoids duplicate versions that drift apart. A working set is enough to settle the editorial rules on cases before the whole holdings are imported.

Effect. The import tool records the szd-htr commit it read from. Delivery to GAMS stays open until S5.

### ADR-011 The working state lives in revisionDesc

Context. ADR-006 distinguishes documents in progress from accepted ones, and ADR-008 requires the state to be visible.

Choice. Taken by the session as a reversible default on 2026-10-30, open to the operator's confirmation. `revisionDesc/@status` carries `draft` or `approved`, and acceptance adds a `change` naming who accepted and when. The checked state between them is computed by the editor and not stored.

Rationale. The state travels with the file, and Git shows an acceptance as a diff of the document itself, so no second list has to be kept in step.

Effect. Who may accept is part of the editorial rules of S4.
