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

const correctFeedbackIcon = `
<svg
	class="quiz-card-feedback-icon-symbol"
	width="40"
	height="40"
	viewBox="0 0 24 24"
	fill="none"
>
	<circle cx="12" cy="12" r="12" fill="currentColor"></circle>
	<path
		d="M17.5 8.5L10.5 15.5L7 12"
		stroke="white"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	></path>
</svg>
`;

const incorrectFeedbackIcon = `
<svg
	class="quiz-card-feedback-icon-symbol"
	width="40"
	height="40"
	viewBox="0 0 24 24"
	fill="none"
>
	<circle cx="12" cy="12" r="12" fill="currentColor"></circle>
	<path
		d="M15.5 8.5L8.5 15.5M8.5 8.5L15.5 15.5"
		stroke="white"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	></path>
</svg>
`;

// DOM references (assigned after DOMContentLoaded)
let container = null;
let actionsEl = null;
let feedbackEl = null;
let submit = null;
let retakeContainer = null;
let retakeControl = null;
let prevButton = null;
let nextButton = null;

let questionSet = [];
let currentQuestionIndex = 0;
let mcq = null;
let domReadyAttempts = 0;
const MAX_DOM_READY_ATTEMPTS = 40;

startWhenReady();

function startWhenReady() {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', startQuiz);
	} else {
		startQuiz();
	}
}

function startQuiz() {
	assignDomReferences();
	ensureFallbackElements();
	assignDomReferences();

	if (!container) {
		if (domReadyAttempts < MAX_DOM_READY_ATTEMPTS) {
			domReadyAttempts += 1;
			window.setTimeout(startQuiz, 50);
		} else {
			console.error('MCQ container element not found.');
		}
		return;
	}

	attachEventListeners();
	initializeQuiz();
}

function assignDomReferences() {
	container = document.getElementById('mcq-container');
	actionsEl = document.querySelector('.quiz-card-actions');
	feedbackEl = document.querySelector('.quiz-card-feedback');
	submit = document.getElementById('quiz-mcq-submit');
	retakeContainer = document.querySelector(
	'.knowledge-check-retake-container'
);
retakeControl = retakeContainer
	? retakeContainer.querySelector('.knowledge-check-retake')
	: null;
	prevButton = document.querySelector(
		'.quiz-controls-button[data-direction="prev"]'
	);
	nextButton = document.querySelector(
		'.quiz-controls-button[data-direction="next"]'
	);
}

