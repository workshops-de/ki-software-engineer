---
name: angular-refactoring
description: Überarbeitet Angular-Code nach der Green Phase unter Wahrung des bestehenden Verhaltens. Verwenden, wenn Angular-Komponenten oder ihre Zusammenarbeit anhand der Projektkonventionen und SOLID-Prinzipien refaktoriert werden sollen.
---

# Angular-Refactoring

Lies die relevanten Projektvorgaben und den betroffenen Code; berücksichtige insbesondere `REFACTORING.md`, soweit die enthaltenen Vorgaben für die Aufgabe gelten. Verschaffe dir anhand der vorhandenen Tests und des Tasks Klarheit über das zu erhaltende Verhalten.

Verbessere die Struktur in kleinen, nachvollziehbaren Schritten und halte den Umfang auf die betroffene Umsetzung begrenzt:

- Halte Komponenten und ihre Verantwortlichkeiten übersichtlich; bevorzuge eine Komponente pro Datei und trenne Verantwortlichkeiten, wenn dies die Verständlichkeit verbessert.
- Achte auf konsistente Abstraktionsebenen und wende SOLID-Prinzipien dort an, wo sie konkrete Kopplung oder Komplexität reduzieren. Vermeide unnötige Abstraktionen.
- Nutze bei asynchronen Datenflüssen und Zuständen geeignete reaktive Komposition im Einklang mit den bestehenden Angular- und Projektkonventionen. Führe keine neue Infrastruktur allein um ihrer selbst willen ein.
- Bewahre öffentliches Verhalten, Schnittstellen und Gestaltung, sofern der Nutzer keine Änderung verlangt. Ergänze aussagekräftige Tests, wenn das zu schützende Verhalten nicht ausreichend abgesichert ist; ändere bestehende Erwartungen nur bei nachweislich falschen Tests.

Führe vor und nach dem Refactoring die relevanten ausführbaren Tests aus und überprüfe gegebenenfalls den Build. Untersuche Fehlschläge und unterscheide bestehende Probleme von neu eingeführten. Wenn eine Prüfung nicht möglich ist, benenne die Einschränkung. Berichte die wesentlichen Strukturänderungen und die Testergebnisse.
