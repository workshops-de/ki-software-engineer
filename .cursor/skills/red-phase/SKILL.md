---
name: red-phase
description: Führt bei der Umsetzung eines neuen Tasks die Red Phase der testgetriebenen Entwicklung durch. Verwenden, wenn zuerst ein fehlgeschlagener Test für ein neues Verhalten erstellt und überprüft werden soll.
---

# Red Phase

Ermittle anhand des Tasks und des vorhandenen Projektkontexts ein konkretes, beobachtbares Verhalten. Kläre entscheidende Unklarheiten, bevor du einen Test auf eine unbegründete Annahme stützt.

Prüfe die vorhandenen Testkonventionen und wähle eine geeignete Testebene. Schreibe einen möglichst fokussierten, aussagekräftigen Test für das gewünschte Verhalten. Vermeide Tests, die nur Implementierungsdetails abbilden.

Führe den Test aus und prüfe die Fehlermeldung. Die Red Phase ist erreicht, wenn der Test wegen des noch fehlenden gewünschten Verhaltens fehlschlägt. Behebe Fehler in der Testeinrichtung oder im Test selbst und führe ihn erneut aus. Wenn das Verhalten bereits existiert oder der Test aus einem anderen Grund nicht sinnvoll fehlschlagen kann, teile dies mit und passe das Vorgehen an den Task an.

Berichte, was der Test prüft, wie er ausgeführt wurde und weshalb er fehlschlägt. Implementiere in einer ausdrücklich angeforderten Red Phase noch keine Produktivlösung; bei einem Auftrag zur vollständigen Umsetzung fahre anschließend mit Green und Refactoring fort.
