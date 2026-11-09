# Refactoring- und Problemreview: BookMonkey

Stand: 9. November 2026. Grundlage: aktueller Anwendungscode, Tests, Konfiguration, Lockfile, [ARCHITECTURE.md](./ARCHITECTURE.md) und [README.md](./README.md).

Dieses Dokument erfasst den ursprünglichen Reviewstand und mögliche Maßnahmen. Beim Review wurden keine Korrekturen vorgenommen. Nachfolgende Änderungen sind im Umsetzungsstand festgehalten; die Befunde darunter beschreiben den Ausgangszustand.

## Umsetzungsstand

- **R01 umgesetzt:** Suchwechsel brechen den alten Request sofort ab und blenden alte Ergebnisse bereits während des Debouncings aus.
- **R02 umgesetzt:** Detailabruf und Speichern haben eine Wartezeit von 15 Sekunden. Bei Timeout oder Verbindungsabbruch eines Saves bleibt der Entwurf sichtbar; Schließen ist wieder möglich. Vor weiterer Bearbeitung muss die gespeicherte Version geladen werden. Es gibt keinen automatischen zweiten PUT; beim Schließen nach unklarem Save-Ausgang wird die Liste aktualisiert, ohne Erfolg zu behaupten. Ein möglicherweise noch arbeitender Server und fehlende Konfliktkontrolle (R05) bleiben externe Grenzen.
- **R13 teilweise umgesetzt:** Neue Playwright-Tests prüfen Suchverzögerung, Antwortreihenfolge, Clear ohne Nachlauf, leere Treffer, initiale Fehler/Retry und ausbleibende Detail-/Speicherantworten. Ein eigener Test für Komponentenzerstörung bleibt offen.
- **R15 für die betroffenen Abläufe umgesetzt:** Gemeinsame Mock-Prüfungen kontrollieren HTTP-Methoden, ISBN-Ziel, `_limit` und Queryparameter. Save-Tests werten den Suchtext aus und prüfen auch Bücher, die nach dem Speichern nicht mehr zum Filter passen. Die echten API-Vertragsprüfungen aus R21 bleiben offen.
- Alle übrigen Befunde bleiben unverändert offen. Die Prüftabelle am Dokumentende bezieht sich auf das ursprüngliche Review.

### Prüfung der Umsetzung

- Beide fachlichen Playwright-Suites bestehen mit jeweils 18 Tests in Chromium, WebKit und Firefox: insgesamt 54 erfolgreiche Browser-Testfälle. Firefox benötigte einen Lauf außerhalb der Sandbox, weil dort bereits die Browserseitenerzeugung scheiterte.
- `npm.cmd run build` ist erfolgreich. Der Build benötigt in dieser Umgebung Zugriff außerhalb der Sandbox und meldet eine Budgetwarnung: initiales Bundle 649,54 kB bei 500 kB Warnschwelle; die Fehlergrenze von 1 MB wird eingehalten.
- TypeScript-Prüfung von Anwendung und den betroffenen Testdateien mit `--noEmit`, Prettier-Prüfung der geänderten Code-/Testdateien und Diff-Whitespace-Prüfung sind erfolgreich. Keine Abhängigkeiten wurden geändert; echte Backend-Aufrufe sind weiterhin nicht Teil der Verifikation.

## Umfang und Aussagekraft

Geprüft wurden Buchliste und Suche, Buchkarten, Detaildialog und Bearbeitung, HTTP-Client, Toast-Service, App-Rahmen sowie Build- und Testkonfiguration. Das externe Backend, seine Berechtigungen, produktive HTTP-Header und Datenhaltung sind nicht Bestandteil dieses Repositorys.

- **Belegt:** direkt am Code oder durch die unten aufgeführten Compilerprüfungen nachgewiesen. Browserauswirkungen sind statisch hergeleitet, sofern nicht anders angegeben.
- **Bedingtes Risiko:** relevant bei einem genannten Szenario, etwa mehreren Bearbeitern oder produktiver Bereitstellung.
- **Offene Prüfung:** anhand dieses Repositorys oder in dieser Umgebung nicht abschließend prüfbar. Keine bestätigte Sicherheitslücke.

| Priorität | Bedeutung |
| --- | --- |
| P1 | Vor produktiver Nutzung beziehungsweise vor umfangreicher Weiterentwicklung klären. |
| P2 | Bei der nächsten Überarbeitung des betroffenen Features berücksichtigen. |
| P3 | Kleine Bereinigung oder Verbesserung bei weiterem Wachstum; kein dringender Umbau. |

## Überblick

