---
title: Journal
project:
  name: teiCrafter SZD
  repository: https://github.com/DigitalHumanitiesCraft/szd-teiCrafter
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
status: active
language: en
created: 2026-10-30
updated: 2026-10-31
authors: [Christopher Pollin]
generated-with: Claude Code (Claude Opus 5.5)
template:
  name: Vorlage Journal
  version: 0.6
  url: https://dhcraft.org/Promptotyping/promptotyping-document/journal
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-journal
related: [project, specification, handoff]
---

# Journal

## Entries

### 2026-10-31 Two code reviews worked through, knowledge curated, trial run prepared

- Trigger: the operator asked for an understanding of the whole editor, for its problems and for refactoring. Two independent reviewers read the modules in two halves without the implementer's verdict, and the operator asked to implement every proposal, to curate the knowledge base and to prepare a trial run as a simulated project.
- Found: the text view guard let through every transaction without a typing, deleting or moving event, so commenting out or copying a source line acted on hidden markup. The mark card removed tags at the positions of the moment it opened. Acceptance took two undo steps, could place a new `revisionDesc` before header content sharing its line, and was dated in UTC. The stored acceptance outlived later edits. Further defects lay in the register ranking, the comparison jump line, late facsimile, list and GND answers, CRLF offsets in the date dialog, the document index's status regex, open work across line breaks and the import record on a failed rerun.
- Changed: each defect fixed in its owning module with a unit or browser case, and three copies replaced by shared code, the guarded write loop for documents and registry, the result list of the person and place dialogs, and the mark description taken from the registry action. The specification's module map in ADR-002 is now the single list of module responsibilities, which CLAUDE.md and the README point to.
- Decided: the text view guard is an allow-list, because a deny-list misses every command CodeMirror adds. A text changed since its acceptance is saved as `draft`, as a reversible default under ADR-011, so the file never claims more than holds. Documents keep comparing the modification time before overwriting, because the stubbed handles of the browser check model disk changes by time, and moving to a content comparison would rebuild the safety cases for a rare gain. Leftover markers are counted as open work without an action, since resolving a deletion across lines needs the XML view.
- Evidence: `npm run check` passing in full after each step, unit tests first.
- Open: the operator's trial run, which also stands for the acceptance of S1 and S2, then the resume steps in [plan](plan.md#where-to-resume).

### 2026-10-30 Text view, action registry and revised documents dialog, paused for review

