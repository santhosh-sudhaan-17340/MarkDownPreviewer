/**
 * Crowd Data Module
 * Handles collection, storage, and aggregation of anonymous crowd-sourced traffic data
 */

class CrowdDataManager {
    constructor() {
        this.db = null;
        this.dbName = 'TrafficNavigatorDB';
        this.dbVersion = 1;
        this.enabled = true;
        this.dataPoints = [];
        this.maxDataPoints = 1000; // Maximum points to keep in memory
        this.uploadInterval = 60000; // Upload every 60 seconds
        this.uploadTimer = null;
        this.initDatabase();
    }

    /**
     * Initialize IndexedDB for local storage
     */
    initDatabase() {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = () => {
            console.error('Failed to open database');
        };

        request.onsuccess = (event) => {
            this.db = event.target.result;
            console.log('Database initialized');
            this.startPeriodicUpload();
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Store for crowd data points
            if (!db.objectStoreNames.contains('crowdData')) {
                const crowdStore = db.createObjectStore('crowdData', { keyPath: 'id', autoIncrement: true });
                crowdStore.createIndex('timestamp', 'timestamp', { unique: false });
                crowdStore.createIndex('segmentId', 'segmentId', { unique: false });
            }

            // Store for traffic segments
            if (!db.objectStoreNames.contains('trafficSegments')) {
                const segmentStore = db.createObjectStore('trafficSegments', { keyPath: 'id' });
                segmentStore.createIndex('lastUpdate', 'lastUpdate', { unique: false });
            }

            // Store for incidents
            if (!db.objectStoreNames.contains('incidents')) {
                const incidentStore = db.createObjectStore('incidents', { keyPath: 'id', autoIncrement: true });
                incidentStore.createIndex('timestamp', 'timestamp', { unique: false });
                incidentStore.createIndex('type', 'type', { unique: false });
            }
        };
    }

    /**
     * Collect a data point from current location and speed
     */
    collectDataPoint(location, speed, heading) {
        if (!this.enabled || !location) return;

        const dataPoint = {
            lat: this.anonymizeCoordinate(location.lat),
            lng: this.anonymizeCoordinate(location.lng),
            speed: Math.round(speed),
            heading: Math.round(heading),
            timestamp: Date.now(),
            segmentId: this.getSegmentId(location.lat, location.lng)
        };

        this.dataPoints.push(dataPoint);

        // Store in IndexedDB
        this.storeDataPoint(dataPoint);

        // Keep only recent data points in memory
        if (this.dataPoints.length > this.maxDataPoints) {
            this.dataPoints.shift();
        }
    }

    /**
     * Anonymize coordinate by rounding to reduce precision
     * Preserves road-level accuracy while protecting exact location
     */
    anonymizeCoordinate(coord) {
        return Math.round(coord * 10000) / 10000; // ~11m precision
    }

    /**
     * Generate a unique segment ID for a road segment
     * Used to group data points on the same road
     */
    getSegmentId(lat, lng) {
        const gridSize = 0.001; // ~111m grid
        const gridLat = Math.floor(lat / gridSize);
        const gridLng = Math.floor(lng / gridSize);
        return `${gridLat}_${gridLng}`;
    }

    /**
     * Store data point in IndexedDB
     */
    storeDataPoint(dataPoint) {
        if (!this.db) return;

        const transaction = this.db.transaction(['crowdData'], 'readwrite');
        const store = transaction.objectStore('crowdData');
        store.add(dataPoint);

        // Clean up old data (older than 24 hours)
        this.cleanupOldData();
    }

    /**
     * Clean up data older than 24 hours
     */
    cleanupOldData() {
        if (!this.db) return;

        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
        const transaction = this.db.transaction(['crowdData'], 'readwrite');
        const store = transaction.objectStore('crowdData');
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(cutoffTime);

        const request = index.openCursor(range);
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
    }

    /**
     * Get aggregated traffic data for a segment
     */
    async getSegmentData(segmentId) {
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['crowdData'], 'readonly');
            const store = transaction.objectStore('crowdData');
            const index = store.index('segmentId');
            const request = index.getAll(segmentId);

