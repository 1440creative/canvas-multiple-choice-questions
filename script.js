const questionsCache = new Map();

//html for option-wrapper
const optionHTML = `
<div class="quiz-mcq-option">
							<div class="quiz-mcq-option__indicator">
								<svg
									class="quiz-mcq-option__dot"
									viewBox="0 0 10 10"
									fill="currentColor"
								>
									<circle cx="5" cy="5" r="5"></circle>
								</svg>
								<svg
									class="quiz-mcq-option__check"
									viewBox="0 0 10 16"
									fill="currentColor"
								>
									<path
										d="M9.6,0L11,1.3L3.9,8L0,4.3L1.4,3l2.6,2.4L9.6,0z"
									></path>
								</svg>
								<svg
									class="quiz-mcq-option__x"
									height="10"
									width="10"
									viewBox="0 0 10 10"
								>
									<path
										d="M5,4.17,9.17,0,10,.83,5.83,5,10,9.17,9.17,10,5,5.83.83,10,0,9.17,4.17,5,0,.83.83,0Z"
									></path>
								</svg>
							</div>
							<div class="quiz-mcq-option__border"></div>
						</div>
`;

// DOM references
const container = document.getElementById('mcq-container');
const actionsEl = document.querySelector('.quiz-card-actions');
const feedbackEl = document.querySelector('.quiz-card-feedback');
const submit = document.getElementById('quiz-mcq-submit');
const retakeContainer = document.querySelector(
	'.knowledge-check-retake-container'
);
const retakeBtn = retakeContainer
	? retakeContainer.querySelector('.knowledge-check-retake')
	: null;
const prevButton = document.querySelector(
	'.quiz-controls-button[data-direction="prev"]'
);
const nextButton = document.querySelector(
	'.quiz-controls-button[data-direction="next"]'
);

let questionSet = [];
let currentQuestionIndex = 0;
let mcq = null;

initializeQuiz();

//submit listener
if (submit) {
	submit.addEventListener('click', handleSubmit);
}

//retake listener
if (retakeBtn) {
	retakeBtn.addEventListener('click', handleRetake);
}

if (prevButton) {
	prevButton.addEventListener('click', () => navigateQuestion(-1));
}

if (nextButton) {
	nextButton.addEventListener('click', () => navigateQuestion(1));
}

//functions
async function initializeQuiz() {
	if (!container) {
		console.error('MCQ container element not found.');
		return;
	}

	questionSet = [];
	currentQuestionIndex = 0;
	mcq = null;
	if (submit) {
		submit.classList.add('quiz-card-button--disabled');
	}
	if (container) {
		container.dataset.questionIndex = '0';
	}
	updateNavigation();

	const questionsUrl = container.dataset.questionsUrl;

	if (!questionsUrl) {
		renderMessage('Quiz data is unavailable.');
		console.error(
			'MCQ data URL missing. Add a data-questions-url attribute to the container.'
		);
		updateNavigation();
		return;
	}

	renderMessage('Loading question...');

	try {
		const questions = await fetchQuestions(questionsUrl);
		if (!questions.length) {
			renderMessage('No quiz questions available.');
			questionSet = [];
			updateNavigation();
			return;
		}

		questionSet = questions;
		const questionIndex = resolveQuestionIndex(
			container.dataset.questionIndex,
			questionSet.length
		);
		showQuestion(questionIndex);
	} catch (error) {
		console.error('Failed to load quiz data:', error);
		renderMessage('Unable to load this quiz right now.');
		updateNavigation();
	}
}

function showQuestion(targetIndex) {
	if (!Array.isArray(questionSet) || !questionSet.length) {
		return;
	}

	const boundedIndex = Math.min(
		Math.max(targetIndex, 0),
		questionSet.length - 1
	);

	currentQuestionIndex = boundedIndex;
	container.dataset.questionIndex = `${currentQuestionIndex}`;
	mcq = questionSet[currentQuestionIndex];
	loadMCQ(mcq);
	updateNavigation();
}

