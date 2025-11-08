/**
 * Incident Manager Module
 * Handles incident reporting, validation, and display
 */

class IncidentManager {
    constructor() {
        this.incidents = new Map();
        this.incidentMarkers = new Map();
        this.incidentTypes = {
            accident: { emoji: '🚗', color: '#F44336', priority: 5 },
            hazard: { emoji: '⚠️', color: '#FFC107', priority: 4 },
            closure: { emoji: '🚧', color: '#F44336', priority: 5 },
            police: { emoji: '🚓', color: '#2196F3', priority: 3 },
            traffic: { emoji: '🚦', color: '#FF9800', priority: 4 },
            other: { emoji: '📍', color: '#9E9E9E', priority: 2 }
        };
        this.showIncidents = true;
    }

    /**
     * Report a new incident
     */
    async reportIncident(type, location, details = '') {
        if (!this.incidentTypes[type]) {
            console.error('Invalid incident type:', type);
            return null;
        }

        if (!location || !location.lat || !location.lng) {
            console.error('Invalid location');
            return null;
        }

        // Check for duplicate nearby incidents
        const existingIncident = await this.findNearbyIncident(location, type, 0.1); // 100m radius

        if (existingIncident) {
            // Update existing incident vote count
            this.confirmIncident(existingIncident.id);
            return existingIncident;
        }

        // Create new incident
        const incident = {
            id: this.generateIncidentId(),
            type,
            lat: location.lat,
            lng: location.lng,
            details,
            timestamp: Date.now(),
            confirmed: 1, // Number of reports
            priority: this.incidentTypes[type].priority
        };

        // Store in memory
        this.incidents.set(incident.id, incident);

        // Store in IndexedDB via crowd data manager
        if (window.crowdDataManager) {
            window.crowdDataManager.storeIncident(incident);
        }

        // Add marker to map if map exists
        if (window.map) {
            this.addIncidentMarker(incident);
        }

        return incident;
    }

    /**
     * Find nearby incident of same type
     */
    async findNearbyIncident(location, type, radiusKm) {
        for (const [id, incident] of this.incidents) {
            if (incident.type !== type) continue;

            const distance = this.calculateDistance(
                location.lat, location.lng,
                incident.lat, incident.lng
            );

            if (distance <= radiusKm) {
                return incident;
            }
        }

        return null;
    }

    /**
     * Confirm an existing incident (upvote)
     */
    confirmIncident(incidentId) {
        const incident = this.incidents.get(incidentId);

        if (!incident) {
            console.error('Incident not found:', incidentId);
            return;
        }

        incident.confirmed++;

        // Update marker if it exists
        if (this.incidentMarkers.has(incidentId)) {
            this.updateIncidentMarker(incident);
        }
    }

