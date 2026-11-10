---
name: tdd-red
description: Erstellt in der TDD-Red-Phase aus einer User Story mit Given/When/Then-Akzeptanzkriterien zunächst fehlschlagende Unit- und UI-Tests, etwa mit Jasmine und Playwright. Nach der Anforderungsanalyse oder dem Requirements Interview einsetzen, bevor produktiver Code geschrieben wird; endet mit der Übergabe an die Green-Phase.
---

# TDD: Red-Phase

Übernimm die geklärten Anforderungen und erstelle konkrete Testgerüste mit Setup, Aktion und fachlichen Assertions. Schreibe die Tests direkt in das Repository. Implementiere das Feature nicht und wechsle nicht selbstständig in die Green- oder Refactor-Phase.

## Anforderungen übernehmen

- Nutze die übergebene User Story einschließlich Akzeptanzkriterien, Umfang, Rahmenbedingungen, technischen Hinweisen und offenen Punkten. Das Ergebnis der Skill `requirements-interviewing` kann unverändert als Eingabe dienen; ein bestimmtes Ablageformat oder die Verfügbarkeit dieser Skill ist nicht erforderlich.
- Lies eine referenzierte Anforderungsdatei oder ein Issue, bevor du daraus Tests ableitest. Bereits im Gespräch vollständig vorliegende Anforderungen müssen nicht erneut angelegt oder bestätigt werden.
- Fehlen Story oder Kriterien, fordere sie gezielt an. Frage bei Widersprüchen oder nicht prüfbaren Ergebnissen nur nach der entscheidenden Lücke. Erfinde keine fachlichen Regeln, API-Verträge oder Grenzwerte. Bearbeite unabhängig davon bereits eindeutige Szenarien weiter und kennzeichne blockierte Kriterien.

## Testgrenzen und Umgebung prüfen

Lies die geltenden `AGENTS.md`-Dateien, Testkonfiguration, relevante Skripte und benachbarte Tests sowie den betroffenen Code. Prüfe den aktuellen Stand statt ausschließlich Architekturhinweisen zu vertrauen. Übernimm vorhandene Runner, Fixtures, Mocking-Muster und Dateikonventionen; Jasmine und Playwright sind Beispiele, keine Pflicht zur Migration.

- Unit-Tests prüfen isolierbare fachliche Regeln, Zustandsübergänge und Schnittstellenverhalten. Nutze bei Angular passende TestBed-, DI- und HTTP-Testmittel sowie kontrollierte Zeitsteuerung, soweit im Projekt verfügbar.
- UI-Tests prüfen sichtbare Abläufe über die echte Oberfläche. Nutze zugängliche Rollen und Beschriftungen, isolierte Testdaten, kontrollierte API-Antworten und bedingungsbasierte Assertions statt fester Wartezeiten.
- Erzeuge Unit- und UI-Testgerüste, soweit die Anforderungen beide Ebenen betreffen. Ordne jedes Given/When/Then-Szenario mindestens einem eigenen `it`- oder `test`-Fall auf der passenden Ebene zu. Sind beide Ebenen sinnvoll, erhalten sie getrennte Fälle mit derselben Szenario-Kennung. Begründe, wenn eine Ebene fachlich nicht sinnvoll ist; erfinde dafür keine zusätzliche Funktion.
- In BookMonkey liegen UI-Tests unter `tests/`, gemeinsame Hilfen unter `tests/support/` und Unit-Tests neben dem betroffenen Code unter `src/`. Lies bei Books-Tests auch `src/app/books/AGENTS.md`. Die vorhandenen Playwright-Tests mocken die API und benötigen kein Backend. Das Karma-Ziel von `npm test` ist laut Repository-Hinweisen unvollständig; prüfe den aktuellen Stand, bevor du es als ausführbar behandelst.
- Ändere im Rahmen der Red-Phase nur Tests und erforderliche Testhilfen. Ergänze keine produktiven Stubs, Exporte, Methoden oder UI-Elemente, nur damit Tests kompilieren. Fehlt Testinfrastruktur, dokumentiere die konkrete Lücke und nötige Einrichtung; ändere Abhängigkeiten und Runner-Konfiguration nur, wenn die Beauftragung diese Einrichtung umfasst.

