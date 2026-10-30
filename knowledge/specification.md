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

- FR-01: The editor opens a TEI file in UTF-8 and shows its source with XML highlighting, line numbers and folding. Each opened document starts with its own undo history. Acceptance criterion: the example letter loads on start, a file opened through the open action replaces it, undo after opening another document leaves that document unchanged, and a file that is not UTF-8 or declares another encoding is refused with a message while the open document stays.
- FR-02: Well-formedness is checked while typing. Acceptance criterion: a malformed position is underlined in the text, the check button names the line, and activating it moves the caret there.
- FR-03: The document can be validated against TEI All. Acceptance criterion: each schema error is listed with a line link and underlined in the text, and any later edit marks the result as outdated. The result belongs to the exact text it ran on, so undoing back to that text shows it again, and a check pending from typing does not discard it.
- FR-04: The facsimile loads from a IIIF Presentation manifest (v2 or v3), a IIIF Image API service or a plain image URL, and for SZD objects the manifest is derived from the TEI. Acceptance criterion: the example letter shows its GAMS images without user input.
- FR-05: The facsimile follows the caret. Acceptance criterion: the shown page is the one whose `pb` precedes the caret.
- FR-06: A marked name becomes `<persName ref="…">` pointing to the entry of the Stefan Zweig Digital person index, found while typing, or to the GND for persons outside the index (ADR-007). Acceptance criterion: the saved file differs from the original only by the inserted elements.
- FR-07: Saving writes back into the opened file where the browser supports the File System Access API, and downloads the file elsewhere. Saving is always possible, whatever state the document is in (ADR-008). Unsaved work is marked until saved, Ctrl+S saves, and closing the tab with unsaved work asks first. A download counts as handed to the browser, which the editor cannot confirm, so the unsaved mark stays and the status names this. While a save runs, no other document can be opened. Acceptance criterion: after saving, `git diff` shows only the edits.
- FR-08: Text and facsimile share the width through a movable split, and the facsimile can be hidden and restored. Acceptance criterion: dragging to the right edge hides it, and an always visible edge button restores it.
- FR-09: A text selection offers its annotation actions in a menu at the selection (Person, Streichung, Unsicher, Ergänzung), reachable with Ctrl+. and arrow keys. When the selection carries an HTR marker, the matching action is suggested and the marker syntax is removed on wrapping. Acceptance criterion: `~~x~~` becomes `<del>x</del>`, `x[?]` becomes `<unclear>x</unclear>`, `{x}` becomes `<add>x</add>`.
- FR-10: The open work of the transcription is counted, and F8 or the counter selects the next spot and offers its action. Open work comprises the HTR markers of the wraps and three kinds without an encoding rule yet, a standalone `[?]` or `[?n?]`, a gap `[...]` or `[...n...]`, and a bracketed HTR remark such as `[Randnotiz links:]`, all searched outside header, comments, CDATA and processing instructions. For a kind without an action the menu says that its rule is open, and Enter does nothing. Acceptance criterion: working through the example letter with F8 and Enter leaves no marker, the saved file equals the original transformed by the marker rules, and a document with gaps counts them and names the open rule when F8 selects one.
- FR-11: The changes since the document was opened or last saved can be shown as a line comparison before a commit. Acceptance criterion: after one annotation the view lists exactly one removed and one added line with their old and new line numbers, a line link returns to the text, and after saving the view reports no changes.
- FR-12: Git conflict markers are recognised when a file is opened and while editing, and explained as two versions of one passage. Start and end markers take Git's form, seven signs followed by a space and a label or by the line end, and count on their own, so a marker left from a partial resolution is still found. A line `=======` counts only after an open start marker, since elsewhere it is ordinary text. Acceptance criterion: the check button and the status name the first marker line, each marker line is listed with a link and underlined, and deleting one version with its markers leaves a well-formed document.
- FR-13: Saving in place never overwrites a file that changed on disk since it was opened or last saved without asking. Acceptance criterion: after the file's modification time changes, saving asks with the choices cancel, save as a new file and overwrite. Cancelling writes nothing and keeps the editor's text, overwriting writes it, and the next save writes without asking again. Write permission is requested before the comparison, and the modification time is compared again once the write stream is open, so a change during a permission prompt or while the stream opens aborts the stream and asks.
- FR-14: A document list opened from the header offers the documents of the repository by collection, each with title, object id, pages, open spots and working state, searchable by title, signature and object id and filterable by collection and by state (with open spots, in progress, accepted). Acceptance criterion: typing part of a title, signature or object id narrows the list to the matching documents and the count names how many of all are shown, a collection chip shows only that collection, the state selector keeps only documents with open spots or only accepted ones, each collection heading names how many of its documents are accepted, the open document is marked, and choosing another document over unsaved work asks first, where cancelling keeps the open document with its edit and confirming loads the chosen one together with its facsimile.
- FR-15: The working state of the open document is shown in the header as a badge, namely in progress with its reason (not well-formed, the number of open spots, not yet validated), ready for acceptance, accepted, or accepted and changed since (ADR-006, ADR-008). Acceptance criterion: the badge follows every edit and validation, and its words name the state without relying on colour. A document with open spots names their number, one without open spots names the missing validation, a valid one reads ready for acceptance, validating an accepted document keeps it accepted, a file stored as accepted opens as accepted, and an edit after acceptance reads „Abgenommen | seither geändert“. Open spots count every kind of open work of FR-10.
- FR-16: A document that is well-formed, free of open spots and valid against TEI All can be accepted. Acceptance writes `revisionDesc/@status="approved"` and a dated `change` into the TEI, creating `revisionDesc` where it is missing (ADR-011). Acceptance criterion: the accept action appears only in the ready state and disappears after accepting. The saved file equals the original plus one `revisionDesc` with `status="approved"` holding one `change` with the date in `@when` and `status="approved"`, and it stays valid against TEI All. A document that already has a `revisionDesc` gets the status set on it and the `change` added inside it, inside its `listChange` where there is one, instead of a second `revisionDesc`, and an empty `<revisionDesc/>` is opened to hold the `change`. The accept action first runs the pending well-formedness check and refuses unless the document is still ready, so an edit inside the check's delay is never accepted on an older validation. Tags in comments, CDATA and processing instructions do not count, a status in single quotes is replaced, and a `>` inside an attribute value does not end the tag. Acceptance reports success only when the parsed document then carries `status="approved"`, and it validates the accepted text again.
- FR-17: An opened document starts with the caret at its first page break, or at the start of the body where it has none. Acceptance criterion: after opening, the caret stands on the line of the first `pb`, the text pane shows it, and the facsimile its first page.
- FR-18: With line wrapping on, a wrapped line continues under the start of its own content plus a small hang. Acceptance criterion: a long indented line in the body wraps with its continuation indented beyond its first character.

