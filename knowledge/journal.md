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
updated: 2026-11-06
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

### 2026-11-06 Journal compacted

- Trigger: the journal had grown to one entry per work step for a single week and repeated what the specification, plan, data, design and testing documents hold.
- Changed: the sixteen entries of 2026-10-30 merged into five transitions, the entries of 2026-10-31 tightened where they repeated each other. Durable content was checked against the canonical documents before it was shortened, and operator quotes, corrections, commit hashes and decisions without another home were kept.
- Evidence: the previous wording is the state of `knowledge/journal.md` at commit `1c44b1e`.

### 2026-11-06 Trial run and agent evidence moved into the repository

- Trigger: operator: the trial run folder beside the repository and the repository were to be merged and tidied, and the repository is to become public with GitHub Pages.
- Changed: the agent runs and the review of `o_szd.1222` moved unchanged from `szd-teiCrafter-probelauf` to `evidence/annotation/` and `evidence/review/`, both manifests verified after the move. The trial run scripts and guide moved to `tools/trial-run/` with English file names, and their sandbox is now the ignored folder `trial-run/` in the repository. The shared annotation check became `tools/check-annotated-copy.mjs`.
- Decision: screenshots stay out of Git, because they show facsimile images whose licence is unconfirmed and the repository is to become public; they remain in the local clone. Earlier entries name the old folder as it was then.
- Evidence: both manifests pass with `sha256sum -c`, `tools/trial-run/setup.ps1` and `colleague-works.ps1` ran from the new location on 2026-11-06, `node --check` passes on the new check.
- Open: the old folder `szd-teiCrafter-probelauf` holds only the outdated sandbox clones and awaits deletion by the operator.

### 2026-10-31 Neutral check of the calibration letter

- Trigger: the four agent runs on the calibration letter `o_szd.1222` were to be compared by a check that does not know which agent proposed what, before the author decides in the review mode.
- Changed: outside the repository, in `szd-teiCrafter-probelauf/review/o_szd.1222/`, a review packet built deterministically from the four proposal files merges 91 proposals into 23 items, three of them with alternative candidates. The packet hides origin, frequency and reasoning, which `provenance.json` keeps for the reconciliation.
- Found: two independently instructed LLM agents checked the packet without knowing the proposals' origin and agreed on all 23 items. They accepted 20, rejected Hotel Westminster in the letter head and "New York" in the telegram address "Vikpress New York", and left the Kultusgemeinde open because the letter does not say which community is meant. Both named one missing mark, "Verlag" in „in den Verlag aufnimmt“ as Herbert Reichner Verlag (SZDORG.24), which none of the four annotation runs proposed. The rule already names „den Verlag“ as a generic word marked where the context settles the body, and the hybrid agent listed the passage as not marked because it is a generic word, so this is a rule not applied, not a gap in the rules.
- Found: the hybrid agent's proposal file contradicts its own record for the Kultusgemeinde. The proposal file carries `@ref` GND 123152-2, while its working copy, its decision record and its protocol remove the reference and leave the mark open. The packet followed the proposal file.
- Changed: a reconciled proposal file `o_szd.1222.vorschlaege.json` holds the 23 items and the missing mark, with the two rejections and the open Kultusgemeinde as `needs_expert` carrying both checks' reasons. The editor's importer places all 24, none stale, none refused.
- Evidence: agreement of two checks run with the same model is machine evidence only and accepts nothing. The author's decisions in the review mode are pending.

### 2026-10-31 Session close: all agent results reviewable

- Trigger: operator asked to close the session in order, finish what can be finished and update the knowledge bases and ACTIVE-WORK.
- Found: the menu's pattern for spanning line breaks had lost its backslash in a template string, so a `<lb>` with attributes was not spanned.
- Changed: one `lineBreakPattern` shared by menu and proposals, with a test. `tools/proposals-from-copy.mjs` turned the nine annotated copies of the direct and browser agents into proposal files, so all nine objects of the run, the calibration letter in four versions, can be reviewed in the editor. The knowledge documents were brought to this state, the superseded ADR-005 shortened, and handoffs written to the teiCrafter base and SZD-split.
- Evidence: unit tests and browser check passing on 2026-10-31, and every converted proposal placed by the importer.

### 2026-10-31 Review of agent proposals

