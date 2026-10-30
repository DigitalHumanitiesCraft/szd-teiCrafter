---
title: Journal
project:
  name: teiCrafter SZD
  repository: https://github.com/DigitalHumanitiesCraft/szd-teiCrafter
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
status: active
language: en
created: 2026-10-30
updated: 2026-10-30
authors: [Christopher Pollin]
generated-with: Claude Code (Claude Opus 5.5)
template:
  name: Vorlage Journal
  version: 0.6
  url: https://dhcraft.org/Promptotyping/promptotyping-document/journal
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-journal
related: [project, specification, handoff]
---

# Journal

## Entries

### 2026-10-30 Definition of done, team round trip and learning from cases

- Trigger: three conceptual questions to the operator on finished letters, derivation forms and person identity.
- Decided: operator: „Ein Brief ist fertig, wenn er formal wohlgeformt, gültig und genau ist und wenn er abgespeichert ist, also quasi abgenommen ist.“ Two working states, in progress and accepted (ADR-006). On derivations, operator: „Wenn wir ein paar Fälle haben, können wir die qualitativ beobachten, analysieren, diskutieren, ableiten, generalisieren und dadurch das insgesamt verbessern.“ Both forms stay as cases, and the teiCrafter base receives a case register through its handoff.
- Changed: [plan](plan.md) gains M8 safe round trip and M9 project page with their open decisions, [specification](specification.md#adr-006-definition-of-done-and-two-working-states) ADR-006.
- Evidence: the question on an existing Stefan Zweig Digital person register stays open with the operator.

### 2026-10-30 Actions at the selection and the open-work queue

- Trigger: operator: „was kannst du alles im UI direkt implementieren? und was testen wir dann? setze das um“.
- Decided: the action menu at the selection with Ctrl+., the HTR marker actions with suggestion and the F8 queue, and the toolbar order of M4. The person register waits for the operator's decision on its place.
- Found: the `hidden` attribute lost against `display: flex` of a toolbar, so the image source form was always visible while its check passed. A read-only comparison with the base and the Wenzelsbibel derivation found that auto-closing tags and the ungated save diverge from base invariants.
- Corrected: `[hidden]` is enforced in the reset layer and the check now asserts the hidden start state. `project.md` no longer claims LF normalisation for all files.
- Changed: [specification](specification.md) FR-09 and FR-10, [design](design.md#interaction-patterns), [plan](plan.md) open decisions on save gate and auto-closing tags.
- Evidence: `test/browser-check.mjs`, all checks passing on 2026-10-30.

### 2026-10-30 Knowledge base and back-flow

- Trigger: operator: „einen Knowledge-Ordner anlegen … quasi ein eigenes Promptotyping-Projekt“, and that the findings should flow back into the other teiCrafter repositories.
- Decided: functions carried by INDEX, project, specification, data, design, testing, plan, handoff, journal and the action layer. An architecture document is left out because the editor is a static site, and the module cut is recorded as ADR-002. The browser check moved from a session scratchpad into `test/`.
- Found: comparing with the teiCrafter base showed that normalising every file to LF would rewrite a partner's CRLF research file on commit, although nobody edited it. CodeMirror's `doc.toString()` joins lines with LF regardless of the configured separator.
- Corrected: the LF rule of the previous entry. Research data is now exempt from conversion, the editor keeps the line endings of the opened file and reads text through `sliceDoc`, see [ADR-004](specification.md#adr-004-git-repository-as-backend).
- Changed: [plan](plan.md) records the person register, the HTR marker actions and the toolbar order as accepted next steps. Generic findings went as handoff points to the teiCrafter base and the Wenzelsbibel derivation.
- Evidence: `test/browser-check.mjs` with a CRLF round trip, all checks passing on 2026-10-30.

### 2026-10-30 Code editor and person annotation

- Trigger: operator asked for fluent editing as in a desktop XML editor and for a concrete task, annotating persons with GND identifiers, downloading the result and checking it.
- Decided: CodeMirror 6 as a vendored bundle (ADR-003) after comparing Monaco, Ace, CodeMirror 5, Xonomy and LEAF-Writer. Operator stated the Git repository as backend for partners (ADR-004).
- Found: CodeMirror's base styles override layered application CSS, which made the gutter light in dark mode. Saving right after an annotation let the pending well-formedness check overwrite the save confirmation. The GND search for a surname alone ranks the intended person below others.
- Corrected: editor colours moved into the CodeMirror theme, saving runs the pending check first, `.gitattributes` fixes LF endings.
- Evidence: commits `7a4a493`, `94b90c4`.

### 2026-10-30 Checks, icons, rotation and split

- Trigger: operator review of the first version asked for blue and orange highlighting, a well-formedness button with status, validation, icons with tooltips, rotation and a movable split that hides the facsimile at the edge.
- Decided: validation against TEI All with libxml2-wasm and the TEI schema taken over from the teiCrafter base.
- Found: a narrow view collapsed the text box and viewer to zero height, because a later cascade layer overrode the media query.
- Evidence: commit `ae94827`.

### 2026-10-30 First editor

- Trigger: operator asked for a simple interface with OpenSeadragon on the right that loads images through IIIF, on a short Stefan Zweig letter as a freely licensed alternative to the Wenzelsbibel data.
- Decided: a new minimal repository instead of a full clone of the teiCrafter base, because the base was not yet cleanly derivable. Letter `o_szd.1222` chosen for its HTR markers and two pages. GAMS serves a IIIF manifest per object, so the manifest is derived from the object id.
- Evidence: commit `a930871`.
