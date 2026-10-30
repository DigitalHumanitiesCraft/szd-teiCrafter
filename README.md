# teiCrafter SZD

A TEI editing environment for the documents of [Stefan Zweig Digital](https://stefanzweig.digital),
derived from the idea of [teiCrafter](https://github.com/DigitalHumanitiesCraft/teiCrafter):
TEI source on the left, the facsimile in an OpenSeadragon viewer on the right.

## What it does

- Lists the documents of the repository by collection (correspondence, life documents, works,
  essay files) in a searchable dialog with title, object id, pages, open spots and working state,
  filterable by collection and state. The example letter `data/o_szd.1222.tei.xml` loads on start,
  and an opened document starts at its first page break.
- Edits TEI in a CodeMirror 6 code editor: blue/orange XML highlighting, line numbers, folding,
  auto-closing tags, search (Ctrl+F), element suggestions after `<` from the source configuration,
  code zoom (buttons or Ctrl + mouse wheel) and line wrapping with a hanging indent.
- Annotates at the selection: a menu offers Person, deletion, uncertain reading and addition.
  Persons are found in the Stefan Zweig Digital person index while typing, or in the GND through
  lobid-gnd, and become `<persName ref="…">`. The HTR markers `~~…~~`, `[?]` and `{…}` are counted,
  and F8 walks through them with the matching action suggested.
- Checks well-formedness while you type and validates against TEI All (P5 4.11.0) in the browser;
  each error links to its line. Git conflict markers are explained as two versions of a passage.
- Shows the working state of the document in the header, from in progress (with its reason) to
  ready for acceptance and accepted. A document that is well-formed, free of open spots and valid
  can be accepted, which writes `revisionDesc/@status="approved"` and a dated `change` into the TEI.
- Loads images into the viewer from a IIIF Presentation manifest (v2 or v3), a IIIF Image API
  `info.json` or service URL, or a plain image URL. For SZD documents the GAMS manifest is
  derived from `idno[@type="objectId"]`. The facsimile follows the caret page by page, can be
  turned and rotated, and the split between text and facsimile can be dragged, moved with the
  arrow keys or used to hide the facsimile.
- Saves in place where the browser supports the File System Access API (Chromium): a file opened
  from a local clone of this repository is written back, ready to commit, and a file changed on
  disk is not overwritten without asking. Elsewhere saving downloads the file. Saving works in
  every state, unsaved work is marked on the save button, and the changes since opening or saving
  can be compared line by line before a commit.

## Working with Git

Editor and research data live in the same repository. Each person clones it, opens a file from
`data/`, edits and saves it, then commits and pushes. This is not simultaneous collaboration, but
it lets a team divide documents and keeps every change versioned, on GitHub or a self-hosted
GitLab alike. A document chosen from the list is saved by download or to a chosen file. To save
it in place, open it from the clone with the open button.

## Data and tools

- `data/<collection>/`: a working set of about ten documents per collection, imported byte-exact
  from the szd-htr pipeline. `tools/working-set.json` lists the selection with a reason per
  document, and `data/IMPORT.md` records per document the szd-htr commit and the SHA-256 of the
  source, because most szd-htr results are not tracked in git. From the import on, the documents
  are maintained here.
- `node tools/import-working-set.mjs [path to szd-htr]` imports the working set and writes
  `data/IMPORT.md`. It never overwrites a file that has been corrected here.
- `node tools/build-document-index.mjs` rebuilds `data/index.json`, the document list with title,
  pages, open spots and working state. Run it after an import and after commits that change a
  document's state.
- `node tools/build-person-index.mjs` rebuilds `data/register/szd-persons.json` from the person
  index at GAMS.

## Structure

- `js/`: generic modules for editor, TEI, IIIF, viewer, validation, comparison and interface,
  plus `js/source.js`, which holds everything specific to Stefan Zweig Digital (GAMS manifest,
  element suggestions, HTR marker actions, person index and reference forms). Another edition
  replaces this file.
- `vendor/codemirror/`, `vendor/openseadragon/`, `vendor/libxml2-wasm/`, `schemas/tei-p5-4.11.0/`:
  vendored third-party material, each with its `NOTICE.md`. CodeMirror is a prebuilt bundle; its
  rebuild recipe is in `vendor/codemirror/NOTICE.md`.
- `test/`: the browser check, the only place that needs Node packages.

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

Code under MIT, see `LICENSE`. The TEI documents are CC BY 4.0 per Stefan Zweig Digital, see
`data/NOTICE.md` and `data/IMPORT.md`.
CodeMirror is MIT, OpenSeadragon BSD-3-Clause, libxml2-wasm MIT, the TEI schema CC BY 3.0 / BSD-2-Clause.
