// The terms the interface uses, defined once. Tooltips in the header, the
// toolbars and the dialogs take their words from here, so a term means the
// same everywhere it appears.

export const concepts = {
  collection:
    "Collection: eine Gruppe von Dokumenten mit gemeinsamem TEI-Profil, abgelegt als Ordner unter data/ und in der Quellkonfiguration benannt.",
  workingState:
    "Arbeitsstand: wie weit ein Dokument ist, von in Bearbeitung über bereit zur Abnahme bis abgenommen. Gespeichert werden kann in jedem Stand.",
  openSpot:
    "Offene Stelle: eine Stelle der Transkription, die die Edition noch als ungelöst zählt. Solange es offene Stellen gibt, ist ein Dokument nicht bereit zur Abnahme.",
  acceptance:
    "Abnahme: die Bestätigung, dass ein wohlgeformtes, gültiges Dokument ohne offene Stellen dem Faksimile entspricht. Sie steht im revisionDesc der Datei.",
  action:
    "Aktion: was das Menü an einer Markierung anbietet, etwa Person oder Streichung, mit dem Element, das sie schreibt. Die Liste steht in data/actions.json.",
  views:
    "XML zeigt den TEI-Quelltext mit allen Auszeichnungen. Text zeigt nur den Haupttext zum Lesen und Annotieren, Auszeichnungen erscheinen als Unterstreichungen. Beide bearbeiten dasselbe Dokument.",
  layout:
    "Zeilen bricht an jedem <lb/> um wie im Original, Fließtext setzt Absätze. Voreingestellt sind Zeilen, wenn das Dokument Zeilenumbrüche auszeichnet.",
};