function ensureFallbackElements() {
	if (!container) {
		return;
	}

	const interactiveWrap = container.parentElement;
	const mainWrap = container.closest('.quiz-card-main');
	const knowledgeWrap = container.closest('.knowledge-check-container');

	if (!actionsEl) {
		actionsEl = document.createElement('div');
		actionsEl.className = 'quiz-card-actions';
		if (interactiveWrap) {
			interactiveWrap.insertAdjacentElement('afterend', actionsEl);
		} else {
			container.insertAdjacentElement('afterend', actionsEl);
		}
	}

	if (!submit || !actionsEl.contains(submit)) {
		actionsEl.innerHTML = '';
		const submitInner = document.createElement('div');
		submitInner.className = 'quiz-card-submit';

		const submitButton = document.createElement('button');
		submitButton.id = 'quiz-mcq-submit';
		submitButton.className =
			'quiz-card-button quiz-card-button--disabled';
		submitButton.type = 'button';
		submitButton.textContent = 'Check';

		submitInner.appendChild(submitButton);
		actionsEl.appendChild(submitInner);
		submit = submitButton;
		submit.disabled = true;
	}

	if (!feedbackEl) {
		feedbackEl = document.createElement('div');
		feedbackEl.className = 'quiz-card-feedback';
		feedbackEl.innerHTML = '';
		const insertAfter = actionsEl || interactiveWrap || container;
		insertAfter.insertAdjacentElement('afterend', feedbackEl);
	}

	let feedbackWrap = feedbackEl.querySelector('.quiz-card-feedback-wrap');
	if (!feedbackWrap) {
		feedbackWrap = document.createElement('div');
		feedbackWrap.className = 'quiz-card-feedback-wrap';
		feedbackEl.appendChild(feedbackWrap);
	}

	let feedbackIcon = feedbackEl.querySelector('.quiz-card-feedback-icon');
	if (!feedbackIcon) {
		feedbackIcon = document.createElement('div');
		feedbackIcon.className = 'quiz-card-feedback-icon';
		feedbackWrap.prepend(feedbackIcon);
	} else if (!feedbackWrap.contains(feedbackIcon)) {
		feedbackWrap.prepend(feedbackIcon);
	}

	if (!feedbackIcon.innerHTML.trim()) {
		feedbackIcon.innerHTML = incorrectFeedbackIcon;
		if (!feedbackIcon.querySelector('.quiz-card-feedback-icon-symbol')) {
			feedbackIcon.textContent = '✕';
		}
	}

	let feedbackLabel = feedbackEl.querySelector('.quiz-card-feedback-label');
	if (!feedbackLabel) {
		feedbackLabel = document.createElement('div');
		feedbackLabel.className = 'quiz-card-feedback-label';
		feedbackWrap.appendChild(feedbackLabel);
	} else if (!feedbackWrap.contains(feedbackLabel)) {
		feedbackWrap.appendChild(feedbackLabel);
	}
	if (!feedbackLabel.textContent.trim()) {
		feedbackLabel.textContent = 'Incorrect';
	}

	if (!retakeContainer) {
		retakeContainer = document.createElement('div');
		retakeContainer.className = 'knowledge-check-retake-container';
		const insertAfter =
			feedbackEl || actionsEl || interactiveWrap || container;
		insertAfter.insertAdjacentElement('afterend', retakeContainer);
	}

	ensureRetakeControl();

	setRetakeVisibility(false);

	let controlsWrapper =
		knowledgeWrap?.querySelector('.quiz-controls') ??
		document.querySelector('.quiz-controls');

	if (!controlsWrapper) {
		controlsWrapper = document.createElement('div');
		controlsWrapper.className = 'quiz-controls';
		const insertTarget = mainWrap || knowledgeWrap || container;
		insertTarget.insertAdjacentElement('afterend', controlsWrapper);
	}

	if (!prevButton) {
		prevButton = document.createElement('button');
		prevButton.type = 'button';
		prevButton.className = 'quiz-controls-button';
		prevButton.dataset.direction = 'prev';
		prevButton.setAttribute('aria-label', 'Previous question');
		controlsWrapper.appendChild(prevButton);
	}

	if (!nextButton) {
		nextButton = document.createElement('button');
		nextButton.type = 'button';
		nextButton.className = 'quiz-controls-button';
		nextButton.dataset.direction = 'next';
		nextButton.setAttribute('aria-label', 'Next question');
		controlsWrapper.appendChild(nextButton);
	}

	setControlButton(prevButton, 'prev');
	setControlButton(nextButton, 'next');

	function setControlButton(button, direction) {
		if (!button) {
			return;
		}

		button.classList.add('quiz-controls-button');
		const fallbackText = direction === 'prev' ? '←' : '→';
		const iconMarkup = `
			<span class="quiz-controls-icon" aria-hidden="true">
				${fallbackText}
			</span>
		`;
		button.dataset.direction = direction;
		button.setAttribute(
			'aria-label',
			direction === 'prev' ? 'Previous question' : 'Next question'
		);
		button.type = 'button';
		button.innerHTML = iconMarkup;
		if (!button.querySelector('.quiz-controls-icon')) {
			button.textContent = fallbackText;
		}
	}

	deactivateEl(retakeContainer, retakeControl, feedbackEl, actionsEl);
	if (submit) {
		submit.classList.add('quiz-card-button--disabled');
		submit.disabled = true;
	}
}

function attachEventListeners() {
	if (submit) {
		submit.removeEventListener('click', handleSubmit);
		submit.addEventListener('click', handleSubmit);
	}

	if (retakeControl) {
		retakeControl.removeEventListener('click', handleRetake);
		retakeControl.addEventListener('click', handleRetake);
		retakeControl.removeEventListener('keydown', handleRetakeKeydown);
		retakeControl.addEventListener('keydown', handleRetakeKeydown);
	}

	if (prevButton) {
		prevButton.removeEventListener('click', handlePrevNavigation);
		prevButton.addEventListener('click', handlePrevNavigation);
	}

	if (nextButton) {
		nextButton.removeEventListener('click', handleNextNavigation);
		nextButton.addEventListener('click', handleNextNavigation);
	}
}

