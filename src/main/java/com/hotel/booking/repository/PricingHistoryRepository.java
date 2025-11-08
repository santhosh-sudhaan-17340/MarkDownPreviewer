package com.hotel.booking.repository;

import com.hotel.booking.model.PricingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

/**
 * Pricing History Repository
 * Data access layer for PricingHistory entity
 */
@Repository
public interface PricingHistoryRepository extends JpaRepository<PricingHistory, Long> {

    List<PricingHistory> findByRoomId(Long roomId);

    List<PricingHistory> findByRoomIdOrderByEffectiveDateDesc(Long roomId);

    @Query("SELECT ph FROM PricingHistory ph " +
           "WHERE ph.room.id = :roomId " +
           "AND ph.effectiveDate >= :startDate " +
           "AND ph.effectiveDate <= :endDate " +
           "ORDER BY ph.effectiveDate DESC")
    List<PricingHistory> findByRoomIdAndDateRange(
        @Param("roomId") Long roomId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
}
