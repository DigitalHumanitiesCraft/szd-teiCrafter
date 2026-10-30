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
- Open work as a queue. A counter in the text toolbar shows what the edition counts as open work, here the HTR output still in the text. Its tooltip lists the kinds from the source configuration, so each derivation explains its own queue. F8 selects the next spot and focuses its suggested action, so the letter is worked through with F8 and Enter. A kind without an encoding rule, such as a gap, is selected as well, and the menu then says in a line below the quote that its rule is still open. No action is suggested, the focus rests on the menu itself, Enter does nothing, and F8 moves on.
- One toolbar row per pane. Each pane is a size container. In a narrow pane the check buttons keep icon and state colour and move their label to assistive technology, and the page label of the facsimile shortens to the form „1/2“, while the full sentence „Seite 1 von 2“ stays readable to screen readers. The container queries follow the rules they override, because source order decides within a CSS layer.
- The facsimile bar stays one row. The image source button opens the source field in the same row, where it takes the place of the page, zoom and rotation controls. The pressed button, Escape and a successful load close it again, so no second control is needed to fold it away.
- One status line per pane. Below the editor a single line carries messages, and while there is none it shows a short usage hint without shortcuts, because a written „Strg+.“ was read as Ctrl and plus and zoomed the code. Both panes therefore end at the same height.
- File actions in the header. Document list, open and save sit in the header and stay together at its right edge, also when the header wraps onto a second row. The document title keeps one line and shortens with an ellipsis.
- Check buttons as status. The well-formedness and validation buttons show their state by icon and label and lead to the error on activation. A validation result stays shown for exactly the text it ran on, so undoing back to that text brings back „TEI-konform“.
- Mixed line endings are visible. Opening a file that mixes them names the counts in the status line, and a break of the minority kind appears as a marked placeholder inside its editor line.
- A document without a facsimile shows none. When the opened document yields no manifest, for instance because it is not well-formed, the previous images, page label and source address are cleared and the source field opens.
- Caret follows facsimile. Moving through the source turns the facsimile to the page of the preceding `pb`.
- Split as visibility control. Dragging the separator resizes the facsimile, dragging it to the edge hides it, and an edge button brings it back. The separator works with arrow keys, Home and End.
- Saving writes back. Saving targets the opened file and confirms where it wrote. A download only says that the file was handed to the browser, keeps the dot, and the tooltip and the hidden status read „Als Download übergeben, Ankunft nicht bestätigt“ until the next edit. Unsaved work shows as an orange border and dot on the save button, whose tooltip then names the unsaved changes, while a visually hidden status carries the same words for assistive technology. Ctrl+S saves, and closing the tab with unsaved work asks first.
- Documents as a searchable list. A header button opens a modal list grouped by collection, with the search field focused, collection chips and a state selector above it. Each entry reads as title, then object id, pages and open spots separated by vertical bars, with a state tag on the right, and the open document is marked. Arrow keys move from the search field into the entries and back, and choosing an entry over unsaved work asks first.
- State as a badge. The header shows the working state as a rounded badge whose words carry the state and whose detail, after a vertical bar, names the reason, such as the number of open spots or a missing validation. Colour adds to the words, blue for ready, green for accepted, orange for accepted and changed since, red for not well-formed.
- Acceptance as a deliberate act. The accept button appears beside the badge only in the ready state. Accepting writes into the text like any edit, so it shows in the comparison and becomes durable only by saving, which the status sentence says.
- Questions protect work. Opening another document over unsaved work and saving over a file that changed on disk ask in a modal dialog. The safe choice comes first and holds the focus, so Enter and Escape never lose text, and the editor's text survives every answer.
- Changes before a commit. An icon button in the text toolbar opens the line comparison with the text as opened or last saved. Removed and added lines carry a minus or plus sign beside their colour, old and new line numbers, and each changed passage starts with a link to its line.
- A conflict reads as two versions. Git conflict markers take the place of the parser error on the check button and in the problem list, which names each marker line with its role and a link, and the status sentence says how to resolve them.
- The judged text stays readable. The action menu quotes the selection, sits below the line or above it when there is no room, and long lines wrap by default. A wrapped line hangs two columns under the start of its own content, so nested markup keeps its shape.
- Selection keeps the highlighting. The selection is drawn as a mix of the theme's blue behind the text, while the native selection stays transparent, so selected element and attribute names keep their colours in light and dark mode.
- Work starts in the text. An opened document places the caret at its first page break, so the transcription is in view at once and the facsimile shows its first page, while the `teiHeader` stays above, one scroll away.
- A menu appears for a pointer selection, Ctrl+. or F8, and not for selections made by search or undo.

## Open questions

- In a narrow pane the three check buttons in their ok state show the same check icon with the state colour. Well-formedness and validation have no tooltip, and the open-spot button has one that names what counts as open work rather than its state, so the three can only be told apart by position or by a screen reader. A distinct icon per check or a tooltip naming the state would resolve it.

## Connection to the action layer

The derived rules for agents are in [CLAUDE.md](../CLAUDE.md#design-principles).
