# Crowd-Based Traffic Navigation App

A real-time traffic navigation application that leverages crowd-sourced data to provide accurate route planning, congestion prediction, and incident reporting.

## Features

### Core Functionality
- **Interactive Map Interface** - Powered by Leaflet.js with OpenStreetMap
- **Real-time GPS Tracking** - Energy-efficient location monitoring
- **Route Planning** - Calculate optimal routes based on current traffic conditions
- **Turn-by-Turn Navigation** - Voice and visual navigation guidance

### Crowd-Sourced Intelligence
- **Congestion Prediction** - Machine learning-based traffic prediction using crowd data
- **ETA Accuracy** - Improved arrival time estimates based on real-world crowd data
- **Incident Reporting** - Report and view accidents, hazards, road closures, and more
- **Real-time Traffic Visualization** - Color-coded routes showing traffic density

### Energy Efficiency
- **Adaptive GPS Sampling** - Adjusts GPS polling frequency based on speed and battery level
- **Battery-Aware Mode** - Reduces location updates when battery is low
- **Smart Caching** - Minimizes data usage with intelligent route caching

### Data Collection
- **Anonymous Data Sharing** - Contribute speed and location data to improve predictions
- **Local Storage** - IndexedDB for offline capability and data persistence
- **Privacy-First** - No personal data collected, location data anonymized

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Leaflet.js + OpenStreetMap
- **Routing**: OSRM (Open Source Routing Machine)
- **Storage**: IndexedDB
- **APIs**: Geolocation API, Battery Status API

## Quick Start

1. Open `index.html` in a modern web browser
2. Allow location permissions when prompted
3. Start navigating!

## Usage

### Planning a Route
1. Click the "Route" button
2. Enter your destination
3. Choose your preferred route
4. Click "Start Navigation"

### Reporting Incidents
1. Click the "Report" button while navigating
2. Select incident type (accident, hazard, closure, etc.)
3. Add optional details
4. Submit to help other drivers

### Adjusting Settings
- Toggle crowd data sharing
- Enable/disable battery saver mode
- Adjust voice guidance volume
- Switch map layers

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with geolocation support

## Privacy

This app prioritizes user privacy:
- No account required
- Location data is anonymized before sharing
- Data stored locally on your device
- No tracking or analytics

## License

MIT License
