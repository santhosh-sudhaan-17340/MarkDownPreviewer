package com.parking.mlcp.repository;

import com.parking.mlcp.entity.PaymentTransaction;
import com.parking.mlcp.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    List<PaymentTransaction> findByTicket_TicketId(Long ticketId);

    List<PaymentTransaction> findByPaymentStatus(PaymentStatus status);

    /**
     * Get total revenue by date range
     */
    @Query("SELECT SUM(pt.amount) FROM PaymentTransaction pt " +
           "WHERE pt.paymentStatus = 'SUCCESS' " +
           "AND pt.transactionTime BETWEEN :startDate AND :endDate")
    Double getTotalRevenueByDateRange(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Get payment method distribution
     */
    @Query("SELECT pt.paymentMethod, COUNT(pt), SUM(pt.amount) " +
           "FROM PaymentTransaction pt " +
           "WHERE pt.paymentStatus = 'SUCCESS' " +
           "AND pt.transactionTime BETWEEN :startDate AND :endDate " +
           "GROUP BY pt.paymentMethod")
    List<Object[]> getPaymentMethodDistribution(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
}
