package com.sourastra.matrimony.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InterestResponse {

    private Long id;
    private Long fromProfileId;
    private Long toProfileId;
    private String message;
    private LocalDateTime createdAt;
}
