// AI Study Partner - Main Application Logic
class StudyPartnerApp {
    constructor() {
        this.data = {
            subjects: [],
            stats: {
                streak: 0,
                studyTime: 0,
                tasksCompleted: 0,
                cardsReviewed: 0
            },
            lastStudyDate: null
        };

        this.init();
    }

    init() {
        this.loadData();
        this.initNavigation();
        this.initModals();
        this.updateDashboard();
        this.checkStreak();
    }

    // Data Management
    loadData() {
        const savedData = localStorage.getItem('studyPartnerData');
        if (savedData) {
            this.data = JSON.parse(savedData);
        }
    }

    saveData() {
        localStorage.setItem('studyPartnerData', JSON.stringify(this.data));
    }

    // Navigation
    initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.navigateTo(section);

                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    navigateTo(sectionId) {
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => section.classList.remove('active'));

        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');

            // Refresh section content
            switch(sectionId) {
                case 'dashboard':
                    this.updateDashboard();
                    break;
                case 'subjects':
                    this.renderSubjects();
                    break;
                case 'flashcards':
                    this.renderCardsList();
                    break;
                case 'study-groups':
                    this.renderStudyGroups();
                    break;
            }
        }
    }

    // Modal Management
    initModals() {
        // Add Subject Modal
        const addSubjectBtn = document.getElementById('add-subject-btn');
        const addSubjectModal = document.getElementById('add-subject-modal');
        const subjectForm = document.getElementById('subject-form');

        addSubjectBtn.addEventListener('click', () => {
            addSubjectModal.classList.add('active');
        });

        subjectForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSubject();
            addSubjectModal.classList.remove('active');
            subjectForm.reset();
        });

        // Add Card Modal
        const addCardBtn = document.getElementById('add-card-btn');
        const addCardModal = document.getElementById('add-card-modal');
        const cardForm = document.getElementById('card-form');

        addCardBtn.addEventListener('click', () => {
            this.populateCardSubjects();
            addCardModal.classList.add('active');
        });

        cardForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addFlashcard();
            addCardModal.classList.remove('active');
            cardForm.reset();
        });

        // Close modals
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                closeBtn.closest('.modal').classList.remove('active');
            });
        });

        // Close on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
    }

    // Subject Management
    addSubject() {
        const name = document.getElementById('subject-name').value;
        const category = document.getElementById('subject-category').value;
        const hours = parseInt(document.getElementById('subject-hours').value);

        const subject = {
            id: Date.now().toString(),
            name,
            category,
            targetHours: hours,
            progress: 0,
            hoursStudied: 0,
            tasksCompleted: 0,
            createdAt: new Date().toISOString()
        };

        this.data.subjects.push(subject);
        this.saveData();
        this.renderSubjects();
        this.updateDashboard();
    }

    renderSubjects() {
        const grid = document.getElementById('subjects-grid');

        if (this.data.subjects.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fas fa-book" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>No subjects yet. Add your first subject to get started!</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.data.subjects.map(subject => `
            <div class="subject-card" data-subject-id="${subject.id}">
                <div class="subject-header">
                    <h3>${subject.name}</h3>
                    <span class="subject-category">${subject.category}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${subject.progress}%"></div>
                </div>
                <div class="subject-stats">
                    <div class="subject-stat">
                        <div class="subject-stat-value">${subject.hoursStudied}h</div>
                        <div class="subject-stat-label">Studied</div>
                    </div>
                    <div class="subject-stat">
                        <div class="subject-stat-value">${subject.targetHours}h</div>
                        <div class="subject-stat-label">Target</div>
                    </div>
                    <div class="subject-stat">
                        <div class="subject-stat-value">${subject.tasksCompleted}</div>
                        <div class="subject-stat-label">Tasks</div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        document.querySelectorAll('.subject-card').forEach(card => {
            card.addEventListener('click', () => {
                const subjectId = card.dataset.subjectId;
                this.showSubjectDetails(subjectId);
            });
        });
    }

    showSubjectDetails(subjectId) {
        const subject = this.data.subjects.find(s => s.id === subjectId);
        if (subject) {
            // Simulate study time increase
            subject.hoursStudied += 0.5;
            subject.progress = Math.min((subject.hoursStudied / subject.targetHours) * 100, 100);
            this.saveData();
            this.renderSubjects();
            this.updateDashboard();
        }
    }

    // Dashboard
    updateDashboard() {
        // Update stats
        document.getElementById('streak-count').textContent = this.data.stats.streak;
        document.getElementById('study-time').textContent = `${this.data.stats.studyTime}h`;
        document.getElementById('tasks-completed').textContent = this.data.stats.tasksCompleted;
        document.getElementById('cards-reviewed').textContent = this.data.stats.cardsReviewed;

        // Update today's tasks
        this.renderTodayTasks();

        // Update subject progress
        this.renderSubjectProgress();
    }

    renderTodayTasks() {
        const container = document.getElementById('today-tasks');

        const tasks = [
            { title: 'Review Math flashcards', time: '10 min', subject: 'Mathematics' },
            { title: 'Complete Physics problem set', time: '20 min', subject: 'Physics' },
            { title: 'Read Chapter 5', time: '15 min', subject: 'Biology' }
        ];

        if (tasks.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">No tasks for today. Great job!</p>';
            return;
        }

        container.innerHTML = tasks.map(task => `
            <div class="task-item">
                <div class="task-info">
                    <h4>${task.title}</h4>
                    <p>${task.subject}</p>
                </div>
                <div class="task-time">
                    <i class="fas fa-clock"></i> ${task.time}
                </div>
            </div>
        `).join('');
    }

    renderSubjectProgress() {
        const container = document.getElementById('subject-progress');

        if (this.data.subjects.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">Add subjects to track progress</p>';
            return;
        }

        container.innerHTML = this.data.subjects.slice(0, 5).map(subject => `
            <div class="progress-item">
                <div class="progress-header">
                    <h4>${subject.name}</h4>
                    <span class="progress-percent">${Math.round(subject.progress)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${subject.progress}%"></div>
                </div>
            </div>
        `).join('');
    }

    // Streak Management
    checkStreak() {
        const today = new Date().toDateString();
        const lastStudy = this.data.lastStudyDate ? new Date(this.data.lastStudyDate).toDateString() : null;

        if (lastStudy !== today) {
            if (lastStudy === new Date(Date.now() - 86400000).toDateString()) {
                // Yesterday - continue streak
                this.data.stats.streak++;
            } else if (lastStudy !== null) {
                // Missed a day - reset streak
                this.data.stats.streak = 1;
            } else {
                // First time
                this.data.stats.streak = 1;
            }

            this.data.lastStudyDate = new Date().toISOString();
            this.saveData();
        }
    }

    // Flashcard Management
    populateCardSubjects() {
        const select = document.getElementById('card-subject');
        select.innerHTML = '<option value="">Select a subject</option>' +
            this.data.subjects.map(subject =>
                `<option value="${subject.id}">${subject.name}</option>`
            ).join('');
    }

    addFlashcard() {
        const subjectId = document.getElementById('card-subject').value;
        const question = document.getElementById('card-question-input').value;
        const answer = document.getElementById('card-answer-input').value;

        if (!subjectId || !question || !answer) return;

        const card = {
            id: Date.now().toString(),
            subjectId,
            question,
            answer,
            nextReview: new Date().toISOString(),
            interval: 1,
            easeFactor: 2.5,
            reviewCount: 0,
            createdAt: new Date().toISOString()
        };

        if (!this.data.flashcards) {
            this.data.flashcards = [];
        }

        this.data.flashcards.push(card);
        this.saveData();
        this.renderCardsList();
    }

    renderCardsList() {
        const container = document.getElementById('cards-list');

        if (!this.data.flashcards || this.data.flashcards.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No flashcards yet. Add your first card!</p>';
            return;
        }

        container.innerHTML = this.data.flashcards.map(card => {
            const subject = this.data.subjects.find(s => s.id === card.subjectId);
            const dueDate = new Date(card.nextReview);
            const isDue = dueDate <= new Date();

            return `
                <div class="card-item">
                    <div class="card-item-header">
                        <span class="card-subject-tag">${subject ? subject.name : 'Unknown'}</span>
                        <span class="card-due" style="color: ${isDue ? 'var(--warning-color)' : 'var(--text-secondary)'}">
                            ${isDue ? 'Due now' : 'Due ' + dueDate.toLocaleDateString()}
                        </span>
                    </div>
                    <div class="card-question-preview">${card.question}</div>
                </div>
            `;
        }).join('');

        this.updateCardsDue();
    }

    updateCardsDue() {
        if (!this.data.flashcards) {
            document.getElementById('cards-due-count').textContent = '0 cards due';
            return;
        }

        const dueCards = this.data.flashcards.filter(card =>
            new Date(card.nextReview) <= new Date()
        ).length;

        document.getElementById('cards-due-count').textContent = `${dueCards} card${dueCards !== 1 ? 's' : ''} due`;
    }

    renderStudyGroups() {
        // This will be handled by group-matching.js
    }

    completeTask(taskId) {
        this.data.stats.tasksCompleted++;
        this.data.stats.studyTime += 0.5;
        this.saveData();
        this.updateDashboard();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.studyApp = new StudyPartnerApp();
});