- Trigger: the Human User's decisions on the reading view („Nein, XML zuerst“, lines by `lb`, places „gleich mit“), his feedback on the documents dialog, and a scope extension for a date action and the actions as data.
- Changed: `js/textview.js` hides markup on the one CodeMirror state, configured by `source.textView` (ADR-012). `data/actions.json` with `js/actions.js` and `js/schema.js` makes the actions data, checked against the schema at load, with the settings view `js/settings.js` (ADR-013). New actions Ort (`js/place.js`, GND places through lobid-gnd) and Datum (`js/dates.js`, `js/datedialog.js`), the mark card `js/markcard.js`, the concept tooltips `js/concepts.js`, and the documents dialog with collections from `source.collections`, which both tools now read. The CodeMirror bundle was rebuilt with `StateField`, `StateEffect`, `Prec`, `RangeSet` and `WidgetType`, after the unchanged entry had rebuilt byte-identical. A selection across markup no longer reports in red on every pointer selection. ADR-010 now records the authority by part decided by the Human User and recorded in SZD-split `knowledge/governance.md` at `d2da6db4`, header and catalogue there, body here, merged and validated against the project ODD of SZD-split.
- Decided: the layout choice is remembered per kind of document, with and without `lb`, so the default by the document and the remembered choice both hold. The letters of the action registry's `key` field are menu keys active while the menu holds the focus. GeoNames stays out, because its API needs a registered user name. Below a 46rem pane the validation label and the layout labels give way to icons, and in the text view the well-formedness label as well. Refusals of harmless edits and selections use the neutral status tone.
- Evidence: `npm run check` in `test/` passing in full on 2026-10-30, 45 unit tests and 202 browser checks in about three minutes, after two runs that stopped on a slow GAMS manifest. Screenshots of the text view in lines, flowing and dark, the card, the place and date dialogs, the settings view and the documents dialog were written by the browser check and read.
- Open: the resume steps in [plan](plan.md#where-to-resume), from the Human User's review of the menu, the documents dialog and the actions dialog. The text view rebuilds its decorations on every edit, untimed in the largest works.

### 2026-10-30 Data safety of the save path and open work beyond the HTR markers

- Trigger: an adversarial review of the save path with repro scripts, and a role test in which documents with dozens of open spots read „Bereit zur Abnahme“.
- Found: a save that finished after another document was opened reset handle and name to the old file, so the next Ctrl+S wrote the new document into it. Undo crossed a document switch. Non-UTF-8 bytes were replaced silently and a byte order mark dropped. Acceptance inside the check's delay accepted an unvalidated text. A download counted as saved. Inserts into a CRLF file carried bare LF. `acceptanceEdits` duplicated a single-quoted status, broke on `>` in an attribute and wrote into a commented-out `revisionDesc`. Permission prompts fell between the disk comparison and the write. A text line „=======“ counted as a conflict. Mixed line endings misplaced error jumps. Title, state and facsimile of the previous document survived a malformed one. A menu action skipped the selection check. Open work counted only the three wrap markers.
- Changed: every finding fixed at its owning module and guarded by a unit test under `test/unit/` or a browser check, see [data safety guarantees](specification.md#data-safety-guarantees) and [testing](testing.md#what-is-guaranteed). Open work became a list of detectors in `js/source.js`, adding standalone `[?]`, gaps and bracketed HTR remarks without actions, and `data/index.json` was rebuilt.
- Decided: a lone conflict start or end marker still counts, because a leftover `>>>>>>>` line is well-formed text that would otherwise stay unnoticed, so only the separator line needs an open conflict. A download keeps the unsaved dot with the words „Als Download übergeben, Ankunft nicht bestätigt“. Mixed line endings stay byte-exact, with minority breaks drawn as placeholders. Only the last validation result is kept.
- Evidence: `npm run check` in `test/` passing in full on 2026-10-30. The unit tests and the new browser checks were also run against the code before the change, served from a copy, where the unit tests of acceptance, detectors, encoding and line endings failed and the browser checks failed for the held save, the permission order, undo across a switch, the overwrite window, byte order mark and Latin-1, title and facsimile after a malformed document, CRLF inserts, the mixed-ending status and jump, the debounce acceptance, the validation result after typing, the download state, the menu recheck and the reentrant question.
- Open: a lone conflict marker of a partial resolution stays counted by design, and the facsimile request of a previous document is not cancelled when a new one opens.

### 2026-10-30 One facsimile row, one status line, open work defined by the edition

- Trigger: operator, on the facsimile bar and the source field below it: „Ich glaube, dass man das elegant in eine Linie alles bringen kann“, asked for a better header and footer, and asked what an open spot means, since every derivation has its own annotation functions.
- Decided: open work is a definition of the edition held in `js/source.js`, here the HTR markers, and the counter's tooltip states it. This is a point where a derivation adapts the editor, recorded for the case register of the base.
- Changed: the source field opens inside the facsimile row in place of the view controls, the usage hint is the resting content of the status line and carries no shortcut, the title keeps one line, and product name, storage key and register example moved into the source configuration. [design](design.md#interaction-patterns).
- Corrected: the hint „Strg+.“ was read as Ctrl and plus, which zooms the code.
- Evidence: commits `c604952`, `feed71c`, `778d6a7`, `test/browser-check.mjs` passing on 2026-10-30.

### 2026-10-30 Module cut, new browser checks and knowledge in step

- Trigger: brief from the coordinating session to bring the knowledge base in step with the refactoring of `afbda2c`, the layout fix of `8efbfef` and the checks of `3082fea`.
- Changed: `afbda2c` split the interface code of `js/app.js` into `files.js`, `docs.js`, `state.js`, `menu.js`, `person.js`, `changes.js` and `ui.js`, leaving `app.js` as composition root, and moved the marker stripping of the name query into `person.nameOf` of `js/source.js`. `8efbfef` moved the narrow-pane container queries behind the rules they override, so they now apply, shortened the page label to „1/2“ in a narrow pane and kept the file actions at the right edge of a wrapping header. `3082fea` added browser runs for the document list, the working state with acceptance, an existing `revisionDesc` and every working-set document, made the check import `buildIndex()` so a stale `data/index.json` fails, and made the index resolve character references in titles. This curation rewrote ADR-002 as the module cut, widened the acceptance criteria of FR-14 to FR-17, replaced the gap list of testing with the covered categories and the remaining gaps, added the narrow page label, the header and an open question on identical check icons to design, and placed the slow first validation and the remaining edition strings in the plan.
- Found: generic modules still carry a few product and edition strings, namely the title fallback and acceptance note in `js/app.js`, the example identifier in `js/person.js` and the storage key in `js/split.js`. Saving a malformed document still has no browser case.
- Evidence: the code of `afbda2c`, `8efbfef`, `3082fea` and the current `js/`, `tools/` and `test/browser-check.mjs` read for every statement, and `npm run check` passing in full on 2026-10-30 in about two minutes.

### 2026-10-30 Knowledge base brought to the working set, document list and working state

- Trigger: brief from the coordinating session to curate the knowledge base after the commits since `8c9aa15`, which had added the hanging indent, the working-set import, the document list, the working state and acceptance without updating the documents.
- Found: the raw TEI has no `persName` in any body, works almost always carry `standOff` persons and correspondence never. A fourth HTR marker `[...]`, also as `[...n...]`, stands for illegible passages and is not counted as an open spot. The GAMS manifests of `o_szd.67` and `o_szd.174` are invalid JSON because of unescaped quotation marks in range labels, the manifest of `o_szd.2934` has a sixth canvas after its five TEI pages, four life documents in szd-htr carry `language/@ident="deu"`, and the szd-htr result `o_szd.2780` is not well-formed. ADR-011 promised that acceptance names who accepted, while the built `change` records the date only, and the save confirmation does not yet name the state as ADR-008 asks.
- Changed: data with the working set, the import provenance, the document index, the corrected subject, the fourth marker and the limits. Specification with FR-14 to FR-18, a document list section and the effects of ADR-006, ADR-009, ADR-010 and ADR-011. Design with the patterns for the list, the badge, acceptance, the unsaved dot, the selection and the start at the first page break. Plan with S2 and S3 built and open, the gap marker in S4, a Later section and the reading view as an open decision. Testing by category with a gaps section. README, CLAUDE.md commands and the terms Working set and Document index.
- Evidence: scans of the files under `data/` for `standOff`, `persName`, marker forms, languages and page counts, the GAMS manifests fetched and parsed on 2026-10-30, `o_szd.2780` parsed in the szd-htr clone at `fd9f924`, and the code of `8f382a5` and `faa8fbd` read for the described behaviour.

### 2026-10-30 Safe round trip, first part of S2

- Trigger: brief from the coordinating session to secure the fixes of `e4c227f` by regression checks and to build the S2 parts that need no further decision.
- Found: the fixes of `e4c227f` had no browser case, and the GND ranking depended on the live service. A stubbed file without a fixed modification time reads as changed on every save, so the stubs now carry one. A malformed file left the previous file name in the header.
- Changed: a line comparison with the text as opened or last saved (`js/diff.js`, button in the text toolbar), Git conflict markers explained in the problem list instead of the parser error, overwrite protection by the file's modification time with the choices cancel, save as new file and overwrite, and one question dialog that also replaced `confirm()` before discarding unsaved work. Conflicts went to the problem list rather than the F8 queue, because they make the document malformed and are resolved by deleting lines.
- Evidence: `test/browser-check.mjs`, all checks passing on 2026-10-30, including a lobid answer fixed by Playwright routing, and screenshots of the comparison and the conflict state in dark and light read by the implementer, commit `fe06885`.

### 2026-10-30 Selection, suggestion and process defaults

- Trigger: operator review of a person annotation in the browser, and the request for a process view in which only real operator decisions are asked.
- Found: the native selection recoloured selected text in dark mode, the base theme's lavender beat the editor theme in light mode, the person dialog kept its error after a valid choice, and lobid ranks persons matching only in relations above name matches.
- Corrected: drawn selection with matching specificity, Person suggested for a capitalised selection, the error cleared by a valid identifier, GND hits filtered to the best name match.
- Decided: operator: „Was heißt ‚empfohlen'? Also brauchst du jetzt wirklich meine Meinung, oder ist das eh klar?“ The session set ADR-010 and ADR-011 as reversible defaults. Only the editorial rules remain with the operator and the partners.
- Evidence: `test/browser-check.mjs`, all checks passing on 2026-10-30, commit `e4c227f`.

### 2026-10-30 Curation and milestone plan

- Trigger: operator: „kuratiere einmal das gesamte Wissen“, then a plan of projects, milestones, acceptance and verification, and a rule for when to research and when to ask.
- Decided: operator on saving: „Man muss schon immer speichern können, aber es muss irgendwie klar sein, was gültig ist“ (ADR-008). Operator on collections: the SZD editor becomes the working editor of the project, editions are not mixed, its collections follow the holdings (ADR-009). The medieval source is set aside until a derivation of its own is taken up.
- Corrected: the plan described a register of our own after ADR-007 had replaced it, kept the save gate the operator rejected, and listed answered decisions as open. Requirements now run in order, the person dialog section, NFR-02 and the user story on checking reflect the current editor, and project, data, INDEX, README and the action layer speak of the collections and the person index.
- Changed: [plan](plan.md) rewritten as milestones S1 to S6 with a three-step verification (browser check, independent agent review, operator acceptance) and a decision rule. Earlier milestone names M1 to M9 in entries below refer to the previous plan.
- Evidence: commit of this entry.

### 2026-10-30 Usability review by an independent agent

- Trigger: operator asked that subagents use the editor themselves and report what they learn, instead of the operator sending screenshots.
- Found: the reviewer drove seven user tasks in three viewports and both colour schemes. Verified by the main session before acting were that the page was 29 px taller than the viewport and that a marker selected by F8 lay partly outside the visible text. Further findings were unsaved work without protection, the menu opening on search selections, an English search panel, no visible focus in the person results, marker syntax in the person query, an outdated validation that looked like an unvalidated one, and toolbars wrapping at laptop width.
- Changed: unsaved-work mark, Ctrl+S and a question before closing, quoted selection in the menu placed below or above the line, wrapping by default with a hanging indent, menu only for pointer selection, Ctrl+. and F8, German search panel, keyboard navigation and focus in the person dialog, "Neu validieren" for an outdated result, refit of the facsimile on width change, workspace clipped to the viewport. [design](design.md#interaction-patterns), [testing](testing.md#what-is-guaranteed).
- Decided: the narrow-view switch between text and facsimile and localised parser messages wait, see [plan](plan.md#open-decisions-and-dependencies).
- Evidence: `test/browser-check.mjs`, all checks passing on 2026-10-30.

### 2026-10-30 Person index of Stefan Zweig Digital

- Trigger: operator: „gibt es Dinge, die du einfach selber durch Recherchen beantworten kannst?“ on the open question of person identity.
- Found: GAMS publishes the person index `o:szd.personen` under CC BY 4.0, and the SZD data repository references it as `https://gams.uni-graz.at/o:szd.personen#SZDPER.n`, with the fragment rule recorded in the vault document on the SZD data architecture. The first build read only part of the index, because some entries carry `corresp` before `xml:id`.
- Decided: ADR-007 supersedes ADR-005, annotation points to the index and falls back to the GND.
- Corrected: the build tool reads `xml:id` from any attribute position and reports skipped entries.
- Evidence: `test/browser-check.mjs`, all checks passing on 2026-10-30.

### 2026-10-30 Definition of done, team round trip and learning from cases

- Trigger: three conceptual questions to the operator on finished letters, derivation forms and person identity.
- Decided: operator: „Ein Brief ist fertig, wenn er formal wohlgeformt, gültig und genau ist und wenn er abgespeichert ist, also quasi abgenommen ist.“ Two working states, in progress and accepted (ADR-006). On derivations, operator: „Wenn wir ein paar Fälle haben, können wir die qualitativ beobachten, analysieren, diskutieren, ableiten, generalisieren und dadurch das insgesamt verbessern.“ Both forms stay as cases, and the teiCrafter base receives a case register through its handoff.
- Changed: [plan](plan.md) gains M8 safe round trip and M9 project page with their open decisions, [specification](specification.md#adr-006-definition-of-done-and-two-working-states) ADR-006.
- Evidence: the question on an existing Stefan Zweig Digital person register stays open with the operator.

### 2026-10-30 Actions at the selection and the open-work queue

- Trigger: operator: „was kannst du alles im UI direkt implementieren? und was testen wir dann? setze das um“.
- Decided: the action menu at the selection with Ctrl+., the HTR marker actions with suggestion and the F8 queue, and the toolbar order of M4. The person register waits for the operator's decision on its place.
- Found: the `hidden` attribute lost against `display: flex` of a toolbar, so the image source form was always visible while its check passed. A read-only comparison with the base and the Wenzelsbibel derivation found that auto-closing tags and the ungated save diverge from base invariants.
- Corrected: `[hidden]` is enforced in the reset layer and the check now asserts the hidden start state. `project.md` no longer claims LF normalisation for all files.
- Changed: [specification](specification.md) FR-09 and FR-10, [design](design.md#interaction-patterns), [plan](plan.md) open decisions on save gate and auto-closing tags.
- Evidence: `test/browser-check.mjs`, all checks passing on 2026-10-30.

### 2026-10-30 Knowledge base and back-flow

- Trigger: operator: „einen Knowledge-Ordner anlegen … quasi ein eigenes Promptotyping-Projekt“, and that the findings should flow back into the other teiCrafter repositories.
- Decided: functions carried by INDEX, project, specification, data, design, testing, plan, handoff, journal and the action layer. An architecture document is left out because the editor is a static site, and the module cut is recorded as ADR-002. The browser check moved from a session scratchpad into `test/`.
- Found: comparing with the teiCrafter base showed that normalising every file to LF would rewrite a partner's CRLF research file on commit, although nobody edited it. CodeMirror's `doc.toString()` joins lines with LF regardless of the configured separator.
- Corrected: the LF rule of the previous entry. Research data is now exempt from conversion, the editor keeps the line endings of the opened file and reads text through `sliceDoc`, see [ADR-004](specification.md#adr-004-git-repository-as-backend).
- Changed: [plan](plan.md) records the person register, the HTR marker actions and the toolbar order as accepted next steps. Generic findings went as handoff points to the teiCrafter base and the Wenzelsbibel derivation.
- Evidence: `test/browser-check.mjs` with a CRLF round trip, all checks passing on 2026-10-30.

### 2026-10-30 Code editor and person annotation

- Trigger: operator asked for fluent editing as in a desktop XML editor and for a concrete task, annotating persons with GND identifiers, downloading the result and checking it.
- Decided: CodeMirror 6 as a vendored bundle (ADR-003) after comparing Monaco, Ace, CodeMirror 5, Xonomy and LEAF-Writer. Operator stated the Git repository as backend for partners (ADR-004).
- Found: CodeMirror's base styles override layered application CSS, which made the gutter light in dark mode. Saving right after an annotation let the pending well-formedness check overwrite the save confirmation. The GND search for a surname alone ranks the intended person below others.
- Corrected: editor colours moved into the CodeMirror theme, saving runs the pending check first, `.gitattributes` fixes LF endings.
- Evidence: commits `7a4a493`, `94b90c4`.

### 2026-10-30 Checks, icons, rotation and split

- Trigger: operator review of the first version asked for blue and orange highlighting, a well-formedness button with status, validation, icons with tooltips, rotation and a movable split that hides the facsimile at the edge.
- Decided: validation against TEI All with libxml2-wasm and the TEI schema taken over from the teiCrafter base.
- Found: a narrow view collapsed the text box and viewer to zero height, because a later cascade layer overrode the media query.
- Evidence: commit `ae94827`.

### 2026-10-30 First editor

- Trigger: operator asked for a simple interface with OpenSeadragon on the right that loads images through IIIF, on a short Stefan Zweig letter as a freely licensed alternative to the Wenzelsbibel data.
- Decided: a new minimal repository instead of a full clone of the teiCrafter base, because the base was not yet cleanly derivable. Letter `o_szd.1222` chosen for its HTR markers and two pages. GAMS serves a IIIF manifest per object, so the manifest is derived from the object id.
- Evidence: commit `a930871`.
