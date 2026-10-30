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
- Unit assertions: pure functions such as the line comparison and the conflict-marker detection are asserted in Node at the start of the browser check, without a page.
- Browser path: `test/browser-check.mjs` drives Chromium in several runs, namely the download path, in-place saving through a stubbed file handle, a file with CRLF line endings, working through every HTR marker, and a file with Git conflict markers. Each run also fails on console errors.
- Visual review: screenshots of the changed states, read by the implementer and finally by the operator, catch layout and legibility problems no assertion describes.

## What is guaranteed

The browser check covers these categories, each with real pointer and keyboard actions and visible outcomes.

- Byte fidelity. The saved file equals the original plus exactly the inserted annotations, a CRLF file keeps its line endings, and working through the markers yields the original transformed by the marker rules of the source configuration, each by byte comparison.
- Annotation. A marked name with an index hit, a GND hit or a typed id becomes the expected `persName` in the form of the holdings, forms of address leave the query, a capitalised selection suggests Person, and GND hits are limited to the best name matches against a lobid answer fixed by Playwright routing.
- HTR markers. The open spots are counted, F8 selects a marker fully visible and quoted in the menu, Enter applies the suggested action, and the document stays well-formed and valid.
- Checks. Malformed input is underlined and named on the check button, the annotated letter is valid against TEI All, and an edit after validation asks to validate again.
- Saving and protection. In-place saving writes once and confirms it, Ctrl+S saves, unsaved work is marked until saved, opening another file and overwriting a file changed on disk both ask first, and cancelling writes nothing.
- Comparison and conflicts. The line comparison shows an annotated line before and after and returns to the text by a line link, and conflict markers are named, linked and underlined, with the resolved file keeping exactly the chosen version.
- Layout and theme. The page fits the viewport, both pane toolbars stay on one row at half width, the narrow view at 390 px has no horizontal scroll, code zoom, element suggestions and the facsimile split with its edge button work, and the drawn selection carries the theme's blue mix in dark and light while selected element names keep their colour.

## Gaps

At commit `faa8fbd` the document list, the working-state badge, acceptance into `revisionDesc`, the start at the first page break and the hanging indent had no browser case, nor had saving a malformed document. The refactoring of the interface code that follows adds checks, and this list is brought into step with what it covers.

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

The check needs network access to GAMS and lobid.org and exits non-zero on any failure. With `SHOTS_DIR` set it writes screenshots of the comparison view, the overwrite question and the conflict state for the visual review.
