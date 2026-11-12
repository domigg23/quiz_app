# Quiz – Vue-Teamprojekt mit SQLite

## Starten
Voraussetzung: Node.js ab 24.14 (auf diesem Rechner installiert).

```powershell
npm ci
npm run dev
```

Öffne die im Terminal angezeigte Adresse. Ein Befehl startet Vue und die lokale API.
Beim ersten Serverstart entsteht automatisch server/data/quiz.sqlite mit allen 35 vorhandenen Fragen.
Weitere Starts behalten die vorhandene Datenbank unverändert bei.

Produktionsvorschau:
```powershell
npm run build
npm run preview
```
Auch die Vorschau stellt die API bereit. Nur den dist-Ordner auf statisches Hosting
zu kopieren reicht nicht: Die Datenbank-API benötigt einen laufenden Node-Server.

## Datenfluss
Browser → fetch('/api/quizzes') → Node-API → SQLite → JSON → Vue-Oberfläche.

- src/stores/quiz.js: lädt die API mit fetch; reactive verwaltet Daten, Ladezustand und Fehler.
- server/api.js: GET /api/quizzes liest die Datenbank. Andere Methoden erhalten 405, unbekannte API-Routen 404.
- server/database.js: legt Tabellen an und liest Quizthemen und Fragen mit SQL.
- server/data/quiz.sqlite: echte lokale Datenbank mit den Tabellen quizzes und questions.
- server/seed-quizzes.json: einmaliger Anfangsbestand, keine zur Laufzeit vom Browser geladene Datenquelle.
- Datenbank und Seed bleiben auf dem Server. Die lokale Datenbank wird nicht in Git eingecheckt.
- Änderungen am Seed verändern eine bereits angelegte Datenbank nicht.

## Fragen bearbeiten
Öffne server/data/quiz.sqlite mit einem SQLite-Werkzeug (z. B. einer vorhandenen SQLite-Erweiterung).
In questions stehen Frage, Kategorie, quiz_id, answers_json und correct_index.
correct_index beginnt bei 0. answers_json ist eine JSON-Liste von Antworttexten.
Nach dem Speichern lädt die Themenauswahl die aktualisierten Daten beim nächsten Seitenaufruf.
Ein neues Quiz benötigt zuerst einen Eintrag in quizzes und danach passende questions.
Für den Kollegen wird beim ersten Start der eingecheckte Seed importiert.
Eigene Datenbankänderungen werden daher nicht automatisch über Git verteilt.

## Schulanforderungen
- Master-Detail: Themenliste und ausgewählte Quizdetails in CatalogView.vue.
- ref und reactive: Themenauswahl, Quizlogik und Datenzustand.
- fetch: Fragen aus einer SQLite-Datenbank über eine HTTP-API laden.
- Vue Router: /, /quiz/:id und /ergebnis.
- Timer, Punkte, Bestwert je Quiz und Wiederholungsrunde für offene Fragen.

## Prüfen
```powershell
npm test
npm run build
```
Die Tests prüfen vollständigen Erstimport, Persistenz nach Neustart,
Datenbankänderungen im HTTP-Ergebnis sowie Fehlerstatus der API.
Die Tests verwenden temporäre Datenbanken.

SQLite-Dokumentation: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
Repository: https://github.com/domigg23/quiz_app

## Aufgabenteilung
Du: Datenbank, API, fetch, Routing, Quizlogik und Timer.
Nolf: Themenauswahl, Suche, Filter, Komponenten, Design und Frageninhalte.
