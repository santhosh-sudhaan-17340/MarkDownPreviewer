package com.parking.mlcp.repository;

import com.parking.mlcp.entity.ParkingTicket;
import com.parking.mlcp.model.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingTicketRepository extends JpaRepository<ParkingTicket, Long> {

    Optional<ParkingTicket> findByTicketNumber(String ticketNumber);

    List<ParkingTicket> findByVehicleNumberAndStatus(String vehicleNumber, TicketStatus status);

    Optional<ParkingTicket> findByVehicleNumberAndStatusOrderByEntryTimeDesc(
        String vehicleNumber, TicketStatus status
    );

    List<ParkingTicket> findByStatus(TicketStatus status);

    /**
     * Find active tickets (currently parked)
     */
    @Query("SELECT t FROM ParkingTicket t WHERE t.status = 'ACTIVE' " +
           "ORDER BY t.entryTime DESC")
    List<ParkingTicket> findActiveTickets();

    /**
     * Find tickets by date range
     */
    @Query("SELECT t FROM ParkingTicket t WHERE t.entryTime BETWEEN :startDate AND :endDate")
    List<ParkingTicket> findByDateRange(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Get revenue by date range
     */
    @Query("SELECT SUM(t.parkingFee) FROM ParkingTicket t " +
           "WHERE t.status = 'COMPLETED' " +
           "AND t.exitTime BETWEEN :startDate AND :endDate")
    Double getRevenueByDateRange(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Get hourly entry statistics for peak hour analysis
     */
    @Query("SELECT HOUR(t.entryTime), COUNT(t) FROM ParkingTicket t " +
           "WHERE t.entryTime BETWEEN :startDate AND :endDate " +
           "GROUP BY HOUR(t.entryTime) ORDER BY HOUR(t.entryTime)")
    List<Object[]> getHourlyEntryStatistics(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Get vehicle type distribution
     */
    @Query("SELECT t.vehicleType, COUNT(t) FROM ParkingTicket t " +
           "WHERE t.entryTime BETWEEN :startDate AND :endDate " +
           "GROUP BY t.vehicleType")
    List<Object[]> getVehicleTypeDistribution(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
}
