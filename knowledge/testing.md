---
title: Testing
project:
  name: teiCrafter SZD
  repository: https://github.com/DigitalHumanitiesCraft/szd-teiCrafter
status: draft
language: en
created: 2026-10-30
updated: 2026-10-31
authors: [Christopher Pollin]
generated-with: Claude Code (Claude Opus 5.5)
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Testing
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/testing
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-testing
related: [specification, design]
---

# Testing

The tests prove the editing task end to end in a real browser, because most risks of this editor sit in the interplay of code editor, dialog, network services and saving. One script drives the user's path with real pointer and keyboard actions and checks visible outcomes and saved bytes. Fast unit tests run first and cover the pure functions on text and bytes, where variants are cheaper to enumerate than in a browser.

## Test strategy

- Syntax: `node --check` on every module catches broken scripts before the browser is involved.
- Unit tests: `test/unit/*.test.mjs`, run by `node --test` as the first step of `npm run check` or alone with `npm run unit`. Each file covers the pure functions of one area, with the variants enumerated there:
  - `state.test.mjs`: acceptance edits on the header variants, withdrawal, the stored status, and the open-work detectors with the forms of the working set, the brackets they leave alone and marks without reference or date value.
  - `files.test.mjs`: the byte boundary of opening and saving, and the guarded write loop on a stubbed handle (unchanged, changed and kept, changed while the stream opens, failing write, newly chosen file).
  - `text.test.mjs`: line endings and the line-break filter, conflict markers, the jump line of the comparison, GND identifiers, IIIF labels and the path check of the index tool.
  - `actions.test.mjs`: loading and checking the registry against TEI All, its byte-exact round trip, marker stripping and wrapping, attribute edits, and dates in German, English, French and Roman forms with the completion from the document date.
  - `textview.test.mjs`: the text view on a CodeMirror state without a page, its layouts, escaping, the refusals of the guard including editor commands on source lines, typing at a paragraph end, Enter and copying.
  - `proposals.test.mjs`: placing proposals by offset, context and occurrence, across a line break but not across other markup, refusing a claimed review, a foreign attribute or another document, the declarations of an acceptance, and the withdrawal of a proposal by an edit.
  - `register.test.mjs`: the ranking of the person register search on the real index, and the reference forms of persons, organisations and places.
- Node assertions: at the start of the browser check, without a page, the line comparison and the conflict-marker detection are asserted, and `data/index.json` is compared with what `buildIndex()` of `tools/build-document-index.mjs` produces from the current files, so a stale index fails.
- Browser path: `test/browser-check.mjs` drives Chromium in several runs, namely the download path, in-place saving through a stubbed file handle, a file with CRLF line endings, working through every HTR marker, a file with Git conflict markers, the document list with the working state and acceptance, a fixture that already carries a `revisionDesc`, a data safety run with stubbed handles that log every disk access, a text view run, a review run, an action registry run, a documents dialog run, and loading every document of the working set from the list. Each run also fails on console errors.
- Size check: `test/size-check.mjs` (`npm run size`, server running) repeats the largest work of the working set inside its body up to given sizes and reports the check after a typing pause, validation with the schema prepared, the stall of the main thread during it, switching to the text view and the JS heap, plus the schema preparation once. It is the source of the limits in NFR-05 and runs on request, outside `npm run check`.
- Visual review: screenshots of the changed states, read by the implementer and finally by the operator, catch layout and legibility problems no assertion describes.

## What is guaranteed

The browser check covers these categories, each with real pointer and keyboard actions and visible outcomes.

