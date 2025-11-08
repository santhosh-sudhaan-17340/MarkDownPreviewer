// Micro-Learning Task Suggestion Engine
class MicroLearningEngine {
    constructor() {
        this.taskTemplates = {
            science: [
                { title: 'Review key concept', description: 'Quick review of fundamental principles', duration: 5, type: 'review' },
                { title: 'Practice problem', description: 'Solve a quick problem to reinforce learning', duration: 10, type: 'practice' },
                { title: 'Watch explanation video', description: 'Short video on a specific topic', duration: 8, type: 'video' },
                { title: 'Create a diagram', description: 'Visual representation of a concept', duration: 15, type: 'creative' },
                { title: 'Flashcard quiz', description: 'Test your knowledge with quick questions', duration: 5, type: 'quiz' }
            ],
            math: [
                { title: 'Solve practice equations', description: 'Work through 5 quick problems', duration: 10, type: 'practice' },
                { title: 'Formula memorization', description: 'Review and memorize key formulas', duration: 5, type: 'review' },
                { title: 'Word problem practice', description: 'Tackle a real-world application', duration: 15, type: 'practice' },
                { title: 'Proof review', description: 'Understand a mathematical proof', duration: 12, type: 'theory' },
                { title: 'Mental math drill', description: 'Quick calculations to sharpen skills', duration: 5, type: 'drill' }
            ],
            language: [
                { title: 'Vocabulary practice', description: 'Learn 10 new words or phrases', duration: 10, type: 'vocabulary' },
                { title: 'Grammar exercise', description: 'Practice specific grammar rules', duration: 8, type: 'grammar' },
                { title: 'Reading comprehension', description: 'Read a short passage and answer questions', duration: 12, type: 'reading' },
                { title: 'Writing prompt', description: 'Quick writing exercise', duration: 15, type: 'writing' },
                { title: 'Listening practice', description: 'Listen to native speakers', duration: 10, type: 'listening' }
            ],
            humanities: [
                { title: 'Timeline review', description: 'Review historical events chronologically', duration: 8, type: 'review' },
                { title: 'Concept mapping', description: 'Create connections between ideas', duration: 12, type: 'creative' },
                { title: 'Source analysis', description: 'Examine a primary or secondary source', duration: 15, type: 'analysis' },
                { title: 'Quick reading', description: 'Read a short article or excerpt', duration: 10, type: 'reading' },
                { title: 'Discussion prep', description: 'Prepare thoughts on a topic', duration: 8, type: 'reflection' }
            ],
            technology: [
                { title: 'Code a small function', description: 'Practice coding with a mini-challenge', duration: 15, type: 'coding' },
                { title: 'Debug practice', description: 'Find and fix bugs in sample code', duration: 12, type: 'debugging' },
                { title: 'API documentation', description: 'Learn a new API method or library', duration: 10, type: 'reading' },
                { title: 'Algorithm review', description: 'Study a data structure or algorithm', duration: 8, type: 'theory' },
                { title: 'Quick project', description: 'Build something small and useful', duration: 20, type: 'project' }
            ],
            other: [
                { title: 'Review notes', description: 'Quick review of recent material', duration: 5, type: 'review' },
                { title: 'Practice questions', description: 'Answer practice questions', duration: 10, type: 'practice' },
                { title: 'Summary writing', description: 'Summarize what you learned', duration: 8, type: 'writing' },
                { title: 'Teach someone', description: 'Explain a concept to solidify understanding', duration: 10, type: 'teaching' },
                { title: 'Create study aid', description: 'Make flashcards or a cheat sheet', duration: 15, type: 'creative' }
            ]
        };

        this.completedTasks = [];
        this.init();
    }

    init() {
        this.loadCompletedTasks();
        this.initControls();
    }

    loadCompletedTasks() {
        const saved = localStorage.getItem('microLearningTasks');
        if (saved) {
            this.completedTasks = JSON.parse(saved);
        }
    }

