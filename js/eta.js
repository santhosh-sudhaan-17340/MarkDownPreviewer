/**
 * ETA Calculator Module
 * Calculates accurate ETAs using crowd data and real-time traffic conditions
 */

class ETACalculator {
    constructor() {
        this.currentRoute = null;
        this.startTime = null;
        this.estimatedDuration = null;
        this.actualTravelTime = 0;
        this.remainingDistance = 0;
        this.updateInterval = null;
        this.etaHistory = [];
    }

    /**
     * Calculate ETA for a route
     */
    async calculateETA(route, useTraffic = true) {
        if (!route || !route.coordinates || route.coordinates.length === 0) {
            return null;
        }

        // Get base duration and distance from route
        const baseDuration = route.duration || this.estimateBaseDuration(route.coordinates);
        const totalDistance = route.distance || this.calculateTotalDistance(route.coordinates);

        let adjustedDuration = baseDuration;

        if (useTraffic && window.congestionPredictor) {
            // Get congestion predictions
            const predictions = await window.congestionPredictor.predictCongestion(route.coordinates);

            // Adjust duration based on traffic
            adjustedDuration = window.congestionPredictor.calculateETAAdjustment(
                baseDuration,
                predictions
            );

            // Factor in incidents
            if (window.incidentManager) {
                const incidents = await this.getRouteIncidents(route.coordinates);
                adjustedDuration = this.adjustForIncidents(adjustedDuration, incidents);
            }
        }

        const eta = {
            estimatedDuration: Math.round(adjustedDuration),
            estimatedArrival: new Date(Date.now() + adjustedDuration * 1000),
            distance: totalDistance,
            averageSpeed: (totalDistance / (adjustedDuration / 3600)),
            confidence: this.calculateConfidence(route, useTraffic)
        };

        return eta;
    }

    /**
     * Estimate base duration without traffic
     */
    estimateBaseDuration(coordinates) {
        const distance = this.calculateTotalDistance(coordinates);
        const averageSpeed = 50; // km/h default
        return (distance / averageSpeed) * 3600; // seconds
    }

    /**
     * Calculate total distance of route
     */
    calculateTotalDistance(coordinates) {
        let totalDistance = 0;

        for (let i = 0; i < coordinates.length - 1; i++) {
            const [lat1, lng1] = coordinates[i];
            const [lat2, lng2] = coordinates[i + 1];
            totalDistance += this.calculateDistance(lat1, lng1, lat2, lng2);
        }

        return totalDistance;
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
     * Get incidents along route
     */
    async getRouteIncidents(coordinates) {
        if (!window.crowdDataManager) return [];

        const incidents = [];

        for (const coord of coordinates) {
            const nearby = await window.crowdDataManager.getNearbyIncidents(
                coord[0], coord[1], 0.5 // 500m radius
            );
            incidents.push(...nearby);
        }

        // Remove duplicates
        const uniqueIncidents = Array.from(
            new Map(incidents.map(inc => [inc.id, inc])).values()
        );

        return uniqueIncidents;
    }

    /**
     * Adjust ETA for incidents
     */
    adjustForIncidents(baseDuration, incidents) {
        if (incidents.length === 0) return baseDuration;

        let adjustment = 0;

        incidents.forEach(incident => {
            switch (incident.type) {
                case 'accident':
                    adjustment += 300; // 5 minutes
                    break;
                case 'closure':
                    adjustment += 600; // 10 minutes
                    break;
                case 'hazard':
                    adjustment += 120; // 2 minutes
                    break;
                case 'traffic':
                    adjustment += 180; // 3 minutes
                    break;
                default:
                    adjustment += 60; // 1 minute
            }
        });

        return baseDuration + adjustment;
    }

    /**
     * Calculate confidence level for ETA
     */
    calculateConfidence(route, useTraffic) {
        let confidence = 0.5; // Base confidence

        if (useTraffic) {
            confidence += 0.2;
        }

        // Higher confidence for shorter routes
        if (route.distance < 5) {
            confidence += 0.2;
        } else if (route.distance < 20) {
            confidence += 0.1;
        }

        return Math.min(confidence, 0.95);
    }

    /**
     * Start real-time ETA tracking during navigation
     */
    startTracking(route) {
        this.currentRoute = route;
        this.startTime = Date.now();
        this.actualTravelTime = 0;

        if (window.gpsTracker && window.gpsTracker.currentPosition) {
            this.updateRealTimeETA();
        }

        // Update every 10 seconds
        this.updateInterval = setInterval(() => {
            this.updateRealTimeETA();
        }, 10000);
    }

    /**
     * Stop ETA tracking
     */
    stopTracking() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        // Record actual vs estimated for learning
        if (this.startTime && this.estimatedDuration) {
            const actualDuration = (Date.now() - this.startTime) / 1000;
            this.recordETAAccuracy(this.estimatedDuration, actualDuration);
        }

        this.currentRoute = null;
        this.startTime = null;
    }

