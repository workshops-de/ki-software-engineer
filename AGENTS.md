# Hinweise für Coding-Agents

Diese Datei gilt für das gesamte Repository.

## Kontext und Orientierung

- BookMonkey ist eine kleine Angular-20-Workshop-SPA mit Standalone-Komponenten, TypeScript im Strict-Modus, RxJS, Tailwind CSS 4 und Angular Material.
- Lies [ARCHITECTURE.md](./ARCHITECTURE.md) für Architekturgrenzen, Risiken und die Begründung der bestehenden Struktur. Gleiche Aussagen mit dem aktuellen Code ab: Das Review beschreibt teilweise einen älteren Stand.
- Inzwischen existieren ein Detail-/Bearbeitungsdialog, sichtbare Ladefehler, Request-Abbruch beim erneuten Listenabruf, Lifecycle-Cleanup und projektspezifische Playwright-Tests. Der Toast-Service wird verwendet.
- [README.md](./README.md) beschreibt Entwicklung, API-Vertrag und Detailtests. Backend und Datenhaltung liegen außerhalb dieses Repositorys.
- Review-Empfehlungen sind mögliche Folgeaufgaben; setze sie nur um, wenn sie zur aktuellen Aufgabe gehören.

## Struktur und Zuständigkeiten

- `src/main.ts` startet die Anwendung; `src/app/app.config.ts` registriert globale Provider.
- `src/app/app.*` enthält Seitenrahmen und Routing, keine fachliche Bücherlogik.
- `src/app/books/` enthält Modell, HTTP-Client, Liste, Buchkarte und Detail-/Bearbeitungsdialog.
- `src/app/shared/` enthält fachlich unabhängige, gemeinsam verwendete Funktionen wie den Toast-Service. Verschiebe Bücherlogik nicht dorthin.
- `tests/book-details.spec.ts` prüft BookMonkey mit gemockter API. `tests/example.spec.ts` besucht externe Playwright-Seiten; `tests-examples/` liegt außerhalb des aktiven Testverzeichnisses.
- `public/` enthält ausgelieferte statische Assets; `docs/` enthält Dokumentationsassets.
- Bearbeite keine generierten Dateien in `dist/`, `.angular/`, `test-results/` oder `node_modules/`.

## Änderungen am Anwendungscode

- Erhalte die Feature-Struktur und die Richtung von UI über `BookApiClient` zu Angular `HttpClient`. Das Books-Feature importiert den App-Rahmen nicht.
- Nutze Standalone-Komponenten und bestehende Angular-/RxJS-Mittel. Halte Änderungen auf die Aufgabe begrenzt und beachte strikte Typ- und Templateprüfung.
- Halte Seitenzustand lokal, solange kein konkreter Bedarf für geteilten Zustand besteht. Führe zusätzliche Schichten, eine Facade oder einen globalen Store erst bei nachweisbarem Bedarf ein.
- Installierte NgRx-, Query-, Express- und SSR-Pakete belegen keine genutzte Architektur. Aktiviere oder entferne sie nicht beiläufig.
- Verwende bestehende Tailwind- und Material-Muster. Bewahre Tastaturbedienung, zugängliche Beschriftungen, Fokusführung und Darstellung auf kleinen Bildschirmen.
- Beachte `.editorconfig` und `.prettierrc`: UTF-8, zwei Leerzeichen, einfache Anführungszeichen in TypeScript, Semikolons, keine abschließenden Kommata und LF.

## Regeln für das Books-Feature