| ID | Priorität | Thema | Einordnung |
| --- | --- | --- | --- |
| R01 | P2 | Ergebnisse und Suchtext während Debouncing nicht synchron | Belegt |
| R02 | P1 | Speicheranfrage kann Dialog unbegrenzt sperren | Bedingtes Risiko |
| R03 | P1 vor Deployment | Festes lokales API-Ziel über HTTP | Belegt; Betriebsrisiko |
| R04 | P2 | API-Antworten ohne Laufzeitprüfung | Belegt |
| R05 | P2 bei Mehrbenutzerbetrieb | Vollständiges PUT ohne Konfliktkontrolle | Bedingtes Risiko |
| R06 | P1 vor Produktivbetrieb | Schreibberechtigungen und Besitzprüfung ungeklärt | Offene Sicherheitsprüfung |
| R07 | P2 | Externe Cover und Schriftarten ohne zentrale Ressourcenrichtlinie | Belegt; Datenschutz-/Betriebsrisiko |
| R08 | P2 vor Deployment | Sicherheitsheader nicht überprüfbar | Offene Härtungsprüfung |
| R09 | P1 vor Freigabe | Abhängigkeitssicherheit nicht abschließend geprüft | Offene Sicherheitsprüfung |
| R10 | P3 | Doppelte Cover- und Fallback-Implementierung | Belegt |
| R11 | P3 | Wiederholte Validierung und unnötige Formularzuordnung | Belegt |
| R12 | P3 | Große Inline-Templates und uneinheitliche Konventionen | Belegt; Wartbarkeit |
| R13 | P1 | Wesentliche Such- und Listenfälle ungetestet | Belegt |
| R14 | P1 | Konfigurierter Unit-Testweg nicht lauffähig | Durch Compilerprüfung bestätigt |
| R15 | P2 | API-Mocks akzeptieren unerwartete Methoden und Verträge | Belegt |
| R16 | P2 | Externe Beispieltests und verteilte Test-URLs | Belegt |
| R17 | P2 | Material-Theme fehlt im Unit-Testziel | Belegt |
| R18 | P2 | Ungenutzte direkte Architekturabhängigkeiten | Belegt; Zweck offen |
| R19 | P2 | Architekturreview widerspricht aktuellem Feature-Stand | Belegt |
| R20 | P2 | Sichtbarer Suchfokus und Ladeansagen fehlen | Belegt; Browserprüfung offen |
| R21 | P1 vor Freigabe der Bearbeitung | Echter GET-/PUT-Vertrag nicht verifiziert | Dokumentierte Prüflücke |

## Funktionsfehler und Datenkonsistenz

### R01 – Suchtext und Treffer können während der Verzögerung auseinanderlaufen

- **Fundstelle:** [book-list.component.ts](./src/app/books/book-list.component.ts), `onSearchChange()` ab Zeile 140 und `loadBooks()` ab Zeile 120.
- **Befund:** Der Suchtext ändert sich sofort. Ein laufender Request wird erst beim nächsten `loadBooks()` nach 300 ms abbestellt. Antwortet die alte Anfrage dazwischen, werden deren Treffer und `loading = false` übernommen, obwohl das Eingabefeld bereits einen anderen Suchtext enthält. Auch bisherige Treffer bleiben während der Verzögerung ohne Kennzeichnung sichtbar.
- **Abgrenzung:** Sobald der neue Abruf beginnt, ist bereits ein Abbruch des vorherigen Requests vorhanden. Die frühere pauschale Aussage „kein Request-Abbruch“ aus dem Architekturreview trifft nicht mehr zu.
- **Maßnahme:** Eingabetext und angewendete Suchabfrage ausdrücklich zuordnen. Bei neuer Eingabe aktive Ergebnisse invalidieren oder als bisherige Treffer kennzeichnen; Abbruch und Ladezustand mit dem gewünschten Debounce-Verhalten abstimmen.
- **Abnahme:** Anfrage A verzögern, Suchtext B eingeben und A vor Ablauf des B-Timers beantworten. A darf nicht als aktuelles Ergebnis zu B erscheinen. Clear und Refresh nach Speichern müssen weiterhin genau den gewünschten Abruf auslösen.

### R02 – Hängende Speicheranfrage blockiert den gesamten Dialog

- **Fundstelle:** [book-details-dialog.component.ts](./src/app/books/book-details-dialog.component.ts), `save()` Zeilen 99–120; [Dialog-Template](./src/app/books/book-details-dialog.component.html), Aktionen ab Zeile 100.
- **Befund:** Beim Speichern werden Formular, Schließen per Escape/Backdrop und beide Aktionsbuttons gesperrt. Die Freigabe erfolgt nur im Fehlercallback; Erfolg schließt den Dialog. Eine eigene Zeitgrenze oder Wiederherstellung bei einer ausbleibenden Antwort fehlt.
- **Auswirkung:** Bleibt der Request offen, gibt es in der Anwendung keinen bedienbaren Ausweg aus `saving`. Auch Ladeanfragen können unbegrenzt im Ladezustand bleiben.
- **Maßnahme:** Eine endliche Wartezeit und einen definierten Wiederherstellungszustand vorsehen. Bei unklarem PUT-Ausgang zuerst den Serverstand abgleichen: Ein clientseitiger Timeout beweist nicht, dass die Speicherung am Server unterblieben ist. Die Schließsperre während eines regulären Saves beibehalten.
- **Abnahme:** PUT dauerhaft offen halten; nach der festgelegten Grenze ist wieder eine verständliche, bedienbare Oberfläche verfügbar. Ein Wiederholungsversuch überschreibt keinen unbemerkt bereits gespeicherten oder zwischenzeitlich geänderten Stand.