    saveCompletedTasks() {
        localStorage.setItem('microLearningTasks', JSON.stringify(this.completedTasks));
    }

    initControls() {
        // Time selector buttons
        const timeBtns = document.querySelectorAll('.time-btn');
        timeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                timeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Generate tasks button
        const generateBtn = document.getElementById('generate-tasks-btn');
        generateBtn.addEventListener('click', () => {
            const activeTimeBtn = document.querySelector('.time-btn.active');
            const minutes = parseInt(activeTimeBtn.dataset.minutes);
            this.generateTasks(minutes);
        });
    }

    generateTasks(availableMinutes) {
        if (!window.studyApp || window.studyApp.data.subjects.length === 0) {
            this.showNoSubjectsMessage();
            return;
        }

        const tasks = this.suggestTasks(availableMinutes);
        this.renderTasks(tasks);
    }

    suggestTasks(availableMinutes) {
        const subjects = window.studyApp.data.subjects;
        const tasks = [];

        // Prioritize subjects with lower progress
        const sortedSubjects = [...subjects].sort((a, b) => a.progress - b.progress);

        let remainingTime = availableMinutes;
        let subjectIndex = 0;

        while (remainingTime >= 5 && subjectIndex < sortedSubjects.length) {
            const subject = sortedSubjects[subjectIndex];
            const category = subject.category.toLowerCase();

            // Get task templates for this category
            const templates = this.taskTemplates[category] || this.taskTemplates.other;

            // Filter tasks that fit in remaining time
            const suitableTasks = templates.filter(t => t.duration <= remainingTime);

            if (suitableTasks.length > 0) {
                // Pick a random suitable task
                const template = suitableTasks[Math.floor(Math.random() * suitableTasks.length)];

                // Create task instance
                const task = {
                    id: Date.now().toString() + Math.random(),
                    subjectId: subject.id,
                    subjectName: subject.name,
                    title: template.title,
                    description: template.description,
                    duration: template.duration,
                    type: template.type,
                    difficulty: this.calculateDifficulty(subject.progress),
                    createdAt: new Date().toISOString(),
                    completed: false
                };

                tasks.push(task);
                remainingTime -= template.duration;
            }

            subjectIndex++;

            // If we've gone through all subjects, start over
            if (subjectIndex >= sortedSubjects.length && remainingTime >= 5) {
                subjectIndex = 0;
            }
        }

        return tasks;
    }

    calculateDifficulty(progress) {
        if (progress < 30) return 'Beginner';
        if (progress < 70) return 'Intermediate';
        return 'Advanced';
    }

