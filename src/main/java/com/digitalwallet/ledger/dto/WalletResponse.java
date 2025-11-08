package com.digitalwallet.ledger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletResponse {

    private Long id;
    private Long userId;
    private String username;
    private BigDecimal balance;
    private BigDecimal dailyWithdrawalLimit;
    private BigDecimal withdrawnToday;
    private BigDecimal remainingDailyLimit;
    private Boolean frozen;
    private String frozenReason;
    private LocalDateTime createdAt;
}
