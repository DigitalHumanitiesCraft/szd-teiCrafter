---
title: Design
project:
  name: teiCrafter SZD
  repository: https://github.com/DigitalHumanitiesCraft/szd-teiCrafter
status: draft
language: en
created: 2026-10-30
updated: 2026-10-31
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

- Tokens: custom properties on `:root` in `docs/css/app.css`, colours in `oklch()`, light and dark mode through `light-dark()`. Blue carries element names and the accent, orange carries attribute names. Violet marks what an outside producer proposed and nobody has decided yet, always with a dashed outline and the label „KI-Vorschlag, ungeprüft“ on its card, so the meaning does not rest on colour.
- Editor colours: the CodeMirror theme in `docs/js/editor.js` consumes the same tokens, because CodeMirror's base styles would override layered CSS.
- Icons: one inline SVG sprite in `docs/index.html`, stroke icons in `currentColor`, each with an accessible name and a tooltip that appears on hover and on keyboard focus, not after a pointer click.
- Text face: `--font-text`, a book serif for the text view, while controls keep the system face and the XML view the code face.
- Terms: the tooltips that define Collection, Arbeitsstand, offene Stelle, Abnahme, Aktion, the two views and the two layouts come from `docs/js/concepts.js`, so the header badge, the counter and the dialogs use the same words.
- Layout: two panes in a grid whose split is a custom property set by the separator, stacked below a narrow width.

## Interaction patterns

