---
name: bookmonkey-developer-blue
description: Führt im BookMonkey-Projekt die Blue-Refactoring-Phase nach überprüftem Green aus. Prüft die Verfahren in REFACTORING.md am aktuellen Code und vereinfacht die betroffenen Produktbereiche bei unverändertem Verhalten und unveränderten Tests. Verwenden nach bookmonkey-developer-green oder für einen konkreten Refactoring-Auftrag, nicht zum Implementieren fehlender Features oder Reparieren roter Tests.
---

# Developer Blue Refactoring für BookMonkey

Vereinfache grünen Produktcode innerhalb des beauftragten Bereichs, ohne sein beobachtbares Verhalten zu ändern.
Dieser Skill ergänzt `bookmonkey-test-issue` (Red) und `bookmonkey-developer-green` (Green). Seine Erstellung oder
Auswahl allein startet keine Refactoring-Umsetzung. Ein begründetes Ergebnis ohne Codeänderung ist zulässig.

## Green und Umfang übernehmen

- Übernimm Issue/Anforderung, Akzeptanzkriterien, geänderte Produktbereiche und Green-Ergebnisse aus dem Chat bzw.
  der Übergabe. Verwende den zuletzt umgesetzten Bereich, wenn er eindeutig gemeint ist. Prüfe Arbeitsbaum und
  aktuelle Quellen; beziehe auch unversionierte Dateien ein und bewahre fremde Änderungen.
- Lies die geltenden `AGENTS.md`, [ARCHITECTURE.md](../../../ARCHITECTURE.md) und
  [REFACTORING.md](../../../REFACTORING.md) im Repository-Root. Bei Setup-Fragen hilft `README.md`.
  Ermittle Testbefehle aus der aktuellen `package.json` und Konfiguration.
- Nutze die aktiven Anweisungen unter „Vorgehen“, „Verfahren“ und „Verifikation und Abschluss“ in
  `REFACTORING.md`. Prüfe ihre Anwendbarkeit am aktuellen Code; leite daraus keinen pauschalen Repository-Umbau ab.
- Reproduziere Green für die betroffenen Unit- und UI-Tests vor Produktänderungen. Halte Testinventar und
  Inhalts-Hashes der Specs, Helfer, Fixtures, Snapshots und Testkonfiguration fest, einschließlich unversionierter
  Red-Phase-Dateien. Bereits bekannte Defekte und Umgebungsblocker sind kein bestätigter Green-Ausgangsstand.
- Scheitern relevante Tests, analysiere und melde den Befund. Die davon abhängige Blue-Phase bleibt offen; eine
  fachliche Reparatur gehört zu Green, ein Testdefekt bzw. fehlende Absicherung zu Red. Verwende Refactoring nicht,
  um einen Verhaltensfehler oder eine neue Anforderung verdeckt umzusetzen.

## Verfahren aus REFACTORING.md gezielt anwenden

