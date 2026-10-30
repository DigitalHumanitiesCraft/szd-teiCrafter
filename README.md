# teiCrafter SZD

A minimal TEI editing environment for letters of [Stefan Zweig Digital](https://stefanzweig.digital),
derived from the idea of [teiCrafter](https://github.com/DigitalHumanitiesCraft/teiCrafter):
TEI source on the left, the facsimile in an OpenSeadragon viewer on the right.

## What it does

- Opens a TEI file (the example letter `data/o_szd.1222.tei.xml` loads on start) with
  blue/orange XML highlighting.
- Checks well-formedness while you type; the status button names the error line and jumps there.
- Validates against TEI All (P5 4.11.0) in the browser; each schema error links to its line.
- Loads images into the viewer from a IIIF Presentation manifest (v2 or v3), a IIIF Image API
  `info.json` or service URL, or a plain image URL. For SZD documents the GAMS manifest is
  derived from `idno[@type="objectId"]`.
- The facsimile follows the caret: the page shown is the last `<pb>` before it. Pages can be
  turned and rotated by 90 degrees.
- The split between text and facsimile can be dragged or moved with the arrow keys; dragging it
  to the right edge hides the facsimile, an edge button brings it back.
- Saves the edited TEI as a download.

## Structure

- `js/tei.js`, `js/iiif.js`, `js/viewer.js`, `js/highlight.js`, `js/validate.js`, `js/split.js`:
  generic modules.
- `js/source.js`: everything specific to Stefan Zweig Digital. Another edition replaces this file.
- `vendor/openseadragon/`, `vendor/libxml2-wasm/`, `schemas/tei-p5-4.11.0/`: vendored third-party
  material, each with its `NOTICE.md`.

## Run

No build step. Serve the repository root and open it in a browser:

```
python -m http.server 8000
```

then http://localhost:8000/.

## Licence

Code under MIT, see `LICENSE`. The example letter is CC BY 4.0, see `data/NOTICE.md`.
OpenSeadragon is BSD-3-Clause, libxml2-wasm MIT, the TEI schema CC BY 3.0 / BSD-2-Clause.
