package com.parking.mlcp.controller;

import com.parking.mlcp.dto.DashboardSummaryResponse;
import com.parking.mlcp.dto.MaintenanceAlertDTO;
import com.parking.mlcp.entity.MaintenanceAlert;
import com.parking.mlcp.entity.PricingRule;
import com.parking.mlcp.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for admin operations
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AdminController {

    private final AdminService adminService;

    /**
     * Get dashboard summary
     */
    @GetMapping("/dashboard")
    public ResponseEntity<DashboardSummaryResponse> getDashboard() {
        DashboardSummaryResponse summary = adminService.getDashboardSummary();
        return ResponseEntity.ok(summary);
    }

    /**
     * Block a parking slot
     */
    @PutMapping("/slots/{slotId}/block")
    public ResponseEntity<String> blockSlot(
            @PathVariable Long slotId,
            @RequestBody Map<String, String> request) {
        String reason = request.getOrDefault("reason", "Admin blocked");
        adminService.blockSlot(slotId, reason);
        return ResponseEntity.ok("Slot blocked successfully");
    }

    /**
     * Unblock a parking slot
     */
    @PutMapping("/slots/{slotId}/unblock")
    public ResponseEntity<String> unblockSlot(@PathVariable Long slotId) {
        adminService.unblockSlot(slotId);
        return ResponseEntity.ok("Slot unblocked successfully");
    }

    /**
     * Create maintenance alert
     */
    @PostMapping("/maintenance")
    public ResponseEntity<MaintenanceAlert> createMaintenanceAlert(
            @RequestBody Map<String, Object> request) {
        Long slotId = Long.valueOf(request.get("slotId").toString());
        String alertType = request.get("alertType").toString();
        String description = request.get("description").toString();
        String severity = request.get("severity").toString();

        MaintenanceAlert alert = adminService.createMaintenanceAlert(
                slotId, alertType, description, severity);
        return ResponseEntity.ok(alert);
    }

    /**
     * Resolve maintenance alert
     */
    @PutMapping("/maintenance/{alertId}/resolve")
    public ResponseEntity<String> resolveMaintenanceAlert(@PathVariable Long alertId) {
        adminService.resolveMaintenanceAlert(alertId);
        return ResponseEntity.ok("Maintenance alert resolved");
    }

    /**
     * Get all maintenance alerts
     */
    @GetMapping("/maintenance")
    public ResponseEntity<List<MaintenanceAlertDTO>> getMaintenanceAlerts() {
        List<MaintenanceAlertDTO> alerts = adminService.getMaintenanceAlerts();
        return ResponseEntity.ok(alerts);
    }

    /**
     * Update pricing rule
     */
    @PostMapping("/pricing")
    public ResponseEntity<PricingRule> updatePricingRule(@RequestBody PricingRule rule) {
        PricingRule updated = adminService.updatePricingRule(rule);
        return ResponseEntity.ok(updated);
    }

    /**
     * Get all pricing rules
     */
    @GetMapping("/pricing")
    public ResponseEntity<List<PricingRule>> getPricingRules() {
        List<PricingRule> rules = adminService.getAllPricingRules();
        return ResponseEntity.ok(rules);
    }
}
