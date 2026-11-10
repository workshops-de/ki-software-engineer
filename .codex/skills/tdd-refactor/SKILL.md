---
name: tdd-refactor
description: Bereinigt Angular-Komponenten und zugehörige Services nach der Green-Phase im Red-Green-Refactor-Zyklus. Wendet Projektkonventionen, SOLID, eine Komponente pro Datei, einheitliche Abstraktionsebenen und reaktive Komposition an und bewahrt dabei das getestete Verhalten. Für strukturelles Refactoring, nicht für neue Funktionen oder die Implementierung noch roter Tests.
---

# TDD: Refactor-Phase für Angular

Überarbeite die grüne Implementierung direkt im Repository in kleinen, verhaltensbewahrenden Schritten. Verbessere Verständlichkeit, Verantwortlichkeiten und Komposition innerhalb der bestehenden Architektur. Beende die Phase mit nachgewiesen weiterhin grünen Prüfungen; beginne keinen neuen Feature-Zyklus.

## Ausgangspunkt und Umfang bestimmen

- Übernimm betroffene Dateien, Anforderungen und Testnachweise aus Green. Eine bestimmte Übergabeform oder die Verfügbarkeit der Skill `tdd-green` ist nicht erforderlich. Fehlt eine Dateiliste, grenze den Bereich anhand der aktuellen Aufgabe und des Diffs ein; leite daraus keinen Auftrag zum Umbau des gesamten Repositorys ab.
- Lies die geltenden `AGENTS.md`-Dateien, `ARCHITECTURE.md`, relevante README-Abschnitte, Produktionscode und zugehörige Tests samt Fixtures. Gleiche Architekturhinweise mit dem aktuellen Code ab; ältere Review-Empfehlungen sind keine zusätzlichen Aufgaben.
- Prüfe Arbeitsstand, Testskripte und Runner-Konfiguration. Bewahre bestehende, auch unversionierte Arbeiten. Halte öffentliche Inputs, Outputs, DI-Verträge, API-Aufrufe und beobachtbare UI-Zustände fest, die der Umbau erhalten muss.
- Führe die betroffenen Tests vor dem Umbau aus. Sind sie fachlich rot, bestimme die Ursache und kennzeichne den fehlenden Green-Ausgangspunkt. Implementiere im Refactor-Schritt keine fehlenden Features. Bearbeite nur unabhängig abgesicherte Bereiche weiter; Infrastrukturfehler sind kein fachliches Red.
- Fehlt für einen riskanten Umbau eine Verhaltensabsicherung, ergänze zuerst einen gezielten Charakterisierungstest für das vereinbarte bestehende Verhalten und weise ihn vor der Änderung grün nach. Erfinde keine neuen Anforderungen und konserviere keine bekannten Vertragsverletzungen. Für reine mechanische Änderungen genügen passende bestehende Prüfungen.

## Struktur und Abstraktion verbessern

Wähle konkrete Schwächen im beauftragten Bereich, etwa vermischte Zuständigkeiten, verschachtelte Subscriptions oder doppelte Zustandsübergänge. Begründe jede Extraktion durch bessere Kohäsion, verständlichere Abläufe oder eine echte Wiederverwendung; vermeide allgemeine Aufräumarbeiten ohne Bezug zum Auftrag.

