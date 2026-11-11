# Refactoring-Review und Maßnahmenplan

**Projekt:** BookMonkey · **Stand:** 09.11.2026 · **Branch:** `workshop`

**Status:** Grundlage für die gemeinsame Abstimmung. Diese Datei beschreibt die besprochenen acht Schwerpunkte und ihre Lösungsvorschläge. Das Refactoring selbst wurde noch nicht umgesetzt. Der Review berücksichtigt den aktuellen Arbeitsstand einschließlich der noch nicht eingecheckten Buchdetailseite.

## 1. Ziel und Rahmen

Die Anwendung soll zuverlässige Suchergebnisse anzeigen, Fehler verständlich behandeln und gemeinsame Darstellungslogik konsistent verwenden. Der Aufwand für Wartung und Tests soll sinken, ohne dafür eine neue Anwendungsarchitektur einzuführen.

Beibehalten werden zunächst Angular mit Standalone-Komponenten, RxJS, der bestehende API-Client, die englische Oberfläche, das grundlegende Layout und die Routen `/` sowie `/books/:id`. Bestehende lokale Änderungen dürfen bei der späteren Umsetzung nicht überschrieben werden.

Fehlerbehebungen und sichtbare Verhaltensänderungen sind von rein strukturellen Änderungen zu unterscheiden. Insbesondere der Erhalt der Suche und das Entfernen vorbereiteter Workshop-Abhängigkeiten werden unten als gesondert abzustimmende Vorschläge behandelt.

Nicht automatisch Bestandteil des Refactorings sind Pagination, neue Buchfelder, eine andere Suchsemantik, Übersetzung, SSR, ein globaler Store oder der Wechsel des Testframeworks.

## 2. Review-Grundlage und bisherige Prüfung

Geprüft wurden Buchliste, Buchkarte, Detailansicht, API-Client und Datenmodell sowie Anwendungsshell, Routing, Provider, Styles, Paketmanifest, Angular-/Playwright-Konfiguration, Tests, README und Architekturdokumentation.

| Prüfung im vorausgegangenen Review                                                  | Ergebnis                                         | Aussagegrenze                                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| `npm run build`                                                                     | Erfolgreich, ohne Angular-Warnungen              | Belegt Kompilierbarkeit, keine fehlerfreien asynchronen Abläufe.  |
| `npm test -- --watch=false`                                                         | Abbruch mit `Cannot find module 'karma-jasmine'` | Unit-/Komponententests sind so derzeit nicht ausführbar.          |
| `npx playwright test tests/book-details.spec.ts --project=chromium --reporter=list` | Sechs Tests bestanden                            | Prüft die Detailseite mit simulierten HTTP-Antworten in Chromium. |
| Firefox, WebKit und vollständige Playwright-Suite                                   | Nicht ausgeführt                                 | Keine Aussage über deren aktuellen Erfolg.                        |

Die Such-Rennbedingungen wurden aus dem Quellcode abgeleitet und im Review nicht zusätzlich mit kontrollierten Browserantworten reproduziert. Dafür sind nachfolgend Regressionstests vorgesehen. Für die Erstellung dieser Dokumentation wurden die Prüfungen nicht erneut ausgeführt.

## 3. Übersicht und Prioritäten

**P1:** Fehler und fehlende Absicherung zuerst. **P2:** Konsistenz und Wartbarkeit verbessern. **P3:** Infrastruktur und Dokumentation bereinigen.