function navigateQuestion(offset) {
	if (
		!Array.isArray(questionSet) ||
		!questionSet.length ||
		offset === 0
	) {
		return;
	}

	const nextIndex = currentQuestionIndex + offset;
	if (nextIndex < 0 || nextIndex > questionSet.length - 1) {
		return;
	}

	showQuestion(nextIndex);
}

function updateNavigation() {
	if (!prevButton || !nextButton) {
		return;
	}

	if (!Array.isArray(questionSet) || questionSet.length <= 1 || !mcq) {
		prevButton.disabled = true;
		nextButton.disabled = !questionSet.length
			? true
			: questionSet.length <= 1;
		return;
	}

	prevButton.disabled = currentQuestionIndex <= 0;
	nextButton.disabled = currentQuestionIndex >= questionSet.length - 1;
}

//handle submit
function handleSubmit(e) {
	if (!mcq) {
		return;
	}

	let answerIsCorrect = false;
	const MCQOptions = document.querySelectorAll('.quiz-mcq-option');
	MCQOptions.forEach((el) => {
		let dot = el.querySelector('.quiz-mcq-option__dot');
		deactivateEl(dot);
	});

	const answers = document.querySelectorAll('.quiz-mcq-option__text');

	for (const answer of answers) {
		const answerID = answer.getAttribute('id').split('-');
		const option = answer.previousElementSibling;
		const selectedIndex = Number.parseInt(
			answerID[answerID.length - 1],
			10
		);

		if (Number.isNaN(selectedIndex) || !option) {
			continue;
		}

		if (selectedIndex === mcq.answer) {
			//correct
			const checkMark = option.querySelector(
				'.quiz-mcq-option__check'
			);

			option.classList.add('is-complete', 'is-correct');

			activateEl(checkMark);
			if (checkMark) {
				checkMark.classList.add('quiz-mcq-option__check--correct');
			}
		} else {
			//incorrect
			const xMark = option.querySelector('.quiz-mcq-option__x');
			const checkMark = option.querySelector(
				'.quiz-mcq-option__check'
			);

			option.classList.add('is-complete', 'is-incorrect');

			activateEl(xMark);
			if (checkMark) {
				checkMark.classList.remove('quiz-mcq-option__check--correct');
			}
		}

		if (
			option.classList.contains('is-selected') &&
			option.classList.contains('is-correct')
		) {
			answerIsCorrect = true;
		}
	}

	//hide submit + give feedback
	//const actionsEl = document.querySelector('.quiz-card-actions');

	//
	activateEl(actionsEl, feedbackEl);
	// actionsEl.classList.add('quiz-card-actions--active');
	// feedbackEl.classList.add('quiz-card-feedback--active');
	giveFeedback(answerIsCorrect);

	//give option to retake
	activateEl(retakeContainer, retakeBtn);
}

//feedback
function giveFeedback(isCorrect) {
	const feedbackLabel = feedbackEl.querySelector(
		'.quiz-card-feedback-label'
	);
	const feedbackIcon = feedbackEl.querySelector(
		'.quiz-card-feedback-icon'
	);

	if (isCorrect === true) {
		feedbackLabel.innerText = 'Correct';
		feedbackIcon.innerHTML = '<i class="fa-solid fa-check"></i>';
		feedbackIcon.classList.add('quiz-card-feedback-icon--correct');
	} else {
		feedbackLabel.innerText = 'Incorrect';
		feedbackIcon.innerHTML = '<i class="fa-solid fa-xmark"></i>';
		feedbackIcon.classList.remove('quiz-card-feedback-icon--correct');
	}
}

//retake
function handleRetake() {
	if (!mcq) {
		return;
	}

	//hide retake option + feedback + show submit
	deactivateEl(retakeContainer, retakeBtn, feedbackEl, actionsEl);
	giveFeedback(false);
	if (submit) {
		submit.classList.add('quiz-card-button--disabled');
	}
	//clear & load mcq
	loadMCQ(mcq);
	updateNavigation();
}