- Trigger: operator accepted the recommendations of the provenance research with „ja“: roles declared in `titleStmt`, one review role, a changed proposal becomes the person's own annotation, dating only in the review log, proposal files beside the working copies.
- Decided: ADR-016. Proposals stay outside the text until a person decides each one, accepting writes `@resp` with producer and review, and the editor alone writes the review role.
- Found: TEI All accepts the three states and the declarations, and also a `@resp` pointer to nothing, so resolution needs a check of its own. The importer placed all 113 proposals the hybrid agent had written in its own format.
- Changed: `js/proposals.js` and `js/review.js`, a button that loads a proposal file, violet dashed proposals counted as open spots, the proposal card with Enter, Delete and „Ändern“, and the saved review log.
- Evidence: unit tests for anchoring, refusal, declarations and withdrawal, and a review run in the browser check, passing on 2026-10-31.

### 2026-10-31 Agent annotation run and the editor changes it called for

- Trigger: operator: „Direkt alles, was wir jetzt sofort umsetzen können, umsetzen“, after four LLM agents had annotated working copies of nine documents in the trial run, two directly in TEI, one through the editor alone and one proposing first and applying through the editor.
- Decided: operator, on the cases the agents left open: hotels, ships and streets are not marked in this stage, a place is linked for what is meant (`Amerika` as the United States), and a generic word for a body is marked only where the context makes the body unambiguous. The remaining cases follow the agents' common practice, recorded in [annotation](annotation.md).
- Found: on `o_szd.1222` the four agents agreed on element, span and value of all but three marks. They differed on whether a hotel in the letterhead is a body, whether „Kultusgemeinde“ may be linked to Vienna by inference, and which of two GND records of the Austrian postal savings bank applies in 1935. All four used the same model, rules and sources, so agreement does not establish correctness. Every agent met the same gaps in the editor: unlinked marks were not counted as open spots, organisations had no action, the place and date dialogs could not write the GeoNames link or `@cert`, selections across a line break were refused, persons could not be marked without a reference, and short GND identifiers such as `63291-0` were refused.
- Changed: each of these gaps closed, together with an Organisation action on the SZD organisation index, places taking GND and GeoNames from the GND record, a change prefilling the existing reference, exact GND hits first, and a date parser that reads English, French and Roman forms, completes incomplete dates from the document date as inferred and takes the document date from the title.
- Evidence: unit tests and browser check passing on 2026-10-31. The agents' results and protocols lie in the trial run folder outside the repository.

### 2026-10-31 Annotation rules and the agentic layer

- Trigger: operator asked how persons, places and dates are annotated, then for agents that annotate documents through the editor, directly in TEI or in a hybrid way, to improve both the editor and the understanding of agent-supported annotation.
- Decided: the operator accepted the recommendations for the first stage, namely persons, organisations, places and dates without works, places referenced by GND and GeoNames together, unlinked entities as open spots that block acceptance, and incomplete dates inferred from the letter date with `@cert="low"`, recorded in [annotation](annotation.md). The operator named the agents working beside the editor an agentic layer that is optional (ADR-015).
- Found: `persName/@ref` in the Stefan Zweig Digital holdings carries only `#SZDPER.n` or a GND URI, and the GAMS RDF transform appends `@ref` to the person index URI.
- Corrected: the editor wrote the full index URI, which ADR-007 had recorded as the holdings' form. It now writes `#SZDPER.n` and still reads the full form.
- Changed: four agents annotate working copies under the trial run folder, with a shared check that compares the text with the original and loads the file in the editor.
- Evidence: commit `98679a8`, unit tests and browser check passing on 2026-10-31.

### 2026-10-31 Validation in a worker, schemas strictest first, size limits named

- Trigger: the operator found the first validation slow and asked how large documents the browser can take. A measurement with synthetic documents up to 50 MB showed that the wait came from compiling TEI All on the main thread, independent of the document, and that the check after each typing pause and the text view grow with the whole text.
- Changed: validation and schema compilation run in a module worker that prepares the schema when the editor starts. The source configuration lists schemas strictest first with TEI All as the marked fallback, and a valid result names its schema. `test/size-check.mjs` makes the measurement repeatable, and the browser check asserts that the first validation leaves the editor responsive.
- Decided: the operator set the schema principle, the strictest available schema with TEI All as the last resort (ADR-014). Validation needs only the RELAX NG generated from the ODD, so the ODD stays in SZD-split. The size limits are stated as ranges in NFR-05, because the szd-htr results stay well below them and a redesign for very large documents is research, listed in the plan.
- Evidence: `npm run check` passing in full, and `npm run size` on 2026-10-31.