    renderTasks(tasks) {
        const container = document.getElementById('micro-tasks-container');

        if (tasks.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fas fa-lightbulb" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Not enough time or no subjects available. Try selecting more time or adding subjects!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = tasks.map(task => `
            <div class="micro-task-card" data-task-id="${task.id}">
                <div class="task-header">
                    <span class="task-badge">${task.subjectName}</span>
                    <span class="task-duration">
                        <i class="fas fa-clock"></i> ${task.duration} min
                    </span>
                </div>
                <h3 class="task-title">${task.title}</h3>
                <p class="task-description">${task.description}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                    <span style="font-size: 0.85rem; color: var(--text-secondary);">
                        ${this.getTypeIcon(task.type)} ${task.difficulty}
                    </span>
                </div>
                <div class="task-actions" style="margin-top: 1rem;">
                    <button class="btn-primary btn-small start-task-btn" data-task-id="${task.id}">
                        <i class="fas fa-play"></i> Start
                    </button>
                    <button class="btn-secondary btn-small skip-task-btn" data-task-id="${task.id}">
                        <i class="fas fa-forward"></i> Skip
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        this.addTaskEventListeners(tasks);
    }

    getTypeIcon(type) {
        const icons = {
            review: '<i class="fas fa-book-open"></i>',
            practice: '<i class="fas fa-pencil-alt"></i>',
            quiz: '<i class="fas fa-question-circle"></i>',
            video: '<i class="fas fa-video"></i>',
            creative: '<i class="fas fa-palette"></i>',
            coding: '<i class="fas fa-code"></i>',
            reading: '<i class="fas fa-book"></i>',
            writing: '<i class="fas fa-pen"></i>',
            theory: '<i class="fas fa-brain"></i>',
            drill: '<i class="fas fa-dumbbell"></i>',
            other: '<i class="fas fa-tasks"></i>'
        };

        return icons[type] || icons.other;
    }

    addTaskEventListeners(tasks) {
        // Start task buttons
        document.querySelectorAll('.start-task-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const taskId = btn.dataset.taskId;
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    this.startTask(task);
                }
            });
        });

        // Skip task buttons
        document.querySelectorAll('.skip-task-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const taskId = btn.dataset.taskId;
                const card = document.querySelector(`[data-task-id="${taskId}"]`);
                if (card) {
                    card.style.opacity = '0.5';
                    card.style.pointerEvents = 'none';
                }
            });
        });
    }

    startTask(task) {
        // Create a timer and track progress
        const card = document.querySelector(`[data-task-id="${task.id}"]`);
        if (!card) return;

        // Update UI
        const actionsDiv = card.querySelector('.task-actions');
        actionsDiv.innerHTML = `
            <div style="width: 100%; text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: var(--primary-color); margin-bottom: 0.5rem;" id="timer-${task.id}">
                    ${task.duration}:00
                </div>
                <button class="btn-primary btn-small" id="complete-${task.id}">
                    <i class="fas fa-check"></i> Complete
                </button>
            </div>
        `;

        // Start timer
        let timeLeft = task.duration * 60; // seconds
        const timerDisplay = document.getElementById(`timer-${task.id}`);

        const interval = setInterval(() => {
            timeLeft--;

            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            if (timeLeft <= 0) {
                clearInterval(interval);
                this.completeTask(task);
            }
        }, 1000);

        // Complete button
        document.getElementById(`complete-${task.id}`).addEventListener('click', () => {
            clearInterval(interval);
            this.completeTask(task);
        });

        // Start study session
        if (window.studyTracker) {
            task.sessionId = window.studyTracker.startSession(task.subjectId, 'micro-learning');
        }
    }

    completeTask(task) {
        task.completed = true;
        task.completedAt = new Date().toISOString();
        this.completedTasks.push(task);
        this.saveCompletedTasks();

        // End study session
        if (task.sessionId && window.studyTracker) {
            window.studyTracker.endSession(task.sessionId, 1, `Completed: ${task.title}`);
        }

        // Update UI
        const card = document.querySelector(`[data-task-id="${task.id}"]`);
        if (card) {
            card.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--success-color); margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--success-color);">Task Completed!</h3>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem;">Great job on ${task.title}</p>
                </div>
            `;
        }

        // Update app stats
        if (window.studyApp) {
            window.studyApp.data.stats.tasksCompleted++;
            window.studyApp.saveData();
            window.studyApp.updateDashboard();
        }
    }

    showNoSubjectsMessage() {
        const container = document.getElementById('micro-tasks-container');
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="fas fa-book" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>No subjects found. Please add subjects first to get personalized micro-learning tasks!</p>
            </div>
        `;
    }

    // Get statistics
    getStats() {
        const stats = {
            total: this.completedTasks.length,
            totalMinutes: this.completedTasks.reduce((sum, t) => sum + t.duration, 0),
            byType: {},
            bySubject: {},
            streak: 0
        };

        // Calculate by type
        this.completedTasks.forEach(task => {
            if (!stats.byType[task.type]) {
                stats.byType[task.type] = 0;
            }
            stats.byType[task.type]++;

            if (!stats.bySubject[task.subjectName]) {
                stats.bySubject[task.subjectName] = 0;
            }
            stats.bySubject[task.subjectName]++;
        });

        return stats;
    }
}

// Initialize engine
document.addEventListener('DOMContentLoaded', () => {
    window.microLearning = new MicroLearningEngine();
});