- Action at the selection. Marking text opens a small menu right below it with the annotation actions. The wrapping actions apply at once, while Person opens a short modal dialog that previews the resulting markup. Ctrl+. opens the menu from the keyboard, arrow keys move, Enter applies, Escape returns to the text.
- Open work as a queue. A counter in the text toolbar shows what the edition counts as open work, here the HTR output still in the text. Its tooltip lists the kinds from the source configuration, so each derivation explains its own queue. F8 selects the next spot and focuses its suggested action, so the letter is worked through with F8 and Enter. A kind without an encoding rule, such as a gap, is selected as well, and the menu then says in a line below the quote that its rule is still open. No action is suggested, the focus rests on the menu itself, Enter does nothing, and F8 moves on.
- One toolbar row per pane. Each pane is a size container. Below 46rem the validation button and the layout control keep their icons, with the state in colour and tooltip, and in the text view the well-formedness label goes as well, because a document there is always well-formed. In a narrow pane all check buttons keep icon and state colour and move their label to assistive technology, and the page label of the facsimile shortens to the form „1/2“, while the full sentence „Seite 1 von 2“ stays readable to screen readers. The container queries follow the rules they override, because source order decides within a CSS layer.
- The facsimile bar stays one row. The image source button opens the source field in the same row, where it takes the place of the page, zoom and rotation controls. The pressed button, Escape and a successful load close it again, so no second control is needed to fold it away.
- One status line per pane. Below the editor a single line carries messages, and while there is none it shows a short usage hint without shortcuts, because a written „Strg+.“ was read as Ctrl and plus and zoomed the code. Both panes therefore end at the same height.
- File actions in the header. Document list, open and save sit in the header and stay together at its right edge, also when the header wraps onto a second row. The document title keeps one line and shortens with an ellipsis.
- Check buttons as status. The well-formedness and validation buttons show their state by icon and label and lead to the error on activation. A validation result stays shown for exactly the text it ran on, so undoing back to that text brings back „TEI-konform“.
- Mixed line endings are visible. Opening a file that mixes them names the counts in the status line, and a break of the minority kind appears as a marked placeholder inside its editor line.
- A document without a facsimile shows none. When the opened document yields no manifest, for instance because it is not well-formed, the previous images, page label and source address are cleared and the source field opens.
- Caret follows facsimile. Moving through the source turns the facsimile to the page of the preceding `pb`.
- Split as visibility control. Dragging the separator resizes the facsimile, dragging it to the edge hides it, and an edge button brings it back. The separator works with arrow keys, Home and End.
- Saving writes back. Saving targets the opened file and confirms where it wrote and in which working state, and names a withdrawn acceptance. A download only says that the file was handed to the browser, keeps the dot, and the tooltip and the hidden status read „Als Download übergeben, Ankunft nicht bestätigt“ until the next edit. Unsaved work shows as an orange border and dot on the save button, whose tooltip then names the unsaved changes, while a visually hidden status carries the same words for assistive technology. Ctrl+S saves, and closing the tab with unsaved work asks first.
- Documents as a searchable list. A header button opens a modal list grouped by collection, with the search field focused and its last text selected, the state selector and the count in one row, and collection chips below. Each collection heading carries a formal count line such as „10 Dokumente | 0 abgenommen | 3 mit offenen Stellen“ and its description as tooltip. Each entry reads as title, then object id and pages, with the state as an icon on the right whose accessible name and tooltip say it, quiet for a draft, green for accepted, blue for ready and orange with the number for open spots. A dashed chip „+ Weitere Collections einrichten“ defines a collection in its tooltip and opens the four steps of setting one up in the repository, since the static editor has no server. Collections, labels and descriptions come from `source.collections`. Arrow keys move from the search field into the entries and back, Escape closes at once, and choosing an entry over unsaved work asks first.
- Proposals reviewed one by one. A header button beside opening a file loads a proposal file. Proposals stand in violet with a dashed outline over the unchanged text and count as open spots. Their card, opened by F8 or a click, names the producer, the element, the identity, the basis with links and the doubt, with the focus on „Annehmen“; Enter accepts, Delete rejects and „Ändern“ opens the action's dialog. After a decision the card moves on to the next proposal. A second header button, shown once a decision exists, saves the review log.
- State as a badge. The header shows the working state as a rounded badge whose words carry the state and whose detail, after a vertical bar, names the reason, such as the number of open spots or a missing validation. Colour adds to the words, blue for ready, green for accepted, orange for accepted and changed since, red for not well-formed.
- Acceptance as a deliberate act. The accept button appears beside the badge only in the ready state. Accepting writes into the text like any edit, so it shows in the comparison and becomes durable only by saving, which the status sentence says.
- Questions protect work. Opening another document over unsaved work and saving over a file that changed on disk ask in a modal dialog. The safe choice comes first and holds the focus, so Enter and Escape never lose text, and the editor's text survives every answer.
- Changes before a commit. An icon button in the text toolbar opens the line comparison with the text as opened or last saved. Removed and added lines carry a minus or plus sign beside their colour, old and new line numbers, and each changed passage starts with a link to its line.
- A conflict reads as two versions. Git conflict markers take the place of the parser error on the check button and in the problem list, which names each marker line with its role and a link, and the status sentence says how to resolve them.
- The judged text stays readable. The action menu quotes the selection, sits below the line or above it when there is no room, and long lines wrap by default. A wrapped line hangs two columns under the start of its own content, so nested markup keeps its shape.
- Selection keeps the highlighting. The selection is drawn as a mix of the theme's blue behind the text, while the native selection stays transparent, so selected element and attribute names keep their colours in light and dark mode.
- Work starts in the text. An opened document places the caret at its first page break, so the transcription is in view at once and the facsimile shows its first page, while the `teiHeader` stays above, one scroll away.
- A menu appears for a pointer selection, Ctrl+. or F8, and not for selections made by search or undo. A pointer selection across markup opens nothing and says nothing, and an explicit request explains it in the neutral tone. Red is kept for states that endanger the document.
- Two views of one document. A segmented control „XML | Text“ at the left of the text toolbar switches presentation, with a tooltip defining both. The text view reads like a page, a book face at about 1.6 line height in a measure of about 70 characters, paragraphs with space, page breaks as a quiet divider „Seite n“ with hairlines, the header as one muted line saying that header and facsimile list are in the XML view. A layout control with the icons for lines and flowing text replaces the wrap button there.
- Marks in the text view. Persons are underlined in blue, places with a double line, and a person or place not yet linked carries a grey wavy line, so the difference does not rest on colour, dates thinly, deletions struck through, additions raised and unclear readings dotted. Orange is reserved for open work, a dashed underline with a light tint, a badge „?“ for an uncertain reading and a chip „Lücke“ for a gap. A mark opens a small card on hover or Enter with its kind as the action names it, identity or „noch nicht verknüpft“, a note on attributes kept in the XML view, and „Ändern“ and „Entfernen“.
- Refusal in place. An edit in the text view that would cut hidden markup does not happen, and the status says „Hier liegt eine Auszeichnung; zum Entfernen die Markierung öffnen.“ in the neutral tone. An editor command that works on source lines, such as commenting out a line, says that it is available in the XML view. A malformed document keeps the text button reachable, which then names the error that blocks the view.
- Dialogs per action. Person, Ort and Datum open short modal dialogs with a preview of the markup. The place dialog says that a place without identifier is marked as not yet linked. The date dialog offers the three forms as radio buttons, shows only the fields of the chosen form, offers trimming to the date part as a checked box, and names an invalid value beside the fields.
- Actions as settings. A header icon opens „Aktionen“, a list of the registry entries with switch, label and key, the element as code and the dialog, views and marker after it, refused entries with their reason in red. Saving writes into the chosen repository folder or downloads, and the reason why saving is unavailable stands beside the button.