### 2026-10-31 Two code reviews worked through, knowledge curated, trial run prepared

- Trigger: the operator asked for an understanding of the whole editor, its problems and refactoring. Two independent reviewers read the modules in two halves without the implementer's verdict, and the operator asked to implement every proposal, to curate the knowledge base and to prepare a trial run as a simulated project.
- Found: the text view guard let through every transaction without a typing, deleting or moving event, so commenting out or copying a source line acted on hidden markup. The mark card removed tags at the positions of the moment it opened. Acceptance took two undo steps, could place a new `revisionDesc` before header content sharing its line, and was dated in UTC. The stored acceptance outlived later edits. Further defects lay in the register ranking, the comparison jump line, late facsimile, list and GND answers, CRLF offsets in the date dialog, the document index's status regex, open work across line breaks and the import record on a failed rerun.
- Changed: each defect fixed in its owning module with a unit or browser case, and three copies replaced by shared code, the guarded write loop for documents and registry, the result list of the person and place dialogs, and the mark description taken from the registry action. The module map in ADR-002 became the single list of module responsibilities, which CLAUDE.md and the README point to.
- Decided: the text view guard is an allow-list, because a deny-list misses every command CodeMirror adds. A text changed since its acceptance is saved as `draft`, as a reversible default under ADR-011, so the file never claims more than holds. Documents keep comparing the modification time before overwriting, because the stubbed handles of the browser check model disk changes by time, and moving to a content comparison would rebuild the safety cases for a rare gain. Leftover markers are counted as open work without an action, since resolving a deletion across lines needs the XML view.
- Evidence: `npm run check` passing in full after each step, unit tests first.

### 2026-10-30 Text view, action registry, data safety of the save path and open work defined by the edition

- Trigger: operator, on the facsimile bar and the source field below it: „Ich glaube, dass man das elegant in eine Linie alles bringen kann“, with the question what an open spot means, since every derivation has its own annotation functions. Then an adversarial review of the save path with repro scripts, a role test in which documents with dozens of open spots read „Bereit zur Abnahme“, the Human User's decisions on the reading view („Nein, XML zuerst“, lines by `lb`, places „gleich mit“), his feedback on the documents dialog, and a scope extension for a date action and the actions as data.
- Decided: open work is a definition of the edition held in `js/source.js`, and the counter's tooltip states it, a point where a derivation adapts the editor, recorded for the case register of the base. A lone conflict start or end marker still counts, because a leftover `>>>>>>>` line is well-formed text that would otherwise stay unnoticed. A download keeps the unsaved dot with the words „Als Download übergeben, Ankunft nicht bestätigt“, mixed line endings stay byte-exact with minority breaks drawn as placeholders, and only the last validation result is kept. The layout choice of the text view is remembered per kind of document, with and without `lb`, the letters of the registry's `key` field are menu keys while the menu holds the focus, and GeoNames stayed out at this point because its API needs a registered user name.
- Corrected: the hint „Strg+.“ was read as Ctrl and plus, which zooms the code, so the resting status line carries no shortcut.
- Found: the save path had more than a dozen defects, among them a late save that redirected the next Ctrl+S into the previous file, undo across a document switch, silently replaced non-UTF-8 bytes and a dropped byte order mark, acceptance of an unvalidated text inside the check's delay, LF inserts into CRLF files and permission prompts between the disk comparison and the write. The full list became the [data safety guarantees](specification.md#data-safety-guarantees) and [testing](testing.md#what-is-guaranteed). Open work had counted only the three wrap markers.
- Changed: the source field opens inside the facsimile row, the title keeps one line, and product name, storage key and register example moved into the source configuration (commits `c604952`, `feed71c`, `778d6a7`). Every save path finding fixed at its owning module with a unit or browser case, and open work became a list of detectors in `js/source.js`. The text view `js/textview.js` hides markup on the one CodeMirror state (ADR-012), and `data/actions.json` with `js/actions.js`, `js/schema.js` and the settings view `js/settings.js` makes the actions data checked against the schema at load (ADR-013). New actions Ort and Datum, the mark card, the concept tooltips and the documents dialog with collections from `source.collections`. The CodeMirror bundle was rebuilt with `StateField`, `StateEffect`, `Prec`, `RangeSet` and `WidgetType`, after the unchanged entry had rebuilt byte-identical. ADR-010 now records the authority by part decided by the Human User and recorded in SZD-split `knowledge/governance.md` at `d2da6db4`.
- Evidence: the save path tests were also run against the code before the change, served from a copy, where they failed for each finding. `npm run check` in `test/` passing in full on 2026-10-30, 45 unit tests and 202 browser checks, after two runs that stopped on a slow GAMS manifest, and the screenshots of text view, card, dialogs, settings view and documents dialog read.
- Open: the facsimile request of a previous document is not cancelled when a new one opens.