| ID  | Priorität       | Befund                                                                | Vorgeschlagenes Ergebnis                                               |
| --- | --------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| R01 | P1              | Suchanfragen und Timer konkurrieren miteinander                       | Ein abbrechbarer, an die Komponentenlebensdauer gebundener Suchablauf. |
| R02 | P1              | Listenfehler wirken wie leere oder aktuelle Ergebnisse                | Eindeutige Zustände und Wiederholung mit dem aktuellen Suchwert.       |
| R03 | P2              | Cover, Ersatztexte und Ladeanzeigen sind doppelt und uneinheitlich    | Kleine gemeinsame Komponenten und Darstellungsregeln.                  |
| R04 | P2              | Datenmodell und tatsächlich unterstützte Antworten widersprechen sich | Gemeinsame Prüfung und Normalisierung an der API-Grenze.               |
| R05 | P2, abzustimmen | Navigation verwirft den Suchkontext                                   | Suchtext über die URL wiederherstellen.                                |
| R06 | P1              | Testeinrichtung und Abdeckung sind unvollständig                      | Ausführbare Tests für die Anwendung und ihre problematischen Abläufe.  |
| R07 | P2/P3           | Feste API-Adresse, ungenutzte Infrastruktur, veraltete Dokumentation  | Konfigurierbare Datenquelle und bewusst bereinigte Projektgrundlage.   |
| R08 | P2              | Suchoberfläche besitzt Lücken bei der Barrierefreiheit                | Benannte Bedienelemente, erkennbare Fokus- und Statusanzeigen.         |

## 4. Detaillierte Befunde und Lösungsvorschläge

### R01 · Suchablauf, konkurrierende Antworten und fehlendes Aufräumen

**Fundstelle:** [BookListComponent](src/app/books/book-list.component.ts), insbesondere `loadBooks()`, `onSearchChange()`, `clearSearch()` und `searchTimeout`.

**Aktueller Ablauf:** Jeder Aufruf von `loadBooks()` startet eine eigene Subscription. Das Debouncing verzögert lediglich den Start neuer Suchen; bereits laufende Anfragen werden nicht abgebrochen. Jede Antwort darf `books` und `loading` verändern. `clearSearch()` startet einen Request, entfernt aber keinen noch offenen Timer. Beim Verlassen der Liste werden Timer und Requests nicht an die Zerstörung der Komponente gebunden.

**Mögliche unerwünschte Ergebnisse:**

1. Suche A startet, anschließend Suche B. B antwortet zuerst. Die spätere Antwort auf A überschreibt die bereits passenden Ergebnisse von B.
2. Eine frühere Anfrage beendet die Ladeanzeige, obwohl die aktuelle Anfrage noch läuft.
3. Direkt nach dem Tippen wird die Suche geleert. Das Leeren lädt sofort; der alte Timer liest später den inzwischen leeren Suchtext und lädt nochmals.
4. Nach dem Wechsel zu einem Buch kann ein noch offener Timer eine unnötige Listensuche starten. Bereits laufende Requests können die verlassene Komponente weiter aktualisieren.

Dies belegt unnötige Arbeit und widersprüchliche Zustandsänderungen, aber für sich genommen keinen dauerhaften Speicherverlust.

**Lösungsschritte:**

- [ ] Initiales Laden, Texteingabe, Leeren und Wiederholen als Ereignisse eines gemeinsamen RxJS-Ablaufs behandeln.
- [ ] Suchtext vor einer Anfrage trimmen und aufeinanderfolgende identische Suchwerte zusammenfassen. Normale Eingaben weiterhin um 300 ms verzögern.
- [ ] Die Verzögerung abbrechbar innerhalb eines äußeren `switchMap` umsetzen, damit auch beim Leeren oder einer neuen Eingabe keine alte Verzögerung übrig bleibt.
- [ ] Sobald eine neue Suchabsicht eintrifft, alte Requests abbrechen beziehungsweise deren Wirkung ausschließen. Ein lediglich nach `debounceTime` angeordnetes `switchMap` würde alte Requests während der Wartezeit noch nicht abbrechen.
- [ ] Leeren, initiales Laden und explizites Wiederholen unmittelbar ausführen. Ein erneuter Versuch mit demselben Text darf nicht durch `distinctUntilChanged` unterdrückt werden.
- [ ] Den manuellen `any`-Timer entfernen. Den resultierenden Stream über `AsyncPipe` oder `takeUntilDestroyed` an die Lebensdauer der Ansicht binden.
- [ ] Requestzustand und Ergebnis nur im aktiven inneren Stream erzeugen; kein unabhängiges Zurücksetzen eines globalen Ladeflags aus abgebrochenen Requests.

