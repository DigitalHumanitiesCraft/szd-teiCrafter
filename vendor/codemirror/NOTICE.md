# CodeMirror 6

`codemirror.js` is a single ES module bundled with esbuild from the published npm packages
listed in `build/package-lock.json`, re-exporting the API surface in `build/entry.js`.

- Main packages: `@codemirror/view` 6.43.15, `@codemirror/state` 6.7.6, `@codemirror/language`
  6.13.1, `@codemirror/lang-xml` 6.1.0, `@codemirror/lint` 6.9.7, `@codemirror/autocomplete`
  6.20.4, `@codemirror/search` 6.7.2, `@codemirror/commands` 6.11.1, `@lezer/highlight` 1.2.5,
  with their dependencies `@lezer/common`, `@lezer/lr`, `@lezer/xml`, `style-mod`, `crelt`,
  `w3c-keyname`, `@marijn/find-cluster-break`.
- Upstream project: <https://codemirror.net/>
- Licence: MIT for every bundled package, reproduced in `LICENSE.txt`; the bundled licence
  comments are appended at the end of `codemirror.js`.

## Rebuild

In an empty directory outside the repository:

```
cp <repo>/vendor/codemirror/build/{entry.js,package.json,package-lock.json} .
npm ci
npx esbuild entry.js --bundle --format=esm --minify --legal-comments=eof --outfile=<repo>/vendor/codemirror/codemirror.js
```

To use a further CodeMirror export, add it to `build/entry.js` and rebuild.
