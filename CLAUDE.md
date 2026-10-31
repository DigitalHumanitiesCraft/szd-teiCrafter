<!-- template: Vorlage Action-Layer v0.6, https://dhcraft.org/Promptotyping/promptotyping-document/action-layer -->

# Project instructions for teiCrafter SZD

teiCrafter SZD is a browser editor for TEI documents of the Stefan Zweig Digital collections with an IIIF facsimile, and a derivation of teiCrafter. Work follows Promptotyping, the documents in `knowledge/` hold specification and domain knowledge, and implementation follows from them. The operator decides on scope, design and acceptance.

## Knowledge base

Read `knowledge/INDEX.md` at every session start, then `knowledge/handoff.md`, then the documents relevant to the task. Consult `knowledge/journal.md` when the origin or reason of a decision is needed.

| Task | Read first |
|---|---|
| Requirements, decisions | `knowledge/specification.md` |
| Documents, working set, facsimile, persons | `knowledge/data.md` |
| Annotation rules | `knowledge/annotation.md` |
| Interface | `knowledge/design.md` |
| Checks | `knowledge/testing.md` |
| Next steps | `knowledge/plan.md` |
| Received input | `knowledge/handoff.md` |

## Working rules

- Handoff: read `knowledge/handoff.md` at session start, verify source and target of every point used, integrate durable content first, write the journal entry, then remove the point.
- Journal: one entry per coherent transition with the fields that have content. Status, open tasks and detailed results belong in their own documents.
- Keep edition specifics in `js/source.js` and the annotation actions in `data/actions.json`. A generic module that needs to know about Stefan Zweig Digital is a design error, report it.
- Place a change in the module that owns it. The module map in ADR-002 of `knowledge/specification.md` is the one list of module responsibilities; update it when a responsibility moves.
- Edits the application makes go through `editor.replace` or `editor.dispatch`, which mark them as application edits. The text view refuses every other command that changes the text unless it is typing, pasting, dropping, replacing or deleting.
- Never alter research data beyond the requested edit. Saving must keep every untouched byte, and the browser check proves it.
- No volatile numbers in this file or in `knowledge/`. Future work goes to `knowledge/plan.md`.

## Design principles

Value source: `knowledge/design.md`. Binding:

- Give source and facsimile the space, keep controls compact and named after their function.
- Keep a state that limits the next action visible where it applies until resolved.
- Disable an unavailable action and show its reason beside it.
- Never let colour carry meaning alone, and keep every action reachable by keyboard.
- Set colours inside the editor through the CodeMirror theme in `js/editor.js`.

## Scope

What you must not do:

- Introduce a build step, a runtime CDN or an API key (ADR-001).
- Add a Wenzelsbibel or other edition specific behaviour to this repository.
- Push, create the remote repository or enable Pages without the operator.

## Tooling

Check available tools, runtimes and network access before dependent steps, and name checks that were not run.

### Commands

- Serve: `python -m http.server 8000` in the repository root.
- Syntax: `node --check js/<module>.js` for every changed module.
- Browser check: `npm run check` in `test/` with the server running, required before each commit that changes behaviour. It takes about three minutes and fails first when `data/index.json` is stale.
- Size check: `npm run size` in `test/` with the server running, after a change that affects checking, validation or the text view; it is the source of the limits in NFR-05.
- CodeMirror bundle: rebuild per `vendor/codemirror/NOTICE.md`.
- Registers: `node tools/build-person-index.mjs` and `node tools/build-organisation-index.mjs` rebuild `data/register/szd-persons.json` and `szd-organisations.json` from GAMS.
- Working set: `node tools/import-working-set.mjs [szd-htr clone]` imports `tools/working-set.json` and records provenance in `data/IMPORT.md`. It keeps files corrected here.
- Proposals from an annotated copy: `node tools/proposals-from-copy.mjs <copy> --producer "llm-agent, model"` writes a proposal file beside the copy for review in the editor (ADR-016).
- Document index: `node tools/build-document-index.mjs` rebuilds `data/index.json` after an import or a commit that changes a document's state.

### Conventions

- Native ES modules, JSDoc for central shapes, design tokens in `css/app.css`, no inline styles except data-driven values.
- Git: work on main, stage files by explicit path, English imperative commit messages.

### Security

- Escape at every trust boundary; GND ids are validated before they enter markup.
- Research data whose licence is unclear stays out of the repository.