**Schnittstellen:** Der API-Client kann `getBooks(pageSize, searchTerm)` beibehalten. Die Änderung betrifft die Steuerung der Liste. Der Suchzustand muss zwischen eingegebenem Text und tatsächlich angefragtem Wert eindeutig vermitteln.

**Prüfung und Abnahme:** Kontrollierte Antworten für A und B in umgekehrter Reihenfolge ausliefern; sichtbar bleiben ausschließlich Ergebnisse für B. Zusätzlich Abbruch während der 300-ms-Wartezeit, sofortiges Leeren und Navigation vor Timerablauf prüfen. Leeren erzeugt genau einen unmittelbaren Request; nach Zerstörung der Ansicht startet kein verzögerter Request mehr.

### R02 · Fehler, leere Ergebnisse und Zustandsmodell

**Fundstellen:** [BookListComponent](src/app/books/book-list.component.ts), Fehlerzweig von `loadBooks()` und Darstellung bei `!loading`; zum Vergleich [BookDetailComponent](src/app/books/book-detail.component.ts), `BookDetailState` und Fehleranzeige.

**Problem:** Die Liste schreibt einen HTTP-Fehler nur in die Konsole und setzt `loading` auf `false`. Bei einem initialen Fehler erscheint damit „No books available“. Nach erfolgreichem Laden können bei einer fehlgeschlagenen neuen Suche die alten Bücher unter dem neuen Suchtext stehen. Die Detailansicht unterscheidet Fehler bereits und bietet Wiederholung an. Ihr Zustandsinterface erlaubt durch optionale Felder allerdings typseitig gleichzeitig ein Buch und einen Fehler.

**Lösungsschritte:**

- [ ] Einen kleinen gemeinsamen Zustandsansatz mit einer diskriminierten Union verwenden: `loading`, `success` mit Daten und `error` mit Fehlerart. Für Liste und Detailseite unterschiedliche fachliche Fehlerarten zulassen.
- [ ] Leere Suchergebnisse als erfolgreichen Zustand mit leerem Array behandeln; ein Fehler darf diesen Zustand nicht vortäuschen.
- [ ] Bei Listenfehlern eine dauerhafte Meldung und „Try again“ anzeigen. Alte Ergebnisse zunächst ausblenden, statt sie als aktuelle Treffer stehenzulassen.
- [ ] Wiederholung mit der aktuell gültigen Suche verbinden und über den Ablauf aus R01 ausführen.
- [ ] Fehler im inneren Requeststream abfangen, damit der übergeordnete Suchstream nach einem Fehler weitere Eingaben verarbeitet.
- [ ] Auf einen globalen Fehlerdienst oder Store verzichten, solange die beiden Ansichten ihre Zustände selbst übersichtlich verwalten können. Ein Toast wäre höchstens eine Ergänzung.

**Schnittstellen:** Ein gemeinsamer lokaler Typ wie `LoadState<T, E>` ist ausreichend. Die Zustandsdaten müssen unzulässige Kombinationen wie gleichzeitig Erfolg und Fehler ausschließen; ein generisches Requestframework ist dafür nicht erforderlich.

**Prüfung und Abnahme:** Initialen Netzwerkausfall, HTTP 500 nach erfolgreicher Suche, erfolgreiche leere Antwort und Wiederholung prüfen. Fehler zeigen keine Leerzustandsmeldung und keine veralteten Treffer. Nach erfolgreichem Wiederholen funktioniert auch die nächste Suche. Eine alte Anfrage darf einen neueren Fehler nicht überschreiben.

### R03 · Wiederholte Darstellung und unterschiedliche Ersatzanzeigen

**Fundstellen:** [BookItemComponent](src/app/books/book-item.component.ts) und [BookDetailComponent](src/app/books/book-detail.component.ts), außerdem Ladeanzeige der Liste.