### R03 – API-Adresse ist fest auf den Entwicklerrechner eingestellt

- **Fundstelle:** [book-api-client.service.ts](./src/app/books/book-api-client.service.ts), Zeile 8.
- **Befund:** Alle Requests verwenden `http://localhost:4730/books`. In einem ausgelieferten Frontend bezeichnet `localhost` den Rechner des jeweiligen Nutzers. Die Zieladresse ist nicht über Provider oder Umgebung austauschbar.
- **Auswirkung:** Ein zentral bereitgestelltes Backend wird nicht angesprochen. Ein späteres entferntes HTTP-Ziel hätte keine Transportverschlüsselung; HTTPS-Seiten und HTTP-APIs können zusätzlich Browserbeschränkungen auslösen. Das lokale Workshop-Setup allein belegt keinen Angriff.
- **Maßnahme:** Basisadresse zentral konfigurierbar machen, produktiv HTTPS oder einen passenden Same-Origin-Proxy verwenden und CORS am tatsächlichen Ziel prüfen.
- **Abnahme:** Dieselbe Anwendung kann mit getrennten Entwicklungs- und Deployment-Zielen betrieben werden, ohne Servicecode zu ändern. Browserrequests erreichen den vorgesehenen Origin.

### R04 – TypeScript-Typen ersetzen keine Prüfung der API-Daten

- **Fundstelle:** [book-api-client.service.ts](./src/app/books/book-api-client.service.ts), Zeilen 12–28; [book.ts](./src/app/books/book.ts); [book-details-dialog.component.ts](./src/app/books/book-details-dialog.component.ts), Zeilen 70–73 und 103–104.
- **Befund:** `get<Book>()`, `get<Book[]>()` und `put<Book>()` übernehmen Antworten ungeprüft. Das Interface existiert zur Laufzeit nicht. Auch die beim PUT zurückgegebene Antwort wird direkt als erfolgreiches Dialogergebnis verwendet.
- **Auswirkung:** Fehlende IDs können das Tracking beeinträchtigen, falsche Feldtypen gelangen in Formulare. Beispiel: `GET` liefert HTTP 200 mit `null`; der Dialog setzt `state = 'viewing'`, zeigt wegen `&& book` aber den Formular-Fallback. Eine leere PUT-Antwort kann außerdem das wahrheitsbasierte `if (saved)` der Liste umgehen, obwohl der Server gespeichert hat.
- **Maßnahme:** Die benötigte Antwortstruktur an der HTTP-Grenze prüfen und Vertragsfehler als Fehlerzustand behandeln. Erfolg nicht allein aus der Wahrheit eines beliebigen Antwortobjekts ableiten. Ein kleiner Validator genügt; eine neue Domain-Schicht ist dafür nicht erforderlich.
- **Abnahme:** `null`, falsche Collection-Struktur, fehlende Identität und unzulässige Feldtypen erzeugen einen definierten Fehler. Erfolgreiches Speichern löst den vorgesehenen Refresh zuverlässig aus.

### R05 – Vollständige Updates können zwischenzeitliche Änderungen überschreiben

- **Fundstelle:** [book-details-dialog.component.ts](./src/app/books/book-details-dialog.component.ts), Zeilen 87 und 103–110; [book-api-client.service.ts](./src/app/books/book-api-client.service.ts), Zeilen 16–17.
- **Befund:** Der beim Öffnen geladene Stand wird mit dem Entwurf zusammengeführt und vollständig per PUT übertragen. Clientseitig gibt es keine Versionsnummer, keinen `If-Match`-Header und keine Konfliktbehandlung. Ob der Server Konflikte anderweitig abfängt, ist unbekannt.
- **Risiko:** Ändern zwei Nutzer dasselbe Buch, kann der spätere Save Änderungen des ersten überschreiben, auch in Feldern, die der zweite Nutzer nicht bewusst bearbeitet hat.
- **Maßnahme:** Bei Mehrbenutzerbetrieb eine vom Backend unterstützte Konfliktstrategie vereinbaren, etwa ETag/Version und verständliche Konfliktauflösung. Nicht ohne Vertragsprüfung auf PATCH wechseln; das dokumentierte vollständige PUT ist zunächst beizubehalten.
- **Abnahme:** Zwei Bearbeitungen desselben Ausgangsstands führen bei einer überholten Speicherung zu einem erkennbaren Konflikt oder einer ausdrücklich festgelegten Zusammenführung.

## Sicherheit und externe Vertrauensgrenzen

### R06 – Authentifizierung, Schreibrechte und Besitzprüfung sind offen

