---
name: bookmonkey-define-feature
description: Führt im BookMonkey-Projekt ein Interview zu neuen Features oder Anforderungen, klärt Ziel, Grenzen und Scope und erstellt daraus eine User Story mit Akzeptanzkriterien, technischen Anmerkungen und GitHub-Issue. Verwenden, wenn Nutzer eine Anforderung definieren möchten oder ein Agent ein neues Feature zur Klärung anfordert. Nicht für die Umsetzung bereits definierter Anforderungen.
---

# BookMonkey-Feature definieren

Führe von einer Feature-Idee zu einer umsetzbaren Anforderung und einem GitHub-Issue. Implementiere dabei keinen
Anwendungscode. Die Erstellung dieses Skills selbst ist kein Auftrag, bereits ein Feature-Issue anzulegen.

## Kontext und Interview

1. Übernimm bekannte Ziele und Entscheidungen aus dem Chat. Lies `AGENTS.md`, `ARCHITECTURE.md` und die für das
   Feature relevanten Quelltexte und untergeordneten Vorgaben. Prüfe technische Aussagen am aktuellen Code.
   Ermittle das GitHub-Ziel aus `git remote -v`, sofern der Nutzer kein anderes Ziel nennt. Kläre mehrdeutige Ziele.
2. Fehlt eine Feature-Idee, beginne mit der Frage, für wen welches Problem gelöst werden soll. Bei einer von einem
   Agenten vorgeschlagenen Erweiterung unterscheide den Vorschlag von einer bereits getroffenen Produktentscheidung.
   Kläre Ziel und Priorität mit dem Nutzer, statt den Vorschlag als beschlossene Anforderung zu behandeln.
3. Stelle kurze, aufeinander aufbauende Fragen in kleinen Runden. Frage nur nach fehlenden Entscheidungen, die die
   Anforderung wesentlich beeinflussen. Nutze das verfügbare Rückfragewerkzeug, sonst eine direkte Frage im Chat.
   Warte auf die Antworten, bevor du davon abhängige Festlegungen triffst; ausbleibende Antworten sind keine Zustimmung.
4. Kläre die folgenden Aspekte, soweit für die Idee relevant. Einfache Features benötigen kein vollständiges Formular:
   - **Ziel und Nutzen:** Zielgruppe, Problem, gewünschtes Ergebnis und erkennbarer Erfolg.
   - **Nutzungsablauf:** Einstieg, zentrale Interaktion, erwartetes Verhalten und ein konkretes Beispiel.
   - **Scope und Grenzen:** kleinster sinnvoller Umfang, ausdrücklich ausgeschlossene Funktionen und unverändertes
     Bestandsverhalten. Trenne spätere Ausbaustufen vom aktuellen Issue.
   - **Randbedingungen:** betroffene Ansichten und Daten, Schnittstellen, Speicherung sowie relevante Fehler- und
     Leerzustände. Kläre mobile Nutzung, Tastaturbedienung oder andere Qualitätsanforderungen, wenn sie betroffen sind.
5. Fasse nach wesentlichen Antworten die getroffenen Entscheidungen knapp zusammen. Mache bei Unklarheiten konkrete
   Vorschläge mit ihren Auswirkungen, aber kennzeichne sie als Vorschläge. Erfinde keine fachlichen Entscheidungen.
   Beende das Interview, sobald Ziel, Umfang und überprüfbares Verhalten ausreichend klar sind.

## User Story ausarbeiten

Erstelle einen präzisen Issue-Titel und einen zusammenhängenden Entwurf in der Sprache des Nutzers. Nutze eine
vorhandene passende Issue-Vorlage des Zielrepositories, sonst diese Struktur:

