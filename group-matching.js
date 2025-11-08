// Study Group Matchmaking System
class StudyGroupMatcher {
    constructor() {
        this.userProfile = {
            studyTime: 'morning',
            studyStyle: 'collaborative',
            subjects: []
        };
        this.mockStudents = [];
        this.init();
    }

    init() {
        this.loadProfile();
        this.generateMockStudents();
        this.initControls();
    }

    loadProfile() {
        const saved = localStorage.getItem('studyProfile');
        if (saved) {
            this.userProfile = JSON.parse(saved);
            this.populateProfile();
        }
    }

    saveProfile() {
        localStorage.setItem('studyProfile', JSON.stringify(this.userProfile));
    }

    populateProfile() {
        document.getElementById('study-time-pref').value = this.userProfile.studyTime;
        document.getElementById('study-style-pref').value = this.userProfile.studyStyle;
    }

    initControls() {
        const updateProfileBtn = document.getElementById('update-profile-btn');
        const findMatchesBtn = document.getElementById('find-matches-btn');

        updateProfileBtn.addEventListener('click', () => this.updateProfile());
        findMatchesBtn.addEventListener('click', () => this.findMatches());
    }

    updateProfile() {
        this.userProfile.studyTime = document.getElementById('study-time-pref').value;
        this.userProfile.studyStyle = document.getElementById('study-style-pref').value;

        // Get subjects from main app
        if (window.studyApp && window.studyApp.data.subjects) {
            this.userProfile.subjects = window.studyApp.data.subjects.map(s => s.name);
        }

        this.saveProfile();
        alert('Profile updated successfully!');
    }

    generateMockStudents() {
        const firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Skylar', 'Dakota', 'Rowan', 'Parker', 'Charlie', 'Finley'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];

        const studyTimes = ['morning', 'afternoon', 'evening', 'night'];
        const studyStyles = ['collaborative', 'competitive', 'teaching', 'quiet'];

        const allSubjects = [
            'Mathematics', 'Physics', 'Chemistry', 'Biology',
            'Computer Science', 'English Literature', 'History',
            'Psychology', 'Economics', 'Philosophy', 'Art',
            'Music Theory', 'Statistics', 'Calculus', 'Algebra'
        ];

        this.mockStudents = [];

        for (let i = 0; i < 30; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

            // Randomly select 2-5 subjects
            const numSubjects = 2 + Math.floor(Math.random() * 4);
            const subjects = [];
            const shuffledSubjects = [...allSubjects].sort(() => Math.random() - 0.5);
            for (let j = 0; j < numSubjects; j++) {
                subjects.push(shuffledSubjects[j]);
            }

            const student = {
                id: `student-${i}`,
                name: `${firstName} ${lastName}`,
                avatar: firstName.charAt(0) + lastName.charAt(0),
                studyTime: studyTimes[Math.floor(Math.random() * studyTimes.length)],
                studyStyle: studyStyles[Math.floor(Math.random() * studyStyles.length)],
                subjects: subjects,
                studyHours: 5 + Math.floor(Math.random() * 20),
                streak: Math.floor(Math.random() * 30),
                rating: 3 + Math.random() * 2, // 3-5
                bio: this.generateBio(subjects[0])
            };

            this.mockStudents.push(student);
        }
    }

    generateBio(primarySubject) {
        const bios = [
            `Passionate about ${primarySubject}. Looking for serious study partners!`,
            `${primarySubject} enthusiast. Let's learn together and ace our exams!`,
            `Studying ${primarySubject} and loving it. Happy to help and learn from others.`,
            `Working hard on ${primarySubject}. Would love to form a consistent study group.`,
            `${primarySubject} student seeking motivated study buddies.`
        ];

        return bios[Math.floor(Math.random() * bios.length)];
    }

    findMatches() {
        // Update profile first
        this.updateProfile();

        if (!this.userProfile.subjects || this.userProfile.subjects.length === 0) {
            alert('Please add some subjects first to find matches!');
            return;
        }

        // Calculate compatibility scores
        const matches = this.mockStudents.map(student => {
            const compatibility = this.calculateCompatibility(student);
            return { ...student, compatibility };
        });

        // Sort by compatibility
        matches.sort((a, b) => b.compatibility - a.compatibility);

        // Take top 9 matches
        const topMatches = matches.slice(0, 9);

        this.renderMatches(topMatches);
    }