    /**
     * Update ETA in real-time during navigation
     */
    async updateRealTimeETA() {
        if (!this.currentRoute || !window.gpsTracker || !window.gpsTracker.currentPosition) {
            return null;
        }

        const currentPos = window.gpsTracker.currentPosition;
        const currentSpeed = window.gpsTracker.speed;

        // Find nearest point on route
        const nearestPoint = this.findNearestPointOnRoute(currentPos, this.currentRoute.coordinates);

        // Calculate remaining distance
        this.remainingDistance = this.calculateRemainingDistance(
            nearestPoint.index,
            this.currentRoute.coordinates
        );

        // Get traffic predictions for remaining route
        const remainingCoords = this.currentRoute.coordinates.slice(nearestPoint.index);
        const predictions = await window.congestionPredictor.predictCongestion(remainingCoords);

        // Calculate remaining time
        const avgPredictedSpeed = predictions.reduce((sum, p) => sum + p.estimatedSpeed, 0) / predictions.length;
        const effectiveSpeed = currentSpeed > 5 ? currentSpeed : avgPredictedSpeed;

        const remainingTime = (this.remainingDistance / effectiveSpeed) * 3600; // seconds

        // Apply traffic adjustment
        const adjustedRemainingTime = window.congestionPredictor.calculateETAAdjustment(
            remainingTime,
            predictions
        );

        const eta = {
            estimatedDuration: Math.round(adjustedRemainingTime),
            estimatedArrival: new Date(Date.now() + adjustedRemainingTime * 1000),
            remainingDistance: this.remainingDistance,
            currentSpeed: currentSpeed,
            averageSpeed: effectiveSpeed,
            trafficStatus: this.getTrafficStatus(predictions)
        };

        // Store in history
        this.etaHistory.push({
            timestamp: Date.now(),
            eta: eta.estimatedDuration,
            distance: this.remainingDistance
        });

        // Keep only recent history
        if (this.etaHistory.length > 100) {
            this.etaHistory.shift();
        }

        return eta;
    }

    /**
     * Find nearest point on route to current position
     */
    findNearestPointOnRoute(position, routeCoords) {
        let minDistance = Infinity;
        let nearestIndex = 0;

        routeCoords.forEach((coord, index) => {
            const distance = this.calculateDistance(
                position.lat, position.lng,
                coord[0], coord[1]
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestIndex = index;
            }
        });

        return {
            index: nearestIndex,
            distance: minDistance,
            coordinates: routeCoords[nearestIndex]
        };
    }

    /**
     * Calculate remaining distance from a point on route
     */
    calculateRemainingDistance(startIndex, routeCoords) {
        let distance = 0;

        for (let i = startIndex; i < routeCoords.length - 1; i++) {
            distance += this.calculateDistance(
                routeCoords[i][0], routeCoords[i][1],
                routeCoords[i + 1][0], routeCoords[i + 1][1]
            );
        }

        return distance;
    }

    /**
     * Get overall traffic status for route
     */
    getTrafficStatus(predictions) {
        if (predictions.length === 0) return 'unknown';

        const severe = predictions.filter(p => p.congestionLevel === 'severe').length;
        const heavy = predictions.filter(p => p.congestionLevel === 'heavy').length;

        if (severe > predictions.length * 0.3) return 'severe';
        if (heavy > predictions.length * 0.3) return 'heavy';
        if (heavy + severe > predictions.length * 0.4) return 'moderate';

        return 'normal';
    }

    /**
     * Record ETA accuracy for machine learning
     */
    recordETAAccuracy(estimated, actual) {
        const accuracy = {
            estimated,
            actual,
            difference: actual - estimated,
            percentageError: ((actual - estimated) / estimated) * 100,
            timestamp: Date.now()
        };

        // In a real app, this would be sent to a backend for ML training
        console.log('ETA Accuracy:', accuracy);

        // Update congestion predictor with learning data
        if (window.congestionPredictor && this.currentRoute) {
            window.congestionPredictor.updatePredictionModel(
                this.currentRoute.id,
                estimated,
                actual
            );
        }
    }

    /**
     * Format duration to human-readable string
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }
        return `${minutes} min`;
    }

    /**
     * Format distance to human-readable string
     */
    formatDistance(km) {
        if (km < 1) {
            return `${Math.round(km * 1000)} m`;
        }
        return `${km.toFixed(1)} km`;
    }

    /**
     * Get ETA statistics
     */
    getStats() {
        if (this.etaHistory.length === 0) {
            return null;
        }

        const recent = this.etaHistory.slice(-10);

        return {
            currentETA: recent[recent.length - 1].eta,
            averageETA: recent.reduce((sum, h) => sum + h.eta, 0) / recent.length,
            etaVariation: this.calculateVariation(recent.map(h => h.eta)),
            distanceRemaining: this.remainingDistance
        };
    }

    /**
     * Calculate variation in ETA predictions
     */
    calculateVariation(values) {
        if (values.length < 2) return 0;

        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;

        return Math.sqrt(variance);
    }

    /**
     * Utility: Degrees to radians
     */
    toRad(degrees) {
        return degrees * Math.PI / 180;
    }
}

// Create global instance
window.etaCalculator = new ETACalculator();
