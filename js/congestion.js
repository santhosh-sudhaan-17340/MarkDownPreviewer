/**
 * Congestion Prediction Module
 * Predicts traffic congestion using crowd data and historical patterns
 */

class CongestionPredictor {
    constructor() {
        this.historicalData = new Map();
        this.predictions = new Map();
        this.timeSlots = 24; // Hour-based predictions
        this.learningRate = 0.1;
        this.initHistoricalPatterns();
    }

    /**
     * Initialize with typical traffic patterns
     */
    initHistoricalPatterns() {
        // Typical weekday traffic patterns (0-23 hours)
        this.weekdayPatterns = {
            morning: { start: 7, end: 9, congestion: 0.8 },
            midday: { start: 12, end: 14, congestion: 0.5 },
            evening: { start: 17, end: 19, congestion: 0.9 },
            night: { start: 22, end: 6, congestion: 0.1 }
        };

        // Weekend patterns
        this.weekendPatterns = {
            morning: { start: 10, end: 12, congestion: 0.4 },
            afternoon: { start: 14, end: 18, congestion: 0.5 },
            night: { start: 22, end: 6, congestion: 0.1 }
        };
    }

    /**
     * Predict congestion for a route
     */
    async predictCongestion(routeCoordinates, timeOffset = 0) {
        const predictions = [];
        const currentTime = new Date(Date.now() + timeOffset);
        const isWeekend = currentTime.getDay() === 0 || currentTime.getDay() === 6;

        for (let i = 0; i < routeCoordinates.length - 1; i++) {
            const segment = {
                start: routeCoordinates[i],
                end: routeCoordinates[i + 1]
            };

            const segmentId = this.getSegmentId(segment.start[0], segment.start[1]);

            // Get real-time data from crowd data
            const crowdData = await this.getCrowdDataForSegment(segmentId);

            // Get historical pattern
            const historicalPrediction = this.getHistoricalPrediction(currentTime, isWeekend);

            // Combine predictions
            const prediction = this.combinePredictions(crowdData, historicalPrediction);

            predictions.push({
                segmentId,
                coordinates: segment,
                congestionLevel: prediction.level,
                congestionScore: prediction.score,
                confidence: prediction.confidence,
                estimatedSpeed: prediction.estimatedSpeed
            });
        }

        return predictions;
    }

    /**
     * Get crowd data for a segment
     */
    async getCrowdDataForSegment(segmentId) {
        if (!window.crowdDataManager) {
            return null;
        }

        const data = await window.crowdDataManager.getSegmentData(segmentId);

        if (!data || data.recentSampleSize < 3) {
            return null;
        }

        return {
            avgSpeed: data.avgSpeed,
            sampleSize: data.recentSampleSize,
            trafficLevel: data.trafficLevel
        };
    }

    /**
     * Get historical prediction based on time
     */
    getHistoricalPrediction(time, isWeekend) {
        const hour = time.getHours();
        const patterns = isWeekend ? this.weekendPatterns : this.weekdayPatterns;

        let congestionScore = 0.2; // Base congestion

        for (const [key, pattern] of Object.entries(patterns)) {
            if (this.isInTimeRange(hour, pattern.start, pattern.end)) {
                congestionScore = pattern.congestion;
                break;
            }
        }

        return {
            score: congestionScore,
            source: 'historical'
        };
    }

    /**
     * Check if hour is in time range (handles overnight ranges)
     */
    isInTimeRange(hour, start, end) {
        if (start <= end) {
            return hour >= start && hour <= end;
        } else {
            // Overnight range (e.g., 22:00 to 6:00)
            return hour >= start || hour <= end;
        }
    }

    /**
     * Combine crowd data and historical predictions
     */
    combinePredictions(crowdData, historicalPrediction) {
        if (!crowdData) {
            // No real-time data, use historical only
            return {
                level: this.scoreToLevel(historicalPrediction.score),
                score: historicalPrediction.score,
                confidence: 0.5,
                estimatedSpeed: this.scoreToSpeed(historicalPrediction.score)
            };
        }

        // Weight real-time data more heavily
        const crowdWeight = Math.min(crowdData.sampleSize / 10, 0.8);
        const historicalWeight = 1 - crowdWeight;

        const crowdScore = this.speedToScore(crowdData.avgSpeed);
        const combinedScore = (crowdScore * crowdWeight) + (historicalPrediction.score * historicalWeight);

        return {
            level: crowdData.trafficLevel,
            score: combinedScore,
            confidence: crowdWeight,
            estimatedSpeed: crowdData.avgSpeed
        };
    }

