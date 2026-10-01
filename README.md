# QuizWerk – Vue-Teamprojekt

## Starten
```powershell
npm ci
npm run dev
```
Produktionsbuild: `npm run build`; Vorschau: `npm run preview`.

## Schulanforderungen
- Master-Detail: src/views/CatalogView.vue zeigt links Themen, rechts das ausgewählte Quiz.
- ref: selectedId im Store und Werte für Timer/Punkte in QuizView.vue.
- reactive: catalog für Daten/Ladezustand und session für das Ergebnis.
- fetch: src/stores/quiz.js lädt public/data/quizzes.json mit Status- und Datenprüfung.
- Vue Router: /, /quiz/:id und /ergebnis; Hash-Routing unterstützt statisches Hosting.
- Quiz: 20 Sekunden pro Frage, Punkte, Ergebnis und Bestwert je Quiz in localStorage.
- Zurücknavigieren beendet Timer und den verzögerten Fragenwechsel. Neuladen der Ergebnisroute zeigt einen Hinweis, da laufende Ergebnisse nur im Arbeitsspeicher liegen.

## Zusammenarbeit
Siehe AUFGABEN.md und KOLLEGE-PROMPT.md. Grundgerüst ist funktionsfähig; der Kollege erweitert die Oberfläche und Inhalte auf eigenem Branch. GitHub-Zugang des Kollegen im Repository unter Settings > Collaborators einladen.

## GitHub hochladen
GitHub CLI ist installiert, aber beim Erstellen nicht angemeldet. Anmeldung selbst durchführen:
```powershell
gh auth login
```
Danach im Projektordner ausführen (erstellt ein privates Repository):
```powershell
gh repo create holzmann-quiz --private --source=. --remote=origin --push
```
Wenn das Repository schon existiert, stattdessen dessen URL als origin verwenden und git push -u origin main ausführen. Keine Tokens in Projektdateien speichern.

Offizielle Grundlagen: https://vuejs.org/guide/essentials/reactivity-fundamentals.html und https://router.vuejs.org/guide/essentials/history-mode.html
