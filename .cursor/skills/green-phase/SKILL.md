---
name: green-phase
description: Führt die Green Phase der testgetriebenen Entwicklung aus. Verwenden, um fehlgeschlagene Tests eines neuen Tasks durch minimale Produktivcodeänderungen zum Bestehen zu bringen.
---

# Green Phase

- Lies den Task und die betroffenen Tests und ermittle das erwartete beobachtbare Verhalten. Beachte vorhandene Projektkonventionen.
- Führe die relevanten Tests aus und prüfe, ob sie wegen des noch fehlenden Verhaltens fehlschlagen. Unterscheide davon Fehler in der Testumgebung oder im Test selbst.
- Implementiere die kleinste passende Produktivcodeänderung, die die Anforderungen der Tests erfüllt. Vermeide unnötige Erweiterungen und eigenständige Refactorings.
- Ändere Tests nicht, um die Implementierung bestehen zu lassen. Korrigiere einen Test nur, wenn er nachweislich falsch ist; erkläre die Korrektur und ihre Grundlage. Kläre widersprüchliche oder unzureichend spezifizierte Erwartungen, sofern sie sich nicht aus dem Task und Projektkontext auflösen lassen.
- Führe zunächst die betroffenen Tests erneut aus und anschließend die gesamte relevante Testsuite. Wenn Tests nicht ausführbar sind oder fehlschlagen, untersuche die Ursache und berichte das Ergebnis samt Einschränkungen.
- Fasse die Produktivcodeänderung und die ausgeführten Tests mit ihren Ergebnissen zusammen.