Wähle aus [REFACTORING.md — Verfahren](../../../REFACTORING.md#verfahren) nur die für den aktuellen Bereich
relevanten Verfahren zu Anfragen/Lebensdauer, Fehlergrenzen, Logik/Präsentation, Kohäsion/Duplikaten, expliziten
Verträgen und Absicherung. Notiere Fundstelle, konkreten Wartungsnutzen, gewähltes Verfahren und die zu bewahrende
Invariante. Test- und Tooling-Verbesserungen sind separate Aufgaben; halte die Testressourcen in Blue unverändert.

### SOLID als Prüfmaßstab

Prüfe SOLID im betroffenen Bereich, soweit anwendbar. Nutze die bereits beschriebenen Verantwortlichkeitsgrenzen
und expliziten Verträge für SRP und DIP; ergänze die übrigen Prüfrichtungen ohne paralleles Regelwerk:

- **Single Responsibility (SRP):** Halte fachlich unterschiedliche Änderungsgründe getrennt, insbesondere
  Anfrageorchestrierung, Darstellung und Diagnosen.
- **Open/Closed (OCP):** Schaffe Erweiterungspunkte nur bei konkretem Erweiterungsbedarf; vermeide vorsorgliche
  Strategien oder Vererbungshierarchien.
- **Liskov Substitution (LSP):** Bewahre bei austauschbaren Implementierungen die zugesagten Eingaben, Ergebnisse
  und Fehlersemantiken; verschärfe keine Vorbedingungen und schwäche keine Nachbedingungen.
- **Interface Segregation (ISP):** Halte Komponenten- und Serviceverträge auf die Bedürfnisse ihrer Verbraucher
  begrenzt; erzwinge keine Abhängigkeit von ungenutzten Fähigkeiten.
- **Dependency Inversion (DIP):** Richte Abhängigkeiten an benötigten Verträgen statt austauschbaren Details aus.
  Angular-DI allein belegt DIP nicht; führe zusätzliche Interfaces oder Schichten nur bei belegbarem Nutzen ein.

## Kleine, verhaltenswahrende Schritte

- Wähle die kleinste sinnvolle Änderung mit klarem Wartungsnutzen; vermeide kosmetische Komplettumbauten und
  spekulative Abstraktionen. Bewahre die bestehende Feature-Struktur und öffentliche Verträge. Erhalte insbesondere
  Suche, Paging/Rückkehrzustand, Anfrageabbruch, Fehlererholung und Theme-Verhalten, soweit sie betroffen sind.
- Führe nach jedem abgeschlossenen Schritt die betroffenen Tests aus. Bei einer neu eingeführten Regression
  korrigiere den eigenen Produktcode oder nimm nur den eigenen Schritt gezielt zurück. Setze keine fremden Änderungen
  zurück. Bleibt die Ursache unklar, berichte den offenen Stand statt weitere Umbauten darauf aufzubauen.
- Tests, Helfer, Fixtures, Snapshots und Testkonfiguration bleiben unverändert. Ändere keine Testauswahl, Assertions,
  Timeouts oder Runner-Einstellungen, um Green zu erhalten. Fokussierte Diagnoseläufe ersetzen nicht die abschließende
  vollständige Verifikation. Benötigt eine Extraktion Testanpassungen, wähle eine vertragswahrende Variante oder melde
  die Grenze des Blue-Auftrags; baue keine Testumgebungserkennung oder künstlichen Erfolgsergebnisse in Produktcode.
- Ergibt die Prüfung keine begründete Vereinfachung, dokumentiere dieses Ergebnis ohne künstliche Codeänderung.
- Aktualisiere `ARCHITECTURE.md`, wenn sich dokumentierte Verantwortlichkeiten oder Datenflüsse ändern.
  Halte `REFACTORING.md` auf aktive, wiederverwendbare Anweisungen beschränkt. Berichte Maßnahmen, Status und
  Verifikation im Abschluss; füge in `REFACTORING.md` keine Ausführungshistorie ein.

## Verifizieren und übergeben

- Führe nach Codeänderungen die relevanten Regressionen, `npm run typecheck` und `npm run build` aus. Für das kleine
  Projekt sind `npm test` und `npm run test:e2e` passende Gesamtläufe für Jasmine/Chrome Headless und Playwright/Chromium.
  Wähle zusätzliche Browser anhand des Auftrags; berichte ausschließlich tatsächlich geprüfte Engines.
- Formatiere geänderte Produktdateien und Dokumentation explizit mit Prettier und prüfe `git diff --check`.
  Formatiere keine geschützten Testdateien nebenbei. Vergleiche am Ende Hashes und Testinventar mit der Ausgangslage;
  ein HEAD-Diff allein schützt unversionierte Red-Tests nicht. Bei fremden Teständerungen prüfe den neuen Stand,
  statt ihn zurückzusetzen oder ungeprüft als identische Testbasis zu melden.
- Behandle fehlende Browser, verweigerten Zugriff oder blockiertes Fonts-Inlining als offene Verifikation. Umgehe
  dies nicht durch Teständerungen. Wiederhole nach Fehlerbehebungen die betroffenen Prüfungen; vermeide unveränderte
  Wiederholungsläufe ohne neue Erkenntnis.
- Berichte je Maßnahme: Fundstelle, angewandtes Verfahren aus `REFACTORING.md`, Struktur vorher/nachher, bewahrtes
  Verhalten, zugeordnete Tests, ausgeführte Befehle/Ergebnisse und Integrität der Testressourcen. Nenne begründet
  verworfene größere Umbauten nur, wenn sie eine relevante Entscheidung erklären. Blue ist erst abgeschlossen,
  wenn die erforderlichen Prüfungen grün sind; offene Risiken oder Verifikationslücken bleiben ausdrücklich offen.

Issue-Kommentare, Statusänderungen, Commits, Pushes und Veröffentlichungen benötigen einen entsprechenden Auftrag.
