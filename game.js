// ===== Vice City Game =====
// Game State
const game = {
    state: 'menu', // menu, playing, paused
    canvas: null,
    ctx: null,
    width: 1200,
    height: 800,
    camera: { x: 0, y: 0 },
    lastTime: 0,
    deltaTime: 0
};

// Player State
const player = {
    x: 600,
    y: 400,
    width: 30,
    height: 30,
    speed: 200,
    angle: 0,
    health: 100,
    money: 0,
    wantedLevel: 0,
    inVehicle: false,
    currentVehicle: null
};

// Input State
const keys = {};

// Vehicles
const vehicles = [];
const vehicleTypes = [
    { name: 'Cheetah', color: '#FF1493', speed: 350, width: 40, height: 70 },
    { name: 'Sentinel', color: '#00FFFF', speed: 300, width: 40, height: 70 },
    { name: 'Phoenix', color: '#FFD700', speed: 320, width: 40, height: 70 },
    { name: 'Sabre', color: '#FF4500', speed: 280, width: 40, height: 70 }
];

// Buildings
const buildings = [];

// Roads
const roads = [];

// Missions
const missions = [
    {
        title: 'Taxi Driver',
        description: 'Drive a taxi and earn $500',
        type: 'drive',
        reward: 500,
        completed: false
    },
    {
        title: 'Street Racer',
        description: 'Reach max speed in any vehicle',
        type: 'speed',
        reward: 1000,
        completed: false
    }
];

let currentMission = null;

// ===== Initialization =====
function init() {
    game.canvas = document.getElementById('game-canvas');
    game.ctx = game.canvas.getContext('2d');

    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Setup event listeners
    setupEventListeners();

    // Generate world
    generateWorld();

    // Start game loop
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    game.canvas.width = window.innerWidth;
    game.canvas.height = window.innerHeight;
    game.width = window.innerWidth;
    game.height = window.innerHeight;
}

function setupEventListeners() {
    // Menu buttons
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('controls-btn').addEventListener('click', showControls);
    document.getElementById('back-btn').addEventListener('click', showMainMenu);
    document.getElementById('resume-btn').addEventListener('click', resumeGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('quit-btn').addEventListener('click', quitToMenu);
    document.getElementById('continue-btn').addEventListener('click', continueMission);

    // Keyboard input
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        keys[e.code] = true;

        // Escape to pause
        if (e.key === 'Escape' && game.state === 'playing') {
            pauseGame();
        }

        // Enter/E to enter/exit vehicle
        if ((e.key === 'Enter' || e.key.toLowerCase() === 'e') && game.state === 'playing') {
            toggleVehicle();
        }

        // Space for horn
        if (e.key === ' ' && player.inVehicle) {
            e.preventDefault();
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
        keys[e.code] = false;
    });
}

function generateWorld() {
    // Generate roads (grid pattern)
    const roadWidth = 80;
    const blockSize = 200;

    // Horizontal roads
    for (let y = 0; y < 3000; y += blockSize) {
        roads.push({
            x: -500,
            y: y,
            width: 4000,
            height: roadWidth,
            direction: 'horizontal'
        });
    }

    // Vertical roads
    for (let x = 0; x < 3000; x += blockSize) {
        roads.push({
            x: x,
            y: -500,
            width: roadWidth,
            height: 4000,
            direction: 'vertical'
        });
    }

    // Generate buildings
    for (let x = 0; x < 3000; x += blockSize) {
        for (let y = 0; y < 3000; y += blockSize) {
            // Create 4 buildings per block
            const offsetX = roadWidth;
            const offsetY = roadWidth;
            const buildingWidth = (blockSize - roadWidth) / 2 - 10;
            const buildingHeight = (blockSize - roadWidth) / 2 - 10;

            buildings.push(
                {
                    x: x + offsetX + 5,
                    y: y + offsetY + 5,
                    width: buildingWidth,
                    height: buildingHeight,
                    color: getRandomBuildingColor()
                },
                {
                    x: x + offsetX + buildingWidth + 15,
                    y: y + offsetY + 5,
                    width: buildingWidth,
                    height: buildingHeight,
                    color: getRandomBuildingColor()
                },
                {
                    x: x + offsetX + 5,
                    y: y + offsetY + buildingHeight + 15,
                    width: buildingWidth,
                    height: buildingHeight,
                    color: getRandomBuildingColor()
                },
                {
                    x: x + offsetX + buildingWidth + 15,
                    y: y + offsetY + buildingHeight + 15,
                    width: buildingWidth,
                    height: buildingHeight,
                    color: getRandomBuildingColor()
                }
            );
        }
    }

    // Generate vehicles
    for (let i = 0; i < 20; i++) {
        const type = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
        const road = roads[Math.floor(Math.random() * roads.length)];

        vehicles.push({
            ...type,
            x: road.x + Math.random() * road.width,
            y: road.y + Math.random() * road.height,
            angle: road.direction === 'horizontal' ? 0 : Math.PI / 2,
            currentSpeed: 0
        });
    }
}

