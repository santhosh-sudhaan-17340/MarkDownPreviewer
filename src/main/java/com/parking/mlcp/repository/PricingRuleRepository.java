package com.parking.mlcp.repository;

import com.parking.mlcp.entity.PricingRule;
import com.parking.mlcp.model.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PricingRuleRepository extends JpaRepository<PricingRule, Long> {

    /**
     * Find active pricing rule for a vehicle type
     */
    @Query("SELECT p FROM PricingRule p WHERE p.vehicleType = :vehicleType " +
           "AND p.isActive = true ORDER BY p.effectiveFrom DESC LIMIT 1")
    Optional<PricingRule> findActiveRuleByVehicleType(@Param("vehicleType") VehicleType vehicleType);
}
