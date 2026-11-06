# Prüfung o_szd.1222

Dieser Ordner hält die neutrale Prüfung der Annotationsvorschläge, die vier Agentenläufe am 31. Oktober 2026 für den Kalibrierungsbrief o_szd.1222 erzeugt haben. Die Läufe selbst liegen unter `annotation/` dieses Probelaufs.

## Dateien in der Reihenfolge ihrer Entstehung

1. `items.json` und `provenance.json` wurden deterministisch und ohne LLM-Aufruf aus den vier Vorschlagsdateien gebaut. `items.json` fasst die Vorschläge zu Items je Textstelle zusammen, ohne Herkunft, Häufigkeit und Begründung. `provenance.json` hält genau diese Zuordnung für den späteren Abgleich fest und blieb den Prüfenden verschlossen.
2. `packet.md` ist der Prüfauftrag mit Transkription, Regeln und Ergebnisformat.
3. `check-a.json` und `check-b.json` sind die Ergebnisse zweier unabhängig instruierter LLM-Agenten, die das Paket ohne Kenntnis der Herkunft der Vorschläge geprüft haben.
4. `o_szd.1222.vorschlaege.json` ist die abgeglichene Vorschlagsdatei im Format `teicrafter-proposals/0.2`. Sie enthält alle Items und die von beiden Prüfungen gemeldete fehlende Auszeichnung. Abgelehnte und offene Stellen tragen den Status `needs_expert` mit den Begründungen beider Prüfungen. Sie wird im Editor über „Vorschläge laden“ geprüft.
5. `README.md` und `MANIFEST.sha256` dokumentieren den Ordner. Das Manifest hält die SHA-256-Summen aller übrigen Dateien.

## Status der Agentenprüfungen

Die beiden Prüfungen sind maschinelle Evidenz. Sie liefen mit demselben Modell, ihre Übereinstimmung belegt daher keine unabhängige fachliche Prüfung und nimmt keine Stelle ab. Entscheiden wird die Autorin oder der Autor im Prüfmodus des Editors.

## Prüfprotokoll

Das Prüfprotokoll der Person entsteht im Editor über den Button „Prüfprotokoll speichern“ und wird als `o_szd.1222.pruefung.json` heruntergeladen. Es gehört nach Abschluss der Prüfung in diesen Ordner und ist dann neu ins Manifest aufzunehmen.

## Entscheidung des Erstautors (31. Oktober 2026)

Der Erstautor hat die Vorlage im Chat entschieden, mit der Angabe „1 ab, 2 ab, 3 ohne ref, 4 an, Rest ok“. Hotel Westminster und „New York“ in der Telegrammadresse sind abgelehnt, die Kultusgemeinde ist als Organisation ohne Verknüpfung angenommen, der Verlag (Herbert Reichner Verlag, SZDORG.24) ist angenommen, und die übrigen 20 Stellen sind als Block bestätigt. Ein Agent hat diese Entscheidungen im Editor teiCrafter SZD eingetragen und das Prüfprotokoll gesichert.

- `o_szd.1222.pruefung.json`: Prüfprotokoll des Editors, 22 angenommen, 2 abgelehnt, 0 geändert.
- `o_szd.1222.geprueft.tei.xml`: der Brief nach der Prüfung, 22 Auszeichnungen mit `#resp-agent-annotation #resp-editor-review`, byte-identisch mit dem Editorinhalt (SHA-256 9029e5b5…4195).

Reichweite der Prüfung: Die vier strittigen Stellen hat der Erstautor einzeln entschieden. Die 20 übrigen Stellen hat er nach der Empfehlung beider Agentenprüfungen als Block bestätigt, ohne jede Stelle einzeln am Faksimile zu prüfen. Die Annahmequote von 22 aus 24 folgt damit vollständig den Agentenempfehlungen und ist kein Qualitätsmaß.
