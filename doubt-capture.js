// Doubt Capture - Camera-based doubt capture and AI-powered solutions
class DoubtCapture {
    constructor() {
        this.stream = null;
        this.doubts = [];
        this.videoElement = document.getElementById('camera-feed');
        this.canvasElement = document.getElementById('photo-canvas');
        this.init();
    }

    init() {
        this.loadDoubts();
        this.initControls();
        this.renderDoubts();
    }

    loadDoubts() {
        const saved = localStorage.getItem('capturedDoubts');
        if (saved) {
            this.doubts = JSON.parse(saved);
        }
    }

    saveDoubts() {
        localStorage.setItem('capturedDoubts', JSON.stringify(this.doubts));
    }

    initControls() {
        const startBtn = document.getElementById('start-camera-btn');
        const captureBtn = document.getElementById('capture-photo-btn');
        const stopBtn = document.getElementById('stop-camera-btn');

        startBtn.addEventListener('click', () => this.startCamera());
        captureBtn.addEventListener('click', () => this.capturePhoto());
        stopBtn.addEventListener('click', () => this.stopCamera());
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            this.videoElement.srcObject = this.stream;

            // Update UI
            document.getElementById('start-camera-btn').style.display = 'none';
            document.getElementById('capture-photo-btn').style.display = 'inline-flex';
            document.getElementById('stop-camera-btn').style.display = 'inline-flex';

        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Could not access camera. Please ensure you have granted camera permissions.');
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.videoElement.srcObject = null;
            this.stream = null;

            // Update UI
            document.getElementById('start-camera-btn').style.display = 'inline-flex';
            document.getElementById('capture-photo-btn').style.display = 'none';
            document.getElementById('stop-camera-btn').style.display = 'none';
        }
    }

    capturePhoto() {
        if (!this.stream) return;

        // Set canvas dimensions to match video
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;

        // Draw video frame to canvas
        const ctx = this.canvasElement.getContext('2d');
        ctx.drawImage(this.videoElement, 0, 0);

        // Get image data
        const imageData = this.canvasElement.toDataURL('image/jpeg', 0.8);

        // Create doubt object
        this.createDoubt(imageData);
    }

    createDoubt(imageData) {
        const doubt = {
            id: Date.now().toString(),
            image: imageData,
            status: 'pending', // pending, analyzing, solved
            createdAt: new Date().toISOString(),
            subject: null,
            extractedText: '',
            solution: '',
            aiAnalysis: ''
        };

        // Simulate AI analysis
        this.analyzeDoubt(doubt);

        this.doubts.unshift(doubt); // Add to beginning
        this.saveDoubts();
        this.renderDoubts();

        // Flash effect
        this.videoElement.style.filter = 'brightness(1.5)';
        setTimeout(() => {
            this.videoElement.style.filter = 'brightness(1)';
        }, 200);
    }

    async analyzeDoubt(doubt) {
        // Simulate AI analysis with delay
        doubt.status = 'analyzing';
        this.saveDoubts();
        this.renderDoubts();

        // Simulate OCR and AI processing
        setTimeout(() => {
            // Generate mock analysis based on common study topics
            const mockAnalysis = this.generateMockAnalysis();

            doubt.status = 'solved';
            doubt.extractedText = mockAnalysis.text;
            doubt.solution = mockAnalysis.solution;
            doubt.aiAnalysis = mockAnalysis.analysis;
            doubt.subject = mockAnalysis.subject;

            this.saveDoubts();
            this.renderDoubts();
        }, 2000);
    }

    generateMockAnalysis() {
        const analyses = [
            {
                text: 'Solve for x: 2x + 5 = 13',
                subject: 'Mathematics',
                solution: `Step 1: Subtract 5 from both sides
2x + 5 - 5 = 13 - 5
2x = 8

Step 2: Divide both sides by 2
2x ÷ 2 = 8 ÷ 2
x = 4

Answer: x = 4`,
                analysis: 'This is a basic linear equation. The key is to isolate the variable by performing inverse operations.'
            },
            {
                text: 'What is photosynthesis?',
                subject: 'Biology',
                solution: `Photosynthesis is the process by which plants convert light energy into chemical energy.

Key Points:
• Takes place in chloroplasts
• Requires: light, water, and CO2
• Produces: glucose and oxygen
• Chemical equation: 6CO2 + 6H2O + light → C6H12O6 + 6O2`,
                analysis: 'This is a fundamental biological process. Understanding the inputs, outputs, and location is crucial.'
            },
            {
                text: 'Explain Newton\'s First Law',
                subject: 'Physics',
                solution: `Newton's First Law (Law of Inertia):
An object at rest stays at rest, and an object in motion stays in motion with the same speed and direction, unless acted upon by an unbalanced force.

Key Concepts:
• Inertia: resistance to change in motion
• Objects naturally maintain their state
• Force is needed to change velocity
• Applies to both stationary and moving objects`,
                analysis: 'This law explains why objects resist changes in their motion. Think of a ball rolling on a smooth surface.'
            },
            {
                text: 'Define mitochondria',
                subject: 'Biology',
                solution: `Mitochondria: "Powerhouse of the Cell"

Structure:
• Double membrane organelle
• Inner membrane has cristae (folds)
• Contains its own DNA

Function:
• Cellular respiration
• Produces ATP (energy)
• Converts glucose to usable energy

Mnemonic: Mighty Mitochondria Makes ATP`,
                analysis: 'Mitochondria are essential for energy production in cells. Their unique structure enables efficient ATP synthesis.'
            },
            {
                text: 'What causes seasons?',
                subject: 'Earth Science',
                solution: `Seasons are caused by Earth's axial tilt (23.5°)

How it works:
1. Earth orbits the sun annually
2. Earth's axis is tilted
3. Different hemispheres receive varying sunlight
4. When Northern Hemisphere tilts toward sun = Summer
5. When tilted away = Winter

Note: Not caused by distance from sun!`,
                analysis: 'Common misconception: seasons are NOT due to Earth\'s distance from the sun, but due to axial tilt.'
            }
        ];

        return analyses[Math.floor(Math.random() * analyses.length)];
    }

    renderDoubts() {
        const container = document.getElementById('doubts-list');

        if (this.doubts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-camera" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>No doubts captured yet. Start the camera and capture your questions!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.doubts.map(doubt => this.renderDoubtCard(doubt)).join('');

        // Add click handlers for expanding doubts
        document.querySelectorAll('.doubt-item').forEach(item => {
            item.addEventListener('click', () => {
                const doubtId = item.dataset.doubtId;
                this.showDoubtDetails(doubtId);
            });
        });
    }

    renderDoubtCard(doubt) {
        const statusColors = {
            pending: 'var(--warning-color)',
            analyzing: 'var(--primary-color)',
            solved: 'var(--success-color)'
        };

        const statusText = {
            pending: 'Pending',
            analyzing: 'Analyzing...',
            solved: 'Solved'
        };

        return `
            <div class="doubt-item" data-doubt-id="${doubt.id}" style="cursor: pointer;">
                <img src="${doubt.image}" alt="Captured doubt" class="doubt-image">
                <div class="doubt-info">
                    <span class="doubt-status" style="background: ${statusColors[doubt.status]}">
                        ${statusText[doubt.status]}
                    </span>
                    <span style="color: var(--text-secondary); font-size: 0.85rem;">
                        ${new Date(doubt.createdAt).toLocaleString()}
                    </span>
                </div>
                ${doubt.extractedText ? `
                    <p class="doubt-text" style="font-size: 0.9rem; margin-top: 0.5rem;">
                        ${doubt.extractedText.substring(0, 50)}...
                    </p>
                ` : ''}
                ${doubt.subject ? `
                    <span style="display: inline-block; margin-top: 0.5rem; padding: 0.25rem 0.75rem; background: var(--primary-color); border-radius: 20px; font-size: 0.75rem;">
                        ${doubt.subject}
                    </span>
                ` : ''}
            </div>
        `;
    }

    showDoubtDetails(doubtId) {
        const doubt = this.doubts.find(d => d.id === doubtId);
        if (!doubt) return;

        // Create modal to show details
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                <h2>Doubt Details</h2>

                <div style="margin: 1.5rem 0;">
                    <img src="${doubt.image}" alt="Captured doubt" style="width: 100%; border-radius: 8px; margin-bottom: 1rem;">

                    ${doubt.status === 'analyzing' ? `
                        <div style="text-align: center; padding: 2rem; color: var(--primary-color);">
                            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <p>AI is analyzing your doubt...</p>
                        </div>
                    ` : ''}

                    ${doubt.status === 'solved' ? `
                        <div class="form-group">
                            <label style="font-weight: 600; color: var(--text-primary);">Subject</label>
                            <p style="color: var(--text-secondary);">${doubt.subject}</p>
                        </div>

                        <div class="form-group">
                            <label style="font-weight: 600; color: var(--text-primary);">Extracted Question</label>
                            <p style="color: var(--text-secondary);">${doubt.extractedText}</p>
                        </div>

                        <div class="form-group">
                            <label style="font-weight: 600; color: var(--text-primary);">AI Analysis</label>
                            <p style="color: var(--text-secondary);">${doubt.aiAnalysis}</p>
                        </div>

                        <div class="form-group">
                            <label style="font-weight: 600; color: var(--text-primary);">Solution</label>
                            <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; white-space: pre-wrap; font-family: monospace; color: var(--text-primary);">${doubt.solution}</div>
                        </div>

                        <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                            <button class="btn-primary" onclick="this.closest('.modal').remove()">
                                <i class="fas fa-check"></i> Got It
                            </button>
                            <button class="btn-secondary" onclick="window.doubtCapture.createFlashcardFromDoubt('${doubt.id}'); this.closest('.modal').remove();">
                                <i class="fas fa-layer-group"></i> Create Flashcard
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    createFlashcardFromDoubt(doubtId) {
        const doubt = this.doubts.find(d => d.id === doubtId);
        if (!doubt || doubt.status !== 'solved') return;

        // Find or create subject
        let subject = window.studyApp?.data.subjects.find(s => s.name === doubt.subject);
        if (!subject && window.studyApp) {
            // Create subject if it doesn't exist
            subject = {
                id: Date.now().toString(),
                name: doubt.subject,
                category: 'other',
                targetHours: 5,
                progress: 0,
                hoursStudied: 0,
                tasksCompleted: 0,
                createdAt: new Date().toISOString()
            };
            window.studyApp.data.subjects.push(subject);
            window.studyApp.saveData();
        }

        if (!subject) return;

        // Create flashcard
        const card = {
            id: Date.now().toString(),
            subjectId: subject.id,
            question: doubt.extractedText,
            answer: doubt.solution,
            nextReview: new Date().toISOString(),
            interval: 1,
            easeFactor: 2.5,
            reviewCount: 0,
            createdAt: new Date().toISOString()
        };

        if (!window.studyApp.data.flashcards) {
            window.studyApp.data.flashcards = [];
        }

        window.studyApp.data.flashcards.push(card);
        window.studyApp.saveData();

        alert('Flashcard created successfully!');
    }

    // Get statistics
    getStats() {
        return {
            total: this.doubts.length,
            pending: this.doubts.filter(d => d.status === 'pending').length,
            analyzing: this.doubts.filter(d => d.status === 'analyzing').length,
            solved: this.doubts.filter(d => d.status === 'solved').length,
            bySubject: this.getDoubtsBySubject()
        };
    }

    getDoubtsBySubject() {
        const bySubject = {};
        this.doubts.forEach(doubt => {
            if (doubt.subject) {
                if (!bySubject[doubt.subject]) {
                    bySubject[doubt.subject] = 0;
                }
                bySubject[doubt.subject]++;
            }
        });
        return bySubject;
    }
}

// Initialize doubt capture
document.addEventListener('DOMContentLoaded', () => {
    window.doubtCapture = new DoubtCapture();
});
