package com.hotel.booking.batch;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Batch Reservation Service
 * Uses JDBC batch processing for high-traffic operations
 * This is optimized for scenarios where many reservations need to be created simultaneously
 */
@Service
@RequiredArgsConstructor
public class BatchReservationService {

    private final JdbcTemplate jdbcTemplate;

    /**
     * Create multiple reservations in a single batch operation
     * This is significantly faster than individual inserts during high-traffic periods
     */
    @Transactional
    public int[] batchCreateReservations(List<BatchReservationRequest> requests) {
        String sql = "INSERT INTO reservations (room_id, user_id, check_in_date, check_out_date, " +
                    "number_of_guests, total_price, status, booking_date, cancellation_policy, " +
                    "is_refundable, refund_percentage, created_at, updated_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        return jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                BatchReservationRequest request = requests.get(i);
                ps.setLong(1, request.roomId);
                ps.setLong(2, request.userId);
                ps.setDate(3, Date.valueOf(request.checkInDate));
                ps.setDate(4, Date.valueOf(request.checkOutDate));
                ps.setInt(5, request.numberOfGuests);
                ps.setBigDecimal(6, request.totalPrice);
                ps.setString(7, request.status);
                ps.setTimestamp(8, Timestamp.valueOf(request.bookingDate));
                ps.setString(9, request.cancellationPolicy);
                ps.setBoolean(10, request.isRefundable);
                ps.setBigDecimal(11, request.refundPercentage);
                ps.setTimestamp(12, Timestamp.valueOf(LocalDateTime.now()));
                ps.setTimestamp(13, Timestamp.valueOf(LocalDateTime.now()));
            }

            @Override
            public int getBatchSize() {
                return requests.size();
            }
        });
    }

    /**
     * Batch update reservation statuses
     * Useful for bulk confirmation or cancellation operations
     */
    @Transactional
    public int[] batchUpdateReservationStatus(List<Long> reservationIds, String newStatus) {
        String sql = "UPDATE reservations SET status = ?, updated_at = ? WHERE id = ?";

        return jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                ps.setString(1, newStatus);
                ps.setTimestamp(2, Timestamp.valueOf(LocalDateTime.now()));
                ps.setLong(3, reservationIds.get(i));
            }

            @Override
            public int getBatchSize() {
                return reservationIds.size();
            }
        });
    }

    /**
     * Batch create pricing history records
     * Useful when updating prices for multiple rooms at once (e.g., seasonal pricing)
     */
    @Transactional
    public int[] batchCreatePricingHistory(List<BatchPricingHistoryRequest> requests) {
        String sql = "INSERT INTO pricing_history (room_id, old_price, new_price, effective_date, " +
                    "reason, changed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)";

        return jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                BatchPricingHistoryRequest request = requests.get(i);
                ps.setLong(1, request.roomId);
                ps.setBigDecimal(2, request.oldPrice);
                ps.setBigDecimal(3, request.newPrice);
                ps.setDate(4, Date.valueOf(request.effectiveDate));
                ps.setString(5, request.reason);
                ps.setString(6, request.changedBy);
                ps.setTimestamp(7, Timestamp.valueOf(LocalDateTime.now()));
            }

            @Override
            public int getBatchSize() {
                return requests.size();
            }
        });
    }

    /**
     * Batch update room prices
     * Updates current prices for multiple rooms in a single batch
     */
    @Transactional
    public int[] batchUpdateRoomPrices(List<BatchRoomPriceUpdate> updates) {
        String sql = "UPDATE rooms SET current_price = ?, updated_at = ? WHERE id = ?";

        return jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                BatchRoomPriceUpdate update = updates.get(i);
                ps.setBigDecimal(1, update.newPrice);
                ps.setTimestamp(2, Timestamp.valueOf(LocalDateTime.now()));
                ps.setLong(3, update.roomId);
            }

            @Override
            public int getBatchSize() {
                return updates.size();
            }
        });
    }

    /**
     * Batch create audit logs
     * Efficient logging for multiple operations
     */
    @Transactional
    public int[] batchCreateAuditLogs(List<BatchAuditLogRequest> requests) {
        String sql = "INSERT INTO audit_log (entity_type, entity_id, action, details, " +
                    "performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)";

        return jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                BatchAuditLogRequest request = requests.get(i);
                ps.setString(1, request.entityType);
                ps.setLong(2, request.entityId);
                ps.setString(3, request.action);
                ps.setString(4, request.details);
                ps.setString(5, request.performedBy);
                ps.setTimestamp(6, Timestamp.valueOf(LocalDateTime.now()));
            }

            @Override
            public int getBatchSize() {
                return requests.size();
            }
        });
    }

    // Request DTOs for batch operations

    public static class BatchReservationRequest {
        public Long roomId;
        public Long userId;
        public LocalDate checkInDate;
        public LocalDate checkOutDate;
        public Integer numberOfGuests;
        public BigDecimal totalPrice;
        public String status;
        public LocalDateTime bookingDate;
        public String cancellationPolicy;
        public Boolean isRefundable;
        public BigDecimal refundPercentage;

        public BatchReservationRequest(Long roomId, Long userId, LocalDate checkInDate,
                                      LocalDate checkOutDate, Integer numberOfGuests,
                                      BigDecimal totalPrice, String status,
                                      String cancellationPolicy) {
            this.roomId = roomId;
            this.userId = userId;
            this.checkInDate = checkInDate;
            this.checkOutDate = checkOutDate;
            this.numberOfGuests = numberOfGuests;
            this.totalPrice = totalPrice;
            this.status = status;
            this.bookingDate = LocalDateTime.now();
            this.cancellationPolicy = cancellationPolicy;
            this.isRefundable = true;
            this.refundPercentage = BigDecimal.valueOf(100.00);
        }
    }

    public static class BatchPricingHistoryRequest {
        public Long roomId;
        public BigDecimal oldPrice;
        public BigDecimal newPrice;
        public LocalDate effectiveDate;
        public String reason;
        public String changedBy;

        public BatchPricingHistoryRequest(Long roomId, BigDecimal oldPrice, BigDecimal newPrice,
                                         LocalDate effectiveDate, String reason, String changedBy) {
            this.roomId = roomId;
            this.oldPrice = oldPrice;
            this.newPrice = newPrice;
            this.effectiveDate = effectiveDate;
            this.reason = reason;
            this.changedBy = changedBy;
        }
    }

    public static class BatchRoomPriceUpdate {
        public Long roomId;
        public BigDecimal newPrice;

        public BatchRoomPriceUpdate(Long roomId, BigDecimal newPrice) {
            this.roomId = roomId;
            this.newPrice = newPrice;
        }
    }

    public static class BatchAuditLogRequest {
        public String entityType;
        public Long entityId;
        public String action;
        public String details;
        public String performedBy;

        public BatchAuditLogRequest(String entityType, Long entityId, String action,
                                   String details, String performedBy) {
            this.entityType = entityType;
            this.entityId = entityId;
            this.action = action;
            this.details = details;
            this.performedBy = performedBy;
        }
    }
}