    calculateCompatibility(student) {
        let score = 0;

        // Study time match (0-30 points)
        if (student.studyTime === this.userProfile.studyTime) {
            score += 30;
        } else {
            // Adjacent time slots get partial credit
            const timeSlots = ['morning', 'afternoon', 'evening', 'night'];
            const userIndex = timeSlots.indexOf(this.userProfile.studyTime);
            const studentIndex = timeSlots.indexOf(student.studyTime);
            const distance = Math.abs(userIndex - studentIndex);

            if (distance === 1) score += 15;
            else if (distance === 2) score += 5;
        }

        // Study style match (0-20 points)
        if (student.studyStyle === this.userProfile.studyStyle) {
            score += 20;
        }

        // Subject overlap (0-40 points)
        const commonSubjects = student.subjects.filter(s =>
            this.userProfile.subjects.includes(s)
        );
        const subjectScore = (commonSubjects.length / Math.max(student.subjects.length, this.userProfile.subjects.length)) * 40;
        score += subjectScore;

        // Activity level bonus (0-10 points)
        if (student.streak >= 7) score += 5;
        if (student.studyHours >= 10) score += 5;

        return Math.round(score);
    }

    renderMatches(matches) {
        const container = document.getElementById('study-matches');

        if (matches.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>No matches found. Try adding more subjects or updating your preferences!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = matches.map(match => this.renderMatchCard(match)).join('');

        // Add click handlers
        document.querySelectorAll('.connect-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const studentId = btn.dataset.studentId;
                this.connectWithStudent(studentId);
            });
        });

        document.querySelectorAll('.match-card').forEach(card => {
            card.addEventListener('click', () => {
                const studentId = card.dataset.studentId;
                this.showStudentProfile(studentId);
            });
        });
    }

    renderMatchCard(match) {
        const commonSubjects = match.subjects.filter(s =>
            this.userProfile.subjects.includes(s)
        );

        const compatibilityColor = match.compatibility >= 70 ? 'var(--success-color)' :
                                   match.compatibility >= 50 ? 'var(--warning-color)' :
                                   'var(--text-secondary)';

        return `
            <div class="match-card" data-student-id="${match.id}">
                <div class="match-header">
                    <div class="match-avatar">${match.avatar}</div>
                    <div class="match-info">
                        <h4>${match.name}</h4>
                        <div class="match-compatibility" style="color: ${compatibilityColor};">
                            ${match.compatibility}% Match
                        </div>
                    </div>
                </div>

                <div class="match-details">
                    <div class="detail-row">
                        <span class="detail-label">Study Time</span>
                        <span class="detail-value">${this.formatStudyTime(match.studyTime)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Style</span>
                        <span class="detail-value">${this.formatStudyStyle(match.studyStyle)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Streak</span>
                        <span class="detail-value">
                            <i class="fas fa-fire" style="color: var(--warning-color);"></i> ${match.streak} days
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Weekly Hours</span>
                        <span class="detail-value">${match.studyHours}h</span>
                    </div>
                </div>

                ${commonSubjects.length > 0 ? `
                    <div style="margin-top: 1rem;">
                        <span style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 0.5rem;">
                            Common Subjects
                        </span>
                        <div class="common-subjects">
                            ${commonSubjects.map(s => `<span class="subject-tag">${s}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                <button class="btn-primary connect-btn" data-student-id="${match.id}" style="width: 100%; margin-top: 1rem;">
                    <i class="fas fa-user-plus"></i> Connect
                </button>
            </div>
        `;
    }

    formatStudyTime(time) {
        const formats = {
            morning: 'Morning (6-12 PM)',
            afternoon: 'Afternoon (12-6 PM)',
            evening: 'Evening (6-10 PM)',
            night: 'Night (10 PM-2 AM)'
        };
        return formats[time] || time;
    }

    formatStudyStyle(style) {
        const formats = {
            collaborative: 'Collaborative',
            competitive: 'Competitive',
            teaching: 'Teaching-focused',
            quiet: 'Quiet Co-working'
        };
        return formats[style] || style;
    }

    showStudentProfile(studentId) {
        const student = this.mockStudents.find(s => s.id === studentId);
        if (!student) return;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                <h2>Study Partner Profile</h2>

                <div style="text-align: center; margin: 2rem 0;">
                    <div class="match-avatar" style="width: 100px; height: 100px; font-size: 3rem; margin: 0 auto;">
                        ${student.avatar}
                    </div>
                    <h3 style="margin-top: 1rem;">${student.name}</h3>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem;">${student.bio}</p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.5rem 0;">
                    <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--warning-color);">
                            <i class="fas fa-fire"></i> ${student.streak}
                        </div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Day Streak</div>
                    </div>

                    <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary-color);">
                            ${student.studyHours}h
                        </div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Weekly Hours</div>
                    </div>
                </div>

                <div style="margin: 1.5rem 0;">
                    <h3 style="margin-bottom: 1rem;">Details</h3>
                    <div class="detail-row">
                        <span class="detail-label">Preferred Study Time</span>
                        <span class="detail-value">${this.formatStudyTime(student.studyTime)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Study Style</span>
                        <span class="detail-value">${this.formatStudyStyle(student.studyStyle)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Rating</span>
                        <span class="detail-value">
                            ${this.renderStars(student.rating)} (${student.rating.toFixed(1)})
                        </span>
                    </div>
                </div>

                <div style="margin: 1.5rem 0;">
                    <h3 style="margin-bottom: 1rem;">Studying</h3>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${student.subjects.map(s => `<span class="subject-tag">${s}</span>`).join('')}
                    </div>
                </div>

                <button class="btn-primary" data-student-id="${student.id}" onclick="window.groupMatcher.connectWithStudent('${student.id}'); this.closest('.modal').remove();" style="width: 100%; margin-top: 1rem;">
                    <i class="fas fa-user-plus"></i> Connect with ${student.name.split(' ')[0]}
                </button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        let stars = '';

        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star" style="color: var(--warning-color);"></i>';
        }

        if (halfStar) {
            stars += '<i class="fas fa-star-half-alt" style="color: var(--warning-color);"></i>';
        }

        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star" style="color: var(--text-secondary);"></i>';
        }

        return stars;
    }

    connectWithStudent(studentId) {
        const student = this.mockStudents.find(s => s.id === studentId);
        if (!student) return;

        // Save connection
        let connections = JSON.parse(localStorage.getItem('studyConnections') || '[]');

        if (connections.find(c => c.id === studentId)) {
            alert(`You're already connected with ${student.name}!`);
            return;
        }

        connections.push({
            id: student.id,
            name: student.name,
            avatar: student.avatar,
            connectedAt: new Date().toISOString()
        });

        localStorage.setItem('studyConnections', JSON.stringify(connections));

        // Show success message
        const successModal = document.createElement('div');
        successModal.className = 'modal active';
        successModal.innerHTML = `
            <div class="modal-content" style="text-align: center;">
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                <div style="margin: 2rem 0;">
                    <i class="fas fa-check-circle" style="font-size: 4rem; color: var(--success-color);"></i>
                </div>
                <h2>Connected!</h2>
                <p style="color: var(--text-secondary); margin: 1rem 0;">
                    You're now connected with ${student.name}. They will be notified and you can start studying together!
                </p>
                <button class="btn-primary" onclick="this.closest('.modal').remove()" style="margin-top: 1rem;">
                    <i class="fas fa-check"></i> Got it
                </button>
            </div>
        `;

        document.body.appendChild(successModal);
    }

    // Get statistics
    getConnections() {
        return JSON.parse(localStorage.getItem('studyConnections') || '[]');
    }

    getStats() {
        const connections = this.getConnections();
        const stats = {
            totalConnections: connections.length,
            activeConnections: connections.filter(c => {
                const connectedDate = new Date(c.connectedAt);
                const daysSince = (new Date() - connectedDate) / (1000 * 60 * 60 * 24);
                return daysSince <= 30;
            }).length
        };

        return stats;
    }
}

// Initialize group matcher
document.addEventListener('DOMContentLoaded', () => {
    window.groupMatcher = new StudyGroupMatcher();
});
