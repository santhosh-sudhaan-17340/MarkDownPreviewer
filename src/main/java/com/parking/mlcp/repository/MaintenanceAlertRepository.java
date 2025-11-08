package com.parking.mlcp.repository;

import com.parking.mlcp.entity.MaintenanceAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MaintenanceAlertRepository extends JpaRepository<MaintenanceAlert, Long> {

    List<MaintenanceAlert> findByStatus(String status);

    List<MaintenanceAlert> findBySlot_SlotId(Long slotId);

    @Query("SELECT m FROM MaintenanceAlert m WHERE m.severity = :severity " +
           "AND m.status IN ('OPEN', 'IN_PROGRESS') ORDER BY m.createdAt DESC")
    List<MaintenanceAlert> findBySeverityAndOpenStatus(@Param("severity") String severity);

    @Query("SELECT m FROM MaintenanceAlert m WHERE m.status IN ('OPEN', 'IN_PROGRESS') " +
           "ORDER BY CASE m.severity " +
           "WHEN 'CRITICAL' THEN 1 " +
           "WHEN 'HIGH' THEN 2 " +
           "WHEN 'MEDIUM' THEN 3 " +
           "WHEN 'LOW' THEN 4 END, m.createdAt ASC")
    List<MaintenanceAlert> findOpenAlertsSortedBySeverity();
}