function getRandomBuildingColor() {
    const colors = ['#2a0050', '#3d0066', '#50007a', '#1a0033', '#660099'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// ===== Game Loop =====
function gameLoop(timestamp) {
    game.deltaTime = (timestamp - game.lastTime) / 1000;
    game.lastTime = timestamp;

    // Limit delta time to prevent huge jumps
    if (game.deltaTime > 0.1) game.deltaTime = 0.1;

    if (game.state === 'playing') {
        update(game.deltaTime);
        render();
    }

    requestAnimationFrame(gameLoop);
}

// ===== Update =====
function update(dt) {
    // Update player
    if (player.inVehicle && player.currentVehicle) {
        updateVehicleMovement(dt);
    } else {
        updatePlayerMovement(dt);
    }

    // Update camera to follow player
    game.camera.x = player.x - game.width / 2;
    game.camera.y = player.y - game.height / 2;

    // Check missions
    checkMissions();

    // Update HUD
    updateHUD();
}

function updatePlayerMovement(dt) {
    let dx = 0;
    let dy = 0;

    if (keys['w'] || keys['ArrowUp']) dy -= 1;
    if (keys['s'] || keys['ArrowDown']) dy += 1;
    if (keys['a'] || keys['ArrowLeft']) dx -= 1;
    if (keys['d'] || keys['ArrowRight']) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }

    // Calculate new position
    const newX = player.x + dx * player.speed * dt;
    const newY = player.y + dy * player.speed * dt;

    // Check collision with buildings
    if (!checkBuildingCollision(newX, newY, player.width, player.height)) {
        player.x = newX;
        player.y = newY;
    }

    // Update angle
    if (dx !== 0 || dy !== 0) {
        player.angle = Math.atan2(dy, dx);
    }
}

function updateVehicleMovement(dt) {
    const vehicle = player.currentVehicle;
    let acceleration = 0;
    let turning = 0;

    if (keys['w'] || keys['ArrowUp']) acceleration = 1;
    if (keys['s'] || keys['ArrowDown']) acceleration = -0.5;
    if (keys['a'] || keys['ArrowLeft']) turning = -1;
    if (keys['d'] || keys['ArrowRight']) turning = 1;

    // Update speed
    if (acceleration !== 0) {
        vehicle.currentSpeed += acceleration * vehicle.speed * dt;
        vehicle.currentSpeed = Math.max(-vehicle.speed * 0.5, Math.min(vehicle.speed, vehicle.currentSpeed));
    } else {
        // Deceleration
        vehicle.currentSpeed *= 0.95;
        if (Math.abs(vehicle.currentSpeed) < 1) vehicle.currentSpeed = 0;
    }

    // Update angle (only when moving)
    if (Math.abs(vehicle.currentSpeed) > 10) {
        vehicle.angle += turning * 2 * dt;
    }

    // Update position
    const newX = vehicle.x + Math.cos(vehicle.angle) * vehicle.currentSpeed * dt;
    const newY = vehicle.y + Math.sin(vehicle.angle) * vehicle.currentSpeed * dt;

    // Check collision with buildings
    if (!checkBuildingCollision(newX, newY, vehicle.width, vehicle.height)) {
        vehicle.x = newX;
        vehicle.y = newY;
        player.x = vehicle.x;
        player.y = vehicle.y;
        player.angle = vehicle.angle;
    } else {
        // Hit building, reduce speed
        vehicle.currentSpeed *= 0.3;
    }
}

function checkBuildingCollision(x, y, width, height) {
    const padding = width / 2;

    for (const building of buildings) {
        if (x + padding > building.x &&
            x - padding < building.x + building.width &&
            y + padding > building.y &&
            y - padding < building.y + building.height) {
            return true;
        }
    }

    return false;
}

function toggleVehicle() {
    if (player.inVehicle) {
        // Exit vehicle
        player.inVehicle = false;
        player.currentVehicle = null;
        document.getElementById('vehicle-info').classList.add('hidden');
    } else {
        // Find nearby vehicle
        for (const vehicle of vehicles) {
            const dist = Math.hypot(vehicle.x - player.x, vehicle.y - player.y);
            if (dist < 50) {
                // Enter vehicle
                player.inVehicle = true;
                player.currentVehicle = vehicle;
                player.x = vehicle.x;
                player.y = vehicle.y;
                player.angle = vehicle.angle;
                document.getElementById('vehicle-info').classList.remove('hidden');
                document.getElementById('vehicle-name').textContent = vehicle.name;
                return;
            }
        }
    }
}

function checkMissions() {
    if (!currentMission) return;

    if (currentMission.type === 'speed' && player.inVehicle) {
        if (Math.abs(player.currentVehicle.currentSpeed) >= player.currentVehicle.speed * 0.9) {
            completeMission();
        }
    }
}

function completeMission() {
    if (!currentMission || currentMission.completed) return;

    currentMission.completed = true;
    player.money += currentMission.reward;

    document.getElementById('reward-text').textContent = `Reward: $${currentMission.reward}`;
    document.getElementById('mission-complete').classList.remove('hidden');
    document.getElementById('mission-complete').classList.add('active');
    document.getElementById('mission-info').classList.add('hidden');

    currentMission = null;
}

// ===== Render =====
function render() {
    const ctx = game.ctx;

    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, game.width, game.height);

    // Draw gradient sky
    const gradient = ctx.createLinearGradient(0, 0, 0, game.height);
    gradient.addColorStop(0, '#FFB6C1');
    gradient.addColorStop(0.5, '#FF69B4');
    gradient.addColorStop(1, '#FF1493');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, game.width, game.height);

    ctx.save();
    ctx.translate(-game.camera.x, -game.camera.y);

    // Draw roads
    ctx.fillStyle = '#333333';
    for (const road of roads) {
        ctx.fillRect(road.x, road.y, road.width, road.height);

        // Draw road lines
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 2;
        ctx.setLineDash([20, 20]);

        if (road.direction === 'horizontal') {
            ctx.beginPath();
            ctx.moveTo(road.x, road.y + road.height / 2);
            ctx.lineTo(road.x + road.width, road.y + road.height / 2);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(road.x + road.width / 2, road.y);
            ctx.lineTo(road.x + road.width / 2, road.y + road.height);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }

    // Draw buildings
    for (const building of buildings) {
        // Building shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(building.x + 5, building.y + 5, building.width, building.height);

        // Building
        ctx.fillStyle = building.color;
        ctx.fillRect(building.x, building.y, building.width, building.height);

        // Building outline
        ctx.strokeStyle = '#FF1493';
        ctx.lineWidth = 2;
        ctx.strokeRect(building.x, building.y, building.width, building.height);

        // Windows
        ctx.fillStyle = '#FFFF00';
        const windowSize = 8;
        const windowSpacing = 20;

        for (let x = building.x + 10; x < building.x + building.width - 10; x += windowSpacing) {
            for (let y = building.y + 10; y < building.y + building.height - 10; y += windowSpacing) {
                if (Math.random() > 0.3) {
                    ctx.fillRect(x, y, windowSize, windowSize);
                }
            }
        }
    }

    // Draw vehicles
    for (const vehicle of vehicles) {
        if (vehicle === player.currentVehicle) continue;
        drawVehicle(ctx, vehicle);
    }

    // Draw player vehicle (if in vehicle)
    if (player.inVehicle && player.currentVehicle) {
        drawVehicle(ctx, player.currentVehicle);
    }

    // Draw player (if on foot)
    if (!player.inVehicle) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);

        // Player shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(-player.width/2 + 2, -player.height/2 + 2, player.width, player.height);

        // Player body
        ctx.fillStyle = '#00FFFF';
        ctx.fillRect(-player.width/2, -player.height/2, player.width, player.height);

        // Player outline
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(-player.width/2, -player.height/2, player.width, player.height);

        ctx.restore();
    }

    ctx.restore();
}

