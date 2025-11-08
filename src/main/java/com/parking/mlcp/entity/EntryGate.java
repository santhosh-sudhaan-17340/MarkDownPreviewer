package com.parking.mlcp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entity representing an entry gate in the parking facility
 */
@Entity
@Table(name = "entry_gate")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EntryGate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "gate_id")
    private Long gateId;

    @Column(name = "gate_name", nullable = false, length = 50)
    private String gateName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "floor_id")
    private ParkingFloor floor;

    @Column(name = "x_coordinate")
    private Integer xCoordinate;

    @Column(name = "y_coordinate")
    private Integer yCoordinate;

    @Column(name = "is_active")
    private Boolean isActive = true;
}