- **Eine Komponente pro Datei:** Extrahiere mehrere produktive Angular-Komponenten einer Datei in eigene, passend benannte Dateien im zuständigen Feature. Aktualisiere Imports und Standalone-Imports. Inline-Templates und Inline-Styles dürfen bleiben; diese Regel verlangt keine separate HTML- oder CSS-Datei. Lokale Test-Host-Komponenten sind kein Anlass für einen produktiven Strukturumbau.
- **Einheitliche Abstraktionsebenen:** Lass eine orchestrierende Methode fachliche Schritte benennen. Lagere darin versteckte Validierungs-, Mapping- oder Transportdetails in präzise benannte Funktionen aus, wenn dies den Ablauf verständlicher macht. Halte einfache Ausdrücke direkt; vermeide Hilfsmethoden, die nur weiterreichen oder beim Lesen unnötige Sprünge erzwingen.
- **SRP:** Trenne Darstellung, Ablaufsteuerung und HTTP-Zugriff entlang der bestehenden Zuständigkeiten. Darstellende Komponenten erhalten Daten und melden Aktionen; fachliche HTTP-Aufrufe bleiben im Feature-Client. Extrahiere reine Berechnungen bei Bedarf in featurelokale Funktionen. Ein Service pro Methode ist kein Ziel.
- **OCP:** Nutze bei belegten Varianten Komposition und kleine Erweiterungspunkte. Erzeuge weder eine Plugin-Architektur noch Konfigurationsschichten für hypothetische Erweiterungen.
- **LSP:** Bewahre beim Ersetzen oder Zusammenführen von Implementierungen die zugesicherten Eingaben, Ergebnisse, Fehler- und Lifecycle-Semantiken. Bevorzuge Komposition gegenüber neuer Komponentenvererbung.
- **ISP:** Schneide Inputs, Outputs und Service-Verträge nach den tatsächlichen Verbrauchern. Vermeide breite Sammelschnittstellen und Abhängigkeiten auf ungenutzte Fähigkeiten; ändere keine öffentlichen Verträge ohne Anpassung und Prüfung ihrer Aufrufer.
- **DIP:** Verwende Angular DI und die bestehende Richtung UI → fachlicher Client → `HttpClient`. Führe zusätzliche Interfaces, InjectionTokens oder Adapter nur bei einem konkreten Austauschbedarf ein. Die direkte Injektion des vorhandenen `BookApiClient` allein rechtfertigt keine zusätzliche Schicht.

Erhalte Standalone-Komponenten, strikte Typ- und Templateprüfung sowie Feature-Grenzen. Halte Seitenzustand lokal. Verschiebe Bücherlogik nicht nach `shared/` oder in den App-Rahmen. Führe Store, Facade, Bibliotheksmigration, neue Abhängigkeiten oder einen Wechsel zwischen Signals und Observables nur bei nachweisbarem Bedarf innerhalb des Auftrags ein. SOLID verlangt keine zusätzliche Architektur.

## Reaktive Abläufe komponieren

Fasse zusammengehörige asynchrone Auslöser und Ergebnisse nachvollziehbar zusammen, wenn dadurch manuelle Koordination entfällt. Ersetze funktionierende imperative Abläufe nicht allein aus Stilgründen.

- Vermeide verschachtelte `subscribe`-Aufrufe. Komponiere abhängige Abläufe mit RxJS; wähle den Operator nach der zugesicherten Semantik: etwa `switchMap` für ersetzbare Leseanfragen, `exhaustMap` für das Ignorieren doppelter Auslöser während eines Vorgangs oder `concatMap` für notwendige Reihenfolge. Breche Schreibvorgänge nicht beiläufig durch einen Request-Wechsel ab.
- Leite darstellbaren Zustand möglichst aus einem klaren Ablauf ab. Verhindere mehrere unkoordinierte Schreiber für dieselben Lade-, Fehler- und Ergebnisfelder. Nutze vorhandene Angular-/RxJS-Mittel wie `AsyncPipe`, `computed` oder lifecyclegebundene Subscriptions passend zum bestehenden Ansatz; vermeide parallele, synchron zu haltende Zustandskopien.
- Bewahre bei der BookMonkey-Suche den sofortigen Abbruch bei Eingabe und das Verbergen alter Treffer während des Debouncings. Ein bloßes `debounceTime` vor `switchMap` kann den Abbruch bis zum Ende der Wartezeit verzögern und genügt diesem Vertrag nicht. Clear und Reload müssen ausstehende Verzögerungen aufheben und mit dem aktuellen Suchtext arbeiten.
- Ordne Ladezustand, Fehler und Ergebnisse dem aktiven Abruf zu. Ein `finalize` einer abgebrochenen Anfrage darf nicht den Ladezustand einer neueren Anfrage zurücksetzen. Fehlerbehandlung innerhalb eines wechselnden Requests muss weitere Suche und Retry ermöglichen; beende nicht unbeabsichtigt den gesamten Auslöser-Stream.
- Bewahre Lifecycle-Cleanup auch für innere Streams, Timer, Animationen und imperative Seiteneffekte. Achte bei `takeUntilDestroyed` auf dessen Position gegenüber höhergeordneten Operatoren und auf einen gültigen Injection-Kontext. Mehrfache Template-Abonnements dürfen keine unbeabsichtigten HTTP-Duplikate erzeugen; prüfe bei Sharing auch Lebensdauer und Cache-Semantik.
- Bewahre fachliche Sonderfälle aus `src/app/books/AGENTS.md`, insbesondere Entwurfsisolation, bestätigtes und unbestätigtes Speichern, Dialogrückmeldungen und Listenaktualisierung. Erhalte Tastaturbedienung, Beschriftungen, Fokusführung, Cover-Fallbacks und mobile Darstellung.