**Problem:** Beide Buchansichten implementieren Cover und Ersatzanzeige selbst. Nur die Detailseite behandelt einen Bildladefehler. Eine nicht leere, aber defekte Cover-URL erzeugt in der Liste deshalb ein kaputtes Bild. Auch fehlende Titel und Autoren werden nur in der Detailseite sinnvoll ersetzt. Spinner und Ladetexte sind ebenfalls mehrfach implementiert und unterschiedlich ausgezeichnet.

**Lösungsschritte:**

- [ ] Eine kleine `BookCoverComponent` mit Cover-URL und Titel als Eingaben extrahieren. Abmessungen und Seitenverhältnis bleiben Aufgabe der umgebenden Ansicht.
- [ ] Fehlende und fehlerhafte Bildquellen über dieselbe Ersatzanzeige behandeln. Der Bildfehlerzustand muss beim Wechsel der Quelle zurückgesetzt werden.
- [ ] Alt-Text aus einem zuverlässig vorhandenen Anzeigetitel bilden. Dieselbe Titelregel auch für Überschrift und Linkbeschriftung der Karte verwenden.
- [ ] Ersatzwerte für Titel und Autor über eine kleine gemeinsame Darstellungsfunktion beziehungsweise ein Viewmodell bereitstellen; keine widersprüchlichen Einzelregeln in Templates verteilen.
- [ ] Einen gemeinsamen Ladeindikator mit konfigurierbarem Text und `role="status"` extrahieren. Rein dekorative Spinner bleiben für assistive Technik verborgen.
- [ ] Nur tatsächlich wiederholtes Verhalten herausziehen. Unterschiedliche Layouts und fachliche Texte der Ansichten bleiben eigenständig.

**Schnittstellen:** Gemeinsame Darstellungskomponenten erhalten Daten als Eingaben, laden selbst keine Bücher und kennen keine Router- oder API-Details. Das verhindert neue Kopplungen zwischen Darstellung und Datenzugriff.

**Prüfung und Abnahme:** Fehlende URL, HTTP-Fehler, gültiges Cover und Wechsel von einer defekten zu einer gültigen Quelle prüfen. Karte und Detailseite zeigen konsistente Ersatzwerte. Ein Buch ohne Titel hat einen verständlichen Linknamen. Beide Ansichten kündigen Laden auf dieselbe zugängliche Weise an.

### R04 · Datenvertrag und Behandlung unerwarteter API-Antworten

**Fundstellen:** [Book](src/app/books/book.ts), [BookApiClient](src/app/books/book-api-client.service.ts), Zustandsabbildung der Detailseite und Test „handles missing information on a narrow screen“ in [book-details.spec.ts](tests/book-details.spec.ts).

**Problem:** Das Modell verlangt unter anderem Titel, Autor und Beschreibung. Der vorhandene Detailtest unterstützt ausdrücklich eine Antwort nur mit `id`. `HttpClient.get<Book>` garantiert diese Struktur nicht zur Laufzeit. Die Detailseite akzeptiert derzeit jedes Objekt mit wahrheitswertiger ID und behandelt ein Objekt ohne ID als nicht gefunden. Ein falscher Feldtyp, etwa ein String statt `coAuthors: string[]`, kann beim Templateaufruf von `join()` scheitern. Liste und Detailseite verfolgen keine gemeinsame Datenregel.

**Lösungsschritte:**

