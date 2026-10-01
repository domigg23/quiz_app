Ich arbeite mit einem Kollegen an einer Vue-3-Quiz-App (Vite, JavaScript, Vue Router). Öffne unser gemeinsames Repository und erstelle den Branch feature/ui-improvements. Das Grundgerüst ist vorhanden und läuft.

Mein Teil ist die Master-Detail-Oberfläche, das Design und die Quizdaten. Entwickle diesen Teil vollständig:
1. In src/views/CatalogView.vue ein Suchfeld mit v-model/ref und einen Kategorienfilter ergänzen. Die Themenliste ist der Master, die ausgewählte Quizbeschreibung ist das Detail. Auswahl und leere Suchergebnisse korrekt behandeln.
2. src/components/QuestionCard.vue, QuizHeader.vue und ResultScreen.vue sowie src/views/ResultView.vue verbessern: klare Darstellung, Tastaturbedienung, sichtbarer Fokus, gut lesbare Farben und Handyansicht.
3. Styling in src/assets/main.css ergänzen.
4. public/data/quizzes.json um mindestens ein Thema mit fünf sachlich richtigen Fragen ergänzen. Schema: Quiz {id,title,category,description,questions}; Frage {id,category,question,answers,correctIndex}. correctIndex ist der nullbasierte Index der richtigen Antwort. Richtige Antworten auf unterschiedliche Positionen verteilen. Quiz-IDs müssen eindeutig sein.
5. Die Props und Events der vorhandenen Komponenten erhalten. Fragen werden ausschließlich über fetch aus public/data/quizzes.json geladen. src/data/questions.js ist nur der alte Datenbestand.
6. src/stores/quiz.js, src/router.js, src/main.js, src/App.vue und die Quizlogik in src/views/QuizView.vue gehören meinem Kollegen. Diese Dateien nur nach Absprache verändern.
7. npm ci und npm run build ausführen. Themenauswahl, Suche, Direktlink, Quiz, Ergebnis, Neustart und mobile Ansicht prüfen. Änderungen erklären und nachvollziehbar committen. Falls GitHub verbunden ist, Branch pushen und Pull Request erstellen, nicht selbst nach main mergen.

Erkläre mir anschließend meinen Code so, dass ich Master-Detail, v-model, ref, computed und die Komponentenkommunikation bei unserer Präsentation selbst erklären kann.
