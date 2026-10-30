---
title: Testing
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
  name: Vorlage Testing
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/testing
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-testing
related: [specification, design]
---

# Testing

The tests prove the editing task end to end in a real browser, because the risks of this editor sit in the interplay of code editor, dialog, network services and saving rather than in isolated functions. One script drives the user's path with real pointer and keyboard actions and checks visible outcomes and saved bytes.

## Test strategy

- Syntax: `node --check` on every module catches broken scripts before the browser is involved.
- Node assertions: at the start of the browser check, without a page, the line comparison and the conflict-marker detection are asserted, `data/index.json` is compared with what `buildIndex()` of `tools/build-document-index.mjs` produces from the current files, so a stale index fails, and `acceptanceEdits` is run on a header with an empty `<revisionDesc/>`, a case the browser runs cannot load because such a document is not valid TEI.
- Browser path: `test/browser-check.mjs` drives Chromium in several runs, namely the download path, in-place saving through a stubbed file handle, a file with CRLF line endings, working through every HTR marker, a file with Git conflict markers, the document list with the working state and acceptance, a fixture that already carries a `revisionDesc`, and loading every document of the working set from the list. Each run also fails on console errors.
- Visual review: screenshots of the changed states, read by the implementer and finally by the operator, catch layout and legibility problems no assertion describes.

## What is guaranteed

The browser check covers these categories, each with real pointer and keyboard actions and visible outcomes.

- Byte fidelity. The saved file equals the original plus exactly the inserted annotations, a CRLF file keeps its line endings, and working through the markers yields the original transformed by the marker rules of the source configuration, each by byte comparison.
- Annotation. A marked name with an index hit, a GND hit or a typed id becomes the expected `persName` in the form of the holdings, forms of address leave the query, a capitalised selection suggests Person, and GND hits are limited to the best name matches against a lobid answer fixed by Playwright routing.
- HTR markers. The open spots are counted, F8 selects a marker fully visible and quoted in the menu, Enter applies the suggested action, and the document stays well-formed and valid.
- Checks. Malformed input is underlined and named on the check button, the annotated letter is valid against TEI All, and an edit after validation asks to validate again.
- Saving and protection. In-place saving writes once and confirms it, Ctrl+S saves, unsaved work is marked until saved, opening another file and overwriting a file changed on disk both ask first, and cancelling writes nothing.
- Comparison and conflicts. The line comparison shows an annotated line before and after and returns to the text by a line link, and conflict markers are named, linked and underlined, with the resolved file keeping exactly the chosen version.
- Opening. The caret starts on the line of the first page break, the badge of the example letter names its open spots, and the save button carries the unsaved dot after an edit and loses it on saving.
- Document list. The list opens with every document of the index and marks the open one, search narrows it and the count says how many are shown, a collection chip shows that collection only and keeps the focus, and the state filter keeps the documents with open spots or the accepted ones. Choosing another document over unsaved work asks first, cancelling keeps the open document with its edit, and confirming loads the chosen document with its facsimile, whose manifest is requested and whose page label shows the new page count.
- Working state and acceptance. A document is followed from not validated through ready for acceptance and accepted to „seither geändert“ after an edit. The accept button appears only when ready, the saved file is the original plus exactly one `revisionDesc` with an approving `change` and stays valid against TEI All, validation keeps the accepted state, and the list shows it. A fixture whose `revisionDesc` already exists gets the status set on it instead of a second one and opens as accepted afterwards, and an empty `<revisionDesc/>` is filled with the `change` (Node assertion).
- Working set. Every document of the index loads from the list well-formed, without console errors and with the title the index records, and none takes more than 3 s from the click to the first frame with the checked text. Load and typing times of the largest documents are printed for the record without a threshold on typing.
- Document index. `data/index.json` is byte-equal to the output of `buildIndex()`, which resolves character references in titles.
- Layout and theme. The page fits the viewport, both pane toolbars stay on one row at half width and the facsimile toolbar also at 900 px, a wrapped line hangs right of the start of its content, the narrow view at 390 px has no horizontal scroll, code zoom, element suggestions and the facsimile split with its edge button work, and the drawn selection carries the theme's blue mix in dark and light while selected element names keep their colour.

## Gaps

- Saving a malformed document is not driven, although ADR-008 promises that saving works in every state. The download run makes the text malformed only after its last save, and every other run saves well-formed text.
- Reading at 200 percent page zoom is not automated, see below.
- The narrow check buttons, which show the same icon in their ok state (see [design](design.md#open-questions)), are only seen in the screenshots.
- The save confirmation does not name the working state yet (ADR-008), so no check exists for it.
- Overwrite protection by modification time is checked with a stubbed handle, and a file replaced with identical bytes and an earlier time stays outside it by design.

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
npm run check                        # in test/, BASE_URL overrides the address
```

The check needs network access to GAMS and lobid.org and exits non-zero on any failure. It begins with the Node assertions, so a stale `data/index.json` fails before a browser starts, and `node tools/build-document-index.mjs` brings it back in step. A full run takes about two minutes.

With `SHOTS_DIR` set it writes screenshots for the visual review, namely the comparison view and the conflict state in dark and light, the overwrite question in light, and the states start, docs (the open document list), ready and accepted, each in dark and light at 1440 and at 900 px width.
