# teiCrafter SZD

A minimal TEI editing environment for letters of [Stefan Zweig Digital](https://stefanzweig.digital),
derived from the idea of [teiCrafter](https://github.com/DigitalHumanitiesCraft/teiCrafter):
TEI source on the left, the facsimile in an OpenSeadragon viewer on the right.

## What it does

- Edits TEI in a CodeMirror 6 code editor (the example letter `data/o_szd.1222.tei.xml` loads on
  start): blue/orange XML highlighting, line numbers, folding, auto-closing tags, search
  (Ctrl+F), element suggestions after `<` from the source configuration, code zoom (buttons or
  Ctrl + mouse wheel) and optional line wrapping.
- Annotates persons: mark a name, search the GND through lobid-gnd or enter a GND id, and the
  selection becomes `<persName ref="https://d-nb.info/gnd/…">`.
- Checks well-formedness while you type; the status button names the error line and jumps there.
- Validates against TEI All (P5 4.11.0) in the browser; each schema error links to its line.
- Loads images into the viewer from a IIIF Presentation manifest (v2 or v3), a IIIF Image API
  `info.json` or service URL, or a plain image URL. For SZD documents the GAMS manifest is
  derived from `idno[@type="objectId"]`.
- The facsimile follows the caret: the page shown is the last `<pb>` before it. Pages can be
  turned and rotated by 90 degrees.
- The split between text and facsimile can be dragged or moved with the arrow keys; dragging it
  to the right edge hides the facsimile, an edge button brings it back.
- Saves in place where the browser supports the File System Access API (Chromium): a file opened
  from a local clone of this repository is written back, ready to commit. Elsewhere saving
  downloads the file.

## Working with Git

Editor and research data live in the same repository. Each person clones it, opens a file from
`data/`, edits and saves it, then commits and pushes. This is not simultaneous collaboration, but
it lets a team divide documents and keeps every change versioned, on GitHub or a self-hosted
GitLab alike.

## Structure

- `js/editor.js`, `js/tei.js`, `js/iiif.js`, `js/viewer.js`, `js/validate.js`, `js/split.js`,
  `js/gnd.js`: generic modules.
- `js/source.js`: everything specific to Stefan Zweig Digital (GAMS manifest, element suggestions,
  person markup). Another edition replaces this file.
- `vendor/codemirror/`, `vendor/openseadragon/`, `vendor/libxml2-wasm/`, `schemas/tei-p5-4.11.0/`:
  vendored third-party material, each with its `NOTICE.md`. CodeMirror is a prebuilt bundle; its
  rebuild recipe is in `vendor/codemirror/NOTICE.md`.

## Run

No build step. Serve the repository root and open it in a browser:

```
python -m http.server 8000
```

then http://localhost:8000/.

## Project knowledge

Requirements, decisions, data, design, checks and the plan are kept in `knowledge/`, starting at
`knowledge/INDEX.md`. The browser check is described in `knowledge/testing.md`.

## Licence

Code under MIT, see `LICENSE`. The example letter is CC BY 4.0, see `data/NOTICE.md`.
CodeMirror is MIT, OpenSeadragon BSD-3-Clause, libxml2-wasm MIT, the TEI schema CC BY 3.0 / BSD-2-Clause.