- [ ] API-Antworten im Client zunächst als `unknown` empfangen und über eine gemeinsame, kleine Prüf-/Normalisierungsfunktion verarbeiten.
- [ ] Die ID als erforderliche, nicht leere Buchkennung behandeln. Fehlende bibliografische Informationen ausdrücklich im Modell zulassen, statt sich auf fälschlich verpflichtende Felder zu verlassen.
- [ ] Optionale Texte auf geeignete Stringwerte prüfen; fehlende, leere oder ausschließlich aus Leerzeichen bestehende Werte einheitlich als nicht verfügbar behandeln.
- [ ] Co-Autoren nur als Liste gültiger Texte weiterreichen. Fehlende oder ungeeignete optionale Werte dürfen keine Templateausnahme auslösen.
- [ ] Seitenzahl nur bei geeignetem numerischem Wert anzeigen; den Wert `0` nicht durch einen Wahrheitswerttest versehentlich als fehlend behandeln.
- [ ] Antwort ohne gültige ID, ungeeignete Listenstruktur oder ungültige Listeneinträge als Datenfehler behandeln. Ungültige Einträge zunächst nicht stillschweigend ausblenden, weil dies unvollständige Ergebnisse verschleiern würde.
- [ ] HTTP 404 als „nicht gefunden“ behandeln. Ungültige erfolgreiche Antworten als Daten-/Ladefehler darstellen; eine wiederholbare Fehlermeldung darf keinen nicht vorhandenen Datensatz behaupten.
- [ ] Anzeigeersatztexte aus R03 von der Datenprüfung trennen: Die API-Schicht liefert Daten oder einen Fehler, keine englischen UI-Texte.

**Schnittstellen:** Der öffentliche API-Client kann weiterhin `Observable<Book>` beziehungsweise `Observable<Book[]>` liefern. Sein `Book`-Typ muss dann tatsächlich die normalisierte Struktur beschreiben. Die externe Bookmonkey-API wird nicht verändert. Für diese kleine Datenstruktur ist zunächst keine neue Validierungsbibliothek vorgesehen.

**Prüfung und Abnahme:** Vollständige und unvollständige Bücher, leere Texte, `null`, falscher Co-Autor-Typ, fehlende ID und eine nicht als Array gelieferte Liste prüfen. Gültige unvollständige Bücher bleiben lesbar; strukturell ungültige Antworten erzeugen einen verständlichen Fehler. HTTP 404 bleibt von solchen Datenfehlern unterscheidbar.

### R05 · Suchkontext beim Navigieren erhalten

**Fundstellen:** Lokales Feld `searchTerm` der Liste und Rücklink `routerLink="/"` der Detailseite.

**Problem:** Der Suchtext existiert nur in der Listenkomponente. Beim Öffnen eines Buches wird sie verlassen, und der Rücklink erzeugt eine neue ungefilterte Liste. Die URL enthält keine Information, mit der der bisherige Suchzustand zuverlässig wiederhergestellt werden könnte.

**Vorschlag zur gesonderten Abstimmung:** Die Suche über einen Query-Parameter `q` in der Listen-URL abbilden. Dies verbessert den Ablauf sichtbar und ist daher mehr als eine rein interne Umstrukturierung.

- [ ] Beim Öffnen der Liste den Suchwert aus `q` lesen, normalisieren und direkt laden.
- [ ] Nach der Suchverzögerung die URL mit `replaceUrl` aktualisieren, damit Texteingaben nicht für jeden Suchstand einen zusätzlichen Verlaufseintrag erzeugen.
- [ ] Einen leeren Suchwert durch Entfernen von `q` darstellen. URL und Suchstream dürfen sich nicht gegenseitig in einer Endlosschleife aktualisieren.
- [ ] Beim Öffnen eines Buches den aktuellen Suchparameter zur Detailroute mitnehmen; der Rücklink führt anschließend nach `/?q=...`.
- [ ] Direkte Detailaufrufe ohne Suchparameter weiterhin auf `/` zurückführen. Kein ausschließliches `history.back()` verwenden, da die vorherige Seite außerhalb der Anwendung liegen kann.

**Prüfung und Abnahme nach Zustimmung:** Suche → Buch → Rücklink sowie Browser-Zurück stellen Suchtext und passende Ergebnisse wieder her. Geteilte Listen-URLs funktionieren nach Neuladen. Direkte Buchlinks ohne Suchkontext führen verlässlich zur Sammlung zurück. Scrollposition und Ergebnis-Caching sind separate Erweiterungen und zunächst nicht vorgesehen.

