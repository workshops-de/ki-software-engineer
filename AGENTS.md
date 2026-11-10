# Hinweise für Coding-Agents

Diese Datei gilt für das gesamte Repository.

## Kontext und Orientierung

- BookMonkey ist eine kleine Angular-20-Workshop-SPA mit Standalone-Komponenten, TypeScript im Strict-Modus, RxJS, Tailwind CSS 4 und Angular Material.
- Lies [ARCHITECTURE.md](./ARCHITECTURE.md) für Architekturgrenzen, Risiken und die Begründung der bestehenden Struktur. Gleiche Aussagen mit dem aktuellen Code ab: Das Review beschreibt teilweise einen älteren Stand.
- Inzwischen existieren ein Detail-/Bearbeitungsdialog, sichtbare Ladefehler, Request-Abbruch beim erneuten Listenabruf, Lifecycle-Cleanup und projektspezifische Playwright-Tests. Der Toast-Service wird verwendet.
- [README.md](./README.md) beschreibt Entwicklung, API-Vertrag sowie Detail- und Suchtests. Backend und Datenhaltung liegen außerhalb dieses Repositorys.
- Review-Empfehlungen sind mögliche Folgeaufgaben; setze sie nur um, wenn sie zur aktuellen Aufgabe gehören.

## Struktur und Zuständigkeiten

- `src/main.ts` startet die Anwendung; `src/app/app.config.ts` registriert globale Provider.
- `src/app/app.*` enthält Seitenrahmen und Routing, keine fachliche Bücherlogik.
- `src/app/books/` enthält Modell, HTTP-Client, Liste, Buchkarte und Detail-/Bearbeitungsdialog. Zusätzliche fachliche Regeln stehen in [src/app/books/AGENTS.md](./src/app/books/AGENTS.md).
- `src/app/shared/` enthält fachlich unabhängige, gemeinsam verwendete Funktionen wie den Toast-Service. Verschiebe Bücherlogik nicht dorthin.
- `tests/book-details.spec.ts` und `tests/book-search.spec.ts` prüfen BookMonkey mit gemockter API; `tests/support/books.ts` enthält gemeinsame Testhilfen. Beachte bei Änderungen an diesen Tests auch die fachlichen Verträge in [src/app/books/AGENTS.md](./src/app/books/AGENTS.md). `tests/example.spec.ts` besucht externe Playwright-Seiten; `tests-examples/` liegt außerhalb des aktiven Testverzeichnisses.
- `public/` enthält ausgelieferte statische Assets; `docs/` enthält Dokumentationsassets.
- Bearbeite keine generierten Dateien in `dist/`, `.angular/`, `test-results/` oder `node_modules/`.

## Änderungen am Anwendungscode

- Erhalte die Feature-Struktur und die Abhängigkeitsrichtung von UI über fachliche HTTP-Clients zu Angular `HttpClient`. Features importieren den App-Rahmen nicht.
- Nutze Standalone-Komponenten und bestehende Angular-/RxJS-Mittel. Halte Änderungen auf die Aufgabe begrenzt und beachte strikte Typ- und Templateprüfung.
- Halte Seitenzustand lokal, solange kein konkreter Bedarf für geteilten Zustand besteht. Führe zusätzliche Schichten, eine Facade oder einen globalen Store erst bei nachweisbarem Bedarf ein.
- Installierte NgRx-, Query-, Express- und SSR-Pakete belegen keine genutzte Architektur. Aktiviere oder entferne sie nicht beiläufig.
- Verwende bestehende Tailwind- und Material-Muster. Bewahre Tastaturbedienung, zugängliche Beschriftungen, Fokusführung und Darstellung auf kleinen Bildschirmen.
- Beachte `.editorconfig` und `.prettierrc`: UTF-8, zwei Leerzeichen, einfache Anführungszeichen in TypeScript, Semikolons, keine abschließenden Kommata und LF.

## Entwicklung und Prüfung

- Abhängigkeiten installieren: `npm ci` bei vorhandenem Lockfile; bei beabsichtigten Abhängigkeitsänderungen `npm install` und Lockfile konsistent aktualisieren.
- Frontend starten: `npm start` unter `http://localhost:4200`. Die separate Entwicklungs-API startet bei Bedarf mit `npx bookmonkey-api` unter `http://localhost:4730`.
- Nach Änderungen an Anwendungscode oder Build-Konfiguration: `npm run build`.
- Bei Änderungen an Details, Bearbeitung oder deren Listenintegration: `npx playwright test tests/book-details.spec.ts`. Playwright startet Angular und mockt die API; ein laufendes Backend ist dafür nicht erforderlich. Fehlende Browser lassen sich mit `npx playwright install` installieren.
- Bei Änderungen an der Suche: `npx playwright test tests/book-search.spec.ts`.
- Ergänze bei Verhaltensänderungen gezielte Regressionstests. Prüfe bei Suchänderungen insbesondere Antwortreihenfolge, Clear, Fehler und Cleanup; die vorhandenen Suchtests decken Cleanup nicht ausdrücklich ab.
- `npm test` verweist auf Karma, dessen direkte Karma-/Jasmine-Abhängigkeiten und Jasmine-Typen fehlen. Behandle dieses Ziel nicht als funktionierenden Testnachweis, solange es nicht vervollständigt und ausgeführt wurde.
- Formatiere gezielt geänderte Dateien mit `npx prettier --write <Dateipfade>`. `npm run format.write` formatiert ganz `src/` und erfasst die Root-Dokumentation nicht.
- Für reine Dokumentationsänderungen reichen Inhalts-, Pfad- und Diff-Prüfung. Berichte nur tatsächlich ausgeführte Prüfungen und benenne nicht ausgeführte oder blockierte relevante Checks.

## Aufteilung der Agent-Anweisungen

Diese Root-Datei enthält Projektkontext, allgemeine Angular-Regeln, übergreifende Abläufe und Testbefehle, insbesondere für `tests/` außerhalb von `src/`. [src/app/books/AGENTS.md](./src/app/books/AGENTS.md) ergänzt ausschließlich die fachlichen Regeln für das Books-Feature und gilt für diesen Ordner und seine Unterverzeichnisse.

Wiederhole geerbte Regeln nicht; spezifischere Anweisungen gelten innerhalb ihres Unterverzeichnisses. Eine zusätzliche `src/AGENTS.md` ist derzeit nicht nötig. Prüfe sie erneut, wenn mehrere Features gemeinsame Konventionen erhalten, die nur den Anwendungscode betreffen.
