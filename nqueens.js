/**
 * N-Queens Problem Solver with Step-by-Step Visualization
 * Uses backtracking algorithm to find a solution
 */

class NQueensSolver {
    constructor() {
        this.boardSize = 8;
        this.board = [];
        this.steps = [];
        this.currentStep = 0;
        this.isPlaying = false;
        this.playInterval = null;
        this.speed = 500;
        this.backtrackCount = 0;

        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        // Buttons
        this.startBtn = document.getElementById('start-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.playBtn = document.getElementById('play-btn');
        this.pauseBtn = document.getElementById('pause-btn');

        // Inputs
        this.boardSizeInput = document.getElementById('board-size');
        this.speedSlider = document.getElementById('speed-slider');

        // Display elements
        this.chessboard = document.getElementById('chessboard');
        this.currentStepDisplay = document.getElementById('current-step');
        this.totalStepsDisplay = document.getElementById('total-steps');
        this.queensCountDisplay = document.getElementById('queens-count');
        this.backtrackCountDisplay = document.getElementById('backtrack-count');
        this.statusDisplay = document.getElementById('status');
        this.speedValue = document.getElementById('speed-value');
        this.stepExplanation = document.getElementById('step-explanation');
    }

    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.startSolving());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.prevBtn.addEventListener('click', () => this.previousStep());
        this.nextBtn.addEventListener('click', () => this.nextStep());
        this.playBtn.addEventListener('click', () => this.autoPlay());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.speedSlider.addEventListener('input', (e) => this.updateSpeed(e.target.value));
    }

    /**
     * Initialize the board with empty cells
     */
    initializeBoard(size) {
        this.boardSize = size;
        this.board = Array(size).fill(null).map(() => Array(size).fill(0));
        this.renderBoard();
    }

    /**
     * Render the chessboard UI
     */
    renderBoard() {
        this.chessboard.innerHTML = '';
        this.chessboard.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;

        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = document.createElement('div');
                cell.className = `cell ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                cell.dataset.row = row;
                cell.dataset.col = col;
                this.chessboard.appendChild(cell);
            }
        }
    }

    /**
     * Check if placing a queen at (row, col) is safe
     */
    isSafe(board, row, col) {
        // Check column
        for (let i = 0; i < row; i++) {
            if (board[i][col] === 1) return false;
        }

        // Check upper left diagonal
        for (let i = row, j = col; i >= 0 && j >= 0; i--, j--) {
            if (board[i][j] === 1) return false;
        }

        // Check upper right diagonal
        for (let i = row, j = col; i >= 0 && j < this.boardSize; i--, j++) {
            if (board[i][j] === 1) return false;
        }

        return true;
    }

    /**
     * Get all cells under attack from placed queens
     */
    getAttackedCells(board, currentRow) {
        const attacked = new Set();

        for (let row = 0; row < currentRow; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === 1) {
                    // Add all cells in the same column
                    for (let r = currentRow; r < this.boardSize; r++) {
                        attacked.add(`${r},${col}`);
                    }

                    // Add diagonal cells
                    let r = row, c = col;
                    while (r < this.boardSize && c >= 0) {
                        if (r >= currentRow) attacked.add(`${r},${c}`);
                        r++;
                        c--;
                    }

                    r = row;
                    c = col;
                    while (r < this.boardSize && c < this.boardSize) {
                        if (r >= currentRow) attacked.add(`${r},${c}`);
                        r++;
                        c++;
                    }
                }
            }
        }

        return attacked;
    }

    /**
     * Solve N-Queens using backtracking and record steps
     */
    solveNQueens(board, row) {
        // Base case: all queens placed successfully
        if (row === this.boardSize) {
            this.steps.push({
                type: 'solution',
                board: board.map(r => [...r]),
                row: row,
                col: -1,
                explanation: `<p><strong>Solution Found!</strong></p><p>Successfully placed all ${this.boardSize} queens on the board. No queen can attack any other queen.</p>`
            });
            return true;
        }

        const attackedCells = this.getAttackedCells(board, row);

        // Try placing queen in each column of current row
        for (let col = 0; col < this.boardSize; col++) {
            // Record trying this position
            this.steps.push({
                type: 'try',
                board: board.map(r => [...r]),
                row: row,
                col: col,
                attackedCells: new Set(attackedCells),
                explanation: `<p><strong>Step ${this.steps.length + 1}: Trying position (${row}, ${col})</strong></p><p>Attempting to place queen ${row + 1} at row ${row}, column ${col}.</p>`
            });

            if (this.isSafe(board, row, col)) {
                // Place queen
                board[row][col] = 1;

                this.steps.push({
                    type: 'place',
                    board: board.map(r => [...r]),
                    row: row,
                    col: col,
                    explanation: `<p><strong>Queen Placed!</strong></p><p>Position (${row}, ${col}) is safe. Placed queen ${row + 1}. Moving to next row.</p>`
                });

                // Recurse to next row
                if (this.solveNQueens(board, row + 1)) {
                    return true;
                }

                // Backtrack: remove queen
                board[row][col] = 0;
                this.backtrackCount++;

                this.steps.push({
                    type: 'backtrack',
                    board: board.map(r => [...r]),
                    row: row,
                    col: col,
                    explanation: `<p><strong>Backtracking!</strong></p><p>No solution found with queen at (${row}, ${col}). Removing queen and trying next position. Backtracks so far: ${this.backtrackCount}</p>`
                });
            } else {
                this.steps.push({
                    type: 'unsafe',
                    board: board.map(r => [...r]),
                    row: row,
                    col: col,
                    attackedCells: new Set(attackedCells),
                    explanation: `<p><strong>Position Unsafe!</strong></p><p>Position (${row}, ${col}) is under attack from another queen. Trying next column.</p>`
                });
            }
        }

        // No solution found in this configuration
        return false;
    }

    /**
     * Start solving the N-Queens problem
     */
    startSolving() {
        const size = parseInt(this.boardSizeInput.value);

        if (size < 4 || size > 12) {
            alert('Please enter a board size between 4 and 12');
            return;
        }

        // Reset and initialize
        this.reset();
        this.boardSize = size;
        this.backtrackCount = 0;
        this.steps = [];
        this.currentStep = 0;

        // Add initial step
        const emptyBoard = Array(size).fill(null).map(() => Array(size).fill(0));
        this.steps.push({
            type: 'start',
            board: emptyBoard,
            row: 0,
            col: -1,
            explanation: `<p><strong>Starting N-Queens Solver</strong></p><p>Board size: ${size}x${size}. Goal: Place ${size} queens such that no queen can attack another.</p>`
        });

        // Initialize board
        this.initializeBoard(size);

        // Solve
        this.statusDisplay.textContent = 'Solving...';
        const board = Array(size).fill(null).map(() => Array(size).fill(0));
        const solved = this.solveNQueens(board, 0);

        if (!solved) {
            this.steps.push({
                type: 'no_solution',
                board: emptyBoard,
                row: 0,
                col: -1,
                explanation: `<p><strong>No Solution Found</strong></p><p>Unable to place ${size} queens safely on the board.</p>`
            });
        }

        // Update UI
        this.totalStepsDisplay.textContent = this.steps.length;
        this.currentStepDisplay.textContent = 0;
        this.backtrackCountDisplay.textContent = this.backtrackCount;
        this.statusDisplay.textContent = 'Ready to step through';

        // Enable navigation buttons
        this.prevBtn.disabled = true;
        this.nextBtn.disabled = false;
        this.playBtn.disabled = false;

        // Show first step
        this.displayStep(0);
    }

    /**
     * Display a specific step
     */
    displayStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return;

        this.currentStep = stepIndex;
        const step = this.steps[stepIndex];

        // Clear previous highlights
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('queen', 'trying', 'attacked', 'safe');
            cell.textContent = '';
        });

        // Display board state
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);

                if (step.board[row][col] === 1) {
                    cell.classList.add('queen');
                    cell.textContent = '♛';
                }
            }
        }

        // Highlight current position based on step type
        if (step.row >= 0 && step.col >= 0) {
            const currentCell = document.querySelector(`[data-row="${step.row}"][data-col="${step.col}"]`);

            switch (step.type) {
                case 'try':
                    currentCell.classList.add('trying');
                    break;
                case 'place':
                    currentCell.classList.add('queen');
                    currentCell.textContent = '♛';
                    break;
                case 'unsafe':
                    currentCell.classList.add('attacked');
                    // Show attacked cells
                    if (step.attackedCells) {
                        step.attackedCells.forEach(pos => {
                            const [r, c] = pos.split(',').map(Number);
                            if (r !== step.row || c !== step.col) {
                                const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                                if (cell && !cell.classList.contains('queen')) {
                                    cell.classList.add('attacked');
                                }
                            }
                        });
                    }
                    break;
            }
        }

        // Update displays
        this.currentStepDisplay.textContent = stepIndex + 1;
        this.queensCountDisplay.textContent = step.board.flat().filter(x => x === 1).length;
        this.stepExplanation.innerHTML = step.explanation;

        // Update status
        if (step.type === 'solution') {
            this.statusDisplay.textContent = '✓ Solution Found!';
            this.statusDisplay.style.color = 'var(--success-color)';
        } else if (step.type === 'backtrack') {
            this.statusDisplay.textContent = 'Backtracking...';
            this.statusDisplay.style.color = 'var(--warning-color)';
        } else {
            this.statusDisplay.textContent = 'In Progress';
            this.statusDisplay.style.color = 'var(--primary-color)';
        }

        // Update button states
        this.prevBtn.disabled = stepIndex === 0;
        this.nextBtn.disabled = stepIndex === this.steps.length - 1;

        if (stepIndex === this.steps.length - 1) {
            this.pause();
        }
    }

    /**
     * Go to previous step
     */
    previousStep() {
        if (this.currentStep > 0) {
            this.displayStep(this.currentStep - 1);
        }
    }

    /**
     * Go to next step
     */
    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.displayStep(this.currentStep + 1);
        }
    }

    /**
     * Auto-play through steps
     */
    autoPlay() {
        this.isPlaying = true;
        this.playBtn.style.display = 'none';
        this.pauseBtn.style.display = 'block';

        this.playInterval = setInterval(() => {
            if (this.currentStep < this.steps.length - 1) {
                this.nextStep();
            } else {
                this.pause();
            }
        }, this.speed);
    }

    /**
     * Pause auto-play
     */
    pause() {
        this.isPlaying = false;
        this.playBtn.style.display = 'block';
        this.pauseBtn.style.display = 'none';

        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }

    /**
     * Update animation speed
     */
    updateSpeed(value) {
        this.speed = parseInt(value);
        this.speedValue.textContent = `${this.speed}ms`;

        if (this.isPlaying) {
            this.pause();
            this.autoPlay();
        }
    }

    /**
     * Reset everything
     */
    reset() {
        this.pause();
        this.steps = [];
        this.currentStep = 0;
        this.backtrackCount = 0;

        // Reset displays
        this.currentStepDisplay.textContent = '0';
        this.totalStepsDisplay.textContent = '0';
        this.queensCountDisplay.textContent = '0';
        this.backtrackCountDisplay.textContent = '0';
        this.statusDisplay.textContent = 'Ready';
        this.statusDisplay.style.color = 'var(--primary-color)';
        this.stepExplanation.innerHTML = '<p>Click "Start Solving" to begin the N-Queens algorithm visualization.</p>';

        // Disable navigation buttons
        this.prevBtn.disabled = true;
        this.nextBtn.disabled = true;
        this.playBtn.disabled = true;

        // Re-render board
        const size = parseInt(this.boardSizeInput.value);
        this.initializeBoard(size);
    }
}

// Initialize the solver when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const solver = new NQueensSolver();
    solver.initializeBoard(8);
});
