package com.parking.mlcp.service;

import com.parking.mlcp.dto.DashboardSummaryResponse;
import com.parking.mlcp.dto.MaintenanceAlertDTO;
import com.parking.mlcp.entity.MaintenanceAlert;
import com.parking.mlcp.entity.ParkingSlot;
import com.parking.mlcp.entity.PricingRule;
import com.parking.mlcp.exception.ResourceNotFoundException;
import com.parking.mlcp.model.SlotStatus;
import com.parking.mlcp.model.TicketStatus;
import com.parking.mlcp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for admin operations and dashboard
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final ParkingSlotRepository slotRepository;
    private final ParkingTicketRepository ticketRepository;
    private final ReservationRepository reservationRepository;
    private final MaintenanceAlertRepository maintenanceAlertRepository;
    private final PricingRuleRepository pricingRuleRepository;
    private final AnalyticsService analyticsService;

    /**
     * Get dashboard summary with key metrics
     */
    @Transactional(readOnly = true)
    public DashboardSummaryResponse getDashboardSummary() {
        // Get occupancy stats
        long totalSlots = slotRepository.count();
        long availableSlots = slotRepository.countByVehicleTypeAndSlotStatus(
                null, SlotStatus.AVAILABLE);
        long currentOccupancy = slotRepository.countByVehicleTypeAndSlotStatus(
                null, SlotStatus.OCCUPIED);

        // Calculate occupancy rate
        double occupancyRate = totalSlots > 0 ?
                (double) currentOccupancy / totalSlots * 100 : 0;

        // Get active tickets and reservations
        long activeTickets = ticketRepository.findByStatus(TicketStatus.ACTIVE).size();
        long activeReservations = reservationRepository.findActiveReservations(LocalDateTime.now()).size();

        // Get revenue
        BigDecimal todayRevenue = analyticsService.getTodayRevenue();
        BigDecimal monthRevenue = analyticsService.getMonthRevenue();

        // Get critical maintenance alerts
        List<MaintenanceAlertDTO> criticalAlerts = maintenanceAlertRepository
                .findBySeverityAndOpenStatus("CRITICAL")
                .stream()
                .limit(5)
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        // Get peak hours for today
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        var peakHours = analyticsService.getPeakHourAnalysis(startOfDay, LocalDateTime.now())
                .stream()
                .limit(5)
                .collect(Collectors.toList());

        return DashboardSummaryResponse.builder()
                .totalSlots(totalSlots)
                .availableSlots(availableSlots)
                .currentOccupancy(currentOccupancy)
                .occupancyRate(Math.round(occupancyRate * 100.0) / 100.0)
                .activeTickets(activeTickets)
                .activeReservations(activeReservations)
                .todayRevenue(todayRevenue)
                .monthRevenue(monthRevenue)
                .criticalAlerts(criticalAlerts)
                .peakHours(peakHours)
                .build();
    }

    /**
     * Block a slot for maintenance or other reasons
     */
    @Transactional
    public void blockSlot(Long slotId, String reason) {
        ParkingSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Slot not found"));

        if (slot.getSlotStatus() == SlotStatus.OCCUPIED) {
            throw new IllegalStateException("Cannot block an occupied slot");
        }

        slot.setSlotStatus(SlotStatus.BLOCKED);
        slotRepository.save(slot);

        log.info("Slot {} blocked. Reason: {}", slot.getSlotNumber(), reason);
    }

    /**
     * Unblock a slot
     */
    @Transactional
    public void unblockSlot(Long slotId) {
        ParkingSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Slot not found"));

        slot.setSlotStatus(SlotStatus.AVAILABLE);
        slotRepository.save(slot);

        log.info("Slot {} unblocked", slot.getSlotNumber());
    }

    /**
     * Create maintenance alert
     */
    @Transactional
    public MaintenanceAlert createMaintenanceAlert(
            Long slotId,
            String alertType,
            String description,
            String severity) {

        ParkingSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Slot not found"));

        // Auto-block slot for critical/high severity alerts
        if ("CRITICAL".equals(severity) || "HIGH".equals(severity)) {
            slot.setSlotStatus(SlotStatus.MAINTENANCE);
            slotRepository.save(slot);
        }

        MaintenanceAlert alert = MaintenanceAlert.builder()
                .slot(slot)
                .alertType(alertType)
                .description(description)
                .severity(severity)
                .status("OPEN")
                .build();

        alert = maintenanceAlertRepository.save(alert);

        log.info("Maintenance alert created for slot {}: {} [{}]",
                slot.getSlotNumber(), alertType, severity);

        return alert;
    }

    /**
     * Resolve maintenance alert
     */
    @Transactional
    public void resolveMaintenanceAlert(Long alertId) {
        MaintenanceAlert alert = maintenanceAlertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found"));

        alert.setStatus("RESOLVED");
        alert.setResolvedAt(LocalDateTime.now());
        maintenanceAlertRepository.save(alert);

        // Make slot available again
        ParkingSlot slot = alert.getSlot();
        if (slot.getSlotStatus() == SlotStatus.MAINTENANCE) {
            slot.setSlotStatus(SlotStatus.AVAILABLE);
            slotRepository.save(slot);
        }

        log.info("Maintenance alert {} resolved for slot {}",
                alertId, slot.getSlotNumber());
    }

    /**
     * Get all maintenance alerts sorted by severity
     */
    @Transactional(readOnly = true)
    public List<MaintenanceAlertDTO> getMaintenanceAlerts() {
        return maintenanceAlertRepository.findOpenAlertsSortedBySeverity()
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Update pricing rule
     */
    @Transactional
    public PricingRule updatePricingRule(PricingRule rule) {
        if (rule.getRuleId() != null) {
            PricingRule existing = pricingRuleRepository.findById(rule.getRuleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Pricing rule not found"));
        }

        PricingRule saved = pricingRuleRepository.save(rule);
        log.info("Pricing rule updated for vehicle type: {}", rule.getVehicleType());
        return saved;
    }

    /**
     * Get all pricing rules
     */
    @Transactional(readOnly = true)
    public List<PricingRule> getAllPricingRules() {
        return pricingRuleRepository.findAll();
    }

    /**
     * Map maintenance alert to DTO
     */
    private MaintenanceAlertDTO mapToDTO(MaintenanceAlert alert) {
        return MaintenanceAlertDTO.builder()
                .alertId(alert.getAlertId())
                .slotNumber(alert.getSlot().getSlotNumber())
                .alertType(alert.getAlertType())
                .description(alert.getDescription())
                .severity(alert.getSeverity())
                .status(alert.getStatus())
                .createdAt(alert.getCreatedAt())
                .build();
    }
}
