# teiCrafter SZD

A TEI editing environment for the documents of [Stefan Zweig Digital](https://stefanzweig.digital),
derived from [teiCrafter](https://github.com/DigitalHumanitiesCraft/teiCrafter): the TEI source
on the left, the facsimile in an OpenSeadragon viewer on the right. Editor and research data live
in one Git repository, so an edition team divides the documents, edits them in the browser and
exchanges the results by commit and push.

## What it does

- Lists the documents of the repository by collection (correspondence, life documents, works,
  essay files) in a searchable dialog with title, object id, shelf mark, pages, open spots and
  working state. The example letter `data/o_szd.1222.tei.xml` loads on start, and an opened
  document starts at its first page break.
- Edits TEI in a CodeMirror 6 code editor with highlighting, folding, search, element
  suggestions, code zoom and line wrapping, or in a text view of the same document that hides
  the markup and sets the text in lines or flowing paragraphs.
- Annotates at the selection by the rules in `knowledge/annotation.md`. A menu offers person,
  place, organisation, date, deletion, uncertain reading and addition. Persons and organisations
  are found in the Stefan Zweig Digital indexes or in the GND through lobid-gnd, places in the GND
  with their GeoNames link, and dates are proposed as ISO values, marked uncertain where inferred.
  A person, organisation or place without a reference and a date without a value count as open
  spots. The actions are data in
  `data/actions.json` and can be switched in the settings view. The HTR markers `~~…~~`, `[?]`
  and `{…}` and the other open work of the machine transcription are counted, and F8 walks
  through them.
- Checks well-formedness while typing and validates in the browser against the strictest schema
  configured in `js/source.js`, today TEI All (P5 4.11.0) as the fallback until the project schema
  exists. Validation runs in the background, so the editor never freezes. Each error links to its line, and Git conflict markers are explained as two versions of a
  passage.
- Shows the working state of the document, from in progress (with its reason) to ready for
  acceptance and accepted. Accepting writes `revisionDesc/@status="approved"` and a dated `change`
  into the TEI. A document saved after a change since its acceptance is stored as in progress
  again.
- Loads the facsimile from the GAMS IIIF manifest derived from `idno[@type="objectId"]`, or from
  any IIIF manifest, IIIF Image API service or image URL, and follows the caret page by page.
- Saves in place where the browser supports the File System Access API (Chrome, Edge): a file
  opened from a local clone is written back, ready to commit, and a file changed on disk is not
  overwritten without asking. Elsewhere saving downloads the file. Saving works in every state,
  names the working state, and the changes since opening can be compared line by line.

## Working as a team member

1. Clone the repository and serve its root, for instance with `python -m http.server 8000`, then
   open http://localhost:8000/ in Chrome or Edge.
2. Find a document with the document list. To save into your clone, open the file itself with
   the open button from `data/<collection>/` of your clone; a document chosen from the list is
   saved by download or to a chosen file.
3. Edit and annotate. Save with Ctrl+S at any point, also in an unfinished state; the status line
   names the state the file was saved in.
4. Check your changes with `git diff`, commit them with a message naming the document, and push.
   Pull before you start the next document, so that a colleague's commits arrive first. If a pull
   changed the file you have open, the editor asks before overwriting it.
5. When a document is free of open spots and valid, accept it and save. After commits that change
   a document's state, rebuild the document list with `node tools/build-document-index.mjs` and
   commit `data/index.json` with them.

Two people should not edit the same file at the same time. If a merge produces Git conflict
markers, the editor names them and the passage can be resolved in the XML view.

## Data and tools

- `data/<collection>/`: a working set of about ten documents per collection, imported byte-exact
  from the szd-htr pipeline. `tools/working-set.json` lists the selection with a reason per
  document, and `data/IMPORT.md` records the szd-htr commit and the SHA-256 of each source. From
  the import on, the documents are corrected here.
- `node tools/import-working-set.mjs [path to szd-htr]` imports the working set. It never
  overwrites a file that has been corrected here.
- `node tools/build-document-index.mjs` rebuilds `data/index.json`, the document list.
- `node tools/build-person-index.mjs` and `node tools/build-organisation-index.mjs` rebuild
  `data/register/szd-persons.json` and `szd-organisations.json` from the indexes at GAMS.

## Structure

- `index.html`, `css/`, `js/`: the editor, native ES modules without a build step. `js/source.js`
  and `data/actions.json` hold everything specific to Stefan Zweig Digital; another edition
  replaces these two files. The responsibilities of the modules are listed in ADR-002 of
  `knowledge/specification.md`.
- `tools/`: Node scripts for import and indexes.
- `vendor/`, `schemas/`: vendored CodeMirror, OpenSeadragon, libxml2-wasm and the TEI schema, each
  with its `NOTICE.md`.
- `test/`: unit tests, the browser check and the size check, the only place that needs Node
  packages (`cd test && npm install && npm run check`, with the server running). The editor is
  meant for documents up to about 1 MB and stays workable up to about 5 MB, see NFR-05 in
  `knowledge/specification.md`.
- `knowledge/`: requirements, decisions, data, design, checks and the plan, starting at
  `knowledge/INDEX.md`.

## Licence

Code under MIT, see `LICENSE`. The TEI documents are CC BY 4.0 per Stefan Zweig Digital, see
`data/NOTICE.md` and `data/IMPORT.md`. CodeMirror is MIT, OpenSeadragon BSD-3-Clause,
libxml2-wasm MIT, the TEI schema CC BY 3.0 / BSD-2-Clause.