## In kleinen Schritten prüfen

1. Wähle eine zusammenhängende Strukturänderung, setze sie um und aktualisiere betroffene Imports und Aufrufer. Ändere keine fachlichen Regeln, API-Payloads oder sichtbaren Abläufe als Nebenwirkung.
2. Führe die zugehörigen Tests nach dem Schritt aus. Behebe verursachte Regressionen oder nimm ausschließlich den eigenen verursachenden Schritt zurück; bewahre fremde Änderungen. Fahre erst auf abgesichertem Stand mit dem nächsten Umbau fort.
3. Erhalte die Aussagekraft der Tests. Passe Imports oder Testaufbau an verschobene Schnittstellen an, sofern nötig; schwäche keine fachlichen Assertions ab und entferne keine Fälle. Verwende weder Ausschlüsse noch `skip`, `only` oder erwartete Fehlschläge als Green-Nachweis. Begründe notwendige Testanpassungen.
4. Formatiere gezielt geänderte Dateien mit `npx prettier --write <Dateipfade>`. Prüfe den finalen Diff auf unbeabsichtigte Vertragsänderungen, unnötige Abstraktionen und Änderungen außerhalb des Auftrags.

## Refactor abschließen

- Führe nach Anwendungscode- oder Build-Konfigurationsänderungen `npm run build` aus.
- Prüfe nach Änderungen an Details, Bearbeitung oder Listenintegration mit `npx playwright test tests/book-details.spec.ts`, nach Suchänderungen mit `npx playwright test tests/book-search.spec.ts`. Bei übergreifenden Umbauten führe beide aus und ergänze weitere betroffene projektspezifische Tests anhand des aktuellen Bestands, etwa für Würfelablauf oder Theme. Prüfe bei reaktiven Suchumbauten Antwortreihenfolge, Clear, Fehler und Cleanup; die vorhandenen Suchtests sichern Cleanup nicht ausdrücklich ab.
- Die Feature-Tests mocken die API und brauchen kein Backend. Externe Playwright-Beispieltests sind kein BookMonkey-Nachweis. Prüfe den aktuellen Zustand von `npm test`: Das Karma-Ziel ist laut Projektanweisungen unvollständig und darf ohne erfolgreiche Ausführung nicht als Nachweis gelten.
- Berichte die bereinigten Verantwortlichkeiten und betroffenen Dateien, die erhaltenen Verträge sowie tatsächlich ausgeführte Prüfungen mit Ergebnissen. Benenne nicht ausgeführte oder blockierte relevante Checks und verbleibende Fehler. Melde den Refactor-Schritt nur dann als nachgewiesen grün, wenn alle Prüfungen im ausgewiesenen Umfang erfolgreich waren.