### R06 · Testeinrichtung reparieren und Regressionen absichern

**Fundstellen:** [package.json](package.json), [angular.json](angular.json), [tsconfig.spec.json](tsconfig.spec.json), [playwright.config.ts](playwright.config.ts), [example.spec.ts](tests/example.spec.ts) und [book-details.spec.ts](tests/book-details.spec.ts).

**Problem:** `npm test` verweist auf einen nicht vollständig eingerichteten Karma/Jasmine-Runner. Die Startertests besuchen `playwright.dev` und sagen nichts über BookMonkey aus. Die sechs Anwendungstests sichern die Detailseite sinnvoll ab, aber keine Such-Rennbedingungen. Frontend- und API-Adressen sowie Mockdefinitionen wiederholen sich; die konfigurierte Möglichkeit einer `baseURL` wird nicht verwendet.

**Lösungsschritte:**

- [ ] Den bestehenden Karma/Jasmine-Runner mit den zur installierten Angular-Version passenden Entwicklungsabhängigkeiten und Typen vervollständigen. Einen Testframework-Wechsel nicht mit diesem Refactoring vermischen.
- [ ] Für die reine Datenprüfung und API-Konfiguration gezielte Unit-/HTTP-Tests einrichten. Asynchrone Suchzustände mit kontrollierten Zeitabläufen und Antworten prüfen.
- [ ] Vor der Suchkorrektur Tests für die Fehlerszenarien aus R01 und R02 ergänzen, damit ihr Fehlschlagen und die spätere Behebung nachvollziehbar sind.
- [ ] Startertests im aktiven Testverzeichnis durch Anwendungstests ersetzen. Das separate Beispielverzeichnis ist bereits außerhalb von `testDir` und darf nicht versehentlich in die reguläre Suite aufgenommen werden.
- [ ] Playwright-`baseURL` auf die lokale Anwendung setzen und relative Navigation verwenden. API-Adresse, Buchfixtures und Standard-Mocks in Testhilfen bündeln.
- [ ] Testrequests außerhalb der definierten Mocks erkennen, damit nicht versehentlich eine laufende lokale API die Ergebnisse beeinflusst.
- [ ] Einen expliziten `test:e2e`-Script dokumentieren; Browserinstallation und benötigte Laufzeitumgebung in der README festhalten.
- [ ] Die vorhandenen Detailtests beibehalten und nach der Extraktion gemeinsamer Komponenten auf Verhaltensprüfung statt auf interne Implementierungsdetails ausrichten.

**Abnahme:** `npm test -- --watch=false` und die Anwendungstests laufen reproduzierbar. HTTP-Mocks machen die Anwendungstests unabhängig von externer Website und Demo-API. Chromium ist das erste lokale Prüfgate; Firefox und WebKit werden für die bestehende Browsermatrix vor Abschluss ebenfalls geprüft, sofern die Laufzeitumgebung diese unterstützt. Einschränkungen werden dokumentiert.

### R07 · Konfiguration, ungenutzte Infrastruktur und widersprüchliche Dokumentation

**Fundstellen:** `BookApiClient.apiUrl`, Paketmanifest, `ToastService`, Material-Theme, Animationsprovider, `App.title`, Playwright-Konfiguration, README und `ARCHITECTURE.md`.

**Teil A – feste Datenquelle, Priorität P2:** `http://localhost:4730/books` ist direkt im Client hinterlegt. Bei einer bereitgestellten Anwendung würde der Browser damit den Rechner des jeweiligen Besuchers kontaktieren.

- [ ] Einen Injection Token für die API-Basisadresse einführen; den bisherigen localhost-Wert als Entwicklungsstandard erhalten.
- [ ] Beide Clientmethoden aus derselben Basisadresse ableiten. Den Einzelabruf weiterhin über eine korrekt kodierte ID bilden.
- [ ] Eine Konfigurationsüberschreibung testen und dokumentieren. Komponenten sollen keine API-Adressen kennen.
- [ ] Testadressen zentral in den Testhilfen halten; die Testkonfiguration muss nicht die komplette Anwendungskonfiguration importieren.