            request.onsuccess = () => {
                const points = request.result;
                if (points.length === 0) {
                    resolve(null);
                    return;
                }

                // Calculate average speed and traffic level
                const avgSpeed = points.reduce((sum, p) => sum + p.speed, 0) / points.length;
                const recentPoints = points.filter(p => Date.now() - p.timestamp < 600000); // Last 10 minutes
                const trafficLevel = this.calculateTrafficLevel(avgSpeed, recentPoints.length);

                resolve({
                    segmentId,
                    avgSpeed,
                    sampleSize: points.length,
                    recentSampleSize: recentPoints.length,
                    trafficLevel,
                    lastUpdate: Math.max(...points.map(p => p.timestamp))
                });
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Calculate traffic level based on speed and sample size
     */
    calculateTrafficLevel(avgSpeed, sampleSize) {
        // More samples = more confident in congestion
        const congestionFactor = Math.min(sampleSize / 10, 1);

        if (avgSpeed > 50) return 'light';
        if (avgSpeed > 30) return 'moderate';
        if (avgSpeed > 15) return 'heavy';
        return 'severe';
    }

    /**
     * Get traffic data for a route (array of coordinates)
     */
    async getRouteTraffic(coordinates) {
        const segments = coordinates.map(coord =>
            this.getSegmentId(coord[0], coord[1])
        );

        const uniqueSegments = [...new Set(segments)];
        const segmentData = await Promise.all(
            uniqueSegments.map(id => this.getSegmentData(id))
        );

        return segmentData.filter(data => data !== null);
    }

    /**
     * Store an incident report
     */
    storeIncident(incident) {
        if (!this.db) return;

        const transaction = this.db.transaction(['incidents'], 'readwrite');
        const store = transaction.objectStore('incidents');

        const incidentData = {
            ...incident,
            timestamp: Date.now(),
            lat: this.anonymizeCoordinate(incident.lat),
            lng: this.anonymizeCoordinate(incident.lng)
        };

        store.add(incidentData);
    }

    /**
     * Get recent incidents near a location
     */
    async getNearbyIncidents(lat, lng, radiusKm = 5) {
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['incidents'], 'readonly');
            const store = transaction.objectStore('incidents');
            const request = store.getAll();

            request.onsuccess = () => {
                const incidents = request.result;
                const cutoffTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours

                const nearbyIncidents = incidents.filter(incident => {
                    if (incident.timestamp < cutoffTime) return false;

                    const distance = this.calculateDistance(
                        lat, lng,
                        incident.lat, incident.lng
                    );

                    return distance <= radiusKm;
                });

                resolve(nearbyIncidents);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Calculate distance between two coordinates (Haversine formula)
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

    toRad(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * Simulate uploading data to server (in real app, this would send to backend)
     */
    uploadData() {
        if (!this.enabled || this.dataPoints.length === 0) return;

        console.log(`Uploading ${this.dataPoints.length} crowd data points`);

        // In a real implementation, this would send data to a backend server
        // For this demo, we just log and clear
        this.dataPoints = [];
    }

    /**
     * Start periodic data upload
     */
    startPeriodicUpload() {
        if (this.uploadTimer) {
            clearInterval(this.uploadTimer);
        }

        this.uploadTimer = setInterval(() => {
            this.uploadData();
        }, this.uploadInterval);
    }

    /**
     * Enable/disable crowd data collection
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled && this.uploadTimer) {
            clearInterval(this.uploadTimer);
            this.uploadTimer = null;
        } else if (enabled && !this.uploadTimer) {
            this.startPeriodicUpload();
        }
    }

    /**
     * Get statistics about collected data
     */
    getStats() {
        return {
            dataPointsInMemory: this.dataPoints.length,
            enabled: this.enabled,
            lastUpload: this.uploadTimer ? 'Active' : 'Inactive'
        };
    }
}

// Create global instance
window.crowdDataManager = new CrowdDataManager();