    /**
     * Convert speed to congestion score (0-1, higher = more congestion)
     */
    speedToScore(speed) {
        if (speed >= 60) return 0.1;
        if (speed >= 40) return 0.3;
        if (speed >= 25) return 0.5;
        if (speed >= 15) return 0.7;
        return 0.9;
    }

    /**
     * Convert congestion score to speed estimate
     */
    scoreToSpeed(score) {
        if (score < 0.2) return 70;
        if (score < 0.4) return 50;
        if (score < 0.6) return 35;
        if (score < 0.8) return 20;
        return 10;
    }

    /**
     * Convert congestion score to level
     */
    scoreToLevel(score) {
        if (score < 0.3) return 'light';
        if (score < 0.5) return 'moderate';
        if (score < 0.7) return 'heavy';
        return 'severe';
    }

    /**
     * Calculate ETA adjustment based on congestion
     */
    calculateETAAdjustment(baseDuration, predictions) {
        if (predictions.length === 0) return baseDuration;

        const avgCongestion = predictions.reduce((sum, p) => sum + p.congestionScore, 0) / predictions.length;

        // Adjust duration based on average congestion
        // Score 0.1 (light) = 1.0x duration
        // Score 0.5 (moderate) = 1.3x duration
        // Score 0.9 (severe) = 2.0x duration
        const multiplier = 1 + (avgCongestion * 1.1);

        return baseDuration * multiplier;
    }

    /**
     * Get color for traffic visualization
     */
    getTrafficColor(level) {
        const colors = {
            light: '#4CAF50',
            moderate: '#FFC107',
            heavy: '#FF9800',
            severe: '#F44336'
        };
        return colors[level] || colors.moderate;
    }

    /**
     * Get segment ID from coordinates
     */
    getSegmentId(lat, lng) {
        const gridSize = 0.001;
        const gridLat = Math.floor(lat / gridSize);
        const gridLng = Math.floor(lng / gridSize);
        return `${gridLat}_${gridLng}`;
    }

    /**
     * Learn from actual travel time vs predicted
     */
    updatePredictionModel(routeId, predictedDuration, actualDuration) {
        const error = actualDuration - predictedDuration;
        const adjustmentFactor = error / predictedDuration;

        // Store for future improvements
        if (!this.historicalData.has(routeId)) {
            this.historicalData.set(routeId, []);
        }

        this.historicalData.get(routeId).push({
            timestamp: Date.now(),
            predictedDuration,
            actualDuration,
            adjustmentFactor
        });

        // Keep only recent history
        const history = this.historicalData.get(routeId);
        if (history.length > 100) {
            history.shift();
        }
    }

    /**
     * Get confidence level for prediction
     */
    getConfidenceLevel(sampleSize) {
        if (sampleSize >= 20) return 'high';
        if (sampleSize >= 10) return 'medium';
        if (sampleSize >= 3) return 'low';
        return 'very-low';
    }

    /**
     * Predict congestion for future time
     */
    predictFutureCongestion(coordinates, minutesAhead) {
        const futureTime = Date.now() + (minutesAhead * 60 * 1000);
        return this.predictCongestion(coordinates, minutesAhead * 60 * 1000);
    }

    /**
     * Get traffic summary for route
     */
    async getRouteSummary(routeCoordinates) {
        const predictions = await this.predictCongestion(routeCoordinates);

        const summary = {
            totalSegments: predictions.length,
            light: 0,
            moderate: 0,
            heavy: 0,
            severe: 0,
            avgConfidence: 0,
            avgSpeed: 0
        };

        predictions.forEach(p => {
            summary[p.congestionLevel]++;
            summary.avgConfidence += p.confidence;
            summary.avgSpeed += p.estimatedSpeed;
        });

        summary.avgConfidence /= predictions.length;
        summary.avgSpeed /= predictions.length;

        // Determine overall traffic status
        if (summary.severe > predictions.length * 0.3) {
            summary.overallStatus = 'severe';
        } else if (summary.heavy > predictions.length * 0.3) {
            summary.overallStatus = 'heavy';
        } else if (summary.moderate > predictions.length * 0.4) {
            summary.overallStatus = 'moderate';
        } else {
            summary.overallStatus = 'light';
        }

        return summary;
    }

    /**
     * Clear cached predictions
     */
    clearCache() {
        this.predictions.clear();
    }
}

// Create global instance
window.congestionPredictor = new CongestionPredictor();
