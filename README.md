# Quiz – Vue-Teamprojekt mit SQLite

## Starten
Node.js ab 24.14 ist erforderlich.
```powershell
npm ci
npm run dev
```
Öffne die angezeigte lokale Adresse. Ein Befehl startet Vue und die Node-API.
Die SQLite-Datenbank server/data/quiz.sqlite wird automatisch erstellt.
Beim ersten Start werden die 70 mitgelieferten Fragen importiert. Fehlende Seed-IDs werden bei weiteren Starts ergänzt.
Vorhandene Fragen bleiben erhalten; bei der Migration werden fehlende Erklärungen und Schwierigkeitsstufen nachgetragen.

Produktionsvorschau:
```powershell
npm run build
npm run preview
```
Auch die Vorschau enthält die API. Ein rein statischer Upload des dist-Ordners genügt nicht.

## Funktionen
- Master-Detail-Auswahl mit Suche und Kategorienfilter.
- Schwierigkeit: Leicht, Mittel, Schwer oder alle Stufen. Die Fragenanzahl zeigt die aktuelle Auswahl.
- Der Server mischt Fragen und Antwortmöglichkeiten für jede neue Runde.
- 20 Sekunden pro Frage; die API prüft das Zeitlimit und die Antwort.
- Nach jeder Antwort erscheinen richtige Lösung und Erklärung. Mit „Nächste Frage“ geht es weiter.
- „Offene Fragen wiederholen“ startet eine neue Zufallsrunde nur mit den vom Server festgestellten Fehlern.
- Bestwerte werden pro Thema, Schwierigkeit und Fragenanzahl im Browser gespeichert.
- „Letztes Ergebnis“ bleibt nach einem Neuladen verfügbar. Die Runde liegt dauerhaft in SQLite; der Browser merkt sich die letzte Ergebnis-ID und Darstellung.
- Der Frageneditor erstellt und bearbeitet Fragen einschließlich Antworten, Erklärung und Schwierigkeit.

## Frageneditor
Öffne den Navigationspunkt „Frageneditor“ auf dem Server-Rechner.
Öffne server/data/editor-key.txt und kopiere den enthaltenen Schlüssel in das Zugangsfeld.
Die Datei entsteht beim Serverstart, gehört nicht ins Git-Repository und wird nicht im Browser ausgeliefert.
Der Editor ist nur über die lokale Loopback-Verbindung und mit passendem Schlüssel nutzbar.
Mit QUIZ_EDITOR_KEY kann vor dem Serverstart ein eigener Schlüssel gesetzt werden.
Zum Anlegen oder Bearbeiten: Thema wählen, vier verschiedene Antworten eingeben,
richtige Antwort markieren, Erklärung schreiben und speichern.
Änderungen gelten für neue Runden. Bereits laufende Runden verwenden einen unveränderten Snapshot.
Editorfragen liegen in der lokalen Datenbank und werden nicht automatisch auf GitHub hochgeladen.
Neue Editor-IDs beginnen ab 100000, damit spätere Seed-Importe nicht kollidieren.

## Datenfluss und Dateien
Browser → fetch → Node-API → SQLite → JSON → reaktive Vue-Oberfläche.

- src/main.js / App.vue: Einstieg, Navigation und RouterView.
- src/views/CatalogView.vue: Master-Detail, Suche und Schwierigkeitsauswahl.
- src/views/QuizView.vue: Rundenstart, Timeranzeige, Antwortabgabe und nächster Schritt.
- src/components/QuestionCard.vue: Antworten und vom Server gelieferte Erklärung.
- src/views/ResultView.vue: gespeichertes Ergebnis vom Server laden und Wiederholung starten.
- src/views/EditorView.vue: geschützter Frageneditor.
- src/stores/quiz.js: reactive-Katalog, Ergebniszustand und Browserspeicherung.
- src/api.js: gemeinsame fetch-Funktion mit Fehlerbehandlung.
- server/api.js: API, zufällige Runden, Auswertung und Editorzugriff.
- server/database.js: Schema, Migrationen, SQL-Lese- und Schreibzugriffe.
- server/seed-quizzes.json: mitgelieferter Importbestand einschließlich Erklärungen und Schwierigkeit.
- server/data/quiz.sqlite: lokale Datenbank; nicht in Git.
- tests/database.test.js: API-, Migrations- und Persistenztests.

Die Tabellen quizzes und questions speichern Inhalte.
rounds speichert die zufällig zusammengestellten Runden samt Antworten und Ergebnissen.
Die normale API liefert vor der Abgabe weder correctIndex noch explanation.
Nach der Abgabe wird nur die gerade beantwortete Frage aufgelöst.
Bewertung und Punktestand werden auf dem Server ermittelt.
Runden-IDs sind zufällige UUIDs und dienen als Zugriffsschlüssel für eine Runde.
Dies ist eine lokale Lern-App ohne Benutzerkonten; der Editor ist keine öffentliche Benutzerverwaltung.

## API
- GET /api/quizzes: Themen und Frage-IDs mit Schwierigkeit, ohne Lösungen.
- POST /api/runs: neue zufällige Runde mit quizId, difficulty und optional sourceRunId.
- GET /api/runs/:id: aktueller Rundenstand ohne vorzeitig aufgelöste Antworten.
- POST /api/runs/:id/answer: questionId und answerIndex; null bedeutet unbeantwortet.
- POST /api/runs/:id/next: questionId; nach einer Antwort weiter oder abschließen.
- GET /api/runs/:id/result: Ergebnis einer abgeschlossenen Runde.
- GET /api/editor/questions: vollständiger Fragenbestand, nur mit lokalem Editorzugang.
- POST /api/editor/questions: neue Frage.
- PUT /api/editor/questions/:id: Frage bearbeiten.

## Schulanforderungen
- Master-Detail: Themenliste und Details.
- ref: Auswahl, Suche und Timer. reactive: Katalog, Ergebnis und Editorformular.
- fetch: Datenbankinhalte über eine HTTP-API lesen und Antworten/Editoränderungen senden.
- Vue Router: /, /quiz/:id, /ergebnis und /frageneditor.
- Query-Parameter: schwierigkeit und modus=wiederholen.

## Prüfen
```powershell
npm test
npm run build
```
Tests prüfen Migration alter Datenbanken, Persistenz, Lösungsverbergung,
Serverwertung, Zeitüberschreitung, doppelte Anfragen, Wiederholung und Editorvalidierung.
QUIZ_DB_PATH kann für Tests auf eine getrennte SQLite-Datei zeigen.

## Aufgabenteilung
Du: Datenbank, API, fetch, Routing, Quizlogik und Timer.
Nolf: Themenauswahl, Suche, Filter, Komponenten, Design und Frageninhalte.
Neue Erweiterungen wurden auf Basis des gemeinsamen Projekts ergänzt.

Repository: https://github.com/domigg23/quiz_app
