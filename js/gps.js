/**
 * GPS Tracking Module
 * Implements energy-efficient location tracking with adaptive sampling
 */

class GPSTracker {
    constructor() {
        this.watchId = null;
        this.currentPosition = null;
        this.heading = 0;
        this.speed = 0;
        this.accuracy = null;
        this.isTracking = false;
        this.batterySaverMode = false;
        this.batteryLevel = 100;
        this.callbacks = [];

        // Adaptive GPS settings
        this.updateIntervals = {
            stationary: 10000,      // 10 seconds when not moving
            slow: 5000,             // 5 seconds when moving slowly (< 20 km/h)
            normal: 2000,           // 2 seconds when moving normally (20-60 km/h)
            fast: 1000,             // 1 second when moving fast (> 60 km/h)
            batterySaver: 15000     // 15 seconds in battery saver mode
        };

        this.currentInterval = this.updateIntervals.normal;
        this.lastPositions = [];
        this.maxPositionHistory = 10;

        this.initBatteryMonitoring();
    }

    /**
     * Initialize battery monitoring
     */
    async initBatteryMonitoring() {
        if ('getBattery' in navigator) {
            try {
                const battery = await navigator.getBattery();
                this.batteryLevel = battery.level * 100;

                battery.addEventListener('levelchange', () => {
                    this.batteryLevel = battery.level * 100;
                    this.updateBatterySaverMode();
                });

                battery.addEventListener('chargingchange', () => {
                    this.updateBatterySaverMode();
                });

                this.updateBatterySaverMode();
            } catch (error) {
                console.log('Battery API not supported');
            }
        }
    }

    /**
     * Update battery saver mode based on battery level
     */
    updateBatterySaverMode() {
        const lowBattery = this.batteryLevel < 20;

        if (lowBattery && !this.batterySaverMode) {
            this.enableBatterySaver();
        }
    }

    /**
     * Enable battery saver mode
     */
    enableBatterySaver() {
        this.batterySaverMode = true;
        this.currentInterval = this.updateIntervals.batterySaver;

        if (this.isTracking) {
            this.stopTracking();
            this.startTracking();
        }

        this.notifyCallbacks({ type: 'batterySaver', enabled: true });
    }

    /**
     * Disable battery saver mode
     */
    disableBatterySaver() {
        this.batterySaverMode = false;
        this.updateInterval();

        if (this.isTracking) {
            this.stopTracking();
            this.startTracking();
        }

        this.notifyCallbacks({ type: 'batterySaver', enabled: false });
    }

    /**
     * Start GPS tracking
     */
    startTracking() {
        if (this.isTracking) return;

        if (!('geolocation' in navigator)) {
            console.error('Geolocation not supported');
            return;
        }

        const options = {
            enableHighAccuracy: !this.batterySaverMode,
            maximumAge: this.batterySaverMode ? 30000 : 10000,
            timeout: 10000
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.handlePosition(position),
            (error) => this.handleError(error),
            options
        );

        this.isTracking = true;
        this.notifyCallbacks({ type: 'trackingStarted' });
    }