### 2026-10-30 Safe round trip, working set and module cut brought into the knowledge base

- Trigger: briefs from the coordinating session to secure the fixes of `e4c227f` by regression checks and build the S2 parts that need no further decision, then to curate the knowledge base after the commits since `8c9aa15` and after the refactoring of `afbda2c`, the layout fix of `8efbfef` and the checks of `3082fea`.
- Found: the fixes of `e4c227f` had no browser case, the GND ranking depended on the live service, a stubbed file without a fixed modification time read as changed on every save, and a malformed file left the previous file name in the header. The raw TEI has no `persName` in any body, and a fourth HTR marker `[...]` marks illegible passages, see [data](data.md). ADR-011 promised that acceptance names who accepted, while the built `change` recorded the date only. Generic modules still carried a few product and edition strings.
- Changed: a line comparison with the text as opened or last saved (`js/diff.js`), Git conflict markers explained in the problem list, overwrite protection by modification time and one question dialog replacing `confirm()` (commit `fe06885`). Conflicts went to the problem list rather than the F8 queue, because they make the document malformed and are resolved by deleting lines. `afbda2c` split `js/app.js` into interface modules, left it as composition root and moved the marker stripping of the name query into `person.nameOf` of `js/source.js`, `8efbfef` made the narrow-pane container queries apply, and `3082fea` added browser runs for the document list and the working state and made a stale `data/index.json` fail. The knowledge documents were brought to the working set, document list, working state and module cut, with ADR-002 rewritten as the module cut and an open design question on identical check icons.
- Evidence: the GAMS manifests fetched and parsed and scans of the files under `data/` on 2026-10-30, the code of `8f382a5`, `faa8fbd`, `afbda2c`, `8efbfef` and `3082fea` read for every statement, `npm run check` passing in full on 2026-10-30.

### 2026-10-30 Usability review, process defaults and the milestone plan