function drawVehicle(ctx, vehicle) {
    ctx.save();
    ctx.translate(vehicle.x, vehicle.y);
    ctx.rotate(vehicle.angle);

    // Vehicle shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-vehicle.width/2 + 3, -vehicle.height/2 + 3, vehicle.width, vehicle.height);

    // Vehicle body
    ctx.fillStyle = vehicle.color;
    ctx.fillRect(-vehicle.width/2, -vehicle.height/2, vehicle.width, vehicle.height);

    // Vehicle outline
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(-vehicle.width/2, -vehicle.height/2, vehicle.width, vehicle.height);

    // Windshield
    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.fillRect(-vehicle.width/2 + 5, -vehicle.height/2 + 10, vehicle.width - 10, 20);

    // Headlights
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(-vehicle.width/2 + 5, vehicle.height/2 - 10, 8, 8);
    ctx.fillRect(vehicle.width/2 - 13, vehicle.height/2 - 10, 8, 8);

    ctx.restore();
}

// ===== HUD =====
function updateHUD() {
    // Health
    document.getElementById('health-fill').style.width = player.health + '%';

    // Money
    document.getElementById('money-value').textContent = '$' + player.money;

    // Wanted level
    const starsContainer = document.getElementById('wanted-stars');
    starsContainer.innerHTML = '';
    for (let i = 0; i < player.wantedLevel; i++) {
        const star = document.createElement('span');
        star.className = 'wanted-star';
        star.textContent = '★';
        starsContainer.appendChild(star);
    }

    // Vehicle speed
    if (player.inVehicle && player.currentVehicle) {
        const speedPercent = (Math.abs(player.currentVehicle.currentSpeed) / player.currentVehicle.speed) * 100;
        document.getElementById('speed-fill').style.width = speedPercent + '%';
    }
}

