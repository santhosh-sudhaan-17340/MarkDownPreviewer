# Vice City - Browser Game

A basic Vice City-inspired browser game built with HTML5 Canvas and vanilla JavaScript. Drive around a neon-lit city, complete missions, and experience the 80s aesthetic!

## Features

### Gameplay
- **Top-down driving** - Classic GTA-style perspective
- **Vehicle system** - Enter/exit multiple vehicle types
- **Open world** - Explore a procedurally generated city
- **Mission system** - Complete objectives to earn money
- **Dynamic HUD** - Health, money, wanted level, and speedometer

### Vehicles
- **Cheetah** - Fast sports car (pink)
- **Sentinel** - Luxury sedan (cyan)
- **Phoenix** - Muscle car (gold)
- **Sabre** - Classic car (orange)

### City Features
- Grid-based road system
- Randomly generated buildings with neon outlines
- Animated windows for night-time effect
- Collision detection

## Controls

| Key | Action |
|-----|--------|
| **WASD / Arrow Keys** | Move player / Drive vehicle |
| **E / Enter** | Enter/Exit vehicle |
| **Space** | Horn (when in vehicle) |
| **ESC** | Pause menu |

## How to Play

1. Open `index.html` in your web browser
2. Click **START GAME** from the main menu
3. Use WASD or Arrow keys to move your character
4. Walk up to a vehicle and press **E** or **Enter** to get in
5. Drive around and complete the mission
6. Reach maximum speed to complete the "Street Racer" mission

## Game Mechanics

### On Foot
- Move in any direction using WASD or arrow keys
- Walk up to vehicles to enter them
- Avoid buildings (they block your path)

### Driving
- Accelerate with W/Up
- Reverse with S/Down
- Steer with A/Left and D/Right
- Exit vehicle with E/Enter
- Speed is shown in the bottom-right HUD

### Missions
- **Street Racer**: Reach max speed in any vehicle (Reward: $1000)
- More missions coming soon!

## Technical Details

Built with:
- **HTML5 Canvas** for rendering
- **Vanilla JavaScript** for game logic
- **CSS3** for UI and Vice City neon aesthetic
- No external libraries or frameworks

### Game Systems
- Game loop with delta time for smooth movement
- Camera system that follows the player
- Collision detection with buildings
- Vehicle physics with acceleration and turning
- Mission tracking and completion

## Vice City Aesthetic

The game features:
- **Neon colors**: Hot pink (#FF1493) and cyan (#00FFFF)
- **Retro gradient backgrounds**: Purple to pink gradient skies
- **Glowing text effects**: Neon text shadows throughout
- **80s style HUD**: Retro UI with glowing borders
- **Synthwave vibes**: Color palette inspired by 1980s Miami

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## File Structure

```
.
├── index.html          # Game HTML and UI
├── styles.css          # Vice City themed styles
├── game.js             # Game engine and logic
└── README.md           # This file
```

## Future Enhancements

Potential additions:
- [ ] More mission types (delivery, racing, combat)
- [ ] Pedestrians and traffic
- [ ] Sound effects and music
- [ ] Weapon system
- [ ] Save/load game state
- [ ] Mobile touch controls
- [ ] More vehicle types
- [ ] Day/night cycle
- [ ] Police chase system
- [ ] Shops and businesses

## Credits

Inspired by the classic GTA: Vice City game by Rockstar Games. This is a fan tribute built for educational purposes.

## License

This project is open source and available for educational purposes.

---

**Welcome to Vice City. Time to make some money!** 🌴🌆💰