**Teil B – ungenutzte Infrastruktur, Priorität P3 und abzustimmen:** NgRx-/Query-Pakete sowie SSR-/Express-Pakete besitzen derzeit keine Verwendung im Anwendungsablauf. Material wird nur vom ungenutzten Toast-Service und dessen Theme referenziert. Das Feld `App.title` wird nicht gelesen; die Playwright-Konfiguration enthält auskommentierte Vorlagen.

- [ ] Für vorbereitete Workshop-Pakete zunächst entscheiden: konkreter geplanter Lehrzweck mit Dokumentation oder Entfernung.
- [ ] Unbenutzte Felder und überholte Vorlagenkommentare entfernen.
- [ ] Bei Entfernung der Toast-Infrastruktur Service, Theme, Styleeinbindung, Provider und direkte Pakete zusammenhängend prüfen. Material/CDK/Animationen nicht ohne Nutzungsprüfung einzeln entfernen.
- [ ] Manifest und Lockfile gemeinsam aktualisieren. Vorhandene Änderungen im Lockfile berücksichtigen und ausschließlich die tatsächlich vorgesehenen Paketänderungen übernehmen.
- [ ] Nach jedem Bereinigungspaket Build und relevante Tests ausführen. Weniger installierte Pakete bedeuten nicht automatisch einen entsprechend kleineren Browserbundle.

**Teil C – Dokumentation und Reproduzierbarkeit, Priorität P3:** Die Architektur behauptet weiterhin, es gebe keine Detailroute und nur Startertests. Die Aussage zur fehlenden Cover-Fehlerbehandlung trifft inzwischen nur noch auf die Liste zu. Der Suchkommentar nennt Titel und Autor, obwohl tatsächlich lediglich die globale API-Suche `q` verwendet wird. Die README beschreibt die Anwendungstests nicht.

- [ ] Architektur um Detailroute, Einzelabruf, aktuelle Fehlerbehandlung und tatsächliche Tests ergänzen.
- [ ] Suchkommentar auf die tatsächlich delegierte API-Suche korrigieren; keine unbelegte Einschränkung auf bestimmte Felder behaupten.
- [ ] README um ausführbare Prüfkommandos, Browserinstallation, API-Konfiguration sowie getestete Node-/npm- und Demo-API-Versionen ergänzen.
- [ ] Keine ungetesteten Versionsvorgaben erfinden: kompatible Versionen bei der Umsetzung feststellen und anschließend festhalten.
- [ ] Architektur als Beschreibung des Istzustands pflegen; diese Datei als Maßnahmenliste führen und erledigte Punkte kennzeichnen.

**Abnahme:** Die API lässt sich ohne Codeänderung im Client auf eine andere Basisadresse umstellen. Jede verbleibende direkte Abhängigkeit ist verwendet oder bewusst als Workshop-Vorbereitung dokumentiert. Dokumentierte Routen und Prüfkommandos stimmen mit dem Projekt überein.

### R08 · Zugänglichkeit der Suchoberfläche und Seitensemantik

**Fundstellen:** Suchfeld, Löschbutton und Ladeanzeige in `BookListComponent`; Überschrift in [app.html](src/app/app.html); Link- und Bildbeschriftung in `BookItemComponent`.

**Problem:** Die Suche besitzt nur einen Placeholder. Der Löschbutton enthält ein Symbol ohne zugänglichen Namen. Die Listenladeanzeige hat keine Statussemantik, die Detailseite dagegen schon. Die Anwendungsshell und die jeweilige Seite verwenden jeweils eine H1. Bei fehlendem Titel kann außerdem ein wenig hilfreicher Linkname entstehen.

**Lösungsschritte:**

