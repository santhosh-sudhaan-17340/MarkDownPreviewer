package com.hotel.booking.service;

import com.hotel.booking.exception.ResourceNotFoundException;
import com.hotel.booking.model.AuditLog;
import com.hotel.booking.model.CancellationRule;
import com.hotel.booking.model.Reservation;
import com.hotel.booking.repository.AuditLogRepository;
import com.hotel.booking.repository.CancellationRuleRepository;
import com.hotel.booking.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Cancellation Service
 * Handles reservation cancellations with refund calculation based on policies
 */
@Service
@RequiredArgsConstructor
public class CancellationService {

    private final ReservationRepository reservationRepository;
    private final CancellationRuleRepository cancellationRuleRepository;
    private final AuditLogRepository auditLogRepository;

    /**
     * Cancel a reservation and calculate refund based on cancellation policy
     */
    @Transactional
    public CancellationResult cancelReservation(Long reservationId, String reason) {
        Reservation reservation = reservationRepository.findById(reservationId)
            .orElseThrow(() -> new ResourceNotFoundException("Reservation not found with id: " + reservationId));

        // Check if reservation can be cancelled
        if (reservation.getStatus() == Reservation.ReservationStatus.CANCELLED) {
            throw new IllegalStateException("Reservation is already cancelled");
        }

        if (reservation.getStatus() == Reservation.ReservationStatus.COMPLETED) {
            throw new IllegalStateException("Cannot cancel a completed reservation");
        }

        // Calculate days before check-in
        long daysBeforeCheckIn = ChronoUnit.DAYS.between(LocalDate.now(), reservation.getCheckInDate());

        // Calculate refund percentage based on cancellation policy
        BigDecimal refundPercentage = calculateRefundPercentage(
            reservation.getCancellationPolicy().name(),
            (int) daysBeforeCheckIn
        );

        // Calculate refund amount
        BigDecimal refundAmount = reservation.getTotalPrice()
            .multiply(refundPercentage)
            .divide(BigDecimal.valueOf(100));

        // Update reservation
        reservation.setStatus(Reservation.ReservationStatus.CANCELLED);
        reservation.setCancellationDate(LocalDateTime.now());
        reservation.setCancellationReason(reason);
        reservation.setRefundPercentage(refundPercentage);
        reservation.setIsRefundable(refundPercentage.compareTo(BigDecimal.ZERO) > 0);

        reservationRepository.save(reservation);

        // Create audit log
        createAuditLog("RESERVATION", reservationId, "CANCEL",
            "Reservation cancelled. Days before check-in: " + daysBeforeCheckIn +
            ", Refund percentage: " + refundPercentage + "%",
            "SYSTEM");

        return new CancellationResult(
            reservationId,
            reservation.getTotalPrice(),
            refundAmount,
            refundPercentage,
            daysBeforeCheckIn,
            reservation.getCancellationPolicy().name()
        );
    }

    /**
     * Calculate refund percentage based on cancellation policy and days before check-in
     */
    public BigDecimal calculateRefundPercentage(String policyName, int daysBeforeCheckIn) {
        List<CancellationRule> rules = cancellationRuleRepository
            .findByPolicyNameOrderByDaysDesc(policyName);

        if (rules.isEmpty()) {
            // Default: no refund if no rules found
            return BigDecimal.ZERO;
        }

        // Find the applicable rule based on days before check-in
        for (CancellationRule rule : rules) {
            if (daysBeforeCheckIn >= rule.getDaysBeforeCheckin()) {
                return rule.getRefundPercentage();
            }
        }

        // If no rule matches, use the rule with the smallest days requirement
        return rules.get(rules.size() - 1).getRefundPercentage();
    }

    /**
     * Get cancellation rules for a policy
     */
    public List<CancellationRule> getCancellationRules(String policyName) {
        return cancellationRuleRepository.findByPolicyNameOrderByDaysDesc(policyName);
    }

    /**
     * Preview cancellation refund without actually cancelling
     */
    public CancellationPreview previewCancellation(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
            .orElseThrow(() -> new ResourceNotFoundException("Reservation not found with id: " + reservationId));

        long daysBeforeCheckIn = ChronoUnit.DAYS.between(LocalDate.now(), reservation.getCheckInDate());

        BigDecimal refundPercentage = calculateRefundPercentage(
            reservation.getCancellationPolicy().name(),
            (int) daysBeforeCheckIn
        );

        BigDecimal refundAmount = reservation.getTotalPrice()
            .multiply(refundPercentage)
            .divide(BigDecimal.valueOf(100));

        return new CancellationPreview(
            reservationId,
            reservation.getTotalPrice(),
            refundAmount,
            refundPercentage,
            daysBeforeCheckIn,
            reservation.getCancellationPolicy().name()
        );
    }

    /**
     * Create audit log entry
     */
    private void createAuditLog(String entityType, Long entityId, String action,
                               String details, String performedBy) {
        AuditLog auditLog = new AuditLog();
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setAction(action);
        auditLog.setDetails(details);
        auditLog.setPerformedBy(performedBy);
        auditLogRepository.save(auditLog);
    }

    /**
     * Result of a cancellation
     */
    public static class CancellationResult {
        public final Long reservationId;
        public final BigDecimal originalAmount;
        public final BigDecimal refundAmount;
        public final BigDecimal refundPercentage;
        public final long daysBeforeCheckIn;
        public final String cancellationPolicy;

        public CancellationResult(Long reservationId, BigDecimal originalAmount,
                                 BigDecimal refundAmount, BigDecimal refundPercentage,
                                 long daysBeforeCheckIn, String cancellationPolicy) {
            this.reservationId = reservationId;
            this.originalAmount = originalAmount;
            this.refundAmount = refundAmount;
            this.refundPercentage = refundPercentage;
            this.daysBeforeCheckIn = daysBeforeCheckIn;
            this.cancellationPolicy = cancellationPolicy;
        }
    }

    /**
     * Preview of a cancellation (without actually cancelling)
     */
    public static class CancellationPreview {
        public final Long reservationId;
        public final BigDecimal originalAmount;
        public final BigDecimal estimatedRefund;
        public final BigDecimal refundPercentage;
        public final long daysBeforeCheckIn;
        public final String cancellationPolicy;

        public CancellationPreview(Long reservationId, BigDecimal originalAmount,
                                  BigDecimal estimatedRefund, BigDecimal refundPercentage,
                                  long daysBeforeCheckIn, String cancellationPolicy) {
            this.reservationId = reservationId;
            this.originalAmount = originalAmount;
            this.estimatedRefund = estimatedRefund;
            this.refundPercentage = refundPercentage;
            this.daysBeforeCheckIn = daysBeforeCheckIn;
            this.cancellationPolicy = cancellationPolicy;
        }
    }
}