- Byte fidelity. The saved file equals the original plus exactly the inserted annotations, a CRLF file keeps its line endings, and working through the markers yields the original transformed by the marker rules of the source configuration, each by byte comparison.
- Annotation. A marked name with an index hit, a GND hit or a typed id becomes the expected `persName` in the form of the holdings, forms of address leave the query, a capitalised selection suggests Person, and GND hits are limited to the best name matches against a lobid answer fixed by Playwright routing.
- Open work. The open spots are counted, F8 selects a marker fully visible and quoted in the menu, Enter applies the suggested action, and the document stays well-formed and valid. Gaps count as open work, the counter's tooltip names every kind, and F8 on a gap shows the note that its rule is open, suggests nothing, holds the focus on the menu and leaves the text unchanged on Enter.
- Checks. Malformed input is underlined and named on the check button, the annotated letter is valid against TEI All and the result names it as the fallback schema, the first validation of a session leaves the main thread without a long stall, and an edit after validation asks to validate again. A validation started right after typing stays shown after the pending check, and undoing back to the validated text brings back its result.
- Saving and protection. In-place saving writes once and confirms it with the working state, Ctrl+S saves, unsaved work is marked until saved, opening another file and overwriting a file changed on disk both ask first, and cancelling writes nothing. A download keeps the unsaved dot and says that arrival is not confirmed.
- Data safety. Choosing another document while a save waits for the disk is refused and the save completes into its own file. Undo after a document switch keeps the new document and still works within it. Permission is queried and requested before the disk comparison, which comes before the write stream. A change of the file while the stream opens aborts it and asks, and a failing write aborts the stream and keeps the text unsaved. A file with a byte order mark is saved byte-exact, a Windows-1252 file is refused while the open document stays, a malformed document opened after an accepted one shows its own name and state and no facsimile of the previous one, a save right after acceptance in a CRLF file keeps the acceptance, a save after a later edit withdraws it, and neither inserts a bare LF, and a file with mixed line endings is named on opening, reports and jumps to the parser's error line and is saved byte-identical. The fallback file input is cleared after each choice, an action on a selection that gained markup after the menu opened is refused, and a second question while one is open is answered as dismissed.
- Comparison and conflicts. The line comparison shows an annotated line before and after and returns to the text by a line link, and conflict markers are named, linked and underlined, with the resolved file keeping exactly the chosen version.
- Opening. The caret starts on the line of the first page break, the badge of the example letter names its open spots, and the save button carries the unsaved dot after an edit and loses it on saving.
- Document list. The list opens with every document of the index and marks the open one, search narrows it and the count says how many are shown, a collection chip shows that collection only and keeps the focus, and the state filter keeps the documents with open spots or the accepted ones. Choosing another document over unsaved work asks first, cancelling keeps the open document with its edit, and confirming loads the chosen document with its facsimile, whose manifest is requested and whose page label shows the new page count.
- Working state and acceptance. A document is followed from not validated through ready for acceptance and accepted to „seither geändert“ after an edit. An unknown element inserted and accepted within the check's delay is refused, and acceptance validates the accepted text again. The accept button appears only when ready, the saved file is the original plus exactly one `revisionDesc` with an approving `change` and stays valid against TEI All, validation keeps the accepted state, and the list shows it. A fixture whose `revisionDesc` already exists gets the status set on it instead of a second one and opens as accepted afterwards, and the header variants of acceptance are unit tests.
- Working set. Every document of the index loads from the list well-formed, without console errors and with the title the index records, and none takes more than 3 s from the click to the first frame with the checked text. Load and typing times of the largest documents are printed for the record without a threshold on typing.
- Document index. `data/index.json` is byte-equal to the output of `buildIndex()`, which resolves character references in titles.
- Review of proposals. A proposal file for the example letter loads two proposals and refuses one that claims a review, the proposals show without changing the text and count as open spots, F8 opens the card with the doubt and the focus on Annehmen, Delete rejects without changing the text, Enter accepts with exactly the markup and the two declarations, the saved log names both decisions, and the result is valid against TEI All.
- Text view. XML opens first and the switch defines both views. The text view hides header, tags and line numbers, opens the example letter in lines and shows page dividers, keeps the selection across the switch and the toolbar on one row at 1440 and 900 px. A pointer selection across paragraphs opens no menu and no message, and Ctrl+. explains it calmly in the words of the text view with the menu's actions disabled. A person annotated in the text view is the same markup as in XML and is undone from the XML view and redone, a deletion into hidden markup is refused with the calm status, typed `<` and `&` become references, Enter on a mark opens its card with the index identifier and Escape returns, „Entfernen“ unwraps in one undoable step, Enter elsewhere writes an `lb`, F8 and Enter apply the next action, and the saved file is byte-exact. A place without identifier and one from a fixed lobid answer with its GeoNames link, an organisation taken from the SZD organisation index as the GND of its entry, a name across a line break marked as one person without reference, „10.“ completed from the letter date as inferred, and a date trimmed from „den 4.Januar 1935.“ with an invalid value refused, are saved as exactly these elements and stay valid against TEI All. A document without `lb` opens in flowing text, a chosen layout is remembered for its kind, a CRLF letter annotated in the text view keeps CRLF, a malformed document stays in XML and names the reason, and the chosen view is remembered for a second page.
- Action registry. The menu and the settings list every action, switching Streichung off removes it from the menu, saves the registry with exactly that value changed into a stubbed repository folder and makes F8 name the switch at a `~~` marker, switching it on again saves the file byte-identical, and an added action for an unknown element is listed as refused and missing from the menu.
- Documents dialog. The heading of a collection carries its formal count line, a document with open spots shows them as a named icon, the add chip defines a collection and opens the setup steps, Escape closes the list, reopening selects the last search, and badge and counter carry their concept tooltips.
- Layout and theme. The page fits the viewport, both pane toolbars stay on one row at half width and the facsimile toolbar also at 900 px, a wrapped line hangs right of the start of its content, the narrow view at 390 px has no horizontal scroll, code zoom, element suggestions and the facsimile split with its edge button work, and the drawn selection carries the theme's blue mix in dark and light while selected element names keep their colour.

