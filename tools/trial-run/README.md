# Probelauf teiCrafter SZD

Diese Skripte simulieren ein kleines Editionsprojekt auf deinem Rechner, im von Git ignorierten Ordner `trial-run/` dieses Repositorys. Du arbeitest wie ein Teammitglied mit einer eigenen Arbeitskopie, nimmst einen neuen Brief aus der szd-htr-Pipeline auf, bearbeitest ihn im Editor, speicherst ihn und gibst ihn über Git ab. Eine simulierte Kollegin arbeitet parallel an einem anderen Brief. Nichts davon verlässt den Rechner, und das Repository selbst wird nur gelesen.

Der Probelauf ist zugleich die Abnahme der Meilensteine S1 und S2 im Plan von `szd-teiCrafter`.

## Was wo liegt

| Ordner oder Datei | Rolle im Projekt |
|---|---|
| `trial-run/server.git` | vertritt GitHub, dorthin wird abgegeben (push) und von dort geholt (pull) |
| `trial-run/ich` | deine Arbeitskopie mit Editor und Daten |
| `trial-run/kollegin` | die Arbeitskopie der simulierten Kollegin |
| `tools/trial-run/setup.ps1` | baut den Probelauf auf, mit `-Neu` frisch von vorn |
| `tools/trial-run/import-document.ps1` | holt ein weiteres Dokument aus szd-htr in deine Arbeitskopie |
| `tools/trial-run/start.ps1` | startet den Editor auf http://localhost:8001/ |
| `tools/trial-run/colleague-works.ps1` | lässt die Kollegin einen anderen Brief bearbeiten und abgeben |

Alle Befehle unten laufen in PowerShell im Wurzelordner des Repositorys. Befehle mit `git -C trial-run\ich` wirken in deiner Arbeitskopie. Vor dem ersten Schritt baut `.\tools\trial-run\setup.ps1` den Probelauf auf. Für den Editor brauchst du Chrome oder Edge, weil nur diese Browser direkt in eine Datei zurückschreiben.

## 1. Daten hineingeben

Neue Dokumente kommen aus der szd-htr-Pipeline. Das Skript trägt den Brief in die Auswahlliste ein, kopiert ihn byte-genau, vermerkt Herkunft und Prüfsumme in `docs/data/IMPORT.md` und baut die Dokumentliste neu.

```
.\tools\trial-run\import-document.ps1 -ObjektId o_szd.1207 -Sammlung korrespondenzen -Grund "Letter for the trial run"
git -C trial-run\ich status
git -C trial-run\ich add docs/data tools/working-set.json
git -C trial-run\ich commit -m "Import o_szd.1207 for the trial run"
```

`o_szd.1207` ist ein Brief an Anna Meingast vom 30. Juni 1934, zwei Seiten Typoskript mit drei offenen HTR-Stellen. Jedes andere Dokument aus `szd-htr/results/<sammlung>/` geht genauso.

## 2. Editor starten und den Brief öffnen

```
.\tools\trial-run\start.ps1
```

Der Browser öffnet den Editor. Das Fenster mit dem Befehl bleibt offen, solange du arbeitest, und Strg+C beendet den Editor.

Damit das Speichern in deine Arbeitskopie zurückschreibt, öffnest du die Datei selbst über den Ordner-Knopf oben rechts, hier `trial-run\ich\docs\data\korrespondenzen\o_szd.1207.tei.xml`. Über die Dokumentliste geöffnete Briefe speichert der Browser nur als Download.

## 3. Bearbeiten

1. Mit F8 springst du zur nächsten offenen Stelle, Enter wendet die vorgeschlagene Aktion an. Der Zähler in der Werkzeugleiste zeigt, wie viele Stellen noch offen sind.
2. Einen Namen markieren und im Menü Person wählen. Der Dialog sucht im SZD-Personenindex, auf Wunsch auch in der GND.
3. Mit „Text“ links oben wechselst du in die Textansicht ohne Tags. Auch dort lässt sich annotieren.
4. Validieren über den Schild-Knopf. Ist der Brief wohlgeformt, gültig und ohne offene Stellen, zeigt das Abzeichen oben „Bereit zur Abnahme“ und bietet die Abnahme an.

## 4. Speichern, auch mittendrin

Strg+S speichert jederzeit, auch wenn der Brief noch fehlerhaft ist. Die Statuszeile unter dem Text nennt, in welchem Stand gespeichert wurde.

Zum Prüfen der Abnahme von S2 baust du einmal absichtlich einen Fehler ein, etwa ein gelöschtes `>`. Dann speicherst du, lädst die Seite neu, öffnest die Datei wieder, siehst den Stand „nicht wohlgeformt“ und behebst den Fehler.

