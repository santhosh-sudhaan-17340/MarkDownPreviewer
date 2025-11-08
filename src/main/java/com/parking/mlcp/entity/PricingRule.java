package com.parking.mlcp.entity;

import com.parking.mlcp.model.VehicleType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity representing pricing rules for different vehicle types
 */
@Entity
@Table(name = "pricing_rule")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PricingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rule_id")
    private Long ruleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 20)
    private VehicleType vehicleType;

    @Column(name = "base_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal basePrice;

    @Column(name = "hourly_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal hourlyRate;

    @Column(name = "daily_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal dailyRate;

    @Column(name = "penalty_rate", precision = 10, scale = 2)
    private BigDecimal penaltyRate = BigDecimal.ZERO;

    @Column(name = "ev_charging_rate", precision = 10, scale = 2)
    private BigDecimal evChargingRate = BigDecimal.ZERO;

    @Column(name = "vip_discount_percent")
    private Integer vipDiscountPercent = 0;

    @Column(name = "effective_from")
    private LocalDateTime effectiveFrom;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @PrePersist
    protected void onCreate() {
        if (effectiveFrom == null) {
            effectiveFrom = LocalDateTime.now();
        }
    }
}