- Trigger: operator asked that subagents use the editor themselves and report what they learn, instead of the operator sending screenshots. Then the operator's review of a person annotation in the browser with the request for a process view in which only real operator decisions are asked, and „kuratiere einmal das gesamte Wissen“ with a plan of projects, milestones, acceptance and verification and a rule for when to research and when to ask.
- Found: the reviewer drove seven user tasks in three viewports and both colour schemes. Verified by the main session before acting were that the page was 29 px taller than the viewport and that a marker selected by F8 lay partly outside the visible text. In the browser the native selection recoloured text in dark mode, the person dialog kept its error after a valid choice, and lobid ranked persons matching only in relations above name matches.
- Decided: operator: „Was heißt ‚empfohlen'? Also brauchst du jetzt wirklich meine Meinung, oder ist das eh klar?“ The session set ADR-010 and ADR-011 as reversible defaults, and only the editorial rules remain with the operator and the partners. Operator on saving: „Man muss schon immer speichern können, aber es muss irgendwie klar sein, was gültig ist“ (ADR-008). Operator on collections: the SZD editor becomes the working editor of the project, editions are not mixed, its collections follow the holdings (ADR-009). The medieval source is set aside until a derivation of its own is taken up. The narrow-view switch and localised parser messages wait.
- Corrected: drawn selection with matching specificity, since the base theme's lavender had also beaten the editor theme in light mode, Person suggested for a capitalised selection, the error cleared by a valid identifier, GND hits filtered to the best name match (commit `e4c227f`). The plan had described a register of its own after ADR-007 replaced it, kept the save gate the operator rejected, and listed answered decisions as open.
- Changed: unsaved-work mark, Ctrl+S and a question before closing, the quoted selection in the menu placed below or above the line, wrapping with a hanging indent, the menu only for pointer selection, Ctrl+. and F8, a German search panel, keyboard navigation and focus in the person dialog, „Neu validieren“ for an outdated result, a refit of the facsimile on width change and the workspace clipped to the viewport, see [design](design.md#interaction-patterns). [plan](plan.md) rewritten as milestones S1 to S6 with a three-step verification (browser check, independent agent review, operator acceptance) and a decision rule. Milestone names M1 to M9 in the entries below refer to the previous plan.
- Evidence: `test/browser-check.mjs`, all checks passing on 2026-10-30.

### 2026-10-30 Knowledge base, selection actions, definition of done and person index

- Trigger: operator: „einen Knowledge-Ordner anlegen … quasi ein eigenes Promptotyping-Projekt“, with the findings flowing back into the other teiCrafter repositories, then „was kannst du alles im UI direkt implementieren? und was testen wir dann? setze das um“, three conceptual questions on finished letters, derivation forms and person identity, and „gibt es Dinge, die du einfach selber durch Recherchen beantworten kannst?“ on person identity.
- Decided: the knowledge functions carried by INDEX, project, specification, data, design, testing, plan, handoff, journal and the action layer, without an architecture document because the editor is a static site, the module cut recorded as ADR-002. The action menu at the selection with Ctrl+., the HTR marker actions with suggestion, the F8 queue and the toolbar order of M4. Operator: „Ein Brief ist fertig, wenn er formal wohlgeformt, gültig und genau ist und wenn er abgespeichert ist, also quasi abgenommen ist.“ Two working states, in progress and accepted (ADR-006), and M8 safe round trip and M9 project page added to the plan. On derivations, operator: „Wenn wir ein paar Fälle haben, können wir die qualitativ beobachten, analysieren, diskutieren, ableiten, generalisieren und dadurch das insgesamt verbessern.“ Both forms stay as cases, and the teiCrafter base receives a case register through its handoff. ADR-007 supersedes ADR-005, annotation points to the GAMS person index `o:szd.personen` and falls back to the GND.
- Found: normalising every file to LF would rewrite a partner's CRLF research file on commit, and CodeMirror's `doc.toString()` joins lines with LF regardless of the configured separator. The `hidden` attribute lost against `display: flex` of a toolbar, so the image source form was always visible while its check passed. A read-only comparison with the base and the Wenzelsbibel derivation found that auto-closing tags and the ungated save diverge from base invariants. The first index build read only part of the index, because some entries carry `corresp` before `xml:id`.
- Corrected: the LF rule of the previous entry, research data is exempt and the editor keeps the line endings of the opened file, reading text through `sliceDoc` ([ADR-004](specification.md#adr-004-git-repository-as-backend)). `[hidden]` is enforced in the reset layer and the check asserts the hidden start state, and `project.md` no longer claims LF normalisation for all files. The build tool reads `xml:id` from any attribute position and reports skipped entries.
- Changed: the browser check moved from a session scratchpad into `test/`, and generic findings went as handoff points to the teiCrafter base and the Wenzelsbibel derivation.
- Evidence: `test/browser-check.mjs` with a CRLF round trip, all checks passing on 2026-10-30.

### 2026-10-30 First editor, checks and person annotation

- Trigger: operator asked for a simple interface with OpenSeadragon on the right that loads images through IIIF, on a short Stefan Zweig letter as a freely licensed alternative to the Wenzelsbibel data. His review of the first version asked for blue and orange highlighting, a well-formedness button with status, validation, icons with tooltips, rotation and a movable split, then for fluent editing as in a desktop XML editor and for annotating persons with GND identifiers, downloading the result and checking it.
- Decided: a new minimal repository instead of a full clone of the teiCrafter base, because the base was not yet cleanly derivable. Letter `o_szd.1222` chosen for its HTR markers and two pages, and the IIIF manifest derived from the object id. Validation against TEI All with libxml2-wasm and the TEI schema of the base. CodeMirror 6 as a vendored bundle (ADR-003) after comparing Monaco, Ace, CodeMirror 5, Xonomy and LEAF-Writer. Operator stated the Git repository as backend for partners (ADR-004).
- Found: a later cascade layer overrode the media query and collapsed the narrow view to zero height. CodeMirror's base styles override layered application CSS, which made the gutter light in dark mode. Saving right after an annotation let the pending well-formedness check overwrite the save confirmation. The GND search for a surname alone ranks the intended person below others.
- Corrected: editor colours moved into the CodeMirror theme, saving runs the pending check first, `.gitattributes` fixes LF endings.
- Evidence: commits `a930871`, `ae94827`, `7a4a493`, `94b90c4`.