    /**
     * Stop GPS tracking
     */
    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        this.isTracking = false;
        this.notifyCallbacks({ type: 'trackingStopped' });
    }

    /**
     * Handle position update
     */
    handlePosition(position) {
        const newPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
        };

        // Calculate speed and heading
        if (this.currentPosition) {
            this.speed = this.calculateSpeed(this.currentPosition, newPosition);
            this.heading = this.calculateHeading(this.currentPosition, newPosition);
        }

        this.currentPosition = newPosition;
        this.accuracy = position.coords.accuracy;

        // Update position history
        this.lastPositions.push(newPosition);
        if (this.lastPositions.length > this.maxPositionHistory) {
            this.lastPositions.shift();
        }

        // Adaptive interval adjustment
        this.updateInterval();

        // Collect crowd data
        if (window.crowdDataManager) {
            window.crowdDataManager.collectDataPoint(newPosition, this.speed, this.heading);
        }

        // Notify callbacks
        this.notifyCallbacks({
            type: 'positionUpdate',
            position: newPosition,
            speed: this.speed,
            heading: this.heading,
            accuracy: this.accuracy
        });
    }

    /**
     * Handle GPS error
     */
    handleError(error) {
        console.error('GPS Error:', error.message);
        this.notifyCallbacks({
            type: 'error',
            error: error.message
        });
    }

    /**
     * Calculate speed between two positions (km/h)
     */
    calculateSpeed(pos1, pos2) {
        const distance = this.calculateDistance(pos1.lat, pos1.lng, pos2.lat, pos2.lng);
        const timeDiff = (pos2.timestamp - pos1.timestamp) / 1000; // seconds

        if (timeDiff === 0) return this.speed;

        const speedKmh = (distance / timeDiff) * 3600;
        return Math.min(speedKmh, 200); // Cap at reasonable maximum
    }

    /**
     * Calculate heading between two positions (degrees)
     */
    calculateHeading(pos1, pos2) {
        const dLng = this.toRad(pos2.lng - pos1.lng);
        const lat1 = this.toRad(pos1.lat);
        const lat2 = this.toRad(pos2.lat);

        const y = Math.sin(dLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
                  Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

        const heading = Math.atan2(y, x);
        return (this.toDeg(heading) + 360) % 360;
    }

    /**
     * Calculate distance between two coordinates (km)
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Update GPS sampling interval based on speed
     */
    updateInterval() {
        if (this.batterySaverMode) {
            return; // Keep battery saver interval
        }

        let newInterval;

        if (this.speed < 5) {
            newInterval = this.updateIntervals.stationary;
        } else if (this.speed < 20) {
            newInterval = this.updateIntervals.slow;
        } else if (this.speed < 60) {
            newInterval = this.updateIntervals.normal;
        } else {
            newInterval = this.updateIntervals.fast;
        }

        if (newInterval !== this.currentInterval) {
            this.currentInterval = newInterval;
            // Restart tracking with new interval
            if (this.isTracking) {
                this.stopTracking();
                this.startTracking();
            }
        }
    }

    /**
     * Get current position
     */
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!('geolocation' in navigator)) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => reject(error),
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    /**
     * Check if user is stationary
     */
    isStationary() {
        if (this.lastPositions.length < 3) return false;

        const recentPositions = this.lastPositions.slice(-3);
        const maxDistance = Math.max(
            ...recentPositions.map((pos, i) => {
                if (i === 0) return 0;
                return this.calculateDistance(
                    recentPositions[i-1].lat, recentPositions[i-1].lng,
                    pos.lat, pos.lng
                );
            })
        );

        return maxDistance < 0.05; // Less than 50 meters movement
    }

    /**
     * Get smoothed position (average of recent positions)
     */
    getSmoothedPosition() {
        if (this.lastPositions.length === 0) return null;

        const recentPositions = this.lastPositions.slice(-5);
        const avgLat = recentPositions.reduce((sum, p) => sum + p.lat, 0) / recentPositions.length;
        const avgLng = recentPositions.reduce((sum, p) => sum + p.lng, 0) / recentPositions.length;

        return { lat: avgLat, lng: avgLng };
    }

    /**
     * Register callback for GPS events
     */
    onUpdate(callback) {
        this.callbacks.push(callback);
    }

    /**
     * Notify all callbacks
     */
    notifyCallbacks(data) {
        this.callbacks.forEach(callback => callback(data));
    }

    /**
     * Utility: Degrees to radians
     */
    toRad(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * Utility: Radians to degrees
     */
    toDeg(radians) {
        return radians * 180 / Math.PI;
    }

    /**
     * Get tracking statistics
     */
    getStats() {
        return {
            isTracking: this.isTracking,
            batterySaverMode: this.batterySaverMode,
            batteryLevel: this.batteryLevel,
            currentSpeed: this.speed,
            currentHeading: this.heading,
            accuracy: this.accuracy,
            updateInterval: this.currentInterval,
            positionHistory: this.lastPositions.length
        };
    }
}

// Create global instance
window.gpsTracker = new GPSTracker();