- **Fundstelle:** [book-api-client.service.ts](./src/app/books/book-api-client.service.ts), `updateBook()`; [app.config.ts](./src/app/app.config.ts); [book.ts](./src/app/books/book.ts), `id`, `isbn`, `userId`.
- **Beobachtung:** Das Frontend hat keinen implementierten Login-/Berechtigungsablauf und übermittelt beim PUT den vollständigen Datensatz einschließlich `userId`. Das Backend liegt außerhalb des Repositorys.
- **Einordnung:** Für eine offene Fake-API im Workshop kann dies beabsichtigt sein. Eine ausnutzbare fehlende Autorisierung des Servers ist hier nicht nachgewiesen. Eine unveränderliche ISBN im Formular ist keine serverseitige Zugriffskontrolle.
- **Offene Prüfung vor Produktivbetrieb:** Der Server muss den angemeldeten Nutzer, das adressierte Buch und erlaubte Feldänderungen prüfen. Manipulierte `userId`, ISBN oder IDs dürfen keine fremden Schreibrechte geben. CORS ist dafür kein Ersatz. Bei späterer Cookie-Authentifizierung zusätzlich die dazu passende CSRF-Absicherung prüfen.
- **Abnahme:** Direkte manipulierte HTTP-Aufrufe werden für nicht berechtigte Nutzer serverseitig abgewiesen; Rechte hängen nicht von deaktivierten oder schreibgeschützten Formularfeldern ab.

### R07 – Unkontrollierte externe Bildquellen und Google-Fonts-Abhängigkeit

- **Fundstelle:** [book-item.component.ts](./src/app/books/book-item.component.ts), Zeilen 15–20; [Dialog-Template](./src/app/books/book-details-dialog.component.html), Zeilen 11–16 und 87; [index.html](./src/index.html), Zeilen 9–10.
- **Befund:** API-Daten und das frei bearbeitbare Cover-Feld bestimmen Bildziele. Eine Quellenrichtlinie und explizite Referrer-Policy fehlen. Zusätzlich werden Schriftstylesheets von Google geladen; Material-Icon-Verwendung ist im Anwendungscode nicht erkennbar.
- **Auswirkung:** Bilder können Browserrequests an fremde Origins auslösen; externe Anbieter erhalten Verbindungsdaten und abhängig von der Browser-/Hosting-Policy Referrer-Informationen. Externe Verfügbarkeit beeinflusst Darstellung und Tests. Das ist kein nachgewiesenes serverseitiges SSRF und kein Beleg für ausführbaren JavaScript-Code im Bildfeld.
- **Maßnahme:** Erlaubte Cover-Schemata und Hosts anhand des Produktbedarfs festlegen, Referrer-Verhalten bestimmen und die Regel serverseitig für gespeicherte URLs berücksichtigen. Lokale Fonts beziehungsweise der Verzicht auf ungenutzte Icon-Fonts reduzieren externe Abhängigkeiten. Einen Bildproxy nur mit eigener Zielvalidierung einführen.
- **Abnahme:** Nicht erlaubte Bildziele werden verständlich behandelt; die Anwendung funktioniert mit blockierten Drittanbietern. Das gewünschte Netzwerk- und Referrer-Verhalten ist geprüft.

### R08 – CSP und weitere Hosting-Schutzmaßnahmen sind nicht verifiziert

