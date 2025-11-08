// ===== Game State =====
const GAME_STATE = {
    players: ['red', 'green', 'yellow', 'blue'],
    currentPlayerIndex: 0,
    diceValue: null,
    gameOver: false,
    tokens: {
        red: [
            { position: 'home', pathIndex: -1, id: 0 },
            { position: 'home', pathIndex: -1, id: 1 },
            { position: 'home', pathIndex: -1, id: 2 },
            { position: 'home', pathIndex: -1, id: 3 }
        ],
        green: [
            { position: 'home', pathIndex: -1, id: 0 },
            { position: 'home', pathIndex: -1, id: 1 },
            { position: 'home', pathIndex: -1, id: 2 },
            { position: 'home', pathIndex: -1, id: 3 }
        ],
        yellow: [
            { position: 'home', pathIndex: -1, id: 0 },
            { position: 'home', pathIndex: -1, id: 1 },
            { position: 'home', pathIndex: -1, id: 2 },
            { position: 'home', pathIndex: -1, id: 3 }
        ],
        blue: [
            { position: 'home', pathIndex: -1, id: 0 },
            { position: 'home', pathIndex: -1, id: 1 },
            { position: 'home', pathIndex: -1, id: 2 },
            { position: 'home', pathIndex: -1, id: 3 }
        ]
    },
    scores: { red: 0, green: 0, yellow: 0, blue: 0 }
};

// Game constants
const START_POSITIONS = { red: 0, green: 13, yellow: 26, blue: 39 };
const SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47]; // Star positions
const PATH_LENGTH = 52; // Total cells in the circular path
const HOME_STRETCH_LENGTH = 6; // Cells to reach home

// ===== DOM Elements =====
const elements = {
    rollDiceBtn: document.getElementById('rollDiceBtn'),
    dice: document.getElementById('dice'),
    diceFace: document.querySelector('.dice-face'),
    messageBox: document.getElementById('messageBox'),
    currentPlayerName: document.getElementById('currentPlayerName'),
    resetBtn: document.getElementById('resetBtn'),
    redScore: document.getElementById('redScore'),
    greenScore: document.getElementById('greenScore'),
    yellowScore: document.getElementById('yellowScore'),
    blueScore: document.getElementById('blueScore')
};

// ===== Initialization =====
function init() {
    setupEventListeners();
    updateUI();
    showMessage('Welcome to Ludo! Red player starts. Roll the dice!');
}

function setupEventListeners() {
    elements.rollDiceBtn.addEventListener('click', rollDice);
    elements.resetBtn.addEventListener('click', resetGame);

    // Add click listeners to all tokens
    const tokenSlots = document.querySelectorAll('.token-slot');
    tokenSlots.forEach(slot => {
        slot.addEventListener('click', () => handleTokenClick(slot));
    });
}

// ===== Dice Functions =====
function rollDice() {
    if (GAME_STATE.gameOver) {
        showMessage('Game is over! Click "New Game" to play again.');
        return;
    }

    // Disable button during roll
    elements.rollDiceBtn.disabled = true;
    elements.dice.classList.add('rolling');

    // Animate dice
    let rollCount = 0;
    const rollInterval = setInterval(() => {
        elements.diceFace.textContent = Math.floor(Math.random() * 6) + 1;
        rollCount++;

        if (rollCount >= 10) {
            clearInterval(rollInterval);
            const finalValue = Math.floor(Math.random() * 6) + 1;
            GAME_STATE.diceValue = finalValue;
            elements.diceFace.textContent = finalValue;
            elements.dice.classList.remove('rolling');

            handleDiceRoll(finalValue);
        }
    }, 50);
}

function handleDiceRoll(value) {
    const currentPlayer = GAME_STATE.players[GAME_STATE.currentPlayerIndex];
    showMessage(`${capitalizeFirst(currentPlayer)} rolled a ${value}!`);

    // Check if player has any valid moves
    const validMoves = getValidMoves(currentPlayer, value);

    if (validMoves.length === 0) {
        showMessage(`${capitalizeFirst(currentPlayer)} has no valid moves. Next player's turn.`);

        // Only give another turn if they rolled a 6
        if (value !== 6) {
            setTimeout(() => nextTurn(), 1500);
        } else {
            elements.rollDiceBtn.disabled = false;
        }
    } else {
        // Highlight valid tokens
        highlightValidTokens(currentPlayer, validMoves);
        showMessage(`${capitalizeFirst(currentPlayer)}, select a token to move.`);
    }
}

function getValidMoves(player, diceValue) {
    const validMoves = [];
    const tokens = GAME_STATE.tokens[player];

    tokens.forEach(token => {
        if (token.position === 'home') {
            // Can only leave home with a 6
            if (diceValue === 6) {
                validMoves.push(token.id);
            }
        } else if (token.position === 'path') {
            // Check if move would be valid
            const newPosition = token.pathIndex + diceValue;
            const homeStretchStart = PATH_LENGTH;
            const homeStretchEnd = PATH_LENGTH + HOME_STRETCH_LENGTH;

            // Check if token is approaching or in home stretch
            if (token.pathIndex < homeStretchStart && newPosition >= homeStretchStart) {
                // Entering home stretch
                if (newPosition <= homeStretchEnd) {
                    validMoves.push(token.id);
                }
            } else if (token.pathIndex >= homeStretchStart) {
                // Already in home stretch
                if (newPosition <= homeStretchEnd) {
                    validMoves.push(token.id);
                }
            } else if (newPosition < homeStretchStart) {
                // Normal move
                validMoves.push(token.id);
            }
        }
    });

    return validMoves;
}

