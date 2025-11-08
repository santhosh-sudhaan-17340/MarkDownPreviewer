const pool = require('../config/database');

/**
 * Analytics and reporting service with heavy SQL queries
 * for logistic optimization and business intelligence
 */
class AnalyticsService {
  /**
   * Get locker occupancy and utilization report
   */
  async getOccupancyReport(locationId = null, startDate = null, endDate = null) {
    let query = `
      SELECT
        ll.id,
        ll.name as locker_name,
        ll.city,
        ll.address,
        COUNT(DISTINCT ls.id) as total_slots,
        COUNT(DISTINCT ls.id) FILTER (WHERE ls.status = 'available') as available_slots,
        COUNT(DISTINCT ls.id) FILTER (WHERE ls.status = 'occupied') as occupied_slots,
        COUNT(DISTINCT ls.id) FILTER (WHERE ls.status = 'reserved') as reserved_slots,
        COUNT(DISTINCT ls.id) FILTER (WHERE ls.status = 'maintenance') as maintenance_slots,
        COUNT(DISTINCT ls.id) FILTER (WHERE ls.status = 'broken') as broken_slots,
        ROUND(
          (COUNT(DISTINCT ls.id) FILTER (WHERE ls.status IN ('occupied', 'reserved')))::NUMERIC /
          NULLIF(COUNT(DISTINCT ls.id), 0) * 100, 2
        ) as current_occupancy_percentage,
        COUNT(DISTINCT ls.id) FILTER (WHERE ls.size = 'small') as small_slots,
        COUNT(DISTINCT ls.id) FILTER (WHERE ls.size = 'medium') as medium_slots,
        COUNT(DISTINCT ls.id) FILTER (WHERE ls.size = 'large') as large_slots,
        COUNT(DISTINCT ls.id) FILTER (WHERE ls.size = 'extra_large') as extra_large_slots,
        ll.status as locker_status
      FROM locker_locations ll
      LEFT JOIN locker_slots ls ON ll.id = ls.locker_location_id
    `;

    const params = [];
    let paramCount = 0;

    if (locationId) {
      paramCount++;
      query += ` WHERE ll.id = $${paramCount}`;
      params.push(locationId);
    }

    query += `
      GROUP BY ll.id, ll.name, ll.city, ll.address, ll.status
      ORDER BY current_occupancy_percentage DESC NULLS LAST
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get overfill report - Locations at risk of running out of capacity
   */
  async getOverfillReport(threshold = 80) {
    const query = `
      WITH locker_stats AS (
        SELECT
          ll.id,
          ll.name,
          ll.city,
          ll.address,
          COUNT(ls.id) as total_slots,
          COUNT(ls.id) FILTER (WHERE ls.status IN ('occupied', 'reserved')) as used_slots,
          COUNT(ls.id) FILTER (WHERE ls.status = 'available') as available_slots,
          ROUND(
            (COUNT(ls.id) FILTER (WHERE ls.status IN ('occupied', 'reserved')))::NUMERIC /
            NULLIF(COUNT(ls.id), 0) * 100, 2
          ) as occupancy_percentage,
          -- Future demand prediction based on pending parcels
          COUNT(DISTINCT p.id) FILTER (WHERE p.status IN ('pending', 'in_transit')) as pending_deliveries,
          -- Size breakdown
          COUNT(ls.id) FILTER (WHERE ls.size = 'small' AND ls.status = 'available') as available_small,
          COUNT(ls.id) FILTER (WHERE ls.size = 'medium' AND ls.status = 'available') as available_medium,
          COUNT(ls.id) FILTER (WHERE ls.size = 'large' AND ls.status = 'available') as available_large,
          COUNT(ls.id) FILTER (WHERE ls.size = 'extra_large' AND ls.status = 'available') as available_extra_large
        FROM locker_locations ll
        LEFT JOIN locker_slots ls ON ll.id = ls.locker_location_id
        LEFT JOIN reservations r ON ls.id = r.slot_id AND r.status = 'active'
        LEFT JOIN parcels p ON r.parcel_id = p.id
        WHERE ll.status = 'active'
        GROUP BY ll.id, ll.name, ll.city, ll.address
      )
      SELECT
        *,
        CASE
          WHEN occupancy_percentage >= 90 THEN 'CRITICAL'
          WHEN occupancy_percentage >= 80 THEN 'HIGH'
          WHEN occupancy_percentage >= 70 THEN 'MEDIUM'
          ELSE 'LOW'
        END as risk_level,
        CASE
          WHEN available_slots < pending_deliveries THEN 'INSUFFICIENT_CAPACITY'
          WHEN available_slots < (pending_deliveries * 1.2) THEN 'TIGHT_CAPACITY'
          ELSE 'ADEQUATE_CAPACITY'
        END as capacity_status
      FROM locker_stats
      WHERE occupancy_percentage >= $1 OR available_slots < pending_deliveries
      ORDER BY occupancy_percentage DESC, pending_deliveries DESC
    `;

    const result = await pool.query(query, [threshold]);
    return result.rows;
  }

  /**
   * Logistics optimization - Find optimal locker for delivery
   */
  async findOptimalLocker(size, latitude = null, longitude = null, maxDistance = 50) {
    const query = `
      WITH locker_availability AS (
        SELECT
          ll.id,
          ll.name,
          ll.city,
          ll.address,
          ll.latitude,
          ll.longitude,
          COUNT(ls.id) FILTER (WHERE ls.size = $1 AND ls.status = 'available') as available_slots_for_size,
          COUNT(ls.id) FILTER (WHERE ls.status = 'available') as total_available_slots,
          COUNT(ls.id) as total_slots,
          ROUND(
            (COUNT(ls.id) FILTER (WHERE ls.status IN ('occupied', 'reserved')))::NUMERIC /
            NULLIF(COUNT(ls.id), 0) * 100, 2
          ) as occupancy_percentage,
          -- Calculate average pickup time for this location (efficiency metric)
          AVG(
            EXTRACT(EPOCH FROM (r.picked_up_at - r.delivered_at)) / 3600
          ) FILTER (WHERE r.picked_up_at IS NOT NULL AND r.delivered_at IS NOT NULL) as avg_pickup_time_hours,
          -- Count recent deliveries (last 7 days) to gauge activity
          COUNT(r.id) FILTER (WHERE r.reserved_at > CURRENT_TIMESTAMP - INTERVAL '7 days') as recent_deliveries
        FROM locker_locations ll
        JOIN locker_slots ls ON ll.id = ls.locker_location_id
        LEFT JOIN reservations r ON ls.id = r.slot_id
        WHERE ll.status = 'active'
        GROUP BY ll.id, ll.name, ll.city, ll.address, ll.latitude, ll.longitude
        HAVING COUNT(ls.id) FILTER (WHERE ls.size = $1 AND ls.status = 'available') > 0
      ),
      ranked_lockers AS (
        SELECT
          *,
          -- Calculate distance if coordinates provided (Haversine formula)
          CASE
            WHEN $2 IS NOT NULL AND $3 IS NOT NULL THEN
              6371 * acos(
                cos(radians($2)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians($3)) +
                sin(radians($2)) * sin(radians(latitude))
              )
            ELSE NULL
          END as distance_km,
          -- Optimization score: balance availability, occupancy, and efficiency
          (
            (available_slots_for_size::NUMERIC / NULLIF(total_slots, 0) * 40) + -- 40% weight on availability
            ((100 - occupancy_percentage) * 0.3) + -- 30% weight on low occupancy
            (CASE WHEN avg_pickup_time_hours < 24 THEN 20 ELSE 10 END) + -- 20% weight on quick pickup
            (CASE WHEN recent_deliveries > 10 THEN 10 ELSE 5 END) -- 10% weight on activity
          ) as optimization_score
        FROM locker_availability
      )
      SELECT
        id,
        name,
        city,
        address,
        latitude,
        longitude,
        available_slots_for_size,
        total_available_slots,
        total_slots,
        occupancy_percentage,
        avg_pickup_time_hours,
        recent_deliveries,
        distance_km,
        ROUND(optimization_score::NUMERIC, 2) as optimization_score,
        CASE
          WHEN distance_km IS NULL THEN NULL
          WHEN distance_km <= 5 THEN 'VERY_CLOSE'
          WHEN distance_km <= 15 THEN 'CLOSE'
          WHEN distance_km <= 30 THEN 'MODERATE'
          ELSE 'FAR'
        END as distance_category
      FROM ranked_lockers
      WHERE distance_km IS NULL OR distance_km <= $4
      ORDER BY
        CASE WHEN distance_km IS NULL THEN 0 ELSE distance_km END ASC,
        optimization_score DESC,
        available_slots_for_size DESC
      LIMIT 10
    `;

    const result = await pool.query(query, [size, latitude, longitude, maxDistance]);
    return result.rows;
  }

  /**
   * Performance metrics for a time period
   */
  async getPerformanceMetrics(startDate, endDate, locationId = null) {
    let query = `
      WITH metrics AS (
        SELECT
          ll.id as location_id,
          ll.name as location_name,
          COUNT(DISTINCT r.id) as total_reservations,
          COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'completed') as completed_pickups,
          COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'expired') as expired_parcels,
          COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'cancelled') as cancelled_parcels,
          AVG(
            EXTRACT(EPOCH FROM (r.picked_up_at - r.delivered_at)) / 3600
          ) FILTER (WHERE r.picked_up_at IS NOT NULL) as avg_pickup_time_hours,
          MIN(
            EXTRACT(EPOCH FROM (r.picked_up_at - r.delivered_at)) / 3600
          ) FILTER (WHERE r.picked_up_at IS NOT NULL) as min_pickup_time_hours,
          MAX(
            EXTRACT(EPOCH FROM (r.picked_up_at - r.delivered_at)) / 3600
          ) FILTER (WHERE r.picked_up_at IS NOT NULL) as max_pickup_time_hours,
          -- Peak occupancy calculation
          (
            SELECT MAX(daily_occupancy)
            FROM (
              SELECT
                DATE(r2.reserved_at) as date,
                COUNT(DISTINCT r2.slot_id)::NUMERIC / COUNT(DISTINCT ls2.id) * 100 as daily_occupancy
              FROM reservations r2
              JOIN locker_slots ls2 ON r2.slot_id = ls2.id
              WHERE ls2.locker_location_id = ll.id
                AND r2.reserved_at BETWEEN $1 AND $2
              GROUP BY DATE(r2.reserved_at)
            ) daily
          ) as peak_occupancy_percentage,
          COUNT(DISTINCT lhl.id) FILTER (WHERE lhl.health_status IN ('warning', 'critical')) as health_issues,
          SUM(r.pickup_attempts) as total_pickup_attempts
        FROM locker_locations ll
        LEFT JOIN locker_slots ls ON ll.id = ls.locker_location_id
        LEFT JOIN reservations r ON ls.id = r.slot_id
          AND r.reserved_at BETWEEN $1 AND $2
        LEFT JOIN locker_health_logs lhl ON ls.id = lhl.slot_id
          AND lhl.checked_at BETWEEN $1 AND $2
        WHERE 1=1
    `;

    const params = [startDate, endDate];
    let paramCount = 2;

    if (locationId) {
      paramCount++;
      query += ` AND ll.id = $${paramCount}`;
      params.push(locationId);
    }

    query += `
        GROUP BY ll.id, ll.name
      )
      SELECT
        *,
        CASE
          WHEN total_reservations > 0 THEN
            ROUND((completed_pickups::NUMERIC / total_reservations * 100), 2)
          ELSE 0
        END as pickup_success_rate,
        CASE
          WHEN total_reservations > 0 THEN
            ROUND((expired_parcels::NUMERIC / total_reservations * 100), 2)
          ELSE 0
        END as expiry_rate,
        ROUND(avg_pickup_time_hours::NUMERIC, 2) as avg_pickup_time_hours,
        ROUND(peak_occupancy_percentage::NUMERIC, 2) as peak_occupancy_percentage
      FROM metrics
      ORDER BY total_reservations DESC
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Demand forecasting based on historical patterns
   */
  async getDemandForecast(locationId, daysAhead = 7) {
    const query = `
      WITH historical_data AS (
        SELECT
          EXTRACT(DOW FROM r.reserved_at) as day_of_week,
          EXTRACT(HOUR FROM r.reserved_at) as hour_of_day,
          COUNT(*) as reservation_count,
          AVG(COUNT(*)) OVER (PARTITION BY EXTRACT(DOW FROM r.reserved_at)) as avg_for_day
        FROM reservations r
        JOIN locker_slots ls ON r.slot_id = ls.id
        WHERE ls.locker_location_id = $1
          AND r.reserved_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
        GROUP BY EXTRACT(DOW FROM r.reserved_at), EXTRACT(HOUR FROM r.reserved_at)
      ),
      forecast AS (
        SELECT
          day_of_week,
          hour_of_day,
          AVG(reservation_count) as predicted_reservations,
          STDDEV(reservation_count) as std_dev,
          MAX(reservation_count) as peak_observed
        FROM historical_data
        GROUP BY day_of_week, hour_of_day
      )
      SELECT
        day_of_week,
        CASE day_of_week
          WHEN 0 THEN 'Sunday'
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
        END as day_name,
        hour_of_day,
        ROUND(predicted_reservations::NUMERIC, 2) as predicted_reservations,
        ROUND(std_dev::NUMERIC, 2) as standard_deviation,
        peak_observed,
        ROUND((predicted_reservations + std_dev)::NUMERIC, 2) as upper_bound,
        ROUND(GREATEST(predicted_reservations - std_dev, 0)::NUMERIC, 2) as lower_bound
      FROM forecast
      ORDER BY day_of_week, hour_of_day
    `;

    const result = await pool.query(query, [locationId]);
    return result.rows;
  }

  /**
   * Slot utilization heat map
   */
  async getSlotUtilizationHeatMap(locationId, days = 30) {
    const query = `
      SELECT
        ls.id as slot_id,
        ls.slot_number,
        ls.size,
        COUNT(r.id) as total_uses,
        AVG(EXTRACT(EPOCH FROM (r.picked_up_at - r.delivered_at)) / 3600)
          FILTER (WHERE r.picked_up_at IS NOT NULL) as avg_occupancy_hours,
        COUNT(r.id) FILTER (WHERE r.status = 'expired') as expiry_count,
        COUNT(r.id) FILTER (WHERE r.status = 'completed') as pickup_count,
        ROUND(
          (COUNT(r.id) FILTER (WHERE r.status = 'completed'))::NUMERIC /
          NULLIF(COUNT(r.id), 0) * 100, 2
        ) as success_rate,
        -- Utilization score
        ROUND(
          (COUNT(r.id)::NUMERIC / $2 * 100), 2
        ) as utilization_percentage
      FROM locker_slots ls
      LEFT JOIN reservations r ON ls.id = r.slot_id
        AND r.reserved_at > CURRENT_TIMESTAMP - INTERVAL '1 day' * $2
      WHERE ls.locker_location_id = $1
      GROUP BY ls.id, ls.slot_number, ls.size
      ORDER BY utilization_percentage DESC, ls.slot_number
    `;

    const result = await pool.query(query, [locationId, days]);
    return result.rows;
  }

  /**
   * Revenue and cost analysis (if pricing is implemented)
   */
  async getRevenueAnalysis(startDate, endDate) {
    const query = `
      SELECT
        DATE(r.reserved_at) as date,
        COUNT(DISTINCT r.id) as total_reservations,
        COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'completed') as completed,
        COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'expired') as expired,
        -- Assuming pricing based on size
        SUM(CASE p.size
          WHEN 'small' THEN 2.99
          WHEN 'medium' THEN 4.99
          WHEN 'large' THEN 7.99
          WHEN 'extra_large' THEN 12.99
        END) FILTER (WHERE r.status = 'completed') as revenue,
        SUM(CASE p.size
          WHEN 'small' THEN 2.99
          WHEN 'medium' THEN 4.99
          WHEN 'large' THEN 7.99
          WHEN 'extra_large' THEN 12.99
        END) FILTER (WHERE r.status = 'expired') as lost_revenue
      FROM reservations r
      JOIN parcels p ON r.parcel_id = p.id
      WHERE r.reserved_at BETWEEN $1 AND $2
      GROUP BY DATE(r.reserved_at)
      ORDER BY date DESC
    `;

    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }
}

module.exports = new AnalyticsService();