- **Fundstelle:** [index.html](./src/index.html); keine produktive Hosting-/Reverse-Proxy-Konfiguration im geprüften Repository vorhanden.
- **Einordnung:** Eine fehlende CSP-Meta-Angabe beweist keine fehlende CSP: Der Host kann sie als HTTP-Header setzen. Produktive CSP, Framing-Schutz und Referrer-Policy wurden nicht gemessen.
- **Maßnahme:** Vor Deployment die tatsächlichen Response-Header prüfen und eine zu Angular Material, Styles und den vorgesehenen Ressourcen passende CSP einschließlich Framing-Regeln festlegen. Die Angular-Dokumentation empfiehlt CSP und Trusted Types als zusätzliche Schutzschicht; eine Aktivierung muss auf Kompatibilität geprüft werden. Quelle: [Angular Security](https://angular.dev/best-practices/security).
- **Abnahme:** Die produktiven Header sind dokumentiert; normale Abläufe funktionieren unter der gewählten Policy und fremdes Einbetten beziehungsweise ungewollte Ressourcenquellen sind entsprechend der Vorgaben eingeschränkt.

### R09 – Keine belastbare Aussage zu bekannten Paket-Sicherheitslücken

- **Fundstelle:** [package.json](./package.json) und [package-lock.json](./package-lock.json). Im Lockfile stehen unter anderem Angular Core 20.2.1, Angular Material/CLI 20.2.0 und Playwright 1.55.0.
- **Prüfergebnis:** `npm.cmd audit --json --ignore-scripts` wurde ausgeführt, scheiterte aber beim Abruf des npm-Advisory-Endpunkts. Zusätzlich konnte npm sein Logverzeichnis außerhalb des Workspace nicht beschreiben. Es liegt kein verwertbarer Auditbericht vor; aus dem Versionsalter wird keine konkrete CVE abgeleitet.
- **Maßnahme:** In einer Umgebung mit Registry-Zugriff Audit erneut ausführen, direkte und transitive Treffer nach tatsächlicher Verwendung und Erreichbarkeit bewerten und Updates separat planen. Build-/Entwicklungsabhängigkeiten und ausgelieferten Browsercode unterscheiden. Kein pauschales `audit fix --force`.
- **Abnahme:** Aktueller Bericht mit dokumentierter Bewertung offener Treffer und geprüften, kompatiblen Updates. `npm audit` prüft bekannte Registry-Advisories und ersetzt keine Code-/Backendprüfung. Quelle: [npm-audit-Dokumentation](https://docs.npmjs.com/cli/v11/commands/npm-audit/).

## Doppelter Code und Wartbarkeit

### R10 – Cover-Darstellung und Fehlerbehandlung sind zweimal implementiert

- **Fundstelle:** [book-item.component.ts](./src/app/books/book-item.component.ts), Zeilen 14–27 und Feld `failedCover`; [Dialog-Template](./src/app/books/book-details-dialog.component.html), Zeilen 10–20 und `coverFailed` in der Dialogklasse.
- **Befund:** Beide Stellen implementieren Bildbindung, Alt-Text, Fehlerereignis und denselben Fallback-Text. Die Karte merkt sich die fehlgeschlagene URL, der Dialog nur einen Boolean. Neue Regeln für Quellen, Ladeverhalten und Fallback müssen zweimal umgesetzt werden.
- **Maßnahme:** Bei der nächsten Cover-Änderung eine kleine featurelokale Cover-Komponente mit URL, Alt-Text und Layoutoptionen prüfen. Den Fehlerzustand an die aktuelle URL binden. Kein allgemeines UI-Framework daraus ableiten.
- **Abnahme:** Fehlende, defekte und nachträglich geänderte URLs funktionieren an beiden Stellen gleich; Abmessungen und Alt-Texte bleiben passend zum jeweiligen Kontext.

### R11 – Formularvalidierung wiederholt sich; Zuordnung ist unnötig breit

- **Fundstelle:** [book-details-dialog.component.ts](./src/app/books/book-details-dialog.component.ts), Zeilen 45–56, 87 und 104.
- **Befund:** Titel und Autor verwenden dieselbe Kombination aus Pflichtfeld und Nicht-Leerzeichen-Prüfung. `form.reset({ ...this.book, ... })` übergibt auch nicht editierbare Modellfelder, die keine Controls besitzen. `numPages!` benötigt eine Annahme über die vorherige Validierung, die der Typ allein nicht ausdrückt.
- **Einordnung:** Kleine lokale Duplikation; kein aktueller Defekt beim Erhalt von `id`, ISBN oder `userId`. Deren Bewahrung durch den anschließenden Spread ist bereits implementiert. Für `price` fehlt eine fachlich festgelegte Formatregel; der String-Typ ist ausdrücklich Teil des Vertrags und kein Fehler.
- **Maßnahme:** Gemeinsame lokale Validatoren und eine explizite Zuordnung der editierbaren Felder erwägen. Zusätzliche Längen-, URL- oder Preisregeln erst anhand des API-/Produktvertrags festlegen und auf dem Server ebenso durchsetzen.
- **Abnahme:** Pflichtfelder und positive ganze Seitenzahlen bleiben validiert; nicht editierbare Identitätsfelder bleiben erhalten und `price` bleibt ein String.

### R12 – Große Templates und gemischte Konventionen erschweren Änderungen

- **Fundstelle:** [book-list.component.ts](./src/app/books/book-list.component.ts), Inline-Template Zeilen 18–98; [book-item.component.ts](./src/app/books/book-item.component.ts); [Dialog-Template](./src/app/books/book-details-dialog.component.html); [app.ts](./src/app/app.ts), Zeile 11.
- **Befund:** Liste/Karte verwenden Inline-Templates und `*ngIf`/`*ngFor`, der Dialog eine separate Datei mit `@if`. Constructor-DI und `inject()` sind gemischt. `App.title` wird nicht verwendet. Das sind Wartbarkeitsthemen, keine belegten Laufzeitfehler.
- **Maßnahme:** Große Templates bei fachlicher Überarbeitung auslagern, Konventionen schrittweise angleichen und das ungenutzte Feld entfernen. Den Formularzweig im Dialog möglichst ausdrücklich an `editing`/`saving` knüpfen statt an einen allgemeinen `else`-Fallback.
- **Abnahme:** Darstellung und Verhalten bleiben gleich; Zustandszweige sind eindeutig. Eine Facade erst ergänzen, wenn weitere kombinierte Listenfunktionen die Orchestrierung tatsächlich vergrößern.

## Tests, Konfiguration und Dokumentation

### R13 – Such- und Listenabläufe haben kein ausreichendes Sicherheitsnetz

- **Fundstelle:** [book-details.spec.ts](./tests/book-details.spec.ts); keine Anwendungsspecs unter `src/` vorhanden.
- **Befund:** Die vorhandenen Detailtests prüfen sinnvolle Funktionen einschließlich Such-Refresh nach Save. Eigene Tests für Debounce-Grenzen, R01, Abbruch bei neuer Suche, Clear ohne Timer-Nachlauf, initialen Listenfehler/Retry, leere Treffer und Cleanup beim Zerstören fehlen. Auch R02 ist nicht abgesichert.
- **Maßnahme:** Zuerst reproduzierbare Tests für diese Übergänge ergänzen; Timer und Antwortreihenfolge gezielt steuern. Keine neuen Tests verlangen, die nur interne Methoden nachzeichnen.
- **Abnahme:** Kritische Fälle scheitern bei einer absichtlich eingebauten Regression und laufen mit gemockter API ohne Netzwerkzugriff auf das Backend reproduzierbar durch.

### R14 – Unit-Testkonfiguration scheitert an fehlender Ausstattung

- **Fundstelle:** [package.json](./package.json), `test`-Script und Dev-Abhängigkeiten; [tsconfig.spec.json](./tsconfig.spec.json), `types: ["jasmine"]`; [angular.json](./angular.json), Karma-Ziel ab Zeile 66.
- **Bestätigt:** `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.spec.json` endet mit Exit 2 und `TS2688: Cannot find type definition file for 'jasmine'`. `karma`, `jasmine-core` und `@types/jasmine` sind im Lockfile nicht vorhanden. Der vollständige Karma-Aufruf wurde nicht ausgeführt.
- **Maßnahme:** Einen bewusst gewählten, funktionsfähigen Unit-Testweg herstellen oder die irreführende Konfiguration im Rahmen einer ausdrücklichen Tooling-Entscheidung ersetzen. Ein bloßer Typ-Stummel repariert keinen Runner.
- **Abnahme:** Ein relevanter Service-/Komponententest läuft über den dokumentierten Befehl auch ohne Watch-Modus automatisiert durch.

### R15 – API-Mocks erkennen mehrere Vertragsfehler nicht

- **Fundstelle:** [book-details.spec.ts](./tests/book-details.spec.ts), `setup()` Zeilen 19–22 und überschriebene Routen etwa ab Zeile 116.
- **Befund:** Die Standard-Detailroute liefert unabhängig von der HTTP-Methode ein Buch. Mehrere spezielle Handler unterscheiden nur PUT von „allen anderen Methoden“. Der Save-Erfolgsfall spiegelt den Requestbody zurück; der anschließende Listenhandler liefert das gespeicherte Buch unabhängig davon, ob es wirklich zur Suche passt.
- **Auswirkung:** Falsche HTTP-Methoden, nicht unterstützte Responseformen und fehlerhafte Suchfilterung können trotz grüner Tests unbemerkt bleiben. Die vorhandene vollständige Payload-Assertion und der überprüfte Suchparameter sind trotzdem wertvoll.
- **Maßnahme:** Methoden explizit prüfen, unerwartete Requests fehlschlagen lassen, relevante Queryparameter auswerten und Fehler-/Antwortvarianten testen. Die Query-Filterung nach einem Save mit einem Buch prüfen, das nicht mehr zur Suche passt.
- **Abnahme:** Eine falsche Methode oder ein verlorener `_limit`-/`q`-Parameter lässt den passenden Test scheitern. Nach Änderung eines suchrelevanten Felds entspricht die Liste wieder dem Filter.

### R16 – Die Standardsuite enthält externe Beispiele und feste URLs

- **Fundstelle:** [example.spec.ts](./tests/example.spec.ts), Zeilen 4 und 11; [playwright.config.ts](./playwright.config.ts), Zeilen 15, 27–29 und 74–77; [book-details.spec.ts](./tests/book-details.spec.ts), Zeilen 17 und 22.
- **Befund:** Der Standardlauf startet die lokale App, prüft aber zusätzlich `playwright.dev`. Damit hängt ein Teil des Ergebnisses von Internetzugriff und einer fremden Website ab. `baseURL` ist auskommentiert, während Frontend- und API-URLs an mehreren Stellen fest stehen.
- **Maßnahme:** Workshop-Beispiele vom aktiven Produkt-Testlauf trennen. Frontend-URL über `baseURL` verwenden und Test-API-Konfiguration konsistent halten. Das separate `tests-examples/` liegt bereits außerhalb von `testDir`.
- **Abnahme:** Der BookMonkey-Testlauf benötigt keine fremde Website und lässt sich mit einem anderen Frontend-Port konfigurieren, ohne die Testfälle einzeln zu bearbeiten.

### R17 – Build und Unit-Testziel laden unterschiedliche globale Styles

- **Fundstelle:** [angular.json](./angular.json), Zeilen 25 und 77; [material-theme.scss](./src/material-theme.scss).
- **Befund:** Der Build lädt `styles.css` und `material-theme.scss`; das Karma-Ziel nur `styles.css`. Material-Dialoge und Snackbar werden dadurch in einer anderen Style-Umgebung geprüft, sobald dieses Ziel repariert ist. Playwright verwendet die laufende App und ist von genau dieser Abweichung nicht betroffen.
- **Maßnahme:** Relevante globale Styles im gewählten Komponententestweg an den Build angleichen.
- **Abnahme:** Dialog und Snackbar erhalten im Komponententest das vorgesehene Theme; ein Browsercheck bestätigt weiterhin Layout und Fokusdarstellung.

### R18 – Mehrere direkte Abhängigkeiten haben keine Verwendung im Anwendungscode

- **Fundstelle:** [package.json](./package.json), Zeilen 14, 23, 25–28 und 39; keine entsprechenden Imports unter `src/` gefunden.
- **Befund:** NgRx Signals/Toolkit, TanStack Query, Express und SSR-Ausstattung sind deklariert, obwohl nur eine clientseitige Anwendung ohne entsprechende Implementierung vorliegt. Ob dies Workshop-Vorbereitung ist, bleibt offen.
- **Auswirkung:** Mehr Installations-, Update- und Prüfaufwand sowie zusätzliche transitive Abhängigkeiten. Daraus folgen weder ein nachgewiesenes größeres Browserbundle noch eine konkrete Sicherheitslücke.
- **Maßnahme:** Workshop-Zweck je Paket klären und dokumentieren oder ungenutzte direkte Einträge samt Lockfile kontrolliert bereinigen. Von Angular-Werkzeugen gegebenenfalls transitiv benötigte Pakete nicht blind entfernen.
- **Abnahme:** Saubere Installation, Angular-Kompilierung, Build und relevante Tests funktionieren weiterhin; verbleibende direkte Architekturpakete haben einen erklärten Zweck.

### R19 – Architekturreview beschreibt teilweise behobene Probleme als aktuell

- **Fundstelle:** [ARCHITECTURE.md](./ARCHITECTURE.md), insbesondere Abschnitte zu Zustand, Toast-Service, Tests und priorisierten Schritten; Gegenprüfung mit [book-list.component.ts](./src/app/books/book-list.component.ts) und [book-details.spec.ts](./tests/book-details.spec.ts).
- **Befund:** Das Review nennt unter anderem fehlenden Request-Abbruch, fehlendes Timer-Cleanup, fehlende sichtbare Fehlerzustände, einen ungenutzten Toast-Service und keine fachlichen Tests. Diese Aussagen sind im aktuellen Stand überholt. Details und Bearbeitung fehlen im Architekturüberblick.
- **Maßnahme:** Das Review später auf den aktuellen Stand bringen und behobene Befunde von verbleibenden Risiken trennen. Die [AGENTS.md](./AGENTS.md) weist auf die Abweichung bereits hin.
- **Abnahme:** Architekturüberblick und priorisierte Maßnahmen stimmen mit Lesen, Suche, Details und Bearbeitung sowie den tatsächlich vorhandenen Tests überein.

### R20 – Suche hat keinen eigens sichtbaren Tastaturfokus; Listenladen keine Statusansage

- **Fundstelle:** [book-list.component.ts](./src/app/books/book-list.component.ts), Eingabe Zeilen 23–30 und Ladeanzeige Zeilen 45–50.
- **Befund:** Die Suchbox entfernt den Outline über `focus:outline-none`; ein eigener Focus-Ring oder Fokusstil am umgebenden Container fehlt. Die Ladeanzeige hat weder `role="status"` noch eine Live-Region; die Ergebnisregion hat kein `aria-busy`. Der Detaildialog besitzt bereits Statusansagen und `aria-busy`.
- **Maßnahme:** Sichtbare Fokusdarstellung ergänzen und Such-/Ladezustände für assistive Technik passend ankündigen. Die tatsächliche Wirkung mit Tastatur und Screenreader prüfen; eine vollständige WCAG-Konformitätsbewertung ist hier nicht erfolgt.
- **Abnahme:** Die aktive Suchbox ist bei Tastaturbedienung klar erkennbar. Lade- und Ergebniswechsel werden verständlich und ohne übermäßige Ansagen vermittelt.

### R21 – Live-Vertrag der externen Bearbeitungs-API bleibt ungeprüft

- **Fundstelle:** [README.md](./README.md), Abschnitt „Book details checks“; [book-api-client.service.ts](./src/app/books/book-api-client.service.ts).
- **Befund:** Die README dokumentiert ausdrücklich, dass die API während der Implementierung nicht erreichbar war. Die vorhandenen Tests mocken den vorausgesetzten Vertrag; ein Live-Nachweis für Lesen/Schreiben per ISBN, vollständiges PUT und Persistenz fehlt. Auch dieses Review hat die API nicht aufgerufen und keine Bücher verändert.
- **Maßnahme:** In einer kontrollierten Testumgebung mit einem Wegwerfbuch GET, PUT, erneutes GET, 404 und Browser-CORS prüfen. Eine explizite API-Version für reproduzierbare Workshop-Läufe festlegen; `npx bookmonkey-api` ist derzeit keine im Projekt festgelegte Backend-Version.
- **Abnahme:** Vollständige Payload, unveränderte Identitätsfelder, String-Preis und dauerhaft gespeicherte Werte entsprechen dem dokumentierten Vertrag. Nicht unterstützte Annahmen werden vor Freigabe korrigiert.

## Bereits vorhandene Schutzmaßnahmen und bewusste Nicht-Befunde

- ISBN-Pfadsegmente werden mit `encodeURIComponent()` kodiert; Suchparameter werden über `HttpParams` erzeugt. Eine direkte Verkettung des Suchtexts in eine Query liegt nicht vor.
- Texte werden mit Angular-Interpolation dargestellt. Im geprüften Anwendungscode wurden kein `innerHTML`, kein `bypassSecurityTrust*`, kein `eval()` und keine direkt eingebauten Zugangsdaten gefunden. Aus frei bearbeitbaren Beschreibungen allein lässt sich deshalb keine XSS-Lücke ableiten. Angulars Sicherheitsmodell für Interpolation und Bindings ist in der [Security-Dokumentation](https://angular.dev/best-practices/security) beschrieben. Eine umfassende Secretsuche über die Git-Historie war nicht Teil der Prüfung.
- Laufende Listenrequests werden vor einem neuen Listenabruf abbestellt. Timer-Cleanup und `takeUntilDestroyed()` sind vorhanden. R01 betrifft das verbleibende Zeitfenster vor dem neuen Abruf.
- Der Dialog bearbeitet einen separaten Formularentwurf. Abbrechen mutiert das Original nicht. Mehrfaches Speichern wird durch Zustandsprüfung und deaktivierte Aktionen verhindert.
- Fehlerzustände mit Wiederholungsmöglichkeit, Cover-Fallbacks, Dialog-Fokuswiederherstellung und Tests für mehrere Detailabläufe existieren bereits.
- Gemeinsamer Modelltyp, lokale Zustände und ein dünner HTTP-Service passen zur aktuellen Größe. Ein globaler Store, generisches Repository, zusätzliche Domain-Schichten oder Micro-Frontends sind durch die Befunde nicht begründet. Wiederholte einzelne Tailwind-Klassen oder ähnliche HTTP-Ladeabläufe allein rechtfertigen keine allgemeine Abstraktion.

## Empfohlene Reihenfolge einer späteren Umsetzung

1. **Absicherung herstellen:** R14 reparieren und R13 um reproduzierbare Fälle für R01/R02 ergänzen; R15/R16 für verlässliche Testsignale angehen.
2. **Ablauffehler beheben:** Suchzustand und hängenden Save behandeln; Antwortvalidierung und API-Vertrag klären (R01, R02, R04, R21).
3. **Produktivgrenzen klären:** API-Ziel, Backendrechte, Paket-Audit und Hosting prüfen (R03, R06–R09). Bei mehreren Bearbeitern R05 berücksichtigen.
4. **Gezielt bereinigen:** Cover-Duplikation, Formularzuordnung, Fokus/Status, Teststyles, Abhängigkeiten und Dokumentation überarbeiten (R10–R12, R17–R20).

Diese Reihenfolge ist ein Vorschlag, keine Freigabe zur Umsetzung.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| Statische Prüfung der oben genannten Features, Tests und Konfiguration | Befunde in R01–R21; keine Codekorrekturen vorgenommen |
| `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` | Erfolgreich, Exit 0 |
| `node node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js --noEmit -p tsconfig.app.json` | Erfolgreich einschließlich Angular-Templateprüfung, Exit 0 |
| `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.spec.json` | Fehlgeschlagen, Exit 2, fehlende Jasmine-Typen (R14) |
| Direkte Prüfung relevanter Lockfile-Einträge | Karma, Jasmine Core und Jasmine-Typen fehlen; genannte Angular-/Playwright-Versionen bestätigt |
| `npm.cmd audit --json --ignore-scripts` | Kein verwertbares Ergebnis: npm-Advisory-Abruf fehlgeschlagen (R09); kein `audit fix` ausgeführt |

Der ursprüngliche Aufruf über `npm` scheiterte an der PowerShell-Skriptausführungsrichtlinie; mit `npm.cmd` ließ sich das Audit ohne Änderung der Richtlinie starten. Produktionsbuild, Browser-/Playwright-Läufe, echte API-Aufrufe und produktive Headerprüfungen wurden nicht ausgeführt. Es wurden keine Pakete installiert oder aktualisiert. Compilerprüfungen liefen mit `--noEmit` ohne Buildausgabe.