## Gaps

- The text view rebuilds its decorations from the whole text on every edit. Typing in the largest works is not yet timed in the text view.
- The mark card on pointer hover and the page divider click are only seen in screenshots, while Enter on a mark and the facsimile following the caret are driven.
- Saving a malformed document is not driven, although ADR-008 promises that saving works in every state. The download run makes the text malformed only after its last save, and every other run saves well-formed text.
- Reading at 200 percent page zoom is not automated, see below.
- The narrow check buttons, which show the same icon in their ok state (see [design](design.md#open-questions)), are only seen in the screenshots.
- Overwrite protection by modification time is checked with a stubbed handle, and a file replaced with identical bytes and an earlier time stays outside it by design. The real permission prompt of the browser is not driven, so the order of permission and comparison is proved only on the stub.
- The accept handler's refusal when acceptance edits do not yield `status="approved"` has no browser case. The state guard after a save that ends with another document open is unreachable from the interface while opening is refused during saving, and stays without a case.
- The races of a list load against typing, of a late facsimile and of a late GND answer are guarded in code without a browser case, since they depend on network timing.
- Rendering of minority line breaks as placeholders in a mixed file is only seen in a screenshot.
- Undoing an acceptance restores the text but not the proposal, and a rejection cannot be undone except by loading the file again. Both are by design of the state field and have no case.
- `tools/proposals-from-copy.mjs` has no automated test. On 2026-10-31 it converted the nine annotated copies of the agent run, and the importer placed every resulting proposal.
- The browser runs wait for the GAMS manifest of the example letter. A slow answer makes a run time out with a message naming the facsimile status, and a rerun then passes.

## Acceptance

- Does the annotation write what an editor expects? Method: operator annotates persons in the example letter and reads the TEI. Level: professional.
- Does saving fit the Git workflow? Method: operator opens `data/o_szd.1222.tei.xml` from the clone, annotates, saves and runs `git diff`. Level: contextual.
- Does editing feel fluent? Method: operator works in the editor for a while. Level: professional.

## What is deliberately not checked

- The real file dialog of the File System Access API cannot be automated. The stubbed handle covers the code path, and the operator's acceptance covers the real dialog.
- Firefox and Safari are not driven. Their save path is the download, which run 1 covers in Chromium.
- 200 percent page zoom is not automated and belongs to the manual review.
- Ranking of the live lobid service is not asserted beyond the presence of the expected identity, and the ranking rule itself runs against the fixed answer.

## How to run

```
python -m http.server 8000          # in the repository root
cd test && npm install && npx playwright install chromium   # once
npm run check                        # in test/, unit tests first, BASE_URL overrides the address
```

The check needs network access to GAMS and lobid.org and exits non-zero on any failure. It begins with the unit tests and then the Node assertions, so a stale `data/index.json` fails before a browser starts, and `node tools/build-document-index.mjs` brings it back in step. A full run takes a few minutes, and a run that stops on an exception still prints the checks it reached.

With `SHOTS_DIR` set it writes screenshots for the visual review, namely the comparison view and the conflict state in dark and light, the overwrite question in light, the mixed-ending error jump, the malformed document after an accepted one and the gap note in the menu in dark, and the states start, docs (the open document list), ready and accepted, each in dark and light at 1440 and at 900 px width.
