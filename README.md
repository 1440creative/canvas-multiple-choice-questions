# Canvas Multiple Choice Questions

This repo contains a vanilla JavaScript prototype of a multiple-choice question (MCQ) 'knowledge check' that is meant to be embedded as HTML in Canvas LMS (pages).

## Getting Started

- Serve the repo with any static web server so `fetch` can load the JSON question set. A quick option is `python3 -m http.server` from the project root, then open `http://localhost:8000/`.
- Open `index.html` in a browser. The quiz container will fetch the question data, render the first prompt, and enable previous/next navigation after the data loads.

## Project Layout

- `index.html` – sample markup with the quiz container.
- `style.css` / `reset.css` – look and feel.
- `script.js` – quiz controller (data loading, rendering, feedback, navigation).
- `data/` – JSON bundles of question sets (`example-questions.json` included).

## How Question Sets Are Loaded

- The quiz container (`#mcq-container`) declares a `data-questions-url` attribute that points to a JSON file relative to the page.
- When `script.js` runs, `initializeQuiz()` reads that attribute, calls `fetchQuestions(url)`, and caches the resulting promise in `questionsCache` so the same set is not reloaded repeatedly.
- Requests use `fetch(url, { credentials: 'same-origin' })`; host the JSON files from the same origin as the page (or adjust headers) to avoid CORS issues.
- After the JSON resolves, `showQuestion()` renders the specified index, wires up answer selection, and updates the next/previous buttons. Submit/retake flows run entirely in the client.

## Authoring Question Sets

Question sets are plain JSON arrays. Each object is one MCQ:

```json
[
	{
		"question": "Prompt text (HTML supported)",
		"answers": ["Choice A", "Choice B", "Choice C"],
		"answer": 1
	}
]
```

- `question` (string) – The prompt text. Inline HTML such as `<em>` or `<strong>` is allowed and will be rendered as-is.
- `answers` (array) – Ordered answer choices. Use at least two entries. Strings can include HTML if you need formatted copy.
- `answer` (number) – Zero-based index into the `answers` array indicating the correct choice. Make sure it remains within bounds whenever you reorder or remove answers.

### Recommendations

- Keep JSON valid: trailing commas or comments will break parsing.
- Escape any quotation marks inside strings (e.g., `\"Hamlet\"`).
- Prefer short, actionable prompts and answers; long-form content may require additional styling.
- If you localize content, place separate JSON files per locale and update `data-questions-url` accordingly.
- For multiple quizzes on one page, give each container its own `data-questions-url` and unique DOM id; the script will initialise each instance separately if you adapt it to loop over containers.

## Creating New Question Sets

1. Copy `data/example-questions.json` to a new filename inside `data/`.
2. Update the questions, answers, and correct index following the schema above.
3. Point the quiz container in `index.html` (or your host page) to the new file via `data-questions-url="data/my-questions.json"`.
4. Reload the page; the quiz should now serve your new set. Use the browser console for any JSON parse errors surfaced by the loader.

## Next Steps

- Extend the schema with optional fields (e.g., per-answer feedback) and update `script.js` to surface them.
- Add automated validation (Node script or lint rule) to catch malformed JSON before publishing.
- Integrate the module into Canvas by swapping the static markup with the LMS component shell and wiring the `data-questions-url` attribute dynamically.
