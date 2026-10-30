---
title: Design
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
  name: Vorlage Design
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/design
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-design
topics: ["[[Scholar-Centered Design]]"]
related: [specification, testing]
---

# Design

The editor is a working tool for long sessions in the source, closer to a desktop XML editor than to a publication site, and its interface gives the source and the image the space while controls stay compact.

## Design attitude

Source and facsimile are the content, and everything else is a control serving them. A state that changes what the user may do next, such as a malformed document or an outdated validation, stays visible at the place where it applies until its cause is resolved. Each control is named after its function, and an action that cannot work in the current state is disabled with its reason shown beside it. Colour supports meaning and never carries it alone. The visual identity is provisional, a neutral surface with a blue and orange pair chosen by the operator for XML highlighting, until a design decision for DHCraft tools replaces it.

## Design system

- Tokens: custom properties on `:root` in `css/app.css`, colours in `oklch()`, light and dark mode through `light-dark()`. Blue carries element names and the accent, orange carries attribute names.
- Editor colours: the CodeMirror theme in `js/editor.js` consumes the same tokens, because CodeMirror's base styles would override layered CSS.
- Icons: one inline SVG sprite in `index.html`, stroke icons in `currentColor`, each with an accessible name and a tooltip that appears on hover and on keyboard focus.
- Layout: two panes in a grid whose split is a custom property set by the separator, stacked below a narrow width.

## Interaction patterns

- Action at the selection. Marking text opens a small menu right below it with the annotation actions. The wrapping actions apply at once, while Person opens a short modal dialog that previews the resulting markup. Ctrl+. opens the menu from the keyboard, arrow keys move, Enter applies, Escape returns to the text.
- Open work as a queue. A counter in the text toolbar shows the HTR markers still in the text. F8 selects the next one and focuses its suggested action, so the letter is worked through with F8 and Enter.
- One toolbar row per pane. Each pane is a size container. In a narrow pane the check buttons keep icon and state colour and move their label to assistive technology, and file actions live in the header.
- Check buttons as status. The well-formedness and validation buttons show their state by icon and label and lead to the error on activation.
- Caret follows facsimile. Moving through the source turns the facsimile to the page of the preceding `pb`.
- Split as visibility control. Dragging the separator resizes the facsimile, dragging it to the edge hides it, and an edge button brings it back. The separator works with arrow keys, Home and End.
- Saving writes back. Saving targets the opened file and confirms where it wrote.

## Connection to the action layer

The derived rules for agents are in [CLAUDE.md](../CLAUDE.md#design-principles).
