# teiCrafter SZD

A minimal TEI editing environment for letters of [Stefan Zweig Digital](https://stefanzweig.digital),
derived from the idea of [teiCrafter](https://github.com/DigitalHumanitiesCraft/teiCrafter):
TEI source on the left, the facsimile in an OpenSeadragon viewer on the right.

## What it does

- Opens a TEI file (the example letter `data/o_szd.1222.tei.xml` loads on start) and checks
  well-formedness while you type.
- Loads images into the viewer from a IIIF Presentation manifest (v2 or v3), a IIIF Image API
  `info.json` or service URL, or a plain image URL. For SZD documents the GAMS manifest is
  derived from `idno[@type="objectId"]`.
- The facsimile follows the caret: the page shown is the last `<pb>` before it.
- Saves the edited TEI as a download.

## Structure

- `js/tei.js`, `js/iiif.js`, `js/viewer.js`: generic modules (TEI facts, IIIF resolution,
  viewer wrapper).
- `js/source.js`: everything specific to Stefan Zweig Digital. Another edition replaces this file.
- `vendor/openseadragon/`: vendored OpenSeadragon, see its `NOTICE.md`.

## Run

No build step. Serve the repository root and open it in a browser:

```
python -m http.server 8000
```

then http://localhost:8000/.

## Licence

Code under MIT, see `LICENSE`. The example letter is CC BY 4.0, see `data/NOTICE.md`.
OpenSeadragon is BSD-3-Clause.