- **Problem und Ziel:** Ausgangslage und gewünschter Nutzen.
- **User Story:** „Als … möchte ich …, damit …“ mit der tatsächlichen Zielgruppe und ihrem Nutzen.
- **Scope:** enthaltene Funktionen und ausdrücklich ausgeschlossene Erweiterungen.
- **Akzeptanzkriterien:** nummerierte oder als Checkboxen formulierte, einzeln überprüfbare Ergebnisse. Verwende
  konkrete Bedingungen und erwartetes Verhalten, bei Bedarf als Gegeben/Wenn/Dann. Berücksichtige relevante
  Fehlerfälle und den Erhalt betroffener bestehender Funktionen. Vermeide bloße Aussagen wie „funktioniert korrekt“.
- **Technische Anmerkungen:** bestätigte betroffene Komponenten, Routen, Datenflüsse und Schnittstellen mit
  Dateiverweisen; relevante Projektvorgaben, Abhängigkeiten und Hinweise zur Verifikation. Trenne belegte Fakten von
  Umsetzungsvorschlägen. Lege keine neue Architektur oder Abhängigkeit ohne Anforderungsgrund fest.
- **Offene Punkte:** nur verbleibende, nicht blockierende Fragen oder ausdrücklich vereinbarte Annahmen. Lass den
  Abschnitt weg, wenn keine bestehen.

Gleiche die Kriterien mit dem vereinbarten Ziel und Scope ab. Wenn eine offene Entscheidung das Zielverhalten oder
die Abnahme bestimmt, frage vor dem Veröffentlichen nach. Bei mehreren unabhängig umsetzbaren Features schlage eine
Aufteilung vor; erstelle zusätzliche Issues nur bei entsprechendem Auftrag.

## GitHub-Issue erstellen

1. Prüfe verfügbare GitHub-Werkzeuge und nutze bevorzugt einen passenden Connector, alternativ eine vorhandene,
   authentifizierte GitHub CLI. Prüfe im Zielrepository nach einem bereits passenden Issue, einschließlich relevanter
   geschlossener Issues. Bei einem Treffer zeige den Zusammenhang und kläre, ob ein neues Issue nötig ist; ändere
   oder öffne vorhandene Issues nicht eigenmächtig.
2. Zeige den konkreten Titel, den vollständigen Issue-Entwurf und das Zielrepository vor dem Erstellen. Wenn die
   Erstellung bereits beauftragt ist, etwa durch ausdrücklichen Aufruf dieses Workflows, fahre ohne zusätzliche
   Freigaberunde fort. Bei automatischer Skill-Auswahl gilt der tatsächliche Nutzerauftrag: Ein Auftrag nur zum
   Interview oder Entwurf bleibt auf diesen Umfang begrenzt; ein Agentenvorschlag allein autorisiert kein Issue.
3. Erstelle genau das vereinbarte Issue. Übergib beim Connector Titel und Beschreibung als strukturierte Argumente.
   Bei der CLI schreibe den exakten Markdown-Inhalt mit echten Zeilenumbrüchen in eine temporäre UTF-8-Datei und
   verwende `gh issue create --repo <owner/repo> --title <titel> --body-file <datei>` mit sicherer Shell-Quotierung.
   Setze Labels, Verantwortliche, Meilensteine und Projektzuordnungen nur, wenn sie vereinbart sind.
4. Bei einem unklaren Ergebnis eines Schreibaufrufs, etwa einem Timeout, suche zuerst nach dem möglicherweise bereits
   erstellten Issue. Wiederhole die Erstellung nur, wenn ein Duplikat ausgeschlossen werden kann. Bei weiterhin
   unklarem Ergebnis stoppe Schreibversuche und berichte den Status.
5. Fehlen Zugang oder Berechtigung, liefere den vollständigen Entwurf und benenne konkret, was zum Erstellen fehlt.
   Verwende keine erfundenen Issue-Nummern oder Erfolgsbehauptungen. Führe keine Installation oder Anmeldung ohne
   entsprechenden Auftrag durch.
6. Gib nach erfolgreicher Erstellung Issue-Nummer, Titel und Link zurück und nenne diesen Skill mit seinem Pfad als
   Grundlage des Erstellungsworkflows. Berichte verbleibende offene Punkte. Starte die Implementierung erst bei einem
   entsprechenden Auftrag; dafür ist der Projektskill `bookmonkey-implement-requirement` vorgesehen.