## Szenarien in Tests umsetzen

1. Behalte vorhandene Kennungen wie `AK-1` bei; vergib bei fehlenden Kennungen stabile IDs. Ordne bei mehreren Szenarien unter einem Kriterium eigene Unterkennungen zu. Halte eine Zuordnung von Szenario zu Testebene, Datei und Testtitel fest.
2. Erstelle für jedes Szenario einen eigenständigen Test. Fasse verschiedene Given/When/Then-Abläufe nicht in einem Test zusammen. Bei Szenario-Tabellen muss jede Datenzeile einen separat benannten Test erzeugen.
3. Benenne den Test mit Kennung und erwartetem Verhalten. Strukturiere den Testkörper durch `Given`, `When` und `Then` als Kommentare oder nachvollziehbare Abschnitte: Ausgangszustand und Daten aufbauen, auslösende Handlung ausführen, alle erwarteten Ergebnisse inklusive zugehöriger `And`-Aussagen prüfen.
4. Nutze konkrete fachliche Assertions. Ein Gerüst enthält ausführbare Testlogik, nicht bloß einen leeren Testkörper oder TODO-Kommentare. Teste beobachtbare Ergebnisse statt privater Implementierungsdetails.
5. Mocke externe Abhängigkeiten und Fehlerantworten, nicht das zu prüfende Verhalten. UI-Tests dürfen Backend-Antworten simulieren, müssen aber das tatsächliche Frontend bedienen. Gemeinsame Fixtures dürfen Vorbereitung teilen; jeder Test muss unabhängig von Reihenfolge und anderen Tests laufen.

Die gewünschte Assertion soll wegen des noch fehlenden Verhaltens scheitern. Verwende keine künstlichen Fehler wie `expect(true).toBe(false)`, pauschales `fail()` oder absichtlich defekte Fixtures. Nutze weder `skip`, `todo`, `pending`, Jasmine `xit`/`xdescribe` noch Playwright `test.fail()`, um die Red-Phase zu ersetzen oder einen erfolgreichen Lauf vorzutäuschen. Deaktiviere oder schwäche bestehende Tests nicht ab.

Wenn eine geplante öffentliche Schnittstelle noch fehlt, kennzeichne sie als Testentwurf für die Green-Phase. Ein dadurch verursachter Import- oder Typfehler ist ein Integrationshindernis und kein nachgewiesener fachlicher Red-Test. Umgehe das nicht mit `any`, `@ts-ignore` oder produktiven Platzhaltern.

## Red nachweisen und übergeben

- Führe die neu erstellten Tests gezielt mit dem vorhandenen Runner aus und beachte vorgeschriebene Repository-Checks. Formatiere nur geänderte Dateien. Vermeide externe Beispieltests oder eine echte API als Voraussetzung für isolierte Feature-Tests.
- Prüfe für jeden Test die tatsächliche Fehlerursache. Unterscheide **fachlich rot**, **bereits grün**, **blockiert durch Testumgebung oder fehlende Schnittstelle** und **nicht ausgeführt**. Ein fehlender Browser, ein Setup-Fehler oder ein nicht gestarteter Server belegen kein fehlendes Feature. Behebe Fehler im eigenen Testcode innerhalb des Testumfangs und wiederhole den betroffenen Lauf.
- Ist ein Test schon grün, prüfe seine Aussagekraft und berichte gegebenenfalls, dass das Kriterium bereits erfüllt ist. Verändere weder Anforderungen noch Anwendung, um einen Fehlschlag zu erzwingen. Stelle nicht die gesamte Phase als nachgewiesen rot dar, wenn einzelne Szenarien blockiert oder ungeprüft sind.
- Beende die Arbeit nach der Red-Prüfung. Übergib die Szenario-Zuordnung mit Dateien und Testtiteln, tatsächlich ausgeführte Befehle, Ergebnis und konkrete Fehlerursache je Fall sowie offene Fragen und Infrastrukturhindernisse. Nenne die noch zu erfüllenden fachlichen Erwartungen als Ausgangspunkt für Green, ohne produktiven Code zu schreiben.