### Non-functional requirements

- NFR-01: The editor runs as static files without a build step. Measure: serving the repository root with any static server is enough, on GitHub Pages and GitLab Pages alike.
- NFR-02: No runtime CDN and no API key. Measure: all libraries and the person index are local files, and network calls go only to the IIIF service of the opened document and, on request, to lobid-gnd.
- NFR-03: Saving preserves every byte the user did not edit. Measure: the browser check compares the saved file with the original.
- NFR-04: Keyboard operation for every action, visible focus, light and dark mode, and a usable narrow view without horizontal page scrolling. Measure: the browser check and the acceptance list in [testing](testing.md).

### Data safety guarantees

The editor guarantees the following for the files it opens and saves. Each guarantee has a regression check named in [testing](testing.md#what-is-guaranteed).

- Saving writes exactly the editor text, and an unedited file is saved byte-identical, including a UTF-8 byte order mark and line endings of any kind or mixture.
- Only UTF-8 opens. Invalid bytes, UTF-16 and a declaration of another encoding are refused before the document replaces the open one, because decoding them would change characters on saving.
- Inserted line breaks, from typing, pasting, annotation actions or acceptance, take the document's line ending, which is the majority ending of the file. A file with mixed endings keeps them, the status names the mixture on opening, and lines are counted as the XML parser counts them, so error lines and jumps agree.
- A save belongs to the document it started on. While it runs, no other document opens, and a save that ends after a document change updates no state of the new document.
- Undo stays within the open document.
- In-place saving asks before overwriting a file changed on disk, also when the change falls between the comparison and the opened write stream. A failed write aborts the stream, so the file on disk stays as it was.
- A download keeps the text marked unsaved, because the browser may still cancel it.
- Acceptance happens only on a text whose validation is current, and only a recognised `revisionDesc` outside comments receives it.

Limits. Overwrite protection rests on the modification time, so a file replaced with identical time escapes it. A download cannot be confirmed at all. Minority line endings in a mixed file appear as marked placeholders inside an editor line, so the editor's line numbers can differ from the parser's in such a file, while the problem list and its jumps follow the parser. The validation result is kept for the last validated text only, so undoing to an earlier validated text asks for validation again. The leftover loading of a facsimile requested for the previous document is not cancelled.

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
- Requirements FR-02, FR-03, FR-07, FR-15, FR-16
- Decisions [ADR-006](#adr-006-definition-of-done-and-two-working-states), [ADR-008](#adr-008-saving-is-always-possible-and-the-state-is-visible)

### Epic 2: working with the team through Git

#### Dividing documents

*As a member of an edition team, I want to open a file from my clone, edit it and save it in place, so that I can commit and push my share while others work on other files.*

Validation: assumption (proxy: operator), stated as a requirement on 2026-10-30.

Derivation:
- Requirements FR-07, FR-14, NFR-01, NFR-03
- Decision [ADR-004](#adr-004-git-repository-as-backend)

## Scope of functions

### Text pane

Purpose. Editing the TEI source.

Data. The opened TEI file, see [data](data.md).

Interaction. Typing with auto-closing tags and element suggestions after `<`, search with Ctrl+F, folding, code zoom by buttons or Ctrl and mouse wheel, line wrapping on by default with a hanging indent, the caret placed at the first page break on opening, check buttons for well-formedness and validation, the open-spot counter with F8, the action menu at a pointer selection or with Ctrl+., the comparison with the text as opened or last saved, and saving with Ctrl+S. Questions before discarding or overwriting work appear in a modal dialog whose first, focused choice is the safe one.

Limits. Suggestions cover the element set of the source configuration. Schema-driven suggestions for all of TEI are not implemented. The comparison is line-based and compares with the text as opened or last saved in this session, not with a Git revision. Git conflicts appear in the problem list rather than the F8 queue, because they make the document malformed and are resolved by deleting lines, not by an annotation action. Overwrite protection compares the file's modification time, so it covers changes made on disk but not a file replaced with identical bytes and an earlier time.

### Document list

Purpose. Finding the next document to work on and seeing how far each collection is.

Data. `data/index.json`, generated from the working set and the files, see [data](data.md#sources).

Interaction. A button in the header opens a modal list grouped by collection. A search field takes title, signature or object id and is focused on opening, collection chips and a state selector narrow the list, arrow keys move between the search field and the entries, and choosing an entry opens the document. Each entry shows title, object id, pages, open spots and a state tag, and each collection heading counts its accepted documents.

Limits. The list reflects the index as last built. Only the entry of the open document is updated from the editor, so the state of other documents changes in the list after the index is rebuilt. A document loaded from the list is saved by download or to a chosen file, and in-place saving needs the document opened from the local clone with the open action.

### Facsimile pane

Purpose. Reading the original beside the source.

Data. Images from the IIIF manifest of the object.

Interaction. Page navigation, zoom in, zoom out and fit from the toolbar, rotation in 90 degree steps, following the caret, the image source behind an icon that opens its field in the toolbar row in place of the view controls, hiding and restoring through the split.

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

Choice. All edition-specific knowledge lives in `js/source.js`, namely the IIIF manifest rule, the element suggestions, the HTR marker actions with their marker syntax, and the person index with its reference forms and `person.nameOf`, which strips the marker syntax from a selection before it becomes the name query. The other modules know no edition.

Rationale. A derivation for another edition replaces one file, and the generic modules can later move into the teiCrafter base.

Effect. Since the refactoring of 2026-10-30 the code is cut as follows.

- `js/app.js` is the composition root. It creates editor, viewer and dialogs and connects them, and it keeps what concerns the open document as a whole, namely the well-formedness and validation checks, the problem list, the explanation of Git conflict markers, the rendering of the working-state badge and the accept action, the open-spot counter with F8, loading the facsimile, the view buttons of both panes, and `documentOpened`, which resets the checks and places the caret on opening.
- `js/files.js` opens, loads and saves, in place or by download, with the overwrite protection, `mayDiscard` before unsaved work is replaced, the unsaved mark, Ctrl+S and the question on `beforeunload`.
- `js/state.js` holds the pure functions of the working state, `openSpots`, `workingState` and `acceptanceEdits`, which the document index tool and the browser check import as well.
- `js/docs.js` is the document list, `js/menu.js` the action menu at the selection, `js/person.js` the person dialog, `js/changes.js` the comparison dialog, and `js/ui.js` the shared helpers `$`, `setStatus`, `ask` and `arrowNavigation`.
- `js/editor.js`, `js/tei.js`, `js/iiif.js`, `js/viewer.js`, `js/validate.js`, `js/split.js`, `js/gnd.js`, `js/register.js` and `js/diff.js` are the generic modules for code editor, TEI facts, IIIF resolution, image viewer, schema validation, split, GND search, register search and line comparison.

The SZD knowledge, including the person index added on 2026-10-30, has stayed in `js/source.js` and the data it points to. The product name, the browser storage key, the example identifier of the person index and the definition of open work are configuration values there too, so the generic modules name neither product nor edition. Since 2026-10-30 open work is a list of detectors in `source.openWork`, each with a key, a label, a `find` function and an optional menu action. The wraps contribute theirs, and the kinds without an encoding rule carry no action. `openSpots(text, detectors)` in `js/state.js` applies them for the editor, the document index tool and the tests, and `js/files.js` exports `decodeXml` and `encodeXml`, the byte boundary of opening and saving. `index.html` remains the edition's page and carries its title and placeholders.

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

Effect. Simultaneous editing of one file is not supported, which the team handles by dividing documents. Research data under `data/` is exempt from line-ending conversion in `.gitattributes`, and the editor saves with the line endings of the opened file, so a commit shows only the edits on any platform. This follows the byte-fidelity rule of the teiCrafter base. Since 2026-10-30 the editor uses the majority ending of the file for new line breaks, normalises every inserted break to it, keeps the endings of a mixed file as they are, and keeps a UTF-8 byte order mark.

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

Effect. ADR-011 places the state in `revisionDesc`, and the editor offers acceptance only when the machine conditions hold (FR-16). Who may accept is open in [plan](plan.md#open-decisions-and-dependencies).

### ADR-007 The person index of Stefan Zweig Digital as the person source

Context. ADR-005 wrote GND URIs directly. The question who owns a person's identity was answered by research on 2026-10-30: Stefan Zweig Digital keeps its own person index (`o:szd.personen`, CC BY 4.0) with index identifiers, GND and Wikidata links, life dates and name variants, and its holdings point to it as `https://gams.uni-graz.at/o:szd.personen#SZDPER.n`.

Choice. Annotation points to the index entry. The GND is the fallback for persons outside the index, written as `http://d-nb.info/gnd/ID` like the holdings. The index is prebuilt into `data/register/szd-persons.json` by `tools/build-person-index.mjs` and searched while typing, with forms of address ignored.

Rationale. The edition's own register carries persons without a GND record, corrects a wrong GND link in one place and is the form the Stefan Zweig Digital views resolve. A project register of our own would duplicate it. This supersedes ADR-005.

Effect. All three persons of the example letter, including the addressee whose GND search had failed on "Frau Meingast", are found in the index.

### ADR-008 Saving is always possible and the state is visible

Context. The teiCrafter base and the Wenzelsbibel derivation write only valid TEI. An editor who must stop in the middle of a correction would then lose the work or keep it outside the repository.

Choice. Operator, 2026-10-30: „Man muss schon immer speichern können, aber es muss irgendwie klar sein, was gültig ist. Wir müssen uns irgendwie visuell überlegen, dass man den Status vielleicht anzeigt.“ Saving never refuses. The state of the document, from not well-formed through well-formed, valid and free of open spots to accepted, is shown in the editor, named in the save confirmation and listed per document on the project page.

Rationale. Interrupted work belongs in the repository, where Git keeps it. Visibility instead of a gate keeps the distinction between unfinished and finished files.

Effect. This departs deliberately from the fail-closed gate of the base. The derivation contract records it as a case. A download is handed to the browser and cannot be confirmed, so since 2026-10-30 it leaves the text marked unsaved, and the status says that arrival is not confirmed.

### ADR-009 Collections of the Stefan Zweig Digital holdings, one edition per derivation

Context. The operator asked for collections whose objects show their state and can be switched, and first considered a medieval manuscript as a second collection.

Choice. Operator, 2026-10-30: the SZD editor is developed as the real editor for the project and part of the Stefan Zweig Digital strategy, so editions are not mixed. Its collections follow the holdings, namely correspondence, life documents, works and the essay files, each with its own TEI profile. A medieval source becomes a derivation of its own when it is taken up.

Rationale. One source configuration per edition keeps ADR-002 intact, and the differing TEI profiles of the holdings already test the collection model.

Effect. Each collection is one folder under `data/` (`korrespondenzen`, `lebensdokumente`, `werke`, `aufsatzablage`), and the document list groups by it. The example letter `o_szd.1222` stays at the root of `data/` as the start document, and the working set records it under correspondence.

### ADR-010 This repository holds the corrected TEI, starting from a working set

Context. szd-htr produces machine TEI for the four collections. Correcting it in a second place raises the question which copy is authoritative and how much enters the editor at first.

Choice. Taken by the session as a reversible default on 2026-10-30, after the operator left recommended defaults to the session, open to the operator's confirmation. A document imported from szd-htr is from then on maintained here, and szd-htr stays the producer of raw transcriptions without receiving corrections back. The first import is a working set of about ten documents per collection, chosen for the variety of their TEI profiles.

Rationale. One authoritative place avoids duplicate versions that drift apart. A working set is enough to settle the editorial rules on cases before the whole holdings are imported.

Effect. `tools/import-working-set.mjs` imports the selection of `tools/working-set.json` and records per document in `data/IMPORT.md` the szd-htr commit, whether the file is tracked there and the SHA-256 of the copied bytes. The hash matters because most szd-htr results are gitignored, so the commit alone does not identify the source. A rerun keeps files corrected here instead of overwriting them. Delivery to GAMS stays open until S5.

### ADR-011 The working state lives in revisionDesc

Context. ADR-006 distinguishes documents in progress from accepted ones, and ADR-008 requires the state to be visible.

Choice. Taken by the session as a reversible default on 2026-10-30, open to the operator's confirmation. `revisionDesc/@status` carries `draft` or `approved`, and acceptance adds a `change` naming who accepted and when. The checked state between them is computed by the editor and not stored.

Rationale. The state travels with the file, and Git shows an acceptance as a diff of the document itself, so no second list has to be kept in step.

Effect. Built with FR-16, where a missing `revisionDesc` counts as `draft` and acceptance creates it. The built `change` records the date only and leaves the person out, because who may accept and how that person is named are part of the editorial rules of S4. The document index reads the status, so the list shows accepted documents without opening them.