// ===== Menu Functions =====
function startGame() {
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('hud').classList.remove('hidden');
    game.state = 'playing';

    // Start first mission
    currentMission = missions[1]; // Street Racer
    document.getElementById('mission-info').classList.remove('hidden');
    document.getElementById('mission-title').textContent = currentMission.title;
    document.getElementById('mission-desc').textContent = currentMission.description;
}

function showControls() {
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('controls-menu').classList.add('active');
}

function showMainMenu() {
    document.getElementById('controls-menu').classList.remove('active');
    document.getElementById('main-menu').classList.add('active');
}

function pauseGame() {
    game.state = 'paused';
    document.getElementById('pause-menu').classList.add('active');
}

function resumeGame() {
    game.state = 'playing';
    document.getElementById('pause-menu').classList.remove('active');
}

function restartGame() {
    // Reset player
    player.x = 600;
    player.y = 400;
    player.health = 100;
    player.money = 0;
    player.wantedLevel = 0;
    player.inVehicle = false;
    player.currentVehicle = null;

    // Reset missions
    missions.forEach(m => m.completed = false);
    currentMission = missions[1];

    document.getElementById('pause-menu').classList.remove('active');
    document.getElementById('mission-info').classList.remove('hidden');
    document.getElementById('mission-title').textContent = currentMission.title;
    document.getElementById('mission-desc').textContent = currentMission.description;

    game.state = 'playing';
}

function quitToMenu() {
    game.state = 'menu';
    document.getElementById('pause-menu').classList.remove('active');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('main-menu').classList.add('active');
}

function continueMission() {
    document.getElementById('mission-complete').classList.remove('active');
    document.getElementById('mission-complete').classList.add('hidden');
}

// ===== Start Game =====
window.addEventListener('load', init);
