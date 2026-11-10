# Refactoring-Anweisungen für BookMonkey

Beachte [ARCHITECTURE.md](ARCHITECTURE.md) und die geltenden `AGENTS.md`. Vereinfache den beauftragten Bereich,
ohne beobachtbares Verhalten oder öffentliche Verträge zu ändern.

## Vorgehen

- Prüfe aktuellen Code und Diff. Wähle nur Änderungen mit einem konkreten Wartungsnutzen im beauftragten Umfang.
- Starte mit grünen Verhaltenstests. Kläre fehlende Absicherung in der Red-Phase und Verhaltensfehler in Green.
- Arbeite in kleinen Schritten und prüfe nach jedem Schritt die betroffenen Tests. Bewahre fremde Änderungen.
- Halte in der Blue-Phase Tests, Testhelfer und Testkonfiguration unverändert. Beauftrage nötige Test- oder
  Tooling-Verbesserungen separat; schwäche keine Prüfungen für ein grünes Ergebnis ab.
- Verzichte auf einen Umbau, wenn keine sinnvolle Vereinfachung erkennbar ist. Führe neue Abhängigkeiten,
  globale Stores, Repository-Schichten oder generische Frameworks nur bei einer konkreten Anforderung ein.

## Verfahren

### Anfragen und Lebensdauer

- Bündele Anfrageabsichten in einem typisierten Zustandsstrom. Beende überholte Timer und HTTP-Anfragen sofort
  bei neuer Absicht, etwa mit einem äußeren `switchMap`.
- Bewahre Such-Debouncing sowie unmittelbares Laden bei Seitenwechsel, Leeren und Retry. Erhalte Seite und
  Suchbegriff gemäß Featurevertrag.
- Binde Arbeit an die Komponentenlebensdauer, bevorzugt mit einer `AsyncPipe`-Subscription. Bereinige verbleibende
  imperative Subscriptions und Timer. Ersetze konkurrierende Besitzer statt nur gemeinsame Ladeflags zu ergänzen.

### Fehlergrenzen

- Halte Lade-, Erfolgs-, Leer-, 404- und Fehlerzustände unterscheidbar. Fange erwartete Fehler im jeweiligen
  Anfragestrom ab, damit spätere Anfragen und manuelle Retries weiter funktionieren.
- Trenne lokale Anzeige und Erholung, gemeinsame HTTP-Diagnosen und unerwartete Laufzeitfehler. Bewahre den
  ursprünglichen Fehlerkanal; konvertiere Fehler nicht in leere Erfolgslisten.
- Verwende neutrale Meldungen. Vermeide doppelte Diagnosen/Toasts, erwartete 404-/Abbruchmeldungen und globale
  automatische Retries. Beschränke Diagnosen auf nötigen Kontext ohne URLs, Suchtexte oder Antwortinhalte.

### Logik und Präsentation

- Halte Anfrageorchestrierung im Container und Darstellung in Templates bzw. Präsentationskomponenten.
  Verschiebe umfangreiche Templates in benachbarte HTML-Dateien; extrahiere Komponenten nur mit klarer Verantwortung.
- Nutze bei wesentlich überarbeiteten Templates die vorhandene eingebaute Kontrollflusssyntax. Bewahre semantische
  Überschriften, Status-/Alert-Rollen, Fokus, Tastaturbedienung, mobile Darstellung und Theme-Lesbarkeit.
- Erhalte API-Texte als Klartext einschließlich relevanter Absatzumbrüche; interpretiere sie nicht als HTML.

### Kohäsion und Duplikate

- Bündele tatsächlich wiederholtes Verhalten auf der engsten sinnvollen Ebene. Vermeide Abstraktionen für bloß
  ähnliche, fachlich unterschiedliche Abläufe.
- Halte Cover-Fallback und Bildfehlerzustand in der Cover-Komponente. Bewahre das Zurücksetzen bei Eingabewechsel
  und erneutem Laden derselben URL sowie Bildalternativen und zugängliche Linknamen.

### Explizite Verträge

- Injiziere die API-Konfiguration an der Kompositionsgrenze. Halte Endpunktbildung, HTTP-Parameter, Paging-Metadaten
  und ID-Encoding im API-Client; bewahre `_limit`, `q`, `_page` und die Auswertung von `X-Total-Count`.
- Deklariere erforderliche Komponenteneingaben explizit. Führe DTO-Mapping oder Laufzeitvalidierung nur bei einem
  konkreten externen Vertragsbedarf ein.

### Absicherung

- Prüfe beobachtbares Verhalten statt privater Implementierungsdetails. Bewahre Abdeckung für Anfrage-Rennen,
  Debounce/Leeren, Abbruch bei Navigation, Fehlererholung, Paging/Rückkehrzustand und Cover-Reset, soweit betroffen.
- Verwende bei separat beauftragten Testverbesserungen semantische Selektoren oder stabile Test-IDs und fokussierte
  Szenarien. Teile Fixtures und Helfer erst bei tatsächlicher Wiederverwendung; vermeide Kopplung an Stylingklassen.

## Verifikation und Abschluss

- Führe relevante Jasmine- und Playwright-Regressionen sowie Typechecks und Produktionsbuild aus. Nutze für einen
  vollständigen Projektlauf `npm test`, `npm run test:e2e`, `npm run typecheck` und `npm run build`.
- Formatiere nur geänderte Dateien explizit mit Prettier und prüfe `git diff --check`. Bestätige in Blue die
  unveränderten Testressourcen einschließlich unversionierter Dateien durch Inventar- und Inhaltsvergleich.
- Aktualisiere `ARCHITECTURE.md` bei geänderten Verantwortlichkeiten oder Datenflüssen. Halte diese Datei auf
  wiederverwendbare Anweisungen beschränkt; berichte Maßnahmen und Testergebnisse im Abschluss statt als Historie.
- Berichte Änderung, bewahrtes Verhalten und tatsächlich ausgeführte Prüfungen. Kennzeichne fehlende Browser,
  Netzwerk- oder Zugriffshindernisse als offene Verifikation; melde nur nach erfolgreichen erforderlichen Prüfungen
  einen abgeschlossenen Refactoring-Schritt.
