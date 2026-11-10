---
name: requirements-finalisation
description: Gleicht ein implementiertes Feature mit den ursprünglichen Akzeptanzkriterien ab, führt Tests und Build aus, aktualisiert das zugehörige GitHub-Issue und liefert einen belegten Abschlussbericht. Zum Abschluss des agentischen Requirements-Workflows verwenden, wenn die Lieferung bestätigt und das Issue geschlossen werden soll.
---

# Anforderungen abschließen

Bestätige die Lieferung anhand der vereinbarten Anforderungen und des tatsächlich geprüften Implementierungsstands. Verknüpfe Anforderungen, Umsetzung und Prüfergebnisse im GitHub-Issue, bevor du es als erledigt schließt. Dieser Skill dient der Abschlussprüfung nach der Implementierung; er startet kein neues Requirements Interview und ersetzt keine noch ausstehende Implementierungsphase.

## Anforderung und Prüfstand bestimmen

- Übernimm die ursprüngliche User Story, Ziel und Umfang, Akzeptanzkriterien einschließlich ihrer Kennungen sowie spätere ausdrücklich vereinbarte Änderungen. Lies beim zugehörigen Issue die vollständige Beschreibung und anforderungsrelevante Kommentare. Bewahre ursprüngliche Kriterien; passe sie nicht nachträglich an das implementierte Verhalten an.
- Nutze vorhandenen Gesprächs- und Übergabekontext. Wenn Anforderungen oder Issue-Zuordnung fehlen, verwende bei Bedarf [context-recovery](../context-recovery/SKILL.md). Eine Issue-Nummer ist nur zusammen mit dem Repository eindeutig. Kläre fehlende oder widersprüchliche Entscheidungen, ohne unabhängige Prüfungen aufzuhalten.
- Lies geltende `AGENTS.md`-Dateien, `README.md`, relevante Architekturhinweise sowie die aktuelle Test- und Build-Konfiguration. Prüfe Arbeitsbaum, Branch, relevante Änderungen und gegebenenfalls PR/Commit. Bewahre fremde und nicht versionierte Arbeit. Nenne ausdrücklich, ob du lokale Änderungen, einen Commit oder einen CI-Stand verifizierst; lokale Erfolge belegen keine Auslieferung.
- Fehlt ein zugehöriges GitHub-Issue, prüfe die belegten Anforderungen trotzdem. Erfinde keine Zuordnung und lege kein neues Issue ohne Auftrag an. Berichte die fehlende Verknüpfung, statt eine erfolgte Issue-Aktualisierung zu behaupten.

## Umsetzung mit den Kriterien abgleichen

Erstelle eine kompakte Nachweismatrix. Behalte vorhandene Kriterienkennungen bei; bei Kriterien ohne Kennung darfst du lokale Referenzen zur Zuordnung vergeben, ohne den Quelltext umzuschreiben.

| Kriterium                 | Implementierungsbeleg       | Verifikation und Ergebnis                         | Status                                   |
| ------------------------- | --------------------------- | ------------------------------------------------- | ---------------------------------------- |
| AK-1 mit kurzer Erwartung | Pfad und relevante Funktion | Testdatei/Szenario oder konkrete manuelle Prüfung | Erfüllt / Abweichend / Nicht verifiziert |

- Prüfe für jedes Kriterium Ausgangszustand, auslösende Aktion und beobachtbares Ergebnis. Lies Code und Testassertions; Testtitel oder grüne Tests allein belegen keine vollständige Erfüllung. Berücksichtige vereinbarte Fehler-, Grenz- und Abbruchfälle sowie verbindliche Rahmenbedingungen.
- Trenne implementiertes Verhalten von nachgewiesenem Verhalten. Markiere ein Kriterium erst als erfüllt, wenn seine maßgeblichen Ergebnisse geprüft sind. Fehlt automatisierte Abdeckung, nutze eine geeignete ausführbare oder manuelle Prüfung und dokumentiere deren Schritte und Grenzen. Füge bei erforderlicher Verhaltenskorrektur gezielte Regressionstests nach Projektregeln hinzu.
- Dokumentiere Lücken und Abweichungen mit betroffenen Kriterien und ihrer Auswirkung. Schwäche weder Kriterien noch Tests ab, um einen erfolgreichen Abschluss herzustellen. Prüfe ausgeschlossene Funktionen nicht als nachträglich erfundene Pflicht.
- Behebe kleine, eindeutige Fehler innerhalb des bereits beauftragten Umfangs und prüfe die Korrektur erneut. Bei größeren Umsetzungslücken oder ungeklärtem Sollverhalten liefere eine konkrete Rückgabe an Implementierung oder Anforderungsklärung. Ein Folge-Issue oder eine eigene Annahme ersetzt keine unerfüllte Anforderung.

## Tests und Build ausführen

Führe die relevanten Feature- und Regressionstests sowie den Projektbuild am abschließenden Stand tatsächlich aus. Wähle die Befehle anhand aktueller Projektregeln und Konfiguration. Frühere Green-Übergaben oder CI-Ergebnisse helfen bei der Einordnung, ersetzen aber nicht die Abschlussläufe dieses Workflows.

Für BookMonkey:

- Führe `npm run build` aus.
- Führe die projektspezifischen Playwright-Suites aus. Dazu gehören `npx playwright test tests/book-details.spec.ts` und `npx playwright test tests/book-search.spec.ts`; ermittle weitere aktuelle Feature-Suites unter `tests/` und beziehe sie in die Regression ein. Die genannten Books-Suites mocken die API und benötigen kein Backend. Lies für Books-Code und Books-Tests auch `src/app/books/AGENTS.md`.
- Behandle `tests/example.spec.ts` mit externen Beispielseiten nicht als BookMonkey-Nachweis und benenne seinen Ausschluss. Prüfe die aktuelle Konfiguration, bevor du andere Tests ausschließt.
- `npm test` ist wegen unvollständiger Karma-/Jasmine-Abhängigkeiten kein belastbarer Nachweis, solange das Ziel nicht vervollständigt und erfolgreich ausgeführt wurde. Ändere dafür nicht beiläufig Abhängigkeiten oder Runner-Konfiguration.
- Formatiere nur geänderte Dateien. Nach Korrekturen müssen die betroffenen Tests und der Build den endgültigen Stand abdecken.

Halte Befehle, Prüfumfang, Ergebnisse und relevante Warnungen fest. Unterscheide Produktfehler, Testfehler und Infrastrukturprobleme. Übersprungene, abgebrochene oder nicht ausführbare relevante Checks zählen nicht als bestanden. Ein Build allein beweist keine fachliche Erfüllung. Behebe aufgabenbezogene Ursachen; bei externen Hindernissen berichte den konkreten Blocker und die nächste notwendige Aktion, statt unverändert wiederholt zu starten.

## GitHub-Issue aktualisieren und schließen

Verwende bevorzugt verfügbare GitHub-Tools, andernfalls eine authentifizierte GitHub-CLI. Ein ausdrücklicher Auftrag zur Finalisierung einschließlich Issue-Abschluss autorisiert die zugehörige Aktualisierung und Schließung nach erfolgreicher Prüfung; frage dafür nicht erneut. Bei einem reinen Prüfauftrag ohne Schreibauftrag bereite den konkreten Bericht zuerst vor und kläre die Veröffentlichung erst danach. Das Erstellen dieses Skills selbst ist kein Auftrag, ein Issue zu ändern.

1. Lies unmittelbar vor dem Schreiben den aktuellen Issue-Stand und prüfe Repository, Nummer, neue Anforderungen sowie gegebenenfalls vereinbarte Merge- oder Auslieferungsbedingungen. Bei relevanten Änderungen ergänze die Prüfung, bevor du abschließt. Merge oder Deployment sind keine automatische Nebenwirkung dieses Skills.
2. Ergänze einen Abschlusskommentar mit Anforderungsquelle, Nachweismatrix, tatsächlich ausgeführten Befehlen und Ergebnissen, verbleibenden Einschränkungen und dem geprüften Arbeitsstand. Verlinke vorhandene Commits, PRs oder CI-Läufe, soweit sie den geprüften Stand belegen. Kennzeichne uncommittete lokale Änderungen; erfinde keine Links oder Commit-Zuordnungen. Erhalte Issue-Beschreibung und Diskussion. Aktualisiere vorhandene Akzeptanz-Checkboxen nur für belegte Erfüllung und ohne fremde Änderungen zu überschreiben.
3. Schließe das Issue mit dem Grund „completed“, soweit unterstützt, erst wenn alle vereinbarten Kriterien erfüllt, relevante Tests und Build erfolgreich und weitere ausdrücklich vereinbarte Abschlussbedingungen erfüllt sind. Bei Lücken, Blockern oder nicht verifizierten Kriterien veröffentliche den Zwischenstand im autorisierten Umfang und lasse das Issue offen. Melde keinen vollständigen Abschluss. Ein bereits geschlossenes Issue mit neuen Befunden wird nicht ohne Auftrag wieder geöffnet; benenne den Widerspruch.
4. Prüfe nach der Mutation Kommentar und Issue-Zustand. Vermeide doppelte Abschlusskommentare bei Wiederaufnahme. Bei unklarem Schreibergebnis lies zuerst nach, bevor du erneut schreibst. Schlägt Veröffentlichung oder Schließung fehl, gib den vorbereiteten Inhalt und die ausstehende Aktion zurück; behaupte keinen GitHub-Erfolg.

## Abschlussbericht ausgeben

Gib im Gespräch einen eigenständig verständlichen, knappen Bericht aus:

- **Ergebnis:** abgeschlossen oder offen, mit Grund und geprüftem Arbeitsstand.
- **Anforderungsabgleich:** Kriterien und Nachweise; bei vielen Kriterien eine kompakte Matrix oder ein bestätigter Issue-Kommentar plus die wesentlichen Ergebnisse und alle Lücken.
- **Validierung:** tatsächlich ausgeführte Test- und Build-Befehle mit Ergebnissen; nicht ausgeführte oder blockierte relevante Checks ausdrücklich benennen.
- **Traceability:** Issue-Link und bestätigter Zustand, Link zum Abschlusskommentar sowie vorhandene PR-/Commit-Bezüge. Benenne fehlenden Zugriff oder eine fehlende Issue-Zuordnung.
- **Restarbeit:** konkrete Abweichungen, Blocker und nächster Schritt; andernfalls „Keine“.

Unterscheide fachliche Verifikation, erfolgreiche GitHub-Aktualisierung und Issue-Schließung. Berichte einen Teilerfolg präzise, wenn nur einzelne Schritte abgeschlossen werden konnten.
