# Quiz – Client, Server und MySQL

## Aufbau
Die App hat drei getrennte Schichten:

1. Client: Vue im Browser (im Entwicklungsbetrieb Vite auf Port 5173).
2. Server: eigenständiger Node-HTTP-Server auf Port 3001.
3. Datenbank: vorhandener MySQL-Server auf Port 3306, Datenbank quiz_app.

Browser → fetch('/api/...') → Vue-Entwicklungsproxy → Node-API → MySQL.
Nur Node kennt die Zugangsdaten und führt SQL-Abfragen aus.
MySQL ist keine öffentliche Browser-Schnittstelle.
Im Produktivmodus liefert Node auch die gebaute Vue-App aus; der Entwicklungsproxy entfällt.

## Einrichten
Voraussetzungen: Node.js ab 24.14 und ein laufender MySQL-Server 8.
```powershell
npm ci
Copy-Item server/.env.example server/.env
```
Wenn server/.env bereits eingerichtet ist, nicht überschreiben.
Trage deine MySQL-Zugangsdaten in server/.env ein:
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.
Standard: 127.0.0.1, 3306, quiz_app als Datenbankname.
Passwörter gehören nur in die lokale .env und nicht nach GitHub.
Für Datenbankinitialisierung und Tests benötigt der konfigurierte Benutzer passende CREATE-Rechte.

## Starten
```powershell
npm run dev
```
Startet zwei getrennte Node-Prozesse: API und Vue-Entwicklungsserver.
Öffne die im Terminal angezeigte Vue-Adresse. Ist 5173 belegt, zeigt Vite den nächsten freien Port.
Strg+C beendet beide Prozesse.
Falls der Server nicht starten kann: MySQL-Dienst, Port und server/.env prüfen.

Alternativ zwei Terminals:
```powershell
npm run dev:server
npm run dev:client
```

Produktionsbetrieb:
```powershell
npm run build
npm start
```
Öffne http://127.0.0.1:3001.
Hier läuft nur der Node-Server, der sowohl dist als auch die API bereitstellt.
Die Datenbank muss ebenfalls laufen. Ein statischer Upload von dist allein reicht nicht.

## Tabellen und Fragenimport
- quizzes: Themen, Beschreibungen und Reihenfolge.
- questions: Fragen, Antworten, richtige Antwort, Erklärung und Schwierigkeit.
- rounds: gemischte Quizrunden, abgegebene Antworten und Ergebnisse.

server/database.js legt die MySQL-Tabellen an und importiert fehlende Fragen aus server/seed-quizzes.json.
Der Seed enthält 70 Fragen. Vorhandene MySQL-Einträge werden nicht überschrieben.
MySQL speichert Daten im Datenverzeichnis seines Dienstes, nicht als Datei im Git-Projekt.

## Funktionen
- Master-Detail-Auswahl mit Suche und Kategorienfilter.
- Schwierigkeit: Leicht, Mittel, Schwer oder alle Stufen.
- Fragen und Antworten werden für neue Runden gemischt.
- Antwortprüfung und Zeitlimit von 20 Sekunden auf dem Server.
- Richtige Lösung und Erklärung erst nach der Abgabe.
- „Nächste Frage“ lässt Zeit zum Lesen.
- Wiederholungsrunde für falsche oder unbeantwortete Fragen.
- Gespeichertes letztes Ergebnis und Bestwerte.

## Fragen verwalten
Fragen werden direkt in MySQL bearbeitet, zum Beispiel mit MySQL Workbench.
Die Tabelle questions enthält question, answers_json, correct_index, explanation und difficulty.
correct_index beginnt bei 0; answers_json ist eine JSON-Liste mit Antworttexten.
Neue Fragen benötigen eine gültige quiz_id. Die id kann MySQL automatisch vergeben.
Änderungen gelten für neue Quizrunden. Laufende Runden behalten ihren Snapshot.
Der Seed bleibt für die Ersteinrichtung und das Ergänzen fehlender IDs erhalten.
Eigene MySQL-Änderungen werden nicht automatisch über Git verteilt.

## Wichtige Dateien
- src/: Vue-Client, Views, Komponenten, Router, ref/reactive.
- src/api.js: fetch-Helfer.
- src/stores/quiz.js: Katalog und Ergebniszustand.
- server/index.js: eigenständiger HTTP-Server, Konfiguration und statische Dateien.
- server/api.js: Endpunkte und Quizlogik.
- server/database.js: asynchrone MySQL-Abfragen über mysql2.
- server/seed-quizzes.json: mitgelieferter Fragenbestand.
- server/.env.example: Konfigurationsvorlage ohne Zugangsdaten.
- scripts/dev.js: startet Client und Server als getrennte Prozesse.
- vite.config.js: Vue und API-Weiterleitung an Port 3001.

## API
GET /api/quizzes: Themen und Frage-IDs, ohne Lösungen.
POST /api/runs: Runde erstellen.
GET /api/runs/:id: aktuellen Stand lesen.
POST /api/runs/:id/answer: Antwort abgeben.
POST /api/runs/:id/next: weiter oder abschließen.
GET /api/runs/:id/result: abgeschlossenes Ergebnis.

## Zuverlässigkeit
SQL-Werte werden als Parameter übergeben.
InnoDB-Transaktionen und SELECT FOR UPDATE sperren eine Runde während der Auswertung.
So verändern gleichzeitige Anfragen nicht gegenseitig den Punktestand.
Frage-IDs werden von MySQL mit AUTO_INCREMENT vergeben.
Runden sind über zufällige UUIDs erreichbar. Die App hat keine öffentliche Benutzerverwaltung.

## Testen
```powershell
npm test
npm run build
```
Die Integrationstests benötigen den MySQL-Zugang aus server/.env.
Sie erstellen getrennte Datenbanken mit zufälligen Namen quiz_app_test_* und entfernen nur diese wieder.
Die Anwendungsdatenbank quiz_app wird von Tests nicht gelöscht.

## Schulanforderungen
Master-Detail: Themenliste und Details.
ref/reactive: Auswahl, Timer, Katalog, Ergebnis.
fetch: Daten lesen, Antworten abgeben.
Vue Router: /, /quiz/:id, /ergebnis.

Repository: https://github.com/domigg23/quiz_app

Technische Grundlagen:
- https://sidorares.github.io/node-mysql2/docs/documentation/promise-wrapper
- https://dev.mysql.com/doc/refman/8.0/en/innodb-locks-set.html
