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
- Browser path: `test/browser-check.mjs` drives Chromium through annotation, validation and saving and catches broken interaction, wrong markup and lost bytes.
- Visual review: screenshots of the changed states, read by the implementer and finally by the operator, catch layout and legibility problems no assertion describes.

## What is guaranteed

| Claim | Check |
|---|---|
| A marked name with a chosen GND hit or a typed id becomes the expected `persName` | browser check, preview text and editor content |
| The saved file equals the original plus exactly the inserted annotations | browser check, byte comparison after download |
| In-place saving writes once into the opened file and confirms it | browser check with a stubbed file handle |
| A file with CRLF line endings is saved with them unchanged | browser check with a stubbed CRLF file |
| The action menu appears at a selection and works by mouse and by Ctrl+. | browser check |
| F8 and Enter resolve every HTR marker, and the saved file equals the original transformed by the marker rules in `js/source.js` | browser check, byte comparison |
| Both pane toolbars stay on one row at half width, and the image source opens and closes on demand | browser check |
| The page fits the viewport, unsaved work is marked until saved, Ctrl+S saves, an edit after validation asks to validate again | browser check |
| A marker selected by F8 is fully visible and quoted in the menu | browser check |
| Malformed input is underlined and named on the check button | browser check |
| The annotated letter is valid against TEI All | browser check |
| Code zoom, element suggestions, the facsimile split and its edge button work | browser check |
| The narrow view has no horizontal page scroll | browser check at 390 px |
| The drawn selection is the theme's blue mix and selected element names keep their colour, in dark and light | browser check, computed styles of the selection layer and of `::selection` |
| A capitalised selection without markers suggests Person | browser check |
| The person dialog's request for a hit disappears once a valid identifier is typed | browser check |
| GND hits are limited to the best name matches | browser check against a fixed lobid answer routed by Playwright |
| The line comparison finds replaced, removed and added lines, and the view shows the annotated line before and after | Node assertions on `js/diff.js` and browser check |
| Unsaved work is not discarded by opening another file without a question | browser check |
| A file changed on disk is not overwritten without a question, cancelling writes nothing and keeps the text | browser check with a stubbed handle whose modification time changes |
| Git conflict markers are named, linked and underlined, and resolving them yields the chosen version byte for byte | browser check with a stubbed conflicted file |

## Acceptance

- Does the annotation write what an editor expects? Method: operator annotates persons in the example letter and reads the TEI. Level: professional.
- Does saving fit the Git workflow? Method: operator opens `data/o_szd.1222.tei.xml` from the clone, annotates, saves and runs `git diff`. Level: contextual.
- Does editing feel fluent? Method: operator works in the editor for a while. Level: professional.

## What is deliberately not checked

- The real file dialog of the File System Access API cannot be automated. The stubbed handle covers the code path, and the operator's acceptance covers the real dialog.
- Firefox and Safari are not driven. Their save path is the download, which run 1 covers in Chromium.
- 200 percent page zoom is not automated and belongs to the manual review.
- Ranking of the live lobid service is not asserted beyond the presence of the expected identity; the ranking rule itself runs against the fixed answer.

## How to run

```
python -m http.server 8000          # in the repository root
cd test && npm install && npx playwright install chromium   # once
npm run check                        # in test/, BASE_URL overrides the address
```

The check needs network access to GAMS and lobid.org and exits non-zero on any failure. With `SHOTS_DIR` set it writes screenshots of the comparison view, the overwrite question and the conflict state for the visual review.
