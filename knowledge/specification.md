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

The editor serves one task chain, opening a letter, correcting and annotating its TEI beside the facsimile, checking it and saving it into the repository. Requirements and decisions change at different rates, so requirements stay stable while decisions grow monotonically below.

## Requirements

### Functional requirements

- FR-01: The editor opens a TEI file and shows its source with XML highlighting, line numbers and folding. Acceptance criterion: the example letter loads on start, and a file opened through the open action replaces it.
- FR-02: Well-formedness is checked while typing. Acceptance criterion: a malformed position is underlined in the text, the check button names the line, and activating it moves the caret there.
- FR-03: The document can be validated against TEI All. Acceptance criterion: each schema error is listed with a line link and underlined in the text, and any later edit marks the result as outdated.
- FR-04: The facsimile loads from a IIIF Presentation manifest (v2 or v3), a IIIF Image API service or a plain image URL, and for SZD objects the manifest is derived from the TEI. Acceptance criterion: the example letter shows its GAMS images without user input.
- FR-05: The facsimile follows the caret. Acceptance criterion: the shown page is the one whose `pb` precedes the caret.
- FR-06: A marked name becomes `<persName ref="https://d-nb.info/gnd/ID">` after a GND search or a manually entered GND id. Acceptance criterion: the saved file differs from the original only by the inserted elements.
- FR-07: Saving writes back into the opened file where the browser supports the File System Access API, and downloads the file elsewhere. Acceptance criterion: after saving, `git diff` shows only the edits.
- FR-08: Text and facsimile share the width through a movable split, and the facsimile can be hidden and restored. Acceptance criterion: dragging to the right edge hides it, and an always visible edge button restores it.

### Non-functional requirements

- NFR-01: The editor runs as static files without a build step. Measure: serving the repository root with any static server is enough, on GitHub Pages and GitLab Pages alike.
- NFR-02: No runtime CDN and no API key. Measure: all libraries are vendored, and the only network calls are the user-triggered IIIF and GND requests.
- NFR-03: Saving preserves every byte the user did not edit. Measure: the browser check compares the saved file with the original.
- NFR-04: Keyboard operation for every action, visible focus, light and dark mode, and a usable narrow view without horizontal page scrolling. Measure: the browser check and the acceptance list in [testing](testing.md).

## Epics and user stories

### Epic 1: correcting and annotating a letter

#### Annotating a person

*As an editor who works through a machine-transcribed letter, I want to mark a name and link it to the GND, so that the person is identified in the TEI without typing markup.*

Validation: assumption (proxy: operator), effect observed in the operator's test on 2026-10-30, resolution by a project partner working on real letters.

Derivation:
- Requirement FR-06
- Interaction pattern [design](design.md#interaction-patterns)
- Term [GND](INDEX.md#gnd)

#### Checking before committing

*As an editor, I want to see well-formedness and schema errors at their place in the text, so that I commit only valid files.*

Validation: assumption (proxy: operator).

Derivation:
- Requirements FR-02, FR-03

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

Interaction. Typing with auto-closing tags and element suggestions after `<`, search with Ctrl+F, folding, code zoom by buttons or Ctrl and mouse wheel, optional line wrapping, check buttons for well-formedness and validation, and the person action on a selection.

Limits. Suggestions cover the element set of the source configuration. Schema-driven suggestions for all of TEI are not implemented.

### Facsimile pane

Purpose. Reading the original beside the source.

Data. Images from the IIIF manifest of the object.

Interaction. Page navigation, deep zoom and rotation in 90 degree steps, following the caret, hiding and restoring through the split.

Limits. Text and image are linked by page. Zones within a page are not linked.

### Person dialog

Purpose. Choosing a GND identity for a marked name.

Data. Live search results from lobid-gnd.

Interaction. The query is prefilled with the selection, a result or a typed id fills the GND field, a preview shows the resulting markup, and applying inserts it.

Limits. Persons without a GND record cannot be annotated yet. A project person register is planned in [plan](plan.md).

## Decisions

### ADR-001 Static site without a build step

Context. Project partners should run and host the editor without a toolchain, and the tool sits next to their research data.

Choice. Plain HTML, CSS and ES modules, with libraries vendored into `vendor/`.

Rationale. A static site works from any web server and on GitHub or GitLab Pages, and stays maintainable without Node.

Effect. The repository runs by serving its root. The browser check needs Node and Playwright, which are limited to `test/`.

### ADR-002 Generic modules and one source configuration

Context. The editor is meant as a derivation of teiCrafter that other editions can repeat.

Choice. All edition-specific knowledge lives in `js/source.js`, namely the IIIF manifest rule, the element suggestions and the person markup. The other modules know no edition.

Rationale. A derivation for another edition replaces one file, and the generic modules can later move into the teiCrafter base.

Effect. The SZD specifics have stayed confined to `js/source.js` through three iterations.

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

Context. Person annotation needs a stable identifier.

Choice. `<persName ref="https://d-nb.info/gnd/ID">`, the identifier as full URI, searched through lobid-gnd.

Rationale. The URI resolves without the editor and is the common TEI practice for authority links. lobid-gnd needs no key and allows browser requests, and the teiCrafter base uses it as well.

Effect. A live request goes to lobid.org only when the user searches, which is a deliberate exception to the rule of no live API calls, because looking up an identity is the editing act itself.