- [ ] Ein mit dem Suchfeld verknüpftes Label ergänzen; ein visuell verborgenes Label ist möglich, wenn das bestehende Layout erhalten werden soll.
- [ ] Den Löschbutton mit einem eindeutigen Namen wie „Clear search“ und `type="button"` versehen. Dekoratives SVG vor assistiver Technik verbergen.
- [ ] Tastaturfokus im Suchfeld und bei interaktiven Elementen sichtbar machen; vorhandene Fokusdarstellung der Buchlinks beibehalten.
- [ ] Den gemeinsamen Ladeindikator aus R03 nutzen und Fehler zugänglich auszeichnen. Status- und Fehlermeldungen nicht zusätzlich mehrfach über verschiedene Live-Regionen ankündigen.
- [ ] Die Marke im Header ohne konkurrierende H1 darstellen; die aktuelle Ansicht behält ihre fachliche Hauptüberschrift.
- [ ] Anzeigenamen aus R03 auch für Buchlinks und Cover verwenden.

**Prüfung und Abnahme:** Suche, Leeren und Buchnavigation vollständig per Tastatur bedienen. Tests sprechen Suchfeld und Buttons über Rolle und Namen an. Lade- und Fehlerzustände sind semantisch erkennbar. Eine kurze manuelle Prüfung mit assistiver Technik ergänzt die DOM-Prüfung; ein automatisierter Test allein belegt keine vollständige Barrierefreiheit.

## 5. Empfohlene Umsetzung in prüfbaren Paketen

1. **Testgrundlage schaffen:** R06 reparieren; vorhandene Detailtests als Ausgangsbasis behalten. Kontrollierte Regressionstests für R01 und R02 ergänzen.
2. **Suchablauf korrigieren:** R01 und R02 gemeinsam umsetzen. Dabei ein eindeutiges Zustandsmodell einführen und alle Abbruch-/Wiederholungsszenarien prüfen.
3. **Datenvertrag vereinheitlichen:** R04 umsetzen. Datenprüfung und UI-Ersatzwerte voneinander trennen.
4. **Darstellung konsolidieren:** R03 umsetzen; Cover und Ladeindikator gemeinsam verwenden. R08 bei den betroffenen Bedienelementen abschließen.
5. **Konfiguration bereinigen:** R07 Teil A umsetzen und HTTP-Tests ergänzen.
6. **Abgestimmte Änderungen ergänzen:** R05 sowie R07 Teil B erst nach Entscheidung zu Sucherhalt und Workshop-Infrastruktur umsetzen.
7. **Dokumentation und Abschlussprüfung:** R07 Teil C aktualisieren, Maßnahmen abhaken und alle vereinbarten Prüfgates ausführen.

Jedes Paket soll separat reviewbar sein. Änderungen an Tests gehören zur jeweiligen Verhaltensänderung. Ein pauschales Neuformatieren oder Modernisieren des gesamten Projekts würde den Review erschweren und ist nicht vorgesehen.

## 6. Abschlusskriterien und offene Entscheidungen

Das Refactoring ist abgeschlossen, wenn die freigegebenen Maßnahmen umgesetzt sind, Suchantworten sich nicht mehr überholen können, Fehler und leere Ergebnisse unterscheidbar sind und beide Buchansichten dieselben Regeln für fehlende Angaben und Cover anwenden. Build und ausführbare Anwendungstests müssen bestehen; bekannte Einschränkungen werden ausdrücklich dokumentiert.

**Noch gemeinsam zu entscheiden:**

- Soll der Suchkontext gemäß R05 über URLs erhalten bleiben? Empfehlung: ja, als gesonderte UX-Verbesserung.
- Welche ungenutzten Abhängigkeiten dienen noch dem Workshop? Empfehlung: nur konkret geplante und dokumentierte Vorbereitungen behalten.

Pagination, Ergebnis-Caching, neue Suchfilter, Währungsumrechnung und lokalisierte Datumsformatierung bleiben separate Aufgaben. Sie beheben keine der hier vorrangig beschriebenen Struktur- und Ablaufprobleme.
