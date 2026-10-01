# Aufgaben für das Zweierteam

## Dein Teil: Daten und Quizlogik
- src/stores/quiz.js: fetch, Ladezustand, Fehlerbehandlung, reactive und ref.
- src/router.js und src/main.js: Routing und dynamische Quiz-ID.
- src/views/QuizView.vue: Timer, Auswertung, Fortschritt und Bestwert je Quiz.
- src/App.vue: Grundgerüst.

## Kollege: Master-Detail-Oberfläche und Inhalte
Die Basis funktioniert bereits. Dein Kollege entwickelt seinen Teil auf feature/ui-improvements weiter:
- src/views/CatalogView.vue: Master-Detail-Ansicht, Suchfeld mit v-model und computed, Kategorienfilter.
- src/components/QuestionCard.vue, QuizHeader.vue, ResultScreen.vue: Oberfläche und Barrierefreiheit.
- src/views/ResultView.vue: Ergebnisdarstellung.
- src/assets/main.css: responsive Gestaltung.
- public/data/quizzes.json: mindestens ein weiteres Thema und erklärende Fragen.

Props und Events der Komponenten beibehalten. Änderungen an Logik und Router vorher abstimmen. Beide prüfen den anderen Teil und erklären ihren Code selbst. Bestehender Code ist ein gemeinsames Grundgerüst, keine Behauptung über die Autorenschaft.
