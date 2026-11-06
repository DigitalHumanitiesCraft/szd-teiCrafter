---
title: Specification
project:
  name: teiCrafter SZD
  repository: https://github.com/DigitalHumanitiesCraft/szd-teiCrafter
status: draft
language: en
created: 2026-10-30
updated: 2026-11-06
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

- FR-01: The editor opens a TEI file in UTF-8 and shows its source with XML highlighting, line numbers and folding. Each opened document starts with its own undo history. The editor starts without a document and offers opening a TEI file or choosing one from the document list; until a document is open, saving, proposals and the working state are out of reach (operator, 2026-11-06). The parameter `?doc=` opens a TEI file under `data/` directly. Acceptance criterion: the start shows no document and no error, `?doc=data/o_szd.1222.tei.xml` opens the example letter, a file opened through the open action replaces it, undo after opening another document leaves that document unchanged, and a file that is not UTF-8 or declares another encoding is refused with a message while the open document stays.
- FR-02: Well-formedness is checked while typing. Acceptance criterion: a malformed position is underlined in the text, the check button names the line, and activating it moves the caret there.
- FR-03: The document can be validated against the strictest configured schema that loads, with TEI All as the fallback, in a worker that prepares the schema at start (ADR-014), so the interface stays responsive while it compiles. A valid result names the schema, and a fallback result says that it constrains little. Acceptance criterion: the first validation of a session leaves the editor responsive, each schema error is listed with a line link and underlined in the text, and any later edit marks the result as outdated. The result belongs to the exact text it ran on, so undoing back to that text shows it again, and a check pending from typing does not discard it.
- FR-04: The facsimile loads from a IIIF Presentation manifest (v2 or v3), a IIIF Image API service or a plain image URL, and for SZD objects the manifest is derived from the TEI. Acceptance criterion: the example letter shows its GAMS images without user input.
- FR-05: The facsimile follows the caret. Acceptance criterion: the shown page is the one whose `pb` precedes the caret.
- FR-06: A marked name becomes `<persName ref="…">` pointing to the entry of the Stefan Zweig Digital person index, found while typing, or to the GND for persons outside the index (ADR-007), or marked without a reference as an open spot. Acceptance criterion: the saved file differs from the original only by the inserted elements.
- FR-07: Saving writes back into the opened file where the browser supports the File System Access API, and downloads the file elsewhere. Saving is always possible, whatever state the document is in (ADR-008). Unsaved work is marked until saved, Ctrl+S saves, and closing the tab with unsaved work asks first. After a download the unsaved mark stays and the status says that arrival is not confirmed, and while a save runs no other document opens ([data safety guarantees](#data-safety-guarantees)). The save confirmation names the working state of the saved text. Acceptance criterion: after saving, `git diff` shows only the edits.
- FR-08: Text and facsimile share the width through a movable split, and the facsimile can be hidden and restored. Acceptance criterion: dragging to the right edge hides it, and an always visible edge button restores it.
- FR-09: A text selection offers its annotation actions in a menu at the selection, reachable with Ctrl+. and arrow keys. The actions come from the action registry `docs/data/actions.json` (ADR-013), here Person, Ort, Organisation, Datum, Streichung, Unsicher and Ergänzung. When the selection carries an HTR marker, the matching action is suggested and the marker syntax is removed on wrapping. A selection may span line breaks, so a name broken across lines becomes one element holding the `lb`. A pointer selection that spans other markup opens no menu and no message, and an explicit request names the reason in the neutral tone, in the text view in terms of paragraphs and marked passages, with the menu's actions disabled so the next letter typed changes nothing. Acceptance criterion: `~~x~~` becomes `<del>x</del>`, `x[?]` becomes `<unclear>x</unclear>`, `{x}` becomes `<add>x</add>`, dragging across paragraphs in the text view leaves the status line unchanged, and a name across a line break is marked as one `persName`.
- FR-10: The open work of the transcription is counted, and F8 or the counter selects the next spot and offers its action. Open work comprises the HTR markers of the wraps, three kinds without an encoding rule yet, a standalone `[?]` or `[?n?]`, a gap `[...]` or `[...n...]` and a bracketed HTR remark such as `[Randnotiz links:]`, every `~~`, `{` or `}` the wraps leave unresolved, such as a deletion running over a line break, and every person, organisation or place without `@ref` and every date without a value ([annotation](annotation.md)), all searched outside header, comments, CDATA and processing instructions. For a kind without an action the menu says that its rule is open, and Enter does nothing. On a mark without its reference F8 opens the card of the mark in the text view, whose „Ändern“ links it. Acceptance criterion: working through the example letter with F8 and Enter leaves no marker, the saved file equals the original transformed by the marker rules, and a document with gaps counts them and names the open rule when F8 selects one.
- FR-11: The changes since the document was opened or last saved can be shown as a line comparison before a commit. Acceptance criterion: after one annotation the view lists exactly one removed and one added line with their old and new line numbers, a line link returns to the text, and after saving the view reports no changes.
- FR-12: Git conflict markers are recognised when a file is opened and while editing, and explained as two versions of one passage. Start and end markers take Git's form, seven signs followed by a space and a label or by the line end, and count on their own, so a marker left from a partial resolution is still found. A line `=======` counts only after an open start marker, since elsewhere it is ordinary text. Acceptance criterion: the check button and the status name the first marker line, each marker line is listed with a link and underlined, and deleting one version with its markers leaves a well-formed document.
- FR-13: Saving in place never overwrites a file that changed on disk since it was opened or last saved without asking. Acceptance criterion: after the file's modification time changes, saving asks with the choices cancel, save as a new file and overwrite. Cancelling writes nothing and keeps the editor's text, overwriting writes it, and the next save writes without asking again. A change during a permission prompt or while the write stream opens aborts the stream and asks, through the write loop of the [data safety guarantees](#data-safety-guarantees).
- FR-14: A document list opened from the header offers the documents of the repository by collection, each with title, object id, pages, open spots and working state, searchable by title, shelf mark and object id and filterable by collection and by state (with open spots, in progress, accepted). Acceptance criterion: typing part of a title, shelf mark or object id narrows the list to the matching documents and the count names how many of all are shown, a collection chip shows only that collection, the state selector keeps only documents with open spots or only accepted ones, each collection heading names how many of its documents are accepted, the open document is marked, and choosing another document over unsaved work asks first, where cancelling keeps the open document with its edit and confirming loads the chosen one together with its facsimile.
- FR-15: The working state of the open document is shown in the header as a badge, namely in progress with its reason (not well-formed, the number of open spots, not yet validated), ready for acceptance, accepted, or accepted and changed since (ADR-006, ADR-008). Acceptance criterion: the badge follows every edit and validation, and its words name the state without relying on colour. A document with open spots names their number, one without open spots names the missing validation, a valid one reads ready for acceptance, validating an accepted document keeps it accepted, a file stored as accepted opens as accepted, and an edit after acceptance reads „Abgenommen | seither geändert“. Saving a text changed since its acceptance sets the stored status back to `draft` and says so in the confirmation, so a file never claims an acceptance of a text nobody accepted, and the document can be accepted again. Open spots count every kind of open work of FR-10.
- FR-16: A document that is well-formed, free of open spots and valid against TEI All can be accepted. Acceptance writes `revisionDesc/@status="approved"` and a dated `change` into the TEI, creating `revisionDesc` where it is missing as the last child of the header (ADR-011), in one transaction that one undo takes back, dated in the local calendar. Acceptance criterion: the accept action appears only in the ready state and disappears after accepting. The saved file equals the original plus one `revisionDesc` with `status="approved"` holding one `change` with the date in `@when` and `status="approved"`, and it stays valid against TEI All. A document that already has a `revisionDesc` gets the status set on it and the `change` added inside it, inside its `listChange` where there is one, instead of a second `revisionDesc`, and an empty `<revisionDesc/>` is opened to hold the `change`. The accept action first runs the pending well-formedness check and refuses unless the document is still ready, so an edit inside the check's delay is never accepted on an older validation. Tags in comments, CDATA and processing instructions do not count, a status in single quotes is replaced, and a `>` inside an attribute value does not end the tag. Acceptance reports success only when the parsed document then carries `status="approved"`, and it validates the accepted text again and reports an error if that text is invalid.
- FR-17: An opened document starts with the caret at its first page break, or at the start of the body where it has none. Acceptance criterion: after opening, the caret stands on the line of the first `pb`, the text pane shows it, and the facsimile its first page.
- FR-18: With line wrapping on, a wrapped line continues under the start of its own content plus a small hang. Acceptance criterion: a long indented line in the body wraps with its continuation indented beyond its first character.
- FR-19: A segmented control „XML | Text“ at the left of the text toolbar switches between the source and a text view of the same document (ADR-012). The text view shows only the body text in a book face with a reading measure, without line numbers, hides header, facsimile list and tags, draws a page break as a divider „Seite n“ that turns the facsimile on a click, and lets the facsimile follow the caret and the page in view. XML opens first, and the choice is remembered per browser. Acceptance criterion: after switching, no tag and no header text is visible, the selection is the same, an annotation made in the text view is undone from the XML view and redone, and a second page in the same browser opens in the text view.
- FR-20: The text view sets a document in lines, breaking at each `lb`, or in flowing paragraphs. A document with `lb` in its body opens in lines and one without in flowing text, and a changed choice is remembered per browser for each of the two kinds. Acceptance criterion: the example letter opens in lines, the same letter without `lb` in flowing text, and a letter opened after choosing flowing text keeps it.
- FR-21: Marked passages in the text view carry their own style, persons a blue underline, places a double underline, dates a thin underline, deletions a strike, additions raised, unclear readings a dotted underline, and open spots an orange dashed underline with a badge „?“ for an uncertain reading and „Lücke“ for a gap. Orange means open and nothing else. Hover or Enter on a marked passage opens a card with its kind, its identity from the person index or the GND, or „noch nicht verknüpft“, a note on attributes kept in the XML view, and the actions „Ändern“ and „Entfernen“. Escape returns to the text. Acceptance criterion: Enter on an annotated person shows its index identifier with the focus on the first action, „Entfernen“ unwraps the element in one undoable step, and Escape returns the focus to the text.
- FR-22: The action Ort marks a selection as `placeName`. Where the registry configures a lookup, the dialog searches the GND type PlaceOrGeographicName through lobid-gnd on request. A chosen GND identifier becomes `@ref`, together with the GeoNames identifier the GND record links in `sameAs`, separated by a space, and without one the place is marked without `@ref` and shown as „noch nicht verknüpft“. Acceptance criterion: „Nizza“ without identifier becomes `<placeName>Nizza</placeName>`, „Berlin“ with a GND hit becomes `<placeName ref="http://d-nb.info/gnd/4005728-8">Berlin</placeName>`, and the saved file differs from the original by exactly these elements.
- FR-23: The action Datum wraps a selection in `date` after a dialog that proposes an ISO value read from German, English, French and Roman forms such as „4.Januar 1935“, „June 6th. 1944“, „10 Juillet 1939“, „18.VI.1930“, „Mai 1924“ and „4.1.1935“, and completes incomplete and relative forms such as „am 10.“, „27.6.44“ or „im Herbst“ from the date of the document named in its title, proposed as inferred, in one of three forms, exact or partial (`@when`), range (`@from`, `@to`) and uncertain span (`@notBefore`, `@notAfter`). A date inferred rather than read is marked `@cert="low"` where the action declares `@cert`. Words around the date are offered for trimming, though not pre-selected when digits are left outside, an unreadable selection opens with an empty field, and only values of the form YYYY, YYYY-MM or YYYY-MM-DD that exist in the calendar are written. Acceptance criterion: „den 4.Januar 1935.“ proposes `1935-01-04` for the part „4.Januar 1935“, `1935-13` is refused with a reason, and the saved letter stays valid against TEI All.
- FR-24: A settings view „Aktionen“ in the header lists the entries of the action registry with a switch, label and letter key, and refused entries with their reason. Changes apply to the menu at once. Saving writes `docs/data/actions.json` in place when the repository folder was chosen and downloads it otherwise, with the protections of document saving. An action whose element or attributes the configured schema does not know is refused at load. Acceptance criterion: switching Streichung off removes it from the menu and names the switch at a `~~` marker, the saved registry differs only in that value, switching it on again saves the file byte-identical, and an added action for an element `foobar` is listed as refused and missing from the menu.
- FR-25: The action Organisation marks a selection as `orgName`, linked to the entry of the Stefan Zweig Digital organisation index found while typing, written as the GND of the entry or as the index URI for an entry without one, or to the GND type CorporateBody for bodies outside the index. Acceptance criterion: „Viking Press“ in the example letter offers the index entry first and becomes `<orgName ref="http://d-nb.info/gnd/10102943-3">Viking Press</orgName>`.
- FR-26: A proposal file of an outside producer, such as an LLM agent, can be loaded for the open document (ADR-016). Its proposals are anchored at their offsets or by text and context, shown in violet with a dashed outline without changing the text, and counted as open spots. F8 or a click opens the card of a proposal with element, identity, basis and doubt; Enter accepts it, writing the markup with `@resp` naming producer and review and declaring both roles in `titleStmt`, Delete rejects it, and „Ändern“ opens the action's dialog, whose result is the person's own annotation. A proposal that claims a review, carries `@resp` or an attribute outside its action, belongs to another document or no longer matches the text is not placed. An edit inside a proposal withdraws it, and a review log of the decisions can be saved. Acceptance criterion: in the example letter a file with two proposals and one claiming a review loads two, Delete rejects one without changing the text, Enter accepts the other with exactly its markup and the two declarations, the log names both decisions, and the result is valid against TEI All.

### Non-functional requirements

- NFR-01: The editor runs as static files without a build step. Measure: serving the folder `docs/` with any static server is enough, on GitHub Pages and GitLab Pages alike (ADR-017).
- NFR-02: No runtime CDN and no API key. Measure: all libraries and the person index are local files, and network calls go only to the IIIF service of the opened document and, on request, to lobid-gnd.
- NFR-03: Saving preserves every byte the user did not edit. Measure: the browser check compares the saved file with the original.
- NFR-04: Keyboard operation for every action, visible focus, light and dark mode, and a usable narrow view without horizontal page scrolling. Measure: the browser check and the acceptance list in [testing](testing.md).
- NFR-05: Document size. The editor is meant for documents up to about 1 MB, where checking, validation and the text view respond without a noticeable stall. Up to about 5 MB the XML view stays workable with a short stall after each typing pause, while the text view becomes sluggish. From about 20 MB the check after each pause takes seconds and the text view is unusable, so such documents are outside the editor's range until the research items in [plan](plan.md#later) are done. The largest document of the szd-htr results is well below 1 MB. Measure: `test/size-check.mjs`, last run on 2026-10-31.

### Data safety guarantees

The editor guarantees the following for the files it opens and saves. Each guarantee has a regression check named in [testing](testing.md#what-is-guaranteed).

- Saving writes exactly the editor text, and an unedited file is saved byte-identical, including a UTF-8 byte order mark and line endings of any kind or mixture.
- Only UTF-8 opens. Invalid bytes, UTF-16 and a declaration of another encoding are refused before the document replaces the open one, because decoding them would change characters on saving.
- Inserted line breaks, from typing, pasting, annotation actions or acceptance, take the document's line ending, which is the majority ending of the file. A file with mixed endings keeps them, the status names the mixture on opening, and lines are counted as the XML parser counts them, so error lines and jumps agree.
- A save belongs to the document it started on. While it runs, no other document opens, and a save that ends after a document change updates no state of the new document.
- Undo stays within the open document.
- In-place saving asks before overwriting a file changed on disk, also when the change falls between the comparison and the opened write stream. A failed write aborts the stream, so the file on disk stays as it was.
- A download keeps the text marked unsaved, because the browser may still cancel it.
- Acceptance happens only on a text whose validation is current, and only a recognised `revisionDesc` outside comments receives it. A text changed since its acceptance is saved as `draft`.
- A document chosen from the list opens only if it is still the latest request, and text typed while it loads is not replaced without asking again. Facsimile results for a document opened meanwhile are dropped.
- The text view changes nothing by itself. It works on the same editor state as the XML view, so saving, line endings, byte order mark, undo and the validation tied to the exact text hold unchanged in both views. Typed and pasted text becomes text, with `<`, `>` and `&` written as references, and Enter writes an `lb` in the document's line ending. Only typing, pasting, dropping, replacing, deleting, undo, redo and the application's own edits reach the document. Editor commands that act on source lines, such as commenting out or copying a line, are refused, because they would act on markup the view hides. An edit that would cut hidden markup or reach outside the body is refused with a calm status, only deletions that remove whole elements pass, and text typed at the visual end of a paragraph stays in that paragraph.
- Documents and the action registry are written through one loop, `guardedWrite` in `docs/js/files.js`, with write permission first, the file on disk compared before writing and again once the stream is open, a question before overwriting a changed file, and an aborted stream on failure. Documents compare the modification time, the registry its content. An unchanged registry is written back byte-identical.
- Annotation dialogs and the mark card act only on a passage that is still where it was when they opened, and edit positions are document positions also in a CRLF file.

Limits. Overwrite protection rests on the modification time, so a file replaced with identical time escapes it. A download cannot be confirmed at all. Minority line endings in a mixed file appear as marked placeholders inside an editor line, so the editor's line numbers can differ from the parser's in such a file, while the problem list and its jumps follow the parser. The validation result is kept for the last validated text only, so undoing to an earlier validated text asks for validation again.

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

Purpose. Editing the TEI source, in the XML view or the text view.

Data. The opened TEI file, see [data](data.md).

Interaction. Typing with auto-closing tags and element suggestions after `<`, search with Ctrl+F, folding, code zoom by buttons or Ctrl and mouse wheel, and line wrapping, on by default with the hanging indent of FR-18. The caret start, the checks, the action menu, the open-spot counter, the comparison and saving follow FR-17, FR-02, FR-03, FR-09, FR-10, FR-11 and FR-07. Questions before discarding or overwriting work appear in a modal dialog whose first, focused choice is the safe one.

Limits. Suggestions cover the element set of the source configuration. Schema-driven suggestions for all of TEI are not implemented. The comparison is line-based and compares with the text as opened or last saved in this session. A Git revision is not compared. Git conflicts appear in the problem list rather than the F8 queue, because they make the document malformed and are resolved by deleting lines. The limits of overwrite protection are under [data safety guarantees](#data-safety-guarantees).

### Document list

Purpose. Finding the next document to work on and seeing how far each collection is.

Data. `docs/data/index.json`, generated from the working set and the files, see [data](data.md#sources).

Interaction. A button in the header opens the list of FR-14 as a modal dialog. The search field is focused on opening, arrow keys move between it and the entries, and choosing an entry opens the document.

Limits. The list reflects the index as last built. Only the entry of the open document is updated from the editor, so the state of other documents changes in the list after the index is rebuilt. A document loaded from the list is saved by download or to a chosen file, and in-place saving needs the document opened from the local clone with the open action.

### Facsimile pane

Purpose. Reading the original beside the source.

Data. Images from the IIIF manifest of the object (FR-04).

Interaction. Page navigation, zoom in, zoom out and fit from the toolbar, rotation in 90 degree steps, and the image source behind an icon that opens its field in the toolbar row in place of the view controls. Following the caret and hiding and restoring through the split are FR-05 and FR-08.

Limits. Text and image are linked by page. Zones within a page are not linked.

### Person dialog

Purpose. Choosing the identity of a marked person (FR-06).

Data. The person index of Stefan Zweig Digital as a local file, and on request live results from lobid-gnd.

Interaction. The query is the selection without forms of address and HTR marker syntax. Typing searches the index at once, a button asks the GND as well, arrow keys move through both lists, a chosen result or a typed index or GND identifier fills the field, a preview shows the resulting markup, and applying inserts it.

Limits. Persons in neither the index nor the GND cannot be annotated with an identifier.

### Text view

Purpose. Reading and annotating the transcription without seeing tags (ADR-012).

Data. The open document, through the same editor state as the XML view.

Interaction. View and layout switch as in FR-19 and FR-20. Selection, action menu, F8, the counter and the dialogs work as in the XML view. Enter on a marked passage opens its card (FR-21), elsewhere it starts a new line with `lb`. Copying gives plain text.

Limits. Structure, header, attributes beyond those of the actions and conflicts are edited in the XML view, and the text view says so in place. A malformed document cannot enter it, and a document that becomes malformed there, for instance by undo, returns to the XML view with the reason. Two paragraphs cannot be joined in it. Decorations are rebuilt from the whole text on every edit, which the largest works of the working set will show first.

### Action settings

Purpose. Choosing which annotation actions the menu offers and how they are named.

Data. `docs/data/actions.json`, checked against the configured schema (ADR-013).

Interaction. A header button opens the list of FR-24. Each entry shows, after its switch, label and letter key, its element, dialog, views and the marker it resolves. A folder button chooses the repository for in-place saving.

Limits. Elements, attributes, dialogs and markers are edited in the file, and the view changes only switch, label and key. The schema check of ADR-013 does not decide whether an element may stand where an action puts it.

## Decisions

### ADR-001 Static site without a build step

Context. Project partners should run and host the editor without a toolchain, and the tool sits next to their research data.

Choice. Plain HTML, CSS and ES modules, with libraries vendored into `docs/vendor/`.

Rationale. A static site works from any web server and on GitHub or GitLab Pages, and stays maintainable without Node.

Effect. The application runs by serving its folder, which since 2026-11-06 is `docs/` rather than the repository root (ADR-017). The browser check needs Node and Playwright, which are limited to `test/`.

### ADR-002 Generic modules and one source configuration

Context. The editor is meant as a derivation of teiCrafter that other editions can repeat.

Choice. All edition-specific knowledge lives in `docs/js/source.js` and the data it points to, `docs/data/actions.json` among them. The source configuration holds the product name and storage key, the collections, the IIIF manifest rule, the element suggestions, the ordered list of schemas, the person index with its reference forms, the place references, the text view settings and the definition of open work. The other modules know no edition and name neither product nor element names of the edition.

Rationale. A derivation for another edition replaces one file and the registry, and the generic modules can later move into the teiCrafter base.

Effect. This module map is the one place that says which module owns what. A change goes into the module that owns it.

| Module | Owns |
|---|---|
| `docs/js/app.js` | Composition root: loads the registry, creates editor, viewer and dialogs and connects them, and keeps what concerns the open document as a whole, namely the checks and problem list, Git conflict explanation, the working-state badge with acceptance and its withdrawal on saving, the open-spot counter with F8, the facsimile of the open document, the view switch and `documentOpened` |
| `docs/js/files.js` | Opening, loading and saving in place or by download, `decodeXml` and `encodeXml` at the byte boundary, `guardedWrite`, the one write loop with overwrite protection that the registry uses as well, `mayDiscard`, the unsaved mark, Ctrl+S and `beforeunload` |
| `docs/js/state.js` | Pure working-state functions, `openSpots`, `workingState`, `acceptanceEdits`, `withdrawalEdits` and `storedStatus`, shared with the document index tool and the tests |
| `docs/js/actions.js`, `docs/js/schema.js` | Reading and checking the action registry, marker detectors, wrapping and attribute edits, and the check of actions against the RELAX NG schema |
| `docs/js/textview.js` | The text view on the one editor state, with its edit guard |
| `docs/js/markcard.js` | The card of a marked passage, described from its registry action |
| `docs/js/proposals.js`, `docs/js/review.js` | Proposals of an outside producer (ADR-016): reading and anchoring a proposal file, the editor state that holds and withdraws them, the declarations an acceptance adds, and the card, decisions and review log |
| `docs/js/docs.js`, `docs/js/menu.js`, `docs/js/person.js`, `docs/js/place.js`, `docs/js/datedialog.js`, `docs/js/settings.js`, `docs/js/changes.js` | Document list, action menu, authority dialog for persons and organisations, place and date dialogs, action settings and comparison dialog |
| `docs/js/editor.js` | The CodeMirror editor, its theme and the marking of application edits |
| `docs/js/validate.js`, `docs/js/validate-worker.js` | Choosing the schema of the source configuration (ADR-014) and validating against it in a module worker that keeps the compiled schema for the session |
| `docs/js/tei.js`, `docs/js/iiif.js`, `docs/js/viewer.js`, `docs/js/split.js`, `docs/js/gnd.js`, `docs/js/register.js`, `docs/js/diff.js`, `docs/js/dates.js` | TEI facts, IIIF resolution, image viewer, split, GND search, register search, line comparison, date parsing |
| `docs/js/concepts.js`, `docs/js/ui.js` | The defined terms of the tooltips, and shared helpers (`$`, `setStatus`, `ask`, `arrowNavigation`, `renderResults`) |

Open work is a list of detectors, each with a key, a label, a `find` function and an optional menu action, which `openWorkFor(actions)` in `docs/js/source.js` builds from the markers of the action registry, the kinds without an encoding rule and the marker syntax the actions leave unresolved (ADR-013). `docs/index.html` remains the edition's page and carries its title and placeholders.

### ADR-003 CodeMirror 6 as a vendored bundle

Context. A textarea with a coloured layer behind it could not support underlined errors, suggestions, folding or selection actions at reasonable cost. Working in the source should feel like a desktop XML editor.

Choice. CodeMirror 6, bundled once with esbuild into `docs/vendor/codemirror/codemirror.js`, with the recipe in `docs/vendor/codemirror/build/`.

Rationale. CodeMirror 6 provides these functions, is MIT-licensed, and the teiCrafter base already uses it. Bundling keeps ADR-001 intact. A later move to Vite changes import paths only, because the editor configuration stays the same.

Effect. Editing, diagnostics and suggestions work. Colours inside the editor come from its theme in `docs/js/editor.js`, because CodeMirror's unlayered base styles override the layered application CSS.

Rejected. Monaco is heavier and weak on narrow screens. Ace and CodeMirror 5 are older technology. Structured editors such as Xonomy serve clicking more than typing.

### ADR-004 Git repository as backend

Context. Partners need to share edited files without a server of their own.

Choice. Editor and research data live in one repository. Saving writes into the file opened from the local clone, and the team divides documents and exchanges them by commit and push.

Rationale. Git versions every change, needs no infrastructure beyond GitHub or a self-hosted GitLab, and keeps the data in plain TEI.

Effect. Simultaneous editing of one file is not supported, which the team handles by dividing documents. Research data under `docs/data/` is exempt from line-ending conversion in `.gitattributes`, and the editor saves with the line endings of the opened file, so a commit shows only the edits on any platform. This follows the byte-fidelity rule of the teiCrafter base. How new line breaks, mixed endings and a byte order mark are handled since 2026-10-30 is stated under [data safety guarantees](#data-safety-guarantees).

### ADR-005 GND URIs in persName/@ref

Status. Superseded by [ADR-007](#adr-007-the-person-index-of-stefan-zweig-digital-as-the-person-source) on 2026-10-30. It wrote `https://d-nb.info/gnd/ID` found through lobid-gnd. What survives is the reason for the live request: a lookup goes to lobid.org only when the user searches, because looking up an identity is the editing act itself.

### ADR-006 Definition of done and two working states

Context. The project list, the save display and a later project rule set all need to know when a document counts as finished. The operator answered for letters, and the rule applies to every collection.

Choice. Operator, 2026-10-30: „Ein Brief ist fertig, wenn er formal wohlgeformt, gültig und genau ist und wenn er abgespeichert ist, also quasi abgenommen ist.“ A letter is either in progress or accepted. Well-formed, valid against TEI All and free of open HTR spots are machine-checkable conditions. Accuracy against the facsimile is a human judgement, and acceptance is the act that records it.

Rationale. Two states reflect the working status without a workflow engine, and the machine conditions let the editor offer acceptance only when they hold.

Effect. ADR-011 places the state in `revisionDesc`, and the editor offers acceptance only when the machine conditions hold (FR-16). Who may accept is open in [plan](plan.md#open-decisions-and-dependencies).

### ADR-007 The person index of Stefan Zweig Digital as the person source

Context. ADR-005 wrote GND URIs directly. The question who owns a person's identity was answered by research on 2026-10-30: Stefan Zweig Digital keeps its own person index (`o:szd.personen`, CC BY 4.0) with index identifiers, GND and Wikidata links, life dates and name variants, and its holdings point to it as `#SZDPER.n`. A check on 2026-10-31 corrected the full URI first recorded here: `persName/@ref` in the holdings carries only `#SZDPER.n` or a GND URI, and the GAMS RDF transform appends `@ref` to the index URI.

Choice. Annotation points to the index entry. The GND is the fallback for persons outside the index, written as `http://d-nb.info/gnd/ID` like the holdings. The index is prebuilt into `docs/data/register/szd-persons.json` by `tools/build-person-index.mjs` and searched while typing, with forms of address ignored.

Rationale. The edition's own register carries persons without a GND record, corrects a wrong GND link in one place and is the form the Stefan Zweig Digital views resolve. A project register of our own would duplicate it. This supersedes ADR-005.

Effect. All three persons of the example letter, including the addressee whose GND search had failed on "Frau Meingast", are found in the index.

### ADR-008 Saving is always possible and the state is visible

Context. The teiCrafter base and the Wenzelsbibel derivation write only valid TEI. An editor who must stop in the middle of a correction would then lose the work or keep it outside the repository.

Choice. Operator, 2026-10-30: „Man muss schon immer speichern können, aber es muss irgendwie klar sein, was gültig ist. Wir müssen uns irgendwie visuell überlegen, dass man den Status vielleicht anzeigt.“ Saving never refuses. The state of the document, from not well-formed through well-formed, valid and free of open spots to accepted, is shown in the editor, named in the save confirmation and listed per document on the project page.

Rationale. Interrupted work belongs in the repository, where Git keeps it. Visibility instead of a gate keeps the distinction between unfinished and finished files.

Effect. This departs deliberately from the fail-closed gate of the base. The derivation contract records it as a case. Since 2026-10-30 a download, which cannot be confirmed, leaves the text marked unsaved (FR-07).

### ADR-009 Collections of the Stefan Zweig Digital holdings, one edition per derivation

Context. The operator asked for collections whose objects show their state and can be switched, and first considered a medieval manuscript as a second collection.

Choice. Operator, 2026-10-30: the SZD editor is developed as the real editor for the project and part of the Stefan Zweig Digital strategy, so editions are not mixed. Its collections follow the holdings, namely correspondence, life documents, works and the essay files, each with its own TEI profile. A medieval source becomes a derivation of its own when it is taken up.

Rationale. One source configuration per edition keeps ADR-002 intact, and the differing TEI profiles of the holdings already test the collection model.

Effect. Each collection is one folder under `docs/data/` (`korrespondenzen`, `lebensdokumente`, `werke`, `aufsatzablage`), and the document list groups by it. The example letter `o_szd.1222` stays at the root of `docs/data/`, where the checks open it through `?doc=`, and the working set records it under correspondence.

### ADR-010 Authority by part, starting from a working set

Context. szd-htr produces machine TEI for the four collections. Correcting it in a second place raises the question which copy is authoritative and how much enters the editor at first. SZD-split, the data repository of Stefan Zweig Digital, already holds the catalogue description of the same objects.

Choice. The import scope was taken by the session as a reversible default on 2026-10-30. A document imported from szd-htr is from then on corrected here, and szd-htr stays the producer of raw transcriptions without receiving corrections back. The first import is a working set of about ten documents per collection, chosen for the variety of their TEI profiles. Authority is divided by part, as the Human User decided on 2026-10-30 and SZD-split records in `knowledge/governance.md` (commit `d2da6db4` on its branch `gams-www-split`). SZD-split is authoritative for the TEI header and the catalogue description, this repository for the transcription body. Both parts are merged into one document and validated together against the project ODD (One Document Does it all, the TEI customisation format), which lives in SZD-split. Its generated RELAX NG schema and action catalogue are pinned in this repository, with a drift check against `docs/data/actions.json`.

Rationale. One authoritative place per part avoids duplicate versions that drift apart, and the catalogue stays with the archive staff who curate it. A working set is enough to settle the editorial rules on cases before the whole holdings are imported.

Effect. The import and its provenance record are described in [data](data.md#sources). A rerun keeps files corrected here instead of overwriting them, and keeps the provenance row of a document whose source cannot be read this time. The header of an imported file is the converter's until the merge with SZD-split is built, and corrections of the header belong in SZD-split. The ODD, the pinned schema and the drift check do not exist yet, so the editor checks against TEI All, the fallback of the schema list `source.schemas` (ADR-014). Delivery to GAMS stays open until S5.

### ADR-011 The working state lives in revisionDesc

Context. ADR-006 distinguishes documents in progress from accepted ones, and ADR-008 requires the state to be visible.

Choice. Taken by the session as a reversible default on 2026-10-30, open to the operator's confirmation. `revisionDesc/@status` carries `draft` or `approved`, and acceptance adds a `change` naming who accepted and when. The checked state between them is computed by the editor and not stored.

Rationale. The state travels with the file, and Git shows an acceptance as a diff of the document itself, so no second list has to be kept in step.

Effect. Built with FR-16, where a missing `revisionDesc` counts as `draft` and acceptance creates it. The built `change` records the date only and leaves the person out, because who may accept and how that person is named are part of the editorial rules of S4. The document index reads the status with `storedStatus` from `docs/js/state.js`, as the editor does, so the list shows accepted documents without opening them. Writing `draft` back when a text changed since its acceptance is saved (FR-15) was taken by the session as a reversible default on 2026-10-31 after the operator asked to implement the review's proposals, so the stored status never outlives the text it was given to. A dated `change` for the withdrawal is not written.

### ADR-012 The text view hides markup on the same editor state

Context. The operator asked for a reading view without visible XML, and the plan named three options, hiding tags inside the code editor, a separate rendered view, and a structured editor. The Human User answered on 2026-10-30 on the open points. On the first view: „Nein, XML zuerst“. On lines: „Ja, bei HTR möchte man schon die Zeilen haben. Sollte man nicht umschalten können und einfach beides haben können? ... Wenn ich Lines explizit annotiert habe, dann brauche ich die Lines. Wenn ich die nicht habe, dann brauche ich eher fließende.“ On places: „Nein, gleich mit“.

Choice. The text view is a presentation of the one CodeMirror state. A state field computes hidden ranges, which are drawn as replaced and treated as atomic, line classes for blocks and page lines, and marks for annotated passages and open spots. A transaction filter lets through application edits (user event `app`), undo and redo, checks typing, pasting, dropping, replacing and deleting by the rules under [data safety guarantees](#data-safety-guarantees), and refuses every other command. The mechanism lives in `docs/js/textview.js`, configured by `source.textView` in `docs/js/source.js` with the shown root element, the line, page and block elements, the mark labels and the badges, so the teiCrafter base and the Wenzelsbibel derivation can take it over. The answers above set the defaults of FR-19 and FR-20 and the place action of FR-22.

Rationale. One state keeps one text, one undo history and byte-exact saving without a conversion in either direction, so the data safety guarantees need no second proof. A rendered view would have needed a mapping back to the source for every edit.

Effect. Built with FR-19 to FR-22, unit tests on a state without a page and browser cases for annotation, undo across the switch, refusal, CRLF, layout and the malformed case. The editorial rules for places, which places are marked and with which authority, stay with the szd operator and the Human User (S4).

### ADR-013 Annotation actions as data

Context. The Human User decided on 2026-10-30 that the actions become a registry, so that a project can see and switch them and a later project ODD can be compared with them, and added the date action.

Choice. `docs/data/actions.json` lists per action its id, label, letter key, icon, element, attributes with their value lists, dialog (none, person, place or date), authority lookup, views, a suggest pattern and the HTR marker it resolves, as plain names, lists and patterns written as strings, without executable code. `docs/js/actions.js` reads and checks the registry, derives the open-work detectors, strips markers and writes elements and attributes. `docs/js/schema.js` reads element and attribute names, including attribute classes, from the RELAX NG text of the schema chosen from `source.schemas` (ADR-014), today TEI All, and an action the schema does not know is refused at load with its reason. The settings view of FR-24 edits switch, label and key and saves the file through the guarded path. The registry stays independent of any one schema, so a catalogue generated from the project ODD can later be compared with it name by name.

Rationale. A derivation changes its actions without code, the menu, dialogs, F8 notes and document index read one source, and refusing unknown markup at load keeps an action from writing what validation would reject.

Effect. `source.wraps` and `source.openWork` gave way to `openWorkFor(actions)` in `docs/js/source.js`, which the editor, the document index tool and the tests use. A switched-off action leaves its markers counted as open work, and F8 names the switch. The mark card takes its title, the attributes it shows and its dialog from the action that writes the element, and the place dialog writes through `wrap` like every other action. Which attributes the actions should write by default, such as `add/@place`, `del/@rend`, `unclear/@reason` and the normalisation of dates, are editorial rules for the ODD (S4) and stay undecided.

### ADR-014 The strictest available schema, TEI All as the fallback

Context. The first validation of a session froze the editor for several seconds. A measurement on 2026-10-31 showed that the time went into compiling TEI All, a RELAX NG of about one megabyte, while validating a letter against the compiled schema took a fraction of a second. TEI All also allows almost everything, so a document valid against it says little about the edition's rules.

Choice. Operator, 2026-10-31: „Mit einem kleineren Schema könnten wir hier die Ladezeit verkürzen, weil wir nur das Schema verwenden, das man sozusagen verwenden möchte. Je strenger ein Schema ist, desto besser. Also TEI All wäre eigentlich der Fallback.“ `source.schemas` lists the schemas strictest first, and the editor validates against the first one that loads. The project schema is the RELAX NG generated from the ODD, and the ODD itself stays in SZD-split as source and documentation, since validation needs only the generated schema. TEI All is the last entry, marked as fallback. Validation and the compilation of the schema run in a module worker, which the editor asks to prepare the schema as soon as it starts.

Rationale. A strict schema is smaller, so it compiles faster, and it rejects what the edition does not allow. The worker keeps the interface responsive whatever the schema costs, and preparing it at start means the first validation usually finds it ready. The action registry is checked against the same schema, so an action the project schema forbids is refused.

Effect. Until SZD-split provides the ODD, the list holds TEI All alone and every valid result says that it was checked against the fallback. Constraints of the ODD that RELAX NG cannot express, such as Schematron rules, would need a separate check. Whether acceptance should require the project schema once it exists is open in [plan](plan.md#open-decisions-and-dependencies).

### ADR-015 An agentic layer beside the editor

Context. On 2026-10-31 four LLM agents, started from a coding harness, annotated working copies of letters in the background by the rules of [annotation](annotation.md), some by editing the TEI directly, some by driving the editor headless, one by proposing first and applying through the editor. They read the same files, registers and authority services the editor uses and are measured by the same checks.

Choice. Operator, 2026-10-31: „Wir haben jetzt dieses Tool, und wir können über den AI Harness jetzt auch hineingehen und Agents beauftragen, die im Hintergrund die Daten updaten und uns damit die Schnittstelle erlauben. Wir haben hier einen agentischen Layer, den wir verwenden und überprüfen können. […] Das ist eine zusätzliche Funktionalität, man muss es aber nicht so verwenden.“ Agents work on the files in the repository from outside the editor, and the editor is the place where a person reviews, corrects and accepts their work. The editor needs nothing from the agents and stays fully usable without them.

Rationale. Files in Git, rules in the knowledge base and machine checks that run outside the browser give an agent the same interface a person has, so no agent integration has to be built into the editor. The editor keeps what an agent cannot provide, the reading against the facsimile and the act of acceptance (ADR-006).

Effect. Agent results stay in working copies outside `docs/data/` until a person has reviewed them ([annotation](annotation.md#producer)). How the editor shows that an annotation came from an agent, and how a person accepts or rejects it, was left open here and is decided in [ADR-016](#adr-016-proposals-are-reviewed-one-by-one-with-the-review-recorded-in-resp).

### ADR-016 Proposals are reviewed one by one, with the review recorded in @resp

Context. ADR-015 left open how the editor shows that an annotation came from an agent and how a person decides it. Research on 2026-10-31 compared the provenance contract of zbz-ocr-tei (decision E131 there, activities in `@resp` pointing to `respStmt`, verification bound to a person), the TEI Guidelines on `@resp`, `@cert` and `respStmt`, the proposal layer of the teiCrafter base and the review of suggestions in INCEpTION and Recogito.

Choice. Operator, 2026-10-31, accepting the recommendations. Proposals stay outside the text until a person decides each one. Accepting writes the markup with `@resp="#resp-agent-annotation #resp-editor-review"`, and the two roles are declared as `respStmt` in `titleStmt` on the first acceptance. There is one shared review role. A proposal that a person changes before accepting becomes the person's own annotation without `@resp`. A review is dated only in the review log, which the person saves beside the proposal file, next to the working copies. `@cert` keeps its meaning of an inferred date, and run metadata, the basis of each proposal and rejected proposals stay out of the TEI.

Rationale. Activities in `@resp` say who did what without an ordinal confidence scale, and they match the sister project, so both editions speak the same provenance language. Keeping proposals out of the text until accepted means a saved file never holds an undecided agent annotation, and a review cannot be claimed by the producer, since the editor alone writes the review role.

Effect. The header gains declarations in a part that SZD-split owns (ADR-010), so the project ODD has to allow `@resp` and `respStmt` there, and a Schematron rule should check that every `@resp` token resolves, since RELAX NG does not. The SZD agents identify persons and places themselves, unlike the closed candidate lists of zbz-ocr-tei, so the person's review is the only safeguard on an identification, and the card shows the producer's basis for it.

### ADR-017 The application is served from docs/

Context. The operator decided on 2026-11-06 to make the repository public and to publish the editor through GitHub Pages. Served from the repository root, Pages would also deliver the knowledge base, the frozen evidence, the tools and the tests.

Choice. Operator, 2026-11-06. The application lives in `docs/`, namely `docs/index.html`, `docs/css/`, `docs/js/`, `docs/data/`, `docs/schemas/` and `docs/vendor/`, and GitHub Pages publishes that folder. `knowledge/`, `evidence/`, `tools/` and `test/` stay at the repository root.

Rationale. GitHub Pages publishes either the root or `docs/` of a branch, so the second choice keeps the published site to what a reader of the editor needs, and internal notes, review evidence and working material are never served as pages.

Effect. ADR-001 holds inside `docs/`, which is served as the site root, so paths inside the application stay relative to it, such as `data/o_szd.1222.tei.xml` in the source configuration. Tools and tests stay at the root and address the application files under `docs/`. Research data under `docs/data/` keeps its exemption from line-ending conversion (ADR-004).