- `BookApiClient` kapselt fachliche HTTP-Aufrufe. Die aktuell fest eingetragene Basisadresse lautet `http://localhost:4730/books`; Änderungen am Deployment müssen diese Konfiguration berücksichtigen.
- Die Liste steuert Suche, Lade-/Fehlerzustand, Dialogöffnung und Aktualisierung nach dem Speichern. Die Buchkarte stellt ein übergebenes `Book` dar und meldet Aktionen über Outputs; sie lädt keine Daten selbst.
- Listenabrufe verwenden `_limit` und optional `q`. Details und Updates adressieren die URL-kodierte **ISBN**, nicht `id`: `GET /books/:isbn`, `PUT /books/:isbn`.
- Beim Speichern wird das vollständige Buch übertragen. Bewahre `id`, `userId` und ISBN; `price` bleibt ein String. Der reale API-Vertrag ist laut README noch nicht live verifiziert.
- Bearbeitungsentwürfe dürfen die Liste und das geladene Original nicht vor erfolgreichem Speichern verändern. Abbrechen verwirft Änderungen; ein Speicherfehler erhält die Eingaben und erlaubt einen erneuten Versuch.
- Nach erfolgreichem Speichern wird die Liste mit dem aktuellen Suchtext neu geladen. Verhindere doppelte Speicheranfragen und bewahre die Schließsperre während des Speicherns.
- Koordiniere bei Änderungen an der Suche Debouncing, Zurücksetzen, Request-Abbruch und Lifecycle-Cleanup. Verspätete Antworten dürfen keine neueren Ergebnisse überschreiben; Lade- und Fehlerzustände müssen zum aktiven Abruf passen.
- Unterscheide Ladefehler von leeren Treffern und biete Wiederholung an. Behalte Cover-Fallbacks bei fehlenden oder defekten Bildern bei.

## Entwicklung und Prüfung

- Abhängigkeiten installieren: `npm ci` bei vorhandenem Lockfile; bei beabsichtigten Abhängigkeitsänderungen `npm install` und Lockfile konsistent aktualisieren.
- Frontend starten: `npm start` unter `http://localhost:4200`. Die separate Entwicklungs-API startet bei Bedarf mit `npx bookmonkey-api` unter `http://localhost:4730`.
- Nach Änderungen an Anwendungscode oder Build-Konfiguration: `npm run build`.
- Bei Änderungen an Details, Bearbeitung oder deren Listenintegration: `npx playwright test tests/book-details.spec.ts`. Playwright startet Angular und mockt die API; ein laufendes Backend ist dafür nicht erforderlich. Fehlende Browser lassen sich mit `npx playwright install` installieren.
- Ergänze bei Verhaltensänderungen gezielte Regressionstests. Prüfe bei Suchänderungen insbesondere Antwortreihenfolge, Clear, Fehler und Cleanup; die Detailtests decken diese Suchfälle nicht vollständig ab.
- `npm test` verweist auf Karma, dessen direkte Karma-/Jasmine-Abhängigkeiten und Jasmine-Typen fehlen. Behandle dieses Ziel nicht als funktionierenden Testnachweis, solange es nicht vervollständigt und ausgeführt wurde.
- Formatiere gezielt geänderte Dateien mit `npx prettier --write <Dateipfade>`. `npm run format.write` formatiert ganz `src/` und erfasst die Root-Dokumentation nicht.
- Für reine Dokumentationsänderungen reichen Inhalts-, Pfad- und Diff-Prüfung. Berichte nur tatsächlich ausgeführte Prüfungen und benenne nicht ausgeführte oder blockierte relevante Checks.

## Entscheidung zur Aufteilung der Agent-Anweisungen

Aktuell genügt diese Root-Datei: Es gibt ein kleines Frontend mit einem Books-Feature, gemeinsamen Werkzeugen und wenigen fachlichen Sonderregeln. Zusätzliche Dateien in `src/` und `src/app/books/` sind derzeit nicht notwendig.

Prüfe einen Split erneut, wenn mehrere Features eigene Konventionen erhalten oder die Books-Regeln wesentlich wachsen. Dann gehören allgemeine Angular-Regeln nach `src/AGENTS.md` und ausschließlich zusätzliche Books-Regeln nach `src/app/books/AGENTS.md`. Root behält Projektkontext, übergreifende Abläufe und Testbefehle, insbesondere für `tests/` außerhalb von `src/`. Wiederhole geerbte Regeln nicht; spezifischere Anweisungen gelten innerhalb ihres Unterverzeichnisses.
