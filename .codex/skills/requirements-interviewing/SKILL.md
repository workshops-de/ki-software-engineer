---
name: requirements-interviewing
description: Klärt grobe Feature-Ideen im schrittweisen Requirements Interview und erstellt eine User Story mit Given/When/Then-Akzeptanzkriterien und technischen Hinweisen. Nutzen, wenn vor Tests und Implementierung Ziele, Rahmenbedingungen und Umfang noch abgestimmt werden müssen.
---

# Anforderungen im Interview ermitteln

Führe den Nutzer von einer groben Idee zu einem gemeinsamen, überprüfbaren Verständnis von Erfolg. Das Ergebnis dient als Übergabe für spätere Tests und Implementierung. Führe das Interview in der Sprache des Nutzers.

## Gespräch führen

- Nutze bereits genannte Ziele, Entscheidungen und vorhandene Anforderungsquellen. Frage bekannte Angaben nicht erneut ab. Lies bei Bedarf gezielt Repository-Regeln und relevanten Code, um technische Fragen selbst zu klären; Code beschreibt den Istzustand, nicht automatisch das gewünschte Verhalten.
- Stelle pro Runde eine zentrale Frage und warte auf die Antwort, bevor du davon abhängige Anforderungen formulierst. Nutze ein verfügbares interaktives Fragewerkzeug; andernfalls frage im Gespräch. Liefere keinen vollständigen Fragebogen auf einmal.
- Beginne bei der größten fachlichen Unklarheit. Fehlt die Idee noch vollständig, frage zuerst nach dem gewünschten Feature und dem Problem dahinter.
- Biete bei schwierigen Entscheidungen wenige verständliche Optionen mit ihren Auswirkungen an. Gib Raum für eigene Antworten und vermeide suggestive Vorgaben.
- Fasse nach wichtigen Entscheidungen das Verständnis kurz zusammen und vertiefe nur verbleibende Lücken. Passe Reihenfolge und Tiefe an das Feature an; überspringe bereits geklärte oder irrelevante Themen.
- Unterscheide Nutzerentscheidungen, belegte technische Rahmenbedingungen, eigene Vorschläge und offene Annahmen. Löse Widersprüche durch eine gezielte Rückfrage. Schweigen bestätigt keine Annahme.

## Ziele, Umfang und Rahmenbedingungen klären

Decke die folgenden Themen ab, soweit sie das gewünschte Ergebnis beeinflussen:

1. **Problem und Nutzen:** Wer benötigt das Feature, in welcher Situation und warum? Was soll danach besser möglich sein? Woran lässt sich der Erfolg konkret erkennen?
2. **Gewünschtes Verhalten:** Was löst den Ablauf aus, welche Schritte durchläuft der Nutzer und welches sichtbare Ergebnis entsteht? Bitte bei abstrakten Aussagen um ein konkretes Beispiel.
3. **Umfang:** Was gehört zur kleinsten nützlichen Version? Was ist ausdrücklich ausgeschlossen oder für später vorgesehen? Sind mehrere unabhängige Ziele enthalten, schlage eine Aufteilung vor und stimme den aktuellen Ausschnitt ab.
4. **Rahmenbedingungen:** Welche bestehenden Abläufe, Daten, Schnittstellen, Berechtigungen, Plattformen oder Termine begrenzen die Lösung? Kläre relevante Qualitätsziele wie Barrierefreiheit, Antwortzeit oder Datenschutz anhand beobachtbarer Anforderungen. Erfinde keine Grenzwerte oder Verpflichtungen.
5. **Ausnahmen und Grenzen:** Welche relevanten Fehler-, Leer- oder Grenzfälle müssen behandelt werden? Was soll bei Abbruch oder Wiederholung passieren? Frage nach konkurrierenden Vorgängen, Persistenz oder externen Ausfällen nur, wenn sie den Ablauf betreffen.

Trenne das fachliche Ziel von einer vorgeschlagenen technischen Lösung. Prüfe, welches Problem ein Lösungsvorschlag erfüllt, und bewahre ausdrücklich gesetzte technische Vorgaben. Verlange vom Nutzer keine Entscheidungen, die sich aus dem Repository beantworten lassen.

## User Story und Akzeptanzkriterien ausarbeiten

Erstelle einen zusammenhängenden Entwurf, sobald Zielgruppe, Nutzen, Kernablauf und Umfang ausreichend klar sind. Bei einem frühen Entwurfswunsch liefere einen vorläufigen Stand und markiere die offenen Entscheidungen.

Verwende dieses Ergebnisformat und ersetze die Platzhalter durch konkrete Inhalte:

```markdown
# [Feature-Titel]

Status: Entwurf / abgestimmt

## User Story

Als [Rolle] möchte ich [Fähigkeit], damit [Nutzen].

## Ziel und Umfang

- Erfolg: [beobachtbares Ergebnis; vereinbarter Messwert, falls relevant]
- Enthalten: [vereinbarter Funktionsumfang]
- Ausgeschlossen: [bewusste Abgrenzungen]
- Rahmenbedingungen: [verbindliche Einschränkungen und Abhängigkeiten]

## Akzeptanzkriterien

### AK-1: [Szenario]

Given [konkreter Ausgangszustand]
When [eine auslösende Handlung oder ein Ereignis]
Then [beobachtbares, eindeutig prüfbares Ergebnis]

## Technische Hinweise

- Belegt: [relevante bestehende Komponenten, Schnittstellen oder Verträge mit Quelle]
- Vorschlag: [möglicher Ansatz und seine Begründung, soweit hilfreich]
- Prüfhinweise: [relevante Testgrenzen, Daten oder technische Risiken]

## Offene Punkte und Annahmen

- [Ungeklärte Entscheidung oder unbestätigte Annahme und ihre Auswirkung]
```

- Formuliere je Akzeptanzkriterium ein klar abgegrenztes Szenario mit eigener Kennung. Ergänze weitere Kriterien für vereinbarte Varianten und relevante Fehler- oder Grenzfälle.
- Beschreibe sichtbares Verhalten und konkrete Zustände. Ersetze Wörter wie „schnell“, „intuitiv“ oder „korrekt“ durch abgestimmte, überprüfbare Aussagen. Nutze bei mehreren erwarteten Ergebnissen zusätzliche `Then`- oder `And`-Zeilen.
- Jedes Kriterium muss auf eine geklärte Anforderung zurückgehen. Stelle zusätzliche Ideen zunächst als Vorschlag zur Diskussion; mache daraus keine stillschweigende Pflicht.
- Halte technische Hinweise getrennt von den fachlichen Kriterien. Kennzeichne ungeprüfte API-Fähigkeiten und Architekturannahmen ausdrücklich. Nenne nur tatsächlich geprüfte Pfade oder Quellen; leite aus installierten Paketen keine Architektur ab.
- Halte das Ergebnis dem Umfang angemessen. Schreibe bei fehlenden offenen Punkten „Keine“ und lasse nicht benötigte technische Unterpunkte weg.

## Gemeinsames Verständnis abschließen

Prüfe den Entwurf auf Konsistenz zwischen Nutzen, Umfang und Kriterien sowie auf verbleibende Entscheidungen, die Tests oder Implementierung verändern würden. Lege den konkreten Entwurf zur Abstimmung vor und frage gezielt nach Korrekturen oder Bestätigung. Überarbeite ihn anhand der Antwort; frage bereits bestätigte Inhalte nicht erneut ab.

Setze den Status erst auf „abgestimmt“, wenn der Nutzer den aktuellen Inhalt bestätigt hat und keine für die Umsetzung entscheidenden Fragen offen sind. Bleiben solche Fragen offen, liefere einen ausdrücklich vorläufigen Entwurf und benenne den nächsten Klärungsschritt.

Liste am Ende immer das vollständige aktuelle Ergebnis noch einmal im Gespräch auf: User Story, Ziel und Umfang, Rahmenbedingungen, alle Akzeptanzkriterien, technische Hinweise sowie offene Punkte und Annahmen. Ein Verweis auf frühere Antworten genügt nicht.

Frage anschließend ausdrücklich, ob du diese Anforderung anlegen sollst. Nenne dabei das konkrete Ziel, wenn es bereits feststeht, zum Beispiel: „Soll ich diese Anforderung so als GitHub-Issue in [Repository] anlegen?“ Ist das Ziel noch unklar, frage: „Soll ich diese Anforderung anlegen? Wenn ja, als Datei oder als GitHub-Issue und wo?“ Warte auf die Antwort und lege vorher nichts an. Diese abschließende Nachfrage gehört auch dann zum Interview, wenn das Anlegen schon zu Beginn gewünscht wurde.

Lege nach Zustimmung den gezeigten Inhalt am bestätigten Ziel an und gib den Pfad oder Link zurück. Bei einer Ablehnung bleibt das Ergebnis im Gespräch. Bei Änderungswünschen überarbeite den Inhalt, liste ihn erneut vollständig auf und frage wieder nach dem Anlegen. Eine inhaltliche Bestätigung allein ist keine Zustimmung zum Anlegen.

Das Anlegen der Anforderung beauftragt keine Tests oder Implementierung; führe diese erst bei entsprechendem Auftrag fort. Übergib dann die abgestimmte Story, Kriterien und verbleibenden technischen Unsicherheiten an den nächsten Arbeitsschritt.
