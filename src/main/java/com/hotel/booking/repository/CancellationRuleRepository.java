package com.hotel.booking.repository;

import com.hotel.booking.model.CancellationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * Cancellation Rule Repository
 * Data access layer for CancellationRule entity
 */
@Repository
public interface CancellationRuleRepository extends JpaRepository<CancellationRule, Long> {

    List<CancellationRule> findByPolicyName(String policyName);

    @Query("SELECT cr FROM CancellationRule cr " +
           "WHERE cr.policyName = :policyName " +
           "ORDER BY cr.daysBeforeCheckin DESC")
    List<CancellationRule> findByPolicyNameOrderByDaysDesc(@Param("policyName") String policyName);
}
