/**
 * Routing Module
 * Handles route planning, turn-by-turn navigation, and route optimization
 */

class RoutingManager {
    constructor() {
        this.currentRoute = null;
        this.alternativeRoutes = [];
        this.routeLayer = null;
        this.currentStep = 0;
        this.isNavigating = false;
        this.routingService = 'osrm'; // Open Source Routing Machine
        this.voiceEnabled = true;
    }

    /**
     * Calculate route from origin to destination
     */
    async calculateRoute(origin, destination, alternatives = true) {
        try {
            // Use OSRM demo server (in production, use your own OSRM instance)
            const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?` +
                `alternatives=${alternatives ? 'true' : 'false'}&steps=true&geometries=geojson&overview=full`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.code !== 'Ok') {
                throw new Error('Route calculation failed');
            }

            // Process routes
            const routes = await this.processRoutes(data.routes);

            // Store routes
            this.currentRoute = routes[0];
            this.alternativeRoutes = routes.slice(1);

            return routes;
        } catch (error) {
            console.error('Routing error:', error);
            throw error;
        }
    }

    /**
     * Process routes from OSRM response
     */
    async processRoutes(rawRoutes) {
        const routes = [];

        for (const route of rawRoutes) {
            const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

            // Get traffic predictions
            let trafficSummary = null;
            if (window.congestionPredictor) {
                trafficSummary = await window.congestionPredictor.getRouteSummary(coordinates);
            }

            // Calculate ETA with traffic
            let eta = null;
            if (window.etaCalculator) {
                eta = await window.etaCalculator.calculateETA({
                    coordinates,
                    duration: route.duration,
                    distance: route.distance / 1000
                });
            }

            // Get incidents on route
            let incidents = [];
            if (window.incidentManager) {
                incidents = window.incidentManager.getIncidentsOnRoute(coordinates);
            }

            routes.push({
                id: this.generateRouteId(),
                coordinates,
                distance: route.distance / 1000, // Convert to km
                duration: route.duration, // seconds
                steps: this.processSteps(route.legs[0].steps),
                geometry: route.geometry,
                trafficSummary,
                eta,
                incidents
            });
        }

        return routes;
    }

    /**
     * Process navigation steps
     */
    processSteps(rawSteps) {
        return rawSteps.map((step, index) => {
            const instruction = this.generateInstruction(step);

            return {
                index,
                distance: step.distance,
                duration: step.duration,
                instruction: instruction.text,
                icon: instruction.icon,
                modifier: step.maneuver.modifier,
                type: step.maneuver.type,
                location: [step.maneuver.location[1], step.maneuver.location[0]],
                name: step.name || 'Unnamed road'
            };
        });
    }

    /**
     * Generate human-readable instruction
     */
    generateInstruction(step) {
        const maneuver = step.maneuver;
        const type = maneuver.type;
        const modifier = maneuver.modifier;
        const name = step.name || 'the road';
        const distance = this.formatDistance(step.distance / 1000);

        let text = '';
        let icon = '→';

        switch (type) {
            case 'depart':
                text = `Head ${modifier || 'straight'}`;
                icon = '🚗';
                break;
            case 'arrive':
                text = 'Arrive at destination';
                icon = '🏁';
                break;
            case 'turn':
                if (modifier === 'left') {
                    text = `Turn left onto ${name}`;
                    icon = '←';
                } else if (modifier === 'right') {
                    text = `Turn right onto ${name}`;
                    icon = '→';
                } else if (modifier === 'slight left') {
                    text = `Slight left onto ${name}`;
                    icon = '↖';
                } else if (modifier === 'slight right') {
                    text = `Slight right onto ${name}`;
                    icon = '↗';
                } else if (modifier === 'sharp left') {
                    text = `Sharp left onto ${name}`;
                    icon = '⬅';
                } else if (modifier === 'sharp right') {
                    text = `Sharp right onto ${name}`;
                    icon = '➡';
                } else {
                    text = `Continue onto ${name}`;
                    icon = '↑';
                }
                break;
            case 'merge':
                text = `Merge ${modifier || ''} onto ${name}`;
                icon = '⤴';
                break;
            case 'roundabout':
                text = `Take the roundabout onto ${name}`;
                icon = '⭕';
                break;
            case 'continue':
                text = `Continue on ${name}`;
                icon = '↑';
                break;
            default:
                text = `Continue on ${name}`;
                icon = '→';
        }

        return { text, icon };
    }

    /**
     * Draw route on map
     */
    drawRoute(route, color = '#2196F3', weight = 6) {
        if (!window.map) return;

        // Remove existing route layer
        this.clearRoute();

        // Create polyline with traffic colors if enabled
        if (route.trafficSummary && window.congestionPredictor) {
            this.drawTrafficRoute(route);
        } else {
            this.routeLayer = L.polyline(route.coordinates, {
                color,
                weight,
                opacity: 0.8
            }).addTo(window.map);

            // Fit map to route
            window.map.fitBounds(this.routeLayer.getBounds(), {
                padding: [50, 50]
            });
        }
    }

    /**
     * Draw route with traffic colors
     */
    async drawTrafficRoute(route) {
        if (!window.map) return;

        const predictions = await window.congestionPredictor.predictCongestion(route.coordinates);

        const layers = L.layerGroup();

        for (let i = 0; i < route.coordinates.length - 1; i++) {
            const prediction = predictions[i] || { congestionLevel: 'moderate' };
            const color = window.congestionPredictor.getTrafficColor(prediction.congestionLevel);

            const segment = L.polyline(
                [route.coordinates[i], route.coordinates[i + 1]],
                {
                    color,
                    weight: 6,
                    opacity: 0.8,
                    className: `traffic-polyline-${prediction.congestionLevel}`
                }
            );

            layers.addLayer(segment);
        }

        this.routeLayer = layers.addTo(window.map);

        // Fit map to route
        const bounds = L.latLngBounds(route.coordinates);
        window.map.fitBounds(bounds, { padding: [50, 50] });
    }

    /**
     * Clear route from map
     */
    clearRoute() {
        if (this.routeLayer && window.map) {
            window.map.removeLayer(this.routeLayer);
            this.routeLayer = null;
        }
    }

    /**
     * Start turn-by-turn navigation
     */
    startNavigation(route) {
        this.currentRoute = route;
        this.currentStep = 0;
        this.isNavigating = true;

        // Draw route on map
        this.drawRoute(route);

        // Start GPS tracking
        if (window.gpsTracker) {
            window.gpsTracker.startTracking();
        }

        // Start ETA tracking
        if (window.etaCalculator) {
            window.etaCalculator.startTracking(route);
        }

        // Start monitoring location for turn-by-turn
        this.startNavigationMonitoring();

        // Announce first instruction
        this.announceCurrentStep();
    }

    /**
     * Stop navigation
     */
    stopNavigation() {
        this.isNavigating = false;

        // Stop GPS tracking
        if (window.gpsTracker) {
            window.gpsTracker.stopTracking();
        }

        // Stop ETA tracking
        if (window.etaCalculator) {
            window.etaCalculator.stopTracking();
        }

        // Clear route
        this.clearRoute();

        this.currentRoute = null;
        this.currentStep = 0;
    }

    /**
     * Monitor location for turn-by-turn navigation
     */
    startNavigationMonitoring() {
        if (!window.gpsTracker) return;

        window.gpsTracker.onUpdate((data) => {
            if (!this.isNavigating || data.type !== 'positionUpdate') return;

            this.updateNavigation(data.position);
        });
    }

    /**
     * Update navigation based on current position
     */
    updateNavigation(position) {
        if (!this.currentRoute || this.currentStep >= this.currentRoute.steps.length) {
            return;
        }

        const currentStepData = this.currentRoute.steps[this.currentStep];
        const nextLocation = currentStepData.location;

        // Calculate distance to next maneuver
        const distance = this.calculateDistance(
            position.lat, position.lng,
            nextLocation[0], nextLocation[1]
        );

        // If close to next maneuver (within 30m), move to next step
        if (distance < 0.03) {
            this.currentStep++;

            if (this.currentStep < this.currentRoute.steps.length) {
                this.announceCurrentStep();
            } else {
                // Reached destination
                this.announceArrival();
            }
        }
    }

    /**
     * Announce current navigation step
     */
    announceCurrentStep() {
        if (!this.currentRoute || this.currentStep >= this.currentRoute.steps.length) {
            return;
        }

        const step = this.currentRoute.steps[this.currentStep];

        // Update UI
        if (window.app) {
            window.app.updateNavigationInstruction(step);
        }

        // Voice announcement
        if (this.voiceEnabled) {
            this.speak(step.instruction);
        }
    }

    /**
     * Announce arrival
     */
    announceArrival() {
        const message = 'You have arrived at your destination';

        // Update UI
        if (window.app) {
            window.app.updateNavigationInstruction({ instruction: message, icon: '🏁' });
        }

        // Voice announcement
        if (this.voiceEnabled) {
            this.speak(message);
        }

        // Stop navigation after a delay
        setTimeout(() => {
            this.stopNavigation();
        }, 5000);
    }

    /**
     * Text-to-speech announcement
     */
    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    }

    /**
     * Calculate distance between two points (km)
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Format distance
     */
    formatDistance(km) {
        if (km < 1) {
            return `${Math.round(km * 1000)} m`;
        }
        return `${km.toFixed(1)} km`;
    }

    /**
     * Generate unique route ID
     */
    generateRouteId() {
        return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Utility: Degrees to radians
     */
    toRad(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * Set voice guidance enabled/disabled
     */
    setVoiceEnabled(enabled) {
        this.voiceEnabled = enabled;
    }

    /**
     * Get current navigation status
     */
    getNavigationStatus() {
        if (!this.isNavigating || !this.currentRoute) {
            return null;
        }

        return {
            isNavigating: this.isNavigating,
            currentStep: this.currentStep,
            totalSteps: this.currentRoute.steps.length,
            currentInstruction: this.currentRoute.steps[this.currentStep]?.instruction,
            remainingDistance: this.currentRoute.distance,
            eta: window.etaCalculator?.getStats()
        };
    }
}

// Create global instance
window.routingManager = new RoutingManager();
