const geolib = require('geolib');

/**
 * Calculate distance between two coordinates in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const distance = geolib.getDistance(
    { latitude: lat1, longitude: lon1 },
    { latitude: lat2, longitude: lon2 }
  );
  return distance / 1000; // Convert meters to kilometers
};

/**
 * Find nearest delivery partners within radius
 */
const findNearestPartners = (partners, restaurantLat, restaurantLon, maxDistanceKm = 5) => {
  return partners
    .map(partner => {
      if (!partner.currentLocation || !partner.currentLocation.latitude) {
        return null;
      }

      const distance = calculateDistance(
        restaurantLat,
        restaurantLon,
        partner.currentLocation.latitude,
        partner.currentLocation.longitude
      );

      return {
        ...partner,
        distance
      };
    })
    .filter(partner => partner !== null && partner.distance <= maxDistanceKm)
    .sort((a, b) => a.distance - b.distance);
};

/**
 * Calculate estimated delivery time based on distance
 */
const estimateDeliveryTime = (distanceKm, averageSpeedKmh = 30, preparationMinutes = 20) => {
  const deliveryTimeMinutes = (distanceKm / averageSpeedKmh) * 60;
  const totalMinutes = Math.ceil(preparationMinutes + deliveryTimeMinutes);
  return totalMinutes;
};

/**
 * Calculate delivery fee based on distance
 */
const calculateDeliveryFee = (distanceKm, baseRate = 20, perKmRate = 5) => {
  if (distanceKm <= 2) {
    return baseRate;
  }
  const additionalDistance = distanceKm - 2;
  return baseRate + (additionalDistance * perKmRate);
};

/**
 * Check if location is within service area (geofencing)
 */
const isWithinServiceArea = (lat, lon, centerLat, centerLon, radiusKm) => {
  const distance = calculateDistance(lat, lon, centerLat, centerLon);
  return distance <= radiusKm;
};

/**
 * Get center point of multiple coordinates
 */
const getCenterPoint = (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  const center = geolib.getCenter(coordinates.map(coord => ({
    latitude: coord.latitude || coord.lat,
    longitude: coord.longitude || coord.lon
  })));

  return center;
};

/**
 * Optimize route for multiple delivery points (simple nearest neighbor algorithm)
 */
const optimizeRoute = (startPoint, deliveryPoints) => {
  if (!deliveryPoints || deliveryPoints.length === 0) {
    return [];
  }

  const optimized = [];
  let current = startPoint;
  const remaining = [...deliveryPoints];

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    remaining.forEach((point, index) => {
      const distance = calculateDistance(
        current.latitude,
        current.longitude,
        point.latitude,
        point.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });

    const nearest = remaining.splice(nearestIndex, 1)[0];
    optimized.push({
      ...nearest,
      distanceFromPrevious: minDistance
    });
    current = nearest;
  }

  return optimized;
};

/**
 * Generate random location within radius (for testing)
 */
const generateRandomLocation = (centerLat, centerLon, radiusKm) => {
  const radiusInDegrees = radiusKm / 111.32; // 1 degree ≈ 111.32 km

  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);

  const newLat = centerLat + y;
  const newLon = centerLon + x / Math.cos(centerLat * Math.PI / 180);

  return {
    latitude: newLat,
    longitude: newLon
  };
};

module.exports = {
  calculateDistance,
  findNearestPartners,
  estimateDeliveryTime,
  calculateDeliveryFee,
  isWithinServiceArea,
  getCenterPoint,
  optimizeRoute,
  generateRandomLocation
};