//load mcq
function loadMCQ(mcq) {
	if (!container || !mcq) {
		return false;
	}

	if (!Array.isArray(mcq.answers) || mcq.answers.length === 0) {
		renderMessage('Quiz question is missing answer choices.');
		return false;
	}

	deactivateEl(retakeContainer, retakeBtn, feedbackEl, actionsEl);
	container.innerHTML = '';

	if (submit) {
		submit.classList.add('quiz-card-button--disabled');
	}

	//load question text
	const questionText = document.createElement('div');
	questionText.className = 'quiz-mcq-question';
	questionText.innerHTML = `<p>${mcq.question}</p>`;
	container.appendChild(questionText);
	//options load
	mcq.answers.forEach((answerCopy, index) => {
		const optionWrap = document.createElement('div');
		optionWrap.classList.add('quiz-mcq-option-wrap');
		optionWrap.innerHTML = optionHTML;
		const optionText = document.createElement('div');
		optionText.classList.add('quiz-mcq-option__text');
		optionText.setAttribute('id', `mcq-option-${index}`);
		optionText.innerHTML = `
	  <div class="quiz-mcq-option__label">
	 							${answerCopy}
	 						</div>
	 `;
		optionWrap.appendChild(optionText);
		container.appendChild(optionWrap);
	});
	const MCQOptions = document.querySelectorAll('.quiz-mcq-option');
	for (const option of MCQOptions) {
		option.addEventListener('click', handleOptionSelect);
	}
	return true;
}

//option select
function handleOptionSelect(e) {
	//reselect options;
	// clear anything already selectd
	clearSelected();

	const option = e.target.closest('.quiz-mcq-option');
	if (!option.classList.contains('is-complete')) {
		// add selected class(es)
		option.classList.add('is-selected');
		//operate on dot indicator
		const dot = option.querySelector('.quiz-mcq-option__dot');
		activateEl(dot);

		//open submit option
		submit.classList.remove('quiz-card-button--disabled');
	}
}

//clear indicators
function clearSelected() {
	const MCQOptions = document.querySelectorAll('.quiz-mcq-option');
	MCQOptions.forEach((el) => {
		el.classList.remove('is-selected');
		const dot = el.querySelector('.quiz-mcq-option__dot');
		deactivateEl(dot);
	});
}

// add or remove --active to classnames
function activateEl(...els) {
	for (let el of els) {
		if (el) {
			const className = el.classList[0]; //get first in list
			el.classList.add(`${className}--active`);
		}
	}
}

function deactivateEl(...els) {
	for (let el of els) {
		if (el) {
			const className = el.classList[0]; //get first in list
			el.classList.remove(`${className}--active`);
		}
	}
}

async function fetchQuestions(url) {
	if (!url) {
		throw new Error('No questions URL provided.');
	}

	if (questionsCache.has(url)) {
		return questionsCache.get(url);
	}

	const request = window
		.fetch(url, { credentials: 'same-origin' })
		.then((response) => {
			if (!response.ok) {
				throw new Error(
					`Failed to load questions (status ${response.status})`
				);
			}
			return response.json();
		})
		.then((data) => {
			if (!Array.isArray(data)) {
				throw new Error('Quiz data must be an array of questions.');
			}
			return data;
		});

	questionsCache.set(url, request);

	try {
		const data = await request;
		return data;
	} catch (error) {
		questionsCache.delete(url);
		throw error;
	}
}

function resolveQuestionIndex(indexValue, total) {
	const parsed = Number.parseInt(indexValue ?? '', 10);
	if (Number.isNaN(parsed)) {
		return 0;
	}

	const upperBound = Math.max(total - 1, 0);
	return Math.min(Math.max(parsed, 0), upperBound);
}

function renderMessage(message) {
	if (!container) {
		return;
	}

	container.innerHTML = `<p class="quiz-mcq__status">${message}</p>`;
}