function highlightValidTokens(player, validMoves) {
    // Remove all previous highlights
    document.querySelectorAll('.token-slot.selectable').forEach(slot => {
        slot.classList.remove('selectable');
    });

    // Highlight valid tokens
    validMoves.forEach(tokenId => {
        const slot = document.querySelector(`.token-slot[data-player="${player}"][data-token="${tokenId}"]`);
        if (slot) {
            slot.classList.add('selectable');
        }
    });
}

function handleTokenClick(slot) {
    if (!slot.classList.contains('selectable')) {
        return;
    }

    const player = slot.dataset.player;
    const tokenId = parseInt(slot.dataset.token);
    const currentPlayer = GAME_STATE.players[GAME_STATE.currentPlayerIndex];

    if (player !== currentPlayer) {
        return;
    }

    moveToken(player, tokenId, GAME_STATE.diceValue);
}

// ===== Token Movement =====
function moveToken(player, tokenId, steps) {
    const token = GAME_STATE.tokens[player][tokenId];
    const diceValue = steps;

    if (token.position === 'home') {
        // Move token to start position
        token.position = 'path';
        token.pathIndex = 0;
        showMessage(`${capitalizeFirst(player)} token entered the board!`);
    } else {
        // Move token along the path
        token.pathIndex += steps;

        // Check if token reached home
        if (token.pathIndex >= PATH_LENGTH + HOME_STRETCH_LENGTH) {
            token.position = 'finished';
            GAME_STATE.scores[player]++;
            showMessage(`${capitalizeFirst(player)} got a token home! 🎉`);

            // Check for win
            if (GAME_STATE.scores[player] === 4) {
                gameWon(player);
                return;
            }
        } else if (token.pathIndex < PATH_LENGTH) {
            // Check for capturing opponent tokens
            checkForCapture(player, token.pathIndex);
        }
    }

    // Update UI
    updateUI();
    clearHighlights();

    // Check if player rolled a 6
    if (diceValue === 6) {
        showMessage(`${capitalizeFirst(player)} rolled a 6! Roll again.`);
        elements.rollDiceBtn.disabled = false;
    } else {
        setTimeout(() => nextTurn(), 1000);
    }
}

function checkForCapture(currentPlayer, position) {
    // Don't capture on safe positions
    if (SAFE_POSITIONS.includes(position % PATH_LENGTH)) {
        return;
    }

    // Check all other players' tokens
    GAME_STATE.players.forEach(player => {
        if (player === currentPlayer) return;

        GAME_STATE.tokens[player].forEach(token => {
            if (token.position === 'path' && token.pathIndex === position) {
                // Capture the token - send it back home
                token.position = 'home';
                token.pathIndex = -1;
                showMessage(`${capitalizeFirst(currentPlayer)} captured ${player}'s token!`);
            }
        });
    });
}

// ===== Turn Management =====
function nextTurn() {
    GAME_STATE.currentPlayerIndex = (GAME_STATE.currentPlayerIndex + 1) % GAME_STATE.players.length;
    const nextPlayer = GAME_STATE.players[GAME_STATE.currentPlayerIndex];

    updateUI();
    showMessage(`${capitalizeFirst(nextPlayer)}'s turn. Roll the dice!`);
    elements.rollDiceBtn.disabled = false;
}

function clearHighlights() {
    document.querySelectorAll('.token-slot.selectable').forEach(slot => {
        slot.classList.remove('selectable');
    });
}

// ===== Game End =====
function gameWon(player) {
    GAME_STATE.gameOver = true;
    showMessage(`🎊 ${capitalizeFirst(player)} wins the game! Congratulations! 🎊`);
    elements.rollDiceBtn.disabled = true;
    clearHighlights();
}

function resetGame() {
    // Reset game state
    GAME_STATE.currentPlayerIndex = 0;
    GAME_STATE.diceValue = null;
    GAME_STATE.gameOver = false;
    GAME_STATE.scores = { red: 0, green: 0, yellow: 0, blue: 0 };

    // Reset all tokens
    GAME_STATE.players.forEach(player => {
        GAME_STATE.tokens[player].forEach(token => {
            token.position = 'home';
            token.pathIndex = -1;
        });
    });

    // Reset UI
    elements.diceFace.textContent = '?';
    elements.rollDiceBtn.disabled = false;
    clearHighlights();
    updateUI();
    showMessage('New game started! Red player begins. Roll the dice!');
}

// ===== UI Updates =====
function updateUI() {
    // Update current player badge
    const currentPlayer = GAME_STATE.players[GAME_STATE.currentPlayerIndex];
    elements.currentPlayerName.textContent = capitalizeFirst(currentPlayer);
    elements.currentPlayerName.className = `player-badge ${currentPlayer}`;

    // Update scores
    elements.redScore.textContent = `${GAME_STATE.scores.red}/4 tokens home`;
    elements.greenScore.textContent = `${GAME_STATE.scores.green}/4 tokens home`;
    elements.yellowScore.textContent = `${GAME_STATE.scores.yellow}/4 tokens home`;
    elements.blueScore.textContent = `${GAME_STATE.scores.blue}/4 tokens home`;

    // Update token positions visually
    updateTokenPositions();
}

function updateTokenPositions() {
    // Clear all token slots first
    document.querySelectorAll('.token-slot').forEach(slot => {
        slot.innerHTML = '';
        const player = slot.dataset.player;
        const tokenId = parseInt(slot.dataset.token);
        const token = GAME_STATE.tokens[player][tokenId];

        // If token is at home, show it in the home slot
        if (token.position === 'home') {
            const tokenDiv = document.createElement('div');
            tokenDiv.className = `token ${player}`;
            slot.appendChild(tokenDiv);
        }
    });

    // Note: For a complete implementation, you would also position tokens on the board path
    // This simplified version keeps tokens visible in home slots or moves them conceptually
}

function showMessage(message) {
    elements.messageBox.textContent = message;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== Start Game =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
