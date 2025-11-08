package com.parking.mlcp.service;

import com.parking.mlcp.entity.ParkingTicket;
import com.parking.mlcp.entity.PricingRule;
import com.parking.mlcp.exception.ParkingException;
import com.parking.mlcp.model.VehicleType;
import com.parking.mlcp.repository.PricingRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Service responsible for calculating parking fees
 * Implements dynamic pricing based on duration, vehicle type, and special features
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PricingService {

    private final PricingRuleRepository pricingRuleRepository;

    /**
     * Calculate parking fee for a ticket
     */
    public BigDecimal calculateParkingFee(ParkingTicket ticket) {
        LocalDateTime exitTime = ticket.getExitTime() != null ?
                ticket.getExitTime() : LocalDateTime.now();

        Duration duration = Duration.between(ticket.getEntryTime(), exitTime);
        long totalMinutes = duration.toMinutes();
        long totalHours = duration.toHours();
        long totalDays = duration.toDays();

        PricingRule rule = getPricingRule(ticket.getVehicleType());

        BigDecimal fee = rule.getBasePrice();

        // Calculate time-based fee
        if (totalDays > 0) {
            // Daily rate is more economical
            fee = fee.add(rule.getDailyRate().multiply(BigDecimal.valueOf(totalDays)));
            long remainingHours = totalHours - (totalDays * 24);
            if (remainingHours > 0) {
                fee = fee.add(rule.getHourlyRate().multiply(BigDecimal.valueOf(remainingHours)));
            }
        } else {
            // Hourly rate
            // Round up partial hours
            long chargeableHours = totalMinutes > 0 ? (totalMinutes + 59) / 60 : 0;
            fee = fee.add(rule.getHourlyRate().multiply(BigDecimal.valueOf(chargeableHours)));
        }

        // Add EV charging fee if applicable
        if (Boolean.TRUE.equals(ticket.getSlot().getIsEvCharging())) {
            BigDecimal evFee = rule.getEvChargingRate().multiply(BigDecimal.valueOf(totalHours));
            fee = fee.add(evFee);
            log.debug("Added EV charging fee: {}", evFee);
        }

        // Apply VIP discount if applicable
        if (Boolean.TRUE.equals(ticket.getSlot().getIsVip()) && rule.getVipDiscountPercent() > 0) {
            BigDecimal discount = fee.multiply(BigDecimal.valueOf(rule.getVipDiscountPercent()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            fee = fee.subtract(discount);
            log.debug("Applied VIP discount: {}", discount);
        }

        // Ensure minimum fee
        if (fee.compareTo(rule.getBasePrice()) < 0) {
            fee = rule.getBasePrice();
        }

        log.info("Calculated fee for ticket {}: {} (Duration: {} hours)",
                ticket.getTicketNumber(), fee, totalHours);

        return fee.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Get pricing rule for vehicle type (cached for performance)
     */
    @Cacheable(value = "pricingRules", key = "#vehicleType")
    public PricingRule getPricingRule(VehicleType vehicleType) {
        return pricingRuleRepository.findActiveRuleByVehicleType(vehicleType)
                .orElseThrow(() -> new ParkingException("No pricing rule found for vehicle type: " + vehicleType));
    }

    /**
     * Calculate estimated fee for a duration (for display purposes)
     */
    public BigDecimal estimateFee(VehicleType vehicleType, long hours, boolean isEvCharging, boolean isVip) {
        PricingRule rule = getPricingRule(vehicleType);

        BigDecimal fee = rule.getBasePrice();

        long days = hours / 24;
        long remainingHours = hours % 24;

        if (days > 0) {
            fee = fee.add(rule.getDailyRate().multiply(BigDecimal.valueOf(days)));
        }
        if (remainingHours > 0) {
            fee = fee.add(rule.getHourlyRate().multiply(BigDecimal.valueOf(remainingHours)));
        }

        if (isEvCharging) {
            fee = fee.add(rule.getEvChargingRate().multiply(BigDecimal.valueOf(hours)));
        }

        if (isVip && rule.getVipDiscountPercent() > 0) {
            BigDecimal discount = fee.multiply(BigDecimal.valueOf(rule.getVipDiscountPercent()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            fee = fee.subtract(discount);
        }

        return fee.setScale(2, RoundingMode.HALF_UP);
    }
}
