/**
 * Main Application Module
 * Coordinates all modules and handles UI interactions
 */

class TrafficNavigatorApp {
    constructor() {
        this.map = null;
        this.userMarker = null;
        this.searchResults = [];
        this.settings = {
            crowdDataEnabled: true,
            batterySaverEnabled: false,
            voiceGuidanceEnabled: true,
            showIncidents: true,
            showTraffic: true
        };

        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Show loading indicator
            this.showLoading('Initializing map...');

            // Initialize map
            await this.initMap();

            // Initialize UI event listeners
            this.initEventListeners();

            // Load settings from localStorage
            this.loadSettings();

            // Start GPS tracking
            this.startLocationTracking();

            // Hide loading indicator
            this.hideLoading();

            // Show welcome message
            this.showToast('Welcome to Traffic Navigator!', 'success');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Failed to initialize app', 'error');
            this.hideLoading();
        }
    }

    /**
     * Initialize Leaflet map
     */
    async initMap() {
        // Create map centered on default location
        this.map = L.map('map', {
            zoomControl: true,
            attributionControl: true
        }).setView([37.7749, -122.4194], 13); // San Francisco default

        // Make map globally accessible
        window.map = this.map;

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Load incidents when map moves
        this.map.on('moveend', () => {
            if (this.settings.showIncidents && window.incidentManager) {
                window.incidentManager.loadIncidents(this.map.getBounds());
            }
        });

        // Try to center on user's location
        try {
            const position = await window.gpsTracker.getCurrentPosition();
            this.map.setView([position.lat, position.lng], 15);
            this.updateUserMarker(position);
        } catch (error) {
            console.log('Could not get user location, using default');
        }
    }

    /**
     * Initialize UI event listeners
     */
    initEventListeners() {
        // Search box
        document.getElementById('destination-input').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        document.getElementById('search-btn').addEventListener('click', () => {
            const input = document.getElementById('destination-input').value;
            if (input) this.handleSearch(input);
        });

        // Locate button
        document.getElementById('locate-btn').addEventListener('click', () => {
            this.centerOnUser();
        });

        // Report button
        document.getElementById('report-btn').addEventListener('click', () => {
            this.openReportModal();
        });

        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.openSettingsModal();
        });

        // Report modal
        document.getElementById('close-report-modal').addEventListener('click', () => {
            this.closeModal('report-modal');
        });

        document.querySelectorAll('.incident-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectIncidentType(e.currentTarget);
            });
        });

        document.getElementById('submit-incident').addEventListener('click', () => {
            this.submitIncident();
        });

        // Settings modal
        document.getElementById('close-settings-modal').addEventListener('click', () => {
            this.closeModal('settings-modal');
        });

        // Settings toggles
        document.getElementById('crowd-data-toggle').addEventListener('change', (e) => {
            this.settings.crowdDataEnabled = e.target.checked;
            window.crowdDataManager.setEnabled(e.target.checked);
            this.saveSettings();
        });

        document.getElementById('battery-saver-toggle').addEventListener('change', (e) => {
            this.settings.batterySaverEnabled = e.target.checked;
            if (e.target.checked) {
                window.gpsTracker.enableBatterySaver();
            } else {
                window.gpsTracker.disableBatterySaver();
            }
            this.saveSettings();
        });

        document.getElementById('voice-guidance-toggle').addEventListener('change', (e) => {
            this.settings.voiceGuidanceEnabled = e.target.checked;
            window.routingManager.setVoiceEnabled(e.target.checked);
            this.saveSettings();
        });

        document.getElementById('show-incidents-toggle').addEventListener('change', (e) => {
            this.settings.showIncidents = e.target.checked;
            window.incidentManager.toggleIncidentVisibility(e.target.checked);
            this.saveSettings();
        });

        document.getElementById('traffic-layer-toggle').addEventListener('change', (e) => {
            this.settings.showTraffic = e.target.checked;
            this.saveSettings();
        });

        // Route panel
        document.getElementById('close-route-panel').addEventListener('click', () => {
            this.closeRoutePanel();
        });

        // Navigation
        document.getElementById('end-navigation-btn').addEventListener('click', () => {
            this.endNavigation();
        });

        // Battery status monitoring
        this.monitorBattery();
    }

    /**
     * Start location tracking
     */
    startLocationTracking() {
        if (!window.gpsTracker) return;

        window.gpsTracker.onUpdate((data) => {
            if (data.type === 'positionUpdate') {
                this.updateUserMarker(data.position);
                this.updateNavigationDisplay(data);
            } else if (data.type === 'batterySaver') {
                this.updateBatteryStatus(data.enabled);
            }
        });

        window.gpsTracker.startTracking();
    }

    /**
     * Update user location marker
     */
    updateUserMarker(position) {
        if (!this.map) return;

        if (this.userMarker) {
            this.userMarker.setLatLng([position.lat, position.lng]);
        } else {
            const icon = L.divIcon({
                html: '<div style="background: #2196F3; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                className: 'user-location-marker',
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            });

            this.userMarker = L.marker([position.lat, position.lng], { icon }).addTo(this.map);
        }
    }

    /**
     * Handle search input
     */
    async handleSearch(query) {
        if (query.length < 3) {
            this.hideSuggestions();
            return;
        }

        try {
            // Use Nominatim for geocoding (OpenStreetMap)
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;

            const response = await fetch(url);
            const results = await response.json();

            this.searchResults = results.map(result => ({
                title: result.display_name.split(',')[0],
                address: result.display_name,
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon)
            }));

            this.displaySuggestions(this.searchResults);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    /**
     * Display search suggestions
     */
    displaySuggestions(suggestions) {
        const container = document.getElementById('suggestions-list');
        container.innerHTML = '';

        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <div class="suggestion-title">${suggestion.title}</div>
                <div class="suggestion-address">${suggestion.address}</div>
            `;
            item.addEventListener('click', () => {
                this.selectDestination(suggestion);
            });
            container.appendChild(item);
        });

        container.classList.remove('hidden');
    }

    /**
     * Hide suggestions
     */
    hideSuggestions() {
        document.getElementById('suggestions-list').classList.add('hidden');
    }

    /**
     * Select destination and calculate route
     */
    async selectDestination(destination) {
        this.hideSuggestions();
        document.getElementById('destination-input').value = destination.title;

        // Get user's current location
        const currentPos = window.gpsTracker.currentPosition;

        if (!currentPos) {
            this.showToast('Waiting for GPS location...', 'warning');
            return;
        }

        this.showLoading('Calculating routes...');

        try {
            // Calculate routes
            const routes = await window.routingManager.calculateRoute(
                currentPos,
                { lat: destination.lat, lng: destination.lng },
                true
            );

            // Display route options
            this.displayRouteOptions(routes);

            this.hideLoading();
        } catch (error) {
            console.error('Route calculation error:', error);
            this.showToast('Failed to calculate route', 'error');
            this.hideLoading();
        }
    }

    /**
     * Display route options
     */
    displayRouteOptions(routes) {
        const container = document.getElementById('route-options-container');
        container.innerHTML = '';

        routes.forEach((route, index) => {
            const option = document.createElement('div');
            option.className = 'route-option';
            if (index === 0) option.classList.add('selected');

            const duration = window.etaCalculator.formatDuration(route.eta?.estimatedDuration || route.duration);
            const distance = window.etaCalculator.formatDistance(route.distance);
            const trafficLevel = route.trafficSummary?.overallStatus || 'unknown';

            option.innerHTML = `
                <div class="route-summary">
                    <div class="route-duration">${duration}</div>
                    <div class="route-distance">${distance}</div>
                </div>
                <div class="route-traffic">
                    <div class="traffic-indicator traffic-${trafficLevel}"></div>
                    <span>${this.capitalize(trafficLevel)} traffic</span>
                    ${route.incidents.length > 0 ? `<span> · ${route.incidents.length} incident${route.incidents.length !== 1 ? 's' : ''}</span>` : ''}
                </div>
            `;

            option.addEventListener('click', () => {
                this.selectRoute(route, option);
            });

            container.appendChild(option);
        });

        document.getElementById('route-info-panel').classList.remove('hidden');
    }

    /**
     * Select a route
     */
    selectRoute(route, optionElement) {
        // Update selected state
        document.querySelectorAll('.route-option').forEach(el => {
            el.classList.remove('selected');
        });
        optionElement.classList.add('selected');

        // Draw route on map
        window.routingManager.drawRoute(route);

        // Start navigation after short delay
        setTimeout(() => {
            this.startNavigation(route);
        }, 1000);
    }

    /**
     * Start navigation
     */
    startNavigation(route) {
        this.closeRoutePanel();

        // Start turn-by-turn navigation
        window.routingManager.startNavigation(route);

        // Show navigation panel
        document.getElementById('navigation-panel').classList.remove('hidden');

        // Update initial instruction
        if (route.steps && route.steps.length > 0) {
            this.updateNavigationInstruction(route.steps[0]);
        }

        this.showToast('Navigation started', 'success');
    }

    /**
     * End navigation
     */
    endNavigation() {
        window.routingManager.stopNavigation();
        document.getElementById('navigation-panel').classList.add('hidden');
        this.showToast('Navigation ended', 'success');
    }

    /**
     * Update navigation display
     */
    async updateNavigationDisplay(data) {
        if (!window.routingManager.isNavigating) return;

        // Update ETA
        const eta = await window.etaCalculator.updateRealTimeETA();

        if (eta) {
            document.getElementById('eta-time').textContent =
                window.etaCalculator.formatDuration(eta.estimatedDuration);
            document.getElementById('eta-distance').textContent =
                window.etaCalculator.formatDistance(eta.remainingDistance);
            document.getElementById('current-speed').textContent =
                `${Math.round(data.speed)} km/h`;
            document.getElementById('traffic-status').textContent =
                this.capitalize(eta.trafficStatus);
        }
    }

    /**
     * Update navigation instruction
     */
    updateNavigationInstruction(step) {
        document.getElementById('instruction-icon').textContent = step.icon;
        document.getElementById('instruction-text').textContent = step.instruction;
    }

    /**
     * Center map on user location
     */
    centerOnUser() {
        const pos = window.gpsTracker.currentPosition;

        if (pos && this.map) {
            this.map.setView([pos.lat, pos.lng], 16);
            this.showToast('Centered on your location', 'success');
        } else {
            this.showToast('Location not available', 'warning');
        }
    }

    /**
     * Open report modal
     */
    openReportModal() {
        const pos = window.gpsTracker.currentPosition;

        if (!pos) {
            this.showToast('Waiting for GPS location...', 'warning');
            return;
        }

        document.getElementById('report-modal').classList.remove('hidden');
    }

    /**
     * Select incident type
     */
    selectIncidentType(button) {
        document.querySelectorAll('.incident-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        button.classList.add('selected');
    }

    /**
     * Submit incident report
     */
    async submitIncident() {
        const selectedBtn = document.querySelector('.incident-btn.selected');

        if (!selectedBtn) {
            this.showToast('Please select an incident type', 'warning');
            return;
        }

        const type = selectedBtn.getAttribute('data-type');
        const details = document.getElementById('incident-details').value;
        const pos = window.gpsTracker.currentPosition;

        if (!pos) {
            this.showToast('Location not available', 'error');
            return;
        }

        // Report incident
        await window.incidentManager.reportIncident(type, pos, details);

        // Close modal and reset
        this.closeModal('report-modal');
        document.querySelectorAll('.incident-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById('incident-details').value = '';

        this.showToast('Incident reported. Thank you!', 'success');
    }

    /**
     * Open settings modal
     */
    openSettingsModal() {
        document.getElementById('settings-modal').classList.remove('hidden');
    }

    /**
     * Close modal
     */
    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    /**
     * Close route panel
     */
    closeRoutePanel() {
        document.getElementById('route-info-panel').classList.add('hidden');
    }

    /**
     * Monitor battery status
     */
    async monitorBattery() {
        if ('getBattery' in navigator) {
            try {
                const battery = await navigator.getBattery();

                const updateBatteryDisplay = () => {
                    const level = Math.round(battery.level * 100);
                    document.getElementById('battery-level').textContent = `${level}%`;

                    const batteryStatus = document.getElementById('battery-status');
                    if (level < 20) {
                        batteryStatus.classList.add('low');
                        batteryStatus.classList.remove('hidden');
                    } else {
                        batteryStatus.classList.remove('low');
                        batteryStatus.classList.add('hidden');
                    }
                };

                updateBatteryDisplay();
                battery.addEventListener('levelchange', updateBatteryDisplay);
            } catch (error) {
                console.log('Battery API not available');
            }
        }
    }

    /**
     * Update battery status indicator
     */
    updateBatteryStatus(batterySaverEnabled) {
        if (batterySaverEnabled) {
            this.showToast('Battery saver mode enabled', 'warning');
        }
    }

    /**
     * Show loading indicator
     */
    showLoading(message = 'Loading...') {
        const indicator = document.getElementById('loading-indicator');
        indicator.querySelector('p').textContent = message;
        indicator.classList.remove('hidden');
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        document.getElementById('loading-indicator').classList.add('hidden');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, 3000);
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('trafficNavigatorSettings');

        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }

        // Apply settings to UI
        document.getElementById('crowd-data-toggle').checked = this.settings.crowdDataEnabled;
        document.getElementById('battery-saver-toggle').checked = this.settings.batterySaverEnabled;
        document.getElementById('voice-guidance-toggle').checked = this.settings.voiceGuidanceEnabled;
        document.getElementById('show-incidents-toggle').checked = this.settings.showIncidents;
        document.getElementById('traffic-layer-toggle').checked = this.settings.showTraffic;

        // Apply to managers
        window.crowdDataManager.setEnabled(this.settings.crowdDataEnabled);
        window.routingManager.setVoiceEnabled(this.settings.voiceGuidanceEnabled);
        window.incidentManager.toggleIncidentVisibility(this.settings.showIncidents);
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        localStorage.setItem('trafficNavigatorSettings', JSON.stringify(this.settings));
    }

    /**
     * Capitalize first letter
     */
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new TrafficNavigatorApp();
    });
} else {
    window.app = new TrafficNavigatorApp();
}