    /**
     * Add incident marker to map
     */
    addIncidentMarker(incident) {
        if (!window.map || !this.showIncidents) return;

        const incidentInfo = this.incidentTypes[incident.type];

        // Create custom icon
        const iconHtml = `
            <div class="incident-marker marker-${incident.type}"
                 style="background: ${incidentInfo.color}">
                ${incidentInfo.emoji}
            </div>
        `;

        const icon = L.divIcon({
            html: iconHtml,
            className: 'custom-incident-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        // Create marker
        const marker = L.marker([incident.lat, incident.lng], { icon });

        // Create popup content
        const popupContent = this.createIncidentPopup(incident);
        marker.bindPopup(popupContent);

        // Add to map
        marker.addTo(window.map);

        // Store reference
        this.incidentMarkers.set(incident.id, marker);

        // Auto-remove after expiry
        this.scheduleIncidentRemoval(incident);
    }

    /**
     * Create incident popup content
     */
    createIncidentPopup(incident) {
        const incidentInfo = this.incidentTypes[incident.type];
        const timeAgo = this.getTimeAgo(incident.timestamp);

        return `
            <div class="incident-popup">
                <h3 style="color: ${incidentInfo.color}; margin: 0 0 8px 0;">
                    ${incidentInfo.emoji} ${this.capitalize(incident.type)}
                </h3>
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #666;">
                    ${timeAgo}
                </p>
                ${incident.details ? `
                    <p style="margin: 8px 0 0 0; font-size: 14px;">
                        ${incident.details}
                    </p>
                ` : ''}
                <div style="margin-top: 8px; font-size: 12px; color: #999;">
                    ${incident.confirmed} report${incident.confirmed !== 1 ? 's' : ''}
                </div>
            </div>
        `;
    }

    /**
     * Update incident marker
     */
    updateIncidentMarker(incident) {
        const marker = this.incidentMarkers.get(incident.id);

        if (marker) {
            const popupContent = this.createIncidentPopup(incident);
            marker.setPopupContent(popupContent);
        }
    }

    /**
     * Remove incident marker
     */
    removeIncidentMarker(incidentId) {
        const marker = this.incidentMarkers.get(incidentId);

        if (marker && window.map) {
            window.map.removeLayer(marker);
            this.incidentMarkers.delete(incidentId);
        }

        this.incidents.delete(incidentId);
    }

    /**
     * Schedule incident removal after expiry
     */
    scheduleIncidentRemoval(incident) {
        const expiryTime = this.getExpiryTime(incident.type);
        const timeUntilExpiry = (incident.timestamp + expiryTime) - Date.now();

        if (timeUntilExpiry > 0) {
            setTimeout(() => {
                this.removeIncidentMarker(incident.id);
            }, timeUntilExpiry);
        }
    }

    /**
     * Get expiry time for incident type (ms)
     */
    getExpiryTime(type) {
        const expiryTimes = {
            accident: 2 * 60 * 60 * 1000,  // 2 hours
            hazard: 4 * 60 * 60 * 1000,    // 4 hours
            closure: 8 * 60 * 60 * 1000,   // 8 hours
            police: 1 * 60 * 60 * 1000,    // 1 hour
            traffic: 30 * 60 * 1000,       // 30 minutes
            other: 2 * 60 * 60 * 1000      // 2 hours
        };

        return expiryTimes[type] || expiryTimes.other;
    }

    /**
     * Load incidents from storage
     */
    async loadIncidents(bounds) {
        if (!window.crowdDataManager) return;

        // Get center of bounds
        const center = bounds.getCenter();

        // Get nearby incidents from storage
        const incidents = await window.crowdDataManager.getNearbyIncidents(
            center.lat,
            center.lng,
            20 // 20km radius
        );

        // Filter out expired incidents
        const now = Date.now();
        const activeIncidents = incidents.filter(incident => {
            const expiryTime = this.getExpiryTime(incident.type);
            return (now - incident.timestamp) < expiryTime;
        });

        // Add to map
        activeIncidents.forEach(incident => {
            if (!this.incidents.has(incident.id)) {
                this.incidents.set(incident.id, incident);
                this.addIncidentMarker(incident);
            }
        });
    }

    /**
     * Clear all incident markers from map
     */
    clearAllMarkers() {
        this.incidentMarkers.forEach((marker, id) => {
            if (window.map) {
                window.map.removeLayer(marker);
            }
        });

        this.incidentMarkers.clear();
    }

    /**
     * Toggle incident visibility
     */
    toggleIncidentVisibility(show) {
        this.showIncidents = show;

        if (show) {
            // Re-add all markers
            this.incidents.forEach(incident => {
                if (!this.incidentMarkers.has(incident.id)) {
                    this.addIncidentMarker(incident);
                }
            });
        } else {
            // Remove all markers
            this.clearAllMarkers();
        }
    }

    /**
     * Get incidents along route
     */
    getIncidentsOnRoute(routeCoordinates, bufferKm = 0.5) {
        const incidentsOnRoute = [];

        this.incidents.forEach(incident => {
            const onRoute = routeCoordinates.some(coord => {
                const distance = this.calculateDistance(
                    incident.lat, incident.lng,
                    coord[0], coord[1]
                );
                return distance <= bufferKm;
            });

            if (onRoute) {
                incidentsOnRoute.push(incident);
            }
        });

        // Sort by priority
        return incidentsOnRoute.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Generate unique incident ID
     */
    generateIncidentId() {
        return `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
     * Get time ago string
     */
    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;

        return `${Math.floor(seconds / 86400)} days ago`;
    }

    /**
     * Capitalize first letter
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Utility: Degrees to radians
     */
    toRad(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * Get incident statistics
     */
    getStats() {
        const stats = {
            total: this.incidents.size,
            byType: {}
        };

        Object.keys(this.incidentTypes).forEach(type => {
            stats.byType[type] = 0;
        });

        this.incidents.forEach(incident => {
            stats.byType[incident.type]++;
        });

        return stats;
    }
}

// Create global instance
window.incidentManager = new IncidentManager();