Nimmst du einen Brief ab, speicherst danach und änderst ihn noch einmal, nimmt das nächste Speichern die Abnahme zurück und sagt das in der Statuszeile. So steht in der Datei nie „abgenommen“ für einen Text, den niemand abgenommen hat.

## 5. Prüfen und abgeben

Der Vergleichs-Knopf in der Werkzeugleiste zeigt die Änderungen seit dem Öffnen Zeile für Zeile. Dasselbe zeigt Git:

```
git -C trial-run\ich diff
git -C trial-run\ich add docs/data/korrespondenzen/o_szd.1207.tei.xml
git -C trial-run\ich commit -m "Annotate persons in o_szd.1207"
```

Für S1 genügt es, dass `git diff` nur deine Änderungen zeigt und sonst kein Zeichen der Datei verändert ist.

## 6. Mit der Kollegin zusammenarbeiten

```
.\tools\trial-run\colleague-works.ps1
git -C trial-run\ich push
```

Der Push wird abgelehnt, weil die Kollegin inzwischen etwas abgegeben hat. Das ist der Normalfall im Team. Du holst ihren Stand und gibst dann ab:

```
git -C trial-run\ich pull --no-rebase
git -C trial-run\ich push
git -C trial-run\ich log --oneline -5
```

Git führt beide Arbeiten zusammen, weil ihr an verschiedenen Briefen gearbeitet habt. Nach einem Neuladen der Seite zeigt die Dokumentliste in deinem Editor auch ihren Brief `o_szd.504` mit einer offenen Stelle weniger. Nach einer Abnahme oder einem Import baust du die Dokumentliste mit `node tools/build-document-index.mjs` in `trial-run\ich` neu und committest `docs/data/index.json` mit.

## 7. Wohin die Daten am Ende gehen

Im Probelauf endet die Abgabe in `server.git`, das GitHub vertritt. Im echten Projekt ist das das Repository `DigitalHumanitiesCraft/szd-teiCrafter`. Der korrigierte Brieftext soll später mit dem Kopf aus SZD-split zusammengeführt und gegen die Projekt-ODD validiert werden, bevor er nach GAMS geht. Diese Zusammenführung ist noch nicht gebaut (ADR-010).

## 8. Vorschläge der Agenten prüfen

Am 31. Oktober 2026 haben vier LLM-Agenten neun Dokumente annotiert. Ihre Ergebnisse liegen unter `evidence\annotation\` dieses Repositorys, je Agent ein Ordner (`direkt-a`, `direkt-b`, `browser`, `hybrid`) mit der annotierten Kopie, einer Vorschlagsdatei `<id>.vorschlaege.json`, einer Tabelle der Entscheidungen und einem Protokoll. Den Brief `o_szd.1222` haben alle vier bearbeitet, du kannst die vier Fassungen also nacheinander prüfen und vergleichen.

1. Den Probelauf mit `.\tools\trial-run\setup.ps1 -Neu` auf den aktuellen Stand bringen, denn erst dieser Stand kennt den Prüfmodus, und mit `.\tools\trial-run\start.ps1` den Editor öffnen.
2. Über „Dokumente“ den Brief wählen, etwa `o_szd.1222`.
3. Den Vorschlagsknopf in der Kopfzeile, neben „Datei öffnen“, drücken und zum Beispiel `evidence\annotation\hybrid\o_szd.1222.vorschlaege.json` wählen. Die Vorschläge erscheinen violett, der Text bleibt unverändert.
4. Mit F8 von Vorschlag zu Vorschlag gehen. Die Karte zeigt, was der Agent vorschlägt, worauf er sich stützt und wo er zweifelt. Enter nimmt an, Entf lehnt ab, „Ändern“ öffnet den Dialog, und was du dort einträgst, gilt als deine eigene Annotation.
5. Danach das TEI speichern und mit dem zweiten neuen Knopf das Prüfprotokoll `<id>.pruefung.json` neben die Vorschlagsdatei legen.

Angenommene Vorschläge tragen im TEI `@resp` mit dem Agenten und deiner Prüfung. Der so geprüfte Brief `o_szd.1222` soll die erste von einem Menschen geprüfte Referenz werden, an der sich die Agenten messen lassen. Die Stellen, die der Hybrid-Agent selbst für unsicher hielt, stehen am Ende seines `protokoll.md`.

## Von vorn anfangen

```
.\tools\trial-run\setup.ps1 -Neu
```

verwirft den Probelauf und baut ihn aus dem aktuellen Stand von main neu auf.
