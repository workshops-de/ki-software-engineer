# Hinweise für das Books-Feature

Diese Datei gilt für `src/app/books/` und seine Unterverzeichnisse. Sie ergänzt die [Root-Anweisungen](../../../AGENTS.md).

## Zuständigkeiten und API-Vertrag

- `BookApiClient` kapselt fachliche HTTP-Aufrufe. Die aktuell fest eingetragene Basisadresse lautet `http://localhost:4730/books`; Änderungen am Deployment müssen diese Konfiguration berücksichtigen.
- `BookListComponent` steuert Suche, Lade-/Fehlerzustand und Listenaktualisierung. `BookDialogService` öffnet den Detaildialog für Liste und Würfel-Button und meldet nötige Aktualisierungen nach bestätigtem oder unbestätigtem Speichern. `BookItemComponent` stellt ein übergebenes `Book` dar und meldet Aktionen über Outputs; sie lädt keine Daten selbst.
- `BookRandomButtonComponent` bindet den Würfelablauf in den Header ein; `BookRandomDialogComponent` lädt mit `getAllBooks()` die gesamte Sammlung ohne `_limit` oder `q`, zeigt wechselnde Cover auf den sechs Würfelseiten statt Augen und wählt gleichverteilt aus. Die aktuelle Suche begrenzt die Auswahl nicht. Schließen beendet Abruf und Animation; reduzierte Bewegung unterdrückt Würfelrotation und Coverwechsel.
- `BookDetailsDialogComponent` lädt das aktuelle Buch anhand der übergebenen ISBN und verwaltet Anzeige, Bearbeitungsentwurf und Speichervorgang. Öffne den Dialog nicht mit den Listendaten als vermeintlich aktuellem Detailstand.
- Listenabrufe verwenden `_limit` und optional `q`. Details und Updates adressieren die URL-kodierte **ISBN**, nicht `id`: `GET /books/:isbn`, `PUT /books/:isbn`.
- Beim Speichern wird das vollständige Buch übertragen. Bewahre `id`, `userId` und ISBN; `price` bleibt ein String. Der reale API-Vertrag ist laut [README](../../../README.md) noch nicht live verifiziert.

## Bearbeiten und Speichern

- Bearbeitungsentwürfe dürfen die Liste und das geladene Original nicht vor erfolgreichem Speichern verändern. Abbrechen verwirft Änderungen. Titel und Autor dürfen nicht leer sein oder nur Leerzeichen enthalten; die Seitenzahl muss eine positive ganze Zahl sein.
- Verhindere doppelte Speicheranfragen und bewahre die Schließsperre während des Speicherns. Bei bestätigtem Erfolg schließt der Dialog mit dem gespeicherten Buch; die Liste zeigt den Erfolgs-Toast und lädt mit dem aktuellen Suchtext neu.
- Ein bestätigter HTTP-Speicherfehler erhält die Eingaben und erlaubt einen erneuten Versuch. Ein Timeout oder Verbindungsabbruch mit Status `0` bedeutet dagegen ein unbestätigtes Speicherergebnis: Der Server könnte die Änderung bereits übernommen haben.
- Bewahre bei unbestätigtem Speichern den sichtbaren Entwurf, erlaube das Schließen und verlange vor weiterer Bearbeitung das Neuladen des Serverstands. Das Neuladen verwirft den Entwurf. Beim Schließen wird die Liste auch ohne bestätigten Erfolg neu geladen; zeige dabei keinen Erfolgs-Toast.
- Detail- und Speicheranfragen haben derzeit ein Timeout von 15 Sekunden. Bewahre Lifecycle-Cleanup sowie unterscheidbare Ladefehler einschließlich 404 und Wiederholungsmöglichkeit.

## Suche und Darstellung

- Koordiniere Debouncing (derzeit 300 ms), Zurücksetzen, Request-Abbruch und Lifecycle-Cleanup. Bereits bei einer Suchtexteingabe wird der bisherige Request abgebrochen; Ergebnisse der vorherigen Suche bleiben während des Debouncings verborgen.
- Clear und erneutes Laden müssen einen ausstehenden Such-Timer löschen. Verspätete Antworten dürfen keine neueren Ergebnisse überschreiben; Lade- und Fehlerzustände müssen zum aktiven Abruf passen. Beim Zerstören der Komponente sind Timer und Subscriptions aufzuräumen.
- Unterscheide Ladefehler von leeren Treffern und biete Wiederholung mit dem aktuellen Suchtext an. Behalte Cover-Fallbacks bei fehlenden oder defekten Bildern in Karte und Dialog bei.