## Requirements from the Human User

The Human User's words on the interface, kept verbatim where they were given, as the reference for later revisions.

### Documents dialog, 2026-10-30

„Das ist sehr gut. Es ist vielleicht ein bisschen voll. Vielleicht kann man das noch irgendwie optimieren und auch ein bisschen vereinheitlichen, sodass wir uns überlegen: Okay, bei einem anderen Projekt müsste es ja wiederum anders ausschauen, also diese Anzahl der Dokumente, welche Unter-Collections es gibt. Vielleicht sollte das User Interface jetzt hier gleich erklären, was das ist. Zum Beispiel könnte man ja jetzt rechts von „Aufsatzablage" ein weiteres Element haben mit einem Plus und „Weitere Collections einrichten". Dann haben wir ja gleich einen Tooltip, der uns gleich mal definiert, was überhaupt eine Collection ist. Das heißt: Wie können wir mit Tooltips arbeiten, um das User Interface eben besser zu vermitteln, damit man quasi die Logik besser hat, oder wo kann man sozusagen Funktionalitäten in das User Interface integrieren, so wie ich das gerade beschrieben habe? ... Vielleicht kann „In Bearbeitung" auch ein Icon sein, oder „Von 0 von 10 abgenommen" kann man vielleicht auch eher ein bisschen formaler beschreiben und solche Dinge.“

Built on 2026-10-30 as described under interaction patterns. On the built dialog he then asked „was kann man hier noch optimieren“, relayed by the coordinating session as six points. The first was a defect and is fixed, the others are open.

- The state icon with its count stood on a line of its own above the title, so an entry took three lines. A generic rule for spans in an entry had put it into the first column, and since the fix it stands on the right beside title and meta line.
- Pencil and orange list with a number are not self-explanatory. Each needs a definition on hover, focus and tap, and accepted needs a mark of its own.
- „10 von 40 Dokumenten“ and „10 Dokumente“ in the group line repeat each other, and the group heading repeats the active chip.
- The sort order is not visible.
- „Collections“ in a German interface should read „Sammlungen“ or the project's term from the configuration.
- Document date and last edit could join the meta line in compact form.

### Text view action menu, 2026-10-30

„Für manche Sachen kann man vielleicht einfach nur Icons machen, weil eine Streichung ja etwas als eine semantische Annotation ist und man das vielleicht irgendwie sozusagen durchdenkt, wie man das am besten abbildet. So eine Streichung oder eine Kursivsetzung ist ja Standard, da kennt man ja die bekannten Icons. Vielleicht kann man ein paar andere auch auf Icons reduzieren und dann vielleicht sauberer nochmal mit Text arbeiten. Ich verstehe das P, O, D, S, U und E nicht. Also, Shortcuts haben wir keine, und das Icon haben wir ja schon.“

Open. The visible key letters in the menu are to go, the menu stays on one line, each semantic annotation gets the representation that fits it, standard icons for deletion, addition, emphasis and uncertainty and text where an icon does not explain itself. Selections that start or end inside a word, observed as „ächst dahin“ and „tzungen, sp noc“, are to snap to word boundaries before actions are offered.

### Actions dialog, 2026-10-30

Asked „alles korrekt?“, the Human User confirmed the mapping of Person to `persName`, Ort to `placeName`, Datum to `date`, Streichung to `del`, Unsicher to `unclear` and Ergänzung to `add`. Seven points were relayed as open.

- Raw patterns such as „löst ~~([^~\n<>]+?)~~“ are shown. The words „löst HTR-Marker ~~…~~“ belong in the list, the pattern at most in a tooltip.
- The letter keys are editable fields without a label that he does not understand („Shortcuts haben wir keine“). They need the label „Taste“ or a place in a tooltip. In the text view a letter acts only while the menu holds the focus after Ctrl+. or F8, otherwise it types as in any editor, which endangers no data.
- There is no icon column, although he wants icons for standard annotations.
- The attributes editions usually need, `add/@place`, `del/@rend`, `unclear/@reason` and the normalisation of dates, are editorial rules for the SZD ODD (S4) and stay undecided.
- „Geprüft gegen TEI All“ constrains almost nothing and should say so plainly until the ODD exists.
- The primary button „Als Datei herunterladen“ should save to the configured location.
- The explanatory paragraph is long and technical and should become one sentence with a defining tooltip.

## Open questions

- Whether the text view should snap a selection to word boundaries itself or only explain, see the menu requirements above.

## Connection to the action layer

The derived rules for agents are in [CLAUDE.md](../CLAUDE.md#design-principles).
