async function second_part(state) {
    console.log(state.didnotmentioncontact);
    console.log("Second part started");

    const elements = {
        questionContainer: document.getElementById('questionContainer'),
        nextBtn: document.getElementById('nextBtn2'),
        prevBtn: document.getElementById('prevBtn2'),
        progress: document.getElementById('progress2'),
        progressPercentage: document.getElementById('progressPercentage2')
    };

    const answers = {};
    let currentQuestionIndex = 0;

    function createQuestion(placeholder) {
        if (placeholder.skip === 'true') {
            return createQuestion(state.templateJson.placeholders[++currentQuestionIndex]);
        }

        const questionDiv = document.createElement('div');
        questionDiv.classList.add('q');

        if (placeholder.type === 'checkbox') {
            questionDiv.innerHTML = createCheckboxHTML(placeholder);
            addCheckboxEventListeners(questionDiv, placeholder);
        } else {
            questionDiv.innerHTML = createInputHTML(placeholder);
        }

        if (placeholder.hint) {
            addHintToQuestion(questionDiv, placeholder.hint);
        }

        return questionDiv;
    }

    function createCheckboxHTML(placeholder) {
        return `
            <label for="${placeholder.id}">${placeholder.question}</label>
            <div class="button-container">
                <input type="radio" id="${placeholder.id}_yes" name="${placeholder.id}" value="yes" class="hidden-radio">
                <label for="${placeholder.id}_yes" class="radio-label option-button">כן</label>
                <input type="radio" id="${placeholder.id}_no" name="${placeholder.id}" value="no" class="hidden-radio">
                <label for="${placeholder.id}_no" class="radio-label option-button">לא</label>
                <input type="hidden" id="${placeholder.id}" name="${placeholder.id}">
            </div>
        `;
    }

    function createInputHTML(placeholder) {
        return `
            <label for="${placeholder.id}">${placeholder.question}</label>
            <input type="${placeholder.type}" id="${placeholder.id}" name="${placeholder.id}"
                ${placeholder.type === 'file' ? 'accept=".jpg,.jpeg,.png,.pdf"' : ''}
                ${placeholder['not-mandatory'] ? '' : 'required'}>
        `;
    }

    function addCheckboxEventListeners(questionDiv, placeholder) {
        ['yes', 'no'].forEach(value => {
            questionDiv.querySelector(`#${placeholder.id}_${value}`).addEventListener('change', function() {
                if (this.checked) {
                    questionDiv.querySelector(`#${placeholder.id}`).value = value;
                }
            });
        });
    }

    function addHintToQuestion(questionDiv, hintText) {
        const hintParagraph = document.createElement('p');
        hintParagraph.className = 'hint';
        hintParagraph.innerHTML = hintText.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">בקישור הזה</a>');
        questionDiv.querySelector('label').insertAdjacentElement('afterend', hintParagraph);
    }

    function showQuestion(index) {
        elements.questionContainer.innerHTML = '';
        const question = createQuestion(state.templateJson.placeholders[index]);
        elements.questionContainer.appendChild(question);

        updateNavigationButtons(index);
        addInputEventListeners(question, index);
        updateProgress();
    }

    function updateNavigationButtons(index) {
        elements.prevBtn.style.display = index > 0 ? 'block' : 'none';
        elements.nextBtn.textContent = index === state.templateJson.placeholders.length - 1 ? 'יצירת מסמך' : 'הבא';
        elements.nextBtn.disabled = true;
    }

    function addInputEventListeners(question, index) {
        const inputs = question.querySelectorAll('input');
        const isNotMandatory = state.templateJson.placeholders[index]['not-mandatory'] === "true";

        inputs.forEach(input => {
            input.addEventListener('input', () => {
                elements.nextBtn.disabled = !(input.checkValidity() || isNotMandatory);
            });

            if (isNotMandatory) {
                setupNotMandatoryQuestion(input);
            }
        });

        if (index === state.templateJson.placeholders.length - 1) {
            elements.nextBtn.addEventListener('click', handleFinalQuestion);
        }

        addPlaceholderIfExists(question, index);
        preventNegativeNumberInput(question, index);
    }

    function setupNotMandatoryQuestion(input) {
        elements.nextBtn.disabled = false;
        elements.nextBtn.textContent = 'דלג';
        input.required = false;
        input.addEventListener('input', () => {
            elements.nextBtn.disabled = false;
            elements.nextBtn.textContent = 'הבא';
        });
    }

    function handleFinalQuestion() {
        console.log(answers);
        const { username, sender, email_of_user: mail, 'user-phone': tel } = answers;
    }

    function addPlaceholderIfExists(question, index) {
        const helptext = state.templateJson.placeholders[index].helptext;
        if (helptext) {
            question.querySelector('input').placeholder = helptext;
        }
    }

    function preventNegativeNumberInput(question, index) {
        if (state.templateJson.placeholders[index].type === 'number') {
            question.querySelector('input').addEventListener('input', function() {
                this.value = Math.max(0, this.value);
            });
        }
    }

    function updateProgress() {
        const targetPercentage = ((currentQuestionIndex + 1) / state.templateJson.placeholders.length) * 100;
        let currentPercentage = parseInt(elements.progressPercentage.textContent, 10) || 0;
        const increment = targetPercentage > currentPercentage ? 1 : -1;

        function animateProgress() {
            if ((increment > 0 && currentPercentage < targetPercentage) ||
                (increment < 0 && currentPercentage > targetPercentage)) {
                currentPercentage += increment;
                elements.progress.style.width = `${currentPercentage}%`;
                elements.progressPercentage.textContent = `${currentPercentage}%`;
                requestAnimationFrame(animateProgress);
            } else {
                elements.progress.style.width = `${targetPercentage}%`;
                elements.progressPercentage.textContent = `${Math.round(targetPercentage)}%`;
            }
        }

        requestAnimationFrame(animateProgress);
    }

    elements.nextBtn.addEventListener('click', () => {
        trackEvent('second_part_next_clicked', {
            event_category: 'Navigation',
            event_label: `Second Part Question ${currentQuestionIndex + 1}`
        });

        const currentQuestion = state.templateJson.placeholders[currentQuestionIndex];
        const input = document.getElementById(currentQuestion.id);
        answers[currentQuestion.id] = currentQuestion.type === 'file' && input.files[0] ? input.files[0].name : input.value;

        if (currentQuestionIndex < state.templateJson.placeholders.length - 1) {
            showQuestion(++currentQuestionIndex);
        } else {
            generateDocument();
        }
    });

    elements.prevBtn.addEventListener('click', () => {
        trackEvent('second_part_prev_clicked', {
            event_category: 'Navigation',
            event_label: `Second Part Question ${currentQuestionIndex + 1}`
        });

        if (currentQuestionIndex > 0) {
            showQuestion(--currentQuestionIndex);
        }
    });

    async function generateDocument() {
        trackEvent('document_generated', {
            event_category: 'Form Completion',
            event_label: 'Document Generated'
        });

        console.log("Starting document generation...");

        prepareAnswers();

        try {
            const docxContent = await fetchDocxTemplate();
            const updatedContent = replaceplaceholders(docxContent);
            const docxBlob = generateDocxBlob(updatedContent);
            saveAs(docxBlob, "מכתב_התראה.docx");
            updateUIAfterGeneration();
        } catch (error) {
            console.error('שגיאה ביצירת המסמך:', error);
            alert('שגיאה ביצירת המסמך. אנא נסה שנית.');
        }
    }

    function prepareAnswers() {
        answers['לא-מסר-פרטי-קשר'] = state.didnotmentioncontact;
        answers['התעלם-מהודעת-הסרה'] = state.didtrytounsubscribe ? 'נוסף על האמור, יש לציין כי במהלך תקופת קבלת ההודעות, עשיתי מספר ניסיונות לבטל את השתייכותי לרשימת התפוצה, בלא הצלחה.' : '';
        answers['לא-הוסיף-אפשרות-הסרה'] = state.missingUnsubscribe ? 'נוסף על האמור, יש לציין כי ההודעה לא עמדה בדרישות סעיף 30א(ד)(1) לחוק, שכן לא נכללה אפשרות לשלוח הודעת הסרה באמצעות הודעה חוזרת.' : '';

        state.templateJson.placeholders.forEach(placeholder => {
            if (placeholder.type === 'checkbox') {
                answers[placeholder.id] = answers[placeholder.id] ? placeholder.value : '';
            } else if (placeholder.type === 'number') {
                answers[placeholder.id] *= 1000;
            }
        });

        answers['התאריך-של-היום'] = new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    async function fetchDocxTemplate() {
        const response = await fetch('hotels.docx');
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.arrayBuffer();
    }

    function replaceplaceholders(docxContent) {
        const zip = new PizZip(docxContent);
        let content = zip.files['word/document.xml'].asText();

        Object.entries(answers).forEach(([key, value]) => {
            const escapedPlaceholder = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(escapedPlaceholder, 'g');
            content = content.replace(regex, value);
        });

        zip.file('word/document.xml', content);
        return zip;
    }

    function generateDocxBlob(zip) {
        return zip.generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
    }

    function updateUIAfterGeneration() {
        const mainContent = document.getElementById('main');
        const headerContent = document.getElementById('logo');
        mainContent.innerHTML = `
            ${headerContent.innerHTML}
            <h2>המסמך נוצר בהצלחה!</h2>
            <button id="restart" onclick="location.reload()">התחל מחדש</button>
        `;
    }

    showQuestion(0);
}