// Spaced Repetition Algorithm - SM-2 inspired flashcard system
class SpacedRepetitionSystem {
    constructor() {
        this.currentCard = null;
        this.reviewQueue = [];
        this.isFlipped = false;
        this.reviewSession = null;
        this.init();
    }

    init() {
        this.initControls();
    }

    initControls() {
        const startReviewBtn = document.getElementById('start-review-btn');
        const flipCardBtn = document.getElementById('flip-card-btn');
        const flashcard = document.getElementById('flashcard');

        startReviewBtn.addEventListener('click', () => this.startReview());

        flipCardBtn.addEventListener('click', () => {
            this.flipCard();
        });

        // Click on card to flip
        flashcard.addEventListener('click', () => {
            if (this.currentCard) {
                this.flipCard();
            }
        });

        // Difficulty buttons
        document.querySelectorAll('.btn-diff').forEach(btn => {
            btn.addEventListener('click', () => {
                const difficulty = btn.dataset.difficulty;
                this.rateCard(difficulty);
            });
        });
    }

    startReview() {
        if (!window.studyApp || !window.studyApp.data.flashcards) {
            alert('No flashcards available. Please add some flashcards first!');
            return;
        }

        // Get cards due for review
        this.reviewQueue = window.studyApp.data.flashcards.filter(card =>
            new Date(card.nextReview) <= new Date()
        );

        if (this.reviewQueue.length === 0) {
            alert('No cards due for review! Great job staying on top of your studies!');
            return;
        }

        // Shuffle the queue
        this.reviewQueue = this.shuffleArray(this.reviewQueue);

        // Start session
        this.reviewSession = {
            startTime: new Date(),
            cardsReviewed: 0,
            ratings: { hard: 0, good: 0, easy: 0 }
        };

        // Show review container
        document.getElementById('review-container').style.display = 'block';
        document.getElementById('cards-list').style.display = 'none';

        // Show first card
        this.showNextCard();
    }

    showNextCard() {
        if (this.reviewQueue.length === 0) {
            this.endReview();
            return;
        }

        this.currentCard = this.reviewQueue[0];
        this.isFlipped = false;

        // Update UI
        const flashcard = document.getElementById('flashcard');
        flashcard.classList.remove('flipped');

        document.getElementById('card-question').textContent = this.currentCard.question;
        document.getElementById('card-answer').textContent = this.currentCard.answer;

        // Hide difficulty buttons until card is flipped
        document.getElementById('difficulty-buttons').style.display = 'none';
        document.getElementById('flip-card-btn').style.display = 'inline-flex';
    }

    flipCard() {
        const flashcard = document.getElementById('flashcard');
        flashcard.classList.toggle('flipped');
        this.isFlipped = !this.isFlipped;

        if (this.isFlipped) {
            // Show difficulty buttons
            document.getElementById('difficulty-buttons').style.display = 'flex';
            document.getElementById('flip-card-btn').style.display = 'none';
        }
    }

    rateCard(difficulty) {
        if (!this.currentCard) return;

        // Update card using SM-2 algorithm
        this.updateCardSchedule(this.currentCard, difficulty);

        // Update session stats
        this.reviewSession.cardsReviewed++;
        this.reviewSession.ratings[difficulty]++;

        // Update global stats
        if (window.studyApp) {
            window.studyApp.data.stats.cardsReviewed++;
            window.studyApp.saveData();
        }

        // Save updated card
        window.studyApp.saveData();

        // Remove from queue
        this.reviewQueue.shift();

        // Show next card
        this.showNextCard();
    }

    updateCardSchedule(card, difficulty) {
        // SM-2 Algorithm implementation
        let quality;

        switch (difficulty) {
            case 'hard':
                quality = 2; // Difficult
                break;
            case 'good':
                quality = 4; // Good
                break;
            case 'easy':
                quality = 5; // Easy
                break;
            default:
                quality = 3;
        }

        // Calculate new ease factor
        card.easeFactor = Math.max(1.3,
            card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        );

        // Calculate new interval
        if (quality < 3) {
            // Failed - reset interval
            card.interval = 1;
        } else {
            if (card.reviewCount === 0) {
                card.interval = 1;
            } else if (card.reviewCount === 1) {
                card.interval = 6;
            } else {
                card.interval = Math.round(card.interval * card.easeFactor);
            }
        }

        // Update review count
        card.reviewCount++;

        // Set next review date
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + card.interval);
        card.nextReview = nextReview.toISOString();