function handleRetakeKeydown(event) {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		handleRetake();
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

function handlePrevNavigation() {
	navigateQuestion(-1);
}

function handleNextNavigation() {
	navigateQuestion(1);
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
		submit.disabled = true;
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

		if (!Array.isArray(questions) || !questions.length) {
			renderMessage('No quiz questions available.');
			questionSet = [];
			updateNavigation();
			return;
		}

		questionSet = questions.map((question) => ({
			...question,
			answers: Array.isArray(question.answers)
				? [...question.answers]
				: [],
		}));

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

	if (
		!Array.isArray(questionSet) ||
		questionSet.length <= 1 ||
		!mcq
	) {
		prevButton.disabled = true;
		nextButton.disabled = !questionSet.length
			? true
			: questionSet.length <= 1;
		return;
	}

	prevButton.disabled = currentQuestionIndex <= 0;
	nextButton.disabled =
		currentQuestionIndex >= questionSet.length - 1;
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
	if (submit) {
		submit.classList.add('quiz-card-button--disabled');
		submit.disabled = true;
	}
	// actionsEl.classList.add('quiz-card-actions--active');
	// feedbackEl.classList.add('quiz-card-feedback--active');
	giveFeedback(answerIsCorrect);

	//give option to retake
	setRetakeVisibility(true);
}

//feedback
function giveFeedback(isCorrect) {
	if (!feedbackEl) {
		return;
	}

	const feedbackLabel = feedbackEl.querySelector(
		'.quiz-card-feedback-label'
	);
	const feedbackIcon = feedbackEl.querySelector(
		'.quiz-card-feedback-icon'
	);

	if (!feedbackLabel || !feedbackIcon) {
		return;
	}

	if (isCorrect === true) {
		feedbackLabel.innerText = 'Correct';
		feedbackIcon.innerHTML = correctFeedbackIcon;
		if (!feedbackIcon.querySelector('.quiz-card-feedback-icon-symbol')) {
			feedbackIcon.textContent = '✓';
		}
		feedbackIcon.classList.add('quiz-card-feedback-icon--correct');
	} else {
		feedbackLabel.innerText = 'Incorrect';
		feedbackIcon.innerHTML = incorrectFeedbackIcon;
		if (!feedbackIcon.querySelector('.quiz-card-feedback-icon-symbol')) {
			feedbackIcon.textContent = '✕';
		}
		feedbackIcon.classList.remove('quiz-card-feedback-icon--correct');
	}
}

//retake
function handleRetake() {
	if (!mcq) {
		return;
	}

	//hide retake option + feedback + show submit
	deactivateEl(retakeContainer, retakeControl, feedbackEl, actionsEl);
	setRetakeVisibility(false);
	giveFeedback(false);
	if (submit) {
		submit.classList.add('quiz-card-button--disabled');
		submit.disabled = true;
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

	deactivateEl(retakeContainer, retakeControl, feedbackEl, actionsEl);
	setRetakeVisibility(false);
	if (feedbackEl) {
		feedbackEl.classList.remove('quiz-card-feedback--active');
	}
	if (actionsEl) {
		actionsEl.classList.remove('quiz-card-actions--active');
	}
	container.innerHTML = '';

	if (submit) {
		submit.classList.add('quiz-card-button--disabled');
		submit.disabled = true;
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
		if (submit) {
			submit.classList.remove('quiz-card-button--disabled');
			submit.disabled = false;
		}
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

function ensureRetakeControl() {
	if (!retakeContainer) {
		return;
	}

	if (retakeControl && retakeControl.parentElement === retakeContainer) {
		return;
	}

	retakeContainer.innerHTML = '';

	retakeControl = document.createElement('div');
	retakeControl.className = 'knowledge-check-retake';
	retakeControl.setAttribute('role', 'button');
	retakeControl.setAttribute('tabindex', '-1');
	retakeControl.setAttribute('aria-hidden', 'true');
	retakeControl.hidden = true;
	retakeControl.textContent = 'Take Again';

	retakeContainer.appendChild(retakeControl);
}

function setRetakeVisibility(isVisible) {
	if (!retakeContainer) {
		return;
	}

	if (!retakeControl || retakeControl.parentElement !== retakeContainer) {
		ensureRetakeControl();
		retakeControl = retakeContainer.querySelector(
			'.knowledge-check-retake'
		);
		attachEventListeners();
	}

	if (!retakeControl) {
		return;
	}

	if (isVisible) {
		retakeContainer.classList.add(
			'knowledge-check-retake-container--active'
		);
		retakeControl.classList.add('knowledge-check-retake--active');
		retakeControl.hidden = false;
		retakeControl.removeAttribute('aria-hidden');
		retakeControl.tabIndex = 0;
	} else {
		retakeContainer.classList.remove(
			'knowledge-check-retake-container--active'
		);
		retakeControl.classList.remove('knowledge-check-retake--active');
		retakeControl.hidden = true;
		retakeControl.setAttribute('aria-hidden', 'true');
		retakeControl.tabIndex = -1;
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