        // Update last reviewed
        card.lastReviewed = new Date().toISOString();
    }

    endReview() {
        const sessionDuration = (new Date() - this.reviewSession.startTime) / 1000 / 60; // minutes

        // Hide review container
        document.getElementById('review-container').style.display = 'none';
        document.getElementById('cards-list').style.display = 'grid';

        // Update dashboard
        if (window.studyApp) {
            window.studyApp.updateDashboard();
            window.studyApp.renderCardsList();
        }

        // Show summary
        const summary = `
            <div class="modal active">
                <div class="modal-content">
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    <h2>Review Session Complete!</h2>

                    <div style="text-align: center; margin: 2rem 0;">
                        <i class="fas fa-check-circle" style="font-size: 4rem; color: var(--success-color);"></i>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.5rem 0;">
                        <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: var(--primary-color);">
                                ${this.reviewSession.cardsReviewed}
                            </div>
                            <div style="color: var(--text-secondary); font-size: 0.9rem;">Cards Reviewed</div>
                        </div>

                        <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: var(--primary-color);">
                                ${Math.round(sessionDuration)}
                            </div>
                            <div style="color: var(--text-secondary); font-size: 0.9rem;">Minutes</div>
                        </div>
                    </div>

                    <div style="margin: 1.5rem 0;">
                        <h3 style="margin-bottom: 1rem;">Performance Breakdown</h3>
                        <div style="display: flex; gap: 1rem; justify-content: space-around;">
                            <div style="text-align: center;">
                                <div style="font-size: 1.5rem; color: var(--danger-color);">
                                    ${this.reviewSession.ratings.hard}
                                </div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary);">Hard</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 1.5rem; color: var(--warning-color);">
                                    ${this.reviewSession.ratings.good}
                                </div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary);">Good</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 1.5rem; color: var(--success-color);">
                                    ${this.reviewSession.ratings.easy}
                                </div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary);">Easy</div>
                            </div>
                        </div>
                    </div>

                    <button class="btn-primary" onclick="this.closest('.modal').remove()" style="width: 100%; margin-top: 1rem;">
                        <i class="fas fa-check"></i> Done
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', summary);

        // Reset session
        this.reviewSession = null;
        this.currentCard = null;
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Statistics and Analytics
    getStats() {
        if (!window.studyApp || !window.studyApp.data.flashcards) {
            return null;
        }

        const cards = window.studyApp.data.flashcards;

        const stats = {
            total: cards.length,
            due: cards.filter(c => new Date(c.nextReview) <= new Date()).length,
            learning: cards.filter(c => c.reviewCount < 3).length,
            mature: cards.filter(c => c.reviewCount >= 3).length,
            averageEaseFactor: 0,
            averageInterval: 0,
            bySubject: {}
        };

        // Calculate averages
        if (cards.length > 0) {
            stats.averageEaseFactor = cards.reduce((sum, c) => sum + c.easeFactor, 0) / cards.length;
            stats.averageInterval = cards.reduce((sum, c) => sum + c.interval, 0) / cards.length;
        }

        // Group by subject
        cards.forEach(card => {
            if (!stats.bySubject[card.subjectId]) {
                stats.bySubject[card.subjectId] = {
                    total: 0,
                    due: 0,
                    averageInterval: 0
                };
            }

            stats.bySubject[card.subjectId].total++;
            if (new Date(card.nextReview) <= new Date()) {
                stats.bySubject[card.subjectId].due++;
            }
        });

        return stats;
    }

    // Get upcoming reviews
    getUpcomingReviews(days = 7) {
        if (!window.studyApp || !window.studyApp.data.flashcards) {
            return [];
        }

        const upcoming = [];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = date.toDateString();

            const count = window.studyApp.data.flashcards.filter(card => {
                const reviewDate = new Date(card.nextReview);
                return reviewDate.toDateString() === dateStr;
            }).length;

            upcoming.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count: count
            });
        }

        return upcoming;
    }

    // Retention rate calculation
    getRetentionRate(days = 30) {
        if (!window.studyApp || !window.studyApp.data.flashcards) {
            return 0;
        }

        const cards = window.studyApp.data.flashcards.filter(c =>
            c.lastReviewed && new Date(c.lastReviewed) >= new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        );

        if (cards.length === 0) return 0;

        // Cards with ease factor > 2.5 are considered "retained"
        const retained = cards.filter(c => c.easeFactor >= 2.5).length;

        return Math.round((retained / cards.length) * 100);
    }

    // Get cards that need attention (low ease factor)
    getCardsNeedingAttention() {
        if (!window.studyApp || !window.studyApp.data.flashcards) {
            return [];
        }

        return window.studyApp.data.flashcards
            .filter(c => c.easeFactor < 2.0 && c.reviewCount > 2)
            .sort((a, b) => a.easeFactor - b.easeFactor)
            .slice(0, 10);
    }
}

// Initialize spaced repetition system
document.addEventListener('DOMContentLoaded', () => {
    window.spacedRepetition = new SpacedRepetitionSystem();
});
